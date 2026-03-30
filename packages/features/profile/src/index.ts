import type { DatabaseClient } from '@mentormatch/db';
import {
	AppError,
	ensureAvatar,
	mentorModeSchema,
	mentorRequestSchema,
	parseJsonArray,
	profileUpdateSchema,
	type SessionUser,
	type UserRole
} from '@mentormatch/shared';

type ProfileRow = {
	id: number;
	email: string;
	role: UserRole;
	is_mentor_approved: number;
	full_name: string;
	bio: string | null;
	location: string | null;
	profile_image_url: string | null;
	linkedin_url: string | null;
	instagram_url: string | null;
	facebook_url: string | null;
	website_url: string | null;
	phone: string | null;
};

function mapSessionUser(row: ProfileRow): SessionUser {
	return {
		id: row.id,
		email: row.email,
		role: row.role,
		isMentorApproved: Boolean(row.is_mentor_approved),
		fullName: row.full_name,
		profileImageUrl: ensureAvatar(row.profile_image_url)
	};
}

export async function getProfile(db: DatabaseClient, userId: number) {
	const row = await db.get<ProfileRow>(
		`
			SELECT
				u.id,
				u.email,
				u.role,
				u.is_mentor_approved,
				p.full_name,
				p.bio,
				p.location,
				p.profile_image_url,
				p.linkedin_url,
				p.instagram_url,
				p.facebook_url,
				p.website_url,
				p.phone
			FROM users u
			JOIN profiles p ON p.user_id = u.id
			WHERE u.id = ?
			LIMIT 1
		`,
		[userId]
	);

	if (!row) {
		throw new AppError(404, 'profile_not_found', 'User profile not found');
	}

	const [educations, experiences, mentorSkills, mentorRequest] = await Promise.all([
		db.all<any>(
			`
				SELECT id, university, degree, major, start_year, end_year, status, logo_url, description
				FROM educations
				WHERE user_id = ?
				ORDER BY start_year DESC
			`,
			[userId]
		),
		db.all<any>(
			`
				SELECT id, company, position, industry, expertise_json, start_year, end_year, status, description
				FROM experiences
				WHERE user_id = ?
				ORDER BY start_year DESC
			`,
			[userId]
		),
		db.all<{ skill_name: string }>(
			'SELECT skill_name FROM mentor_skills WHERE mentor_id = ? ORDER BY skill_name ASC',
			[userId]
		),
		db.get<{ id: number; status: string; document_url: string; note: string | null; submitted_at: string }>(
			`
				SELECT id, status, document_url, note, submitted_at
				FROM mentor_requests
				WHERE user_id = ?
				ORDER BY submitted_at DESC
				LIMIT 1
			`,
			[userId]
		)
	]);

	return {
		id: row.id,
		email: row.email,
		role: row.role,
		isMentorApproved: Boolean(row.is_mentor_approved),
		user: mapSessionUser(row),
		profile: {
			fullName: row.full_name,
			bio: row.bio,
			location: row.location,
			profileImageUrl: ensureAvatar(row.profile_image_url),
			linkedinUrl: row.linkedin_url,
			instagramUrl: row.instagram_url,
			facebookUrl: row.facebook_url,
			websiteUrl: row.website_url,
			phone: row.phone,
			educations: educations.map((education) => ({
				id: education.id,
				university: education.university,
				degree: education.degree,
				major: education.major,
				startYear: education.start_year,
				endYear: education.end_year,
				status: education.status,
				logoUrl: education.logo_url,
				description: education.description
			})),
			experiences: experiences.map((experience) => ({
				id: experience.id,
				company: experience.company,
				position: experience.position,
				industry: experience.industry,
				expertise: parseJsonArray(experience.expertise_json),
				startYear: experience.start_year,
				endYear: experience.end_year,
				status: experience.status,
				description: experience.description
			})),
			mentorSkills: mentorSkills.map((skill) => skill.skill_name),
			mentorRequest
		}
	};
}

export async function updateProfile(db: DatabaseClient, userId: number, input: unknown) {
	const payload = profileUpdateSchema.parse(input);
	const now = new Date().toISOString();

	await db.run(
		`
			UPDATE profiles
			SET
				full_name = ?,
				bio = ?,
				location = ?,
				profile_image_url = ?,
				linkedin_url = ?,
				instagram_url = ?,
				facebook_url = ?,
				website_url = ?,
				phone = ?,
				updated_at = ?
			WHERE user_id = ?
		`,
		[
			payload.fullName,
			payload.bio ?? null,
			payload.location ?? null,
			payload.profileImageUrl ?? null,
			payload.linkedinUrl ?? null,
			payload.instagramUrl ?? null,
			payload.facebookUrl ?? null,
			payload.websiteUrl ?? null,
			payload.phone ?? null,
			now,
			userId
		]
	);

	await db.run('DELETE FROM educations WHERE user_id = ?', [userId]);
	await db.run('DELETE FROM experiences WHERE user_id = ?', [userId]);
	await db.run('DELETE FROM mentor_skills WHERE mentor_id = ?', [userId]);

	for (const education of payload.educations) {
		await db.run(
			`
				INSERT INTO educations (
					user_id, university, degree, major, start_year, end_year, status, logo_url, description
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
			[
				userId,
				education.university,
				education.degree,
				education.major,
				education.startYear,
				education.endYear ?? null,
				education.status,
				education.logoUrl ?? null,
				education.description ?? null
			]
		);
	}

	for (const experience of payload.experiences) {
		await db.run(
			`
				INSERT INTO experiences (
					user_id, company, position, industry, expertise_json, start_year, end_year, status, description
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
			[
				userId,
				experience.company,
				experience.position,
				experience.industry ?? null,
				JSON.stringify(experience.expertise ?? []),
				experience.startYear,
				experience.endYear ?? null,
				experience.status,
				experience.description ?? null
			]
		);
	}

	for (const skill of payload.mentorSkills) {
		await db.run('INSERT INTO mentor_skills (mentor_id, skill_name) VALUES (?, ?)', [userId, skill]);
	}

	return getProfile(db, userId);
}

export async function submitMentorRequest(db: DatabaseClient, userId: number, input: unknown) {
	const payload = mentorRequestSchema.parse(input);
	await db.run(
		`
			INSERT INTO mentor_requests (user_id, document_url, note, status, submitted_at)
			VALUES (?, ?, ?, 'pending', ?)
		`,
		[userId, payload.documentUrl, payload.note ?? null, new Date().toISOString()]
	);

	return { ok: true };
}

export async function toggleRole(db: DatabaseClient, userId: number, input: unknown = {}) {
	const payload = mentorModeSchema.parse(input);
	const current = await db.get<{ role: UserRole; is_mentor_approved: number }>(
		'SELECT role, is_mentor_approved FROM users WHERE id = ? LIMIT 1',
		[userId]
	);

	if (!current) {
		throw new AppError(404, 'user_not_found', 'User not found');
	}

	const nextRole = payload.role ?? (current.role === 'mentor' ? 'mentee' : 'mentor');
	if (nextRole === 'mentor' && !current.is_mentor_approved) {
		throw new AppError(403, 'mentor_approval_required', 'Mentor approval required before switching role');
	}

	await db.run('UPDATE users SET role = ?, updated_at = ? WHERE id = ?', [
		nextRole,
		new Date().toISOString(),
		userId
	]);

	return { role: nextRole };
}
