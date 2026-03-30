import type { DatabaseClient } from '@mentormatch/db';
import { AppError, ensureAvatar, mentorSearchSchema, parseJsonArray } from '@mentormatch/shared';

type MentorCardRow = {
	id: number;
	full_name: string;
	profile_image_url: string | null;
	location: string | null;
	latest_position: string | null;
	latest_company: string | null;
	latest_expertise_json: string | null;
	skill_names: string | null;
};

export async function listMentors(db: DatabaseClient, currentUserId: number | null, input: unknown) {
	const filters = mentorSearchSchema.parse(input);

	const rows = await db.all<MentorCardRow>(
		`
			SELECT
				u.id,
				p.full_name,
				p.profile_image_url,
				p.location,
				(
					SELECT e.position
					FROM experiences e
					WHERE e.user_id = u.id
					ORDER BY e.start_year DESC
					LIMIT 1
				) AS latest_position,
				(
					SELECT e.company
					FROM experiences e
					WHERE e.user_id = u.id
					ORDER BY e.start_year DESC
					LIMIT 1
				) AS latest_company,
				(
					SELECT e.expertise_json
					FROM experiences e
					WHERE e.user_id = u.id
					ORDER BY e.start_year DESC
					LIMIT 1
				) AS latest_expertise_json,
				(
					SELECT GROUP_CONCAT(ms.skill_name, ',')
					FROM mentor_skills ms
					WHERE ms.mentor_id = u.id
				) AS skill_names
			FROM users u
			JOIN profiles p ON p.user_id = u.id
			WHERE u.role = 'mentor'
				AND u.is_mentor_approved = 1
				AND (? IS NULL OR u.id != ?)
				AND (? = '' OR LOWER(p.full_name) LIKE '%' || LOWER(?) || '%' OR LOWER(IFNULL(p.location, '')) LIKE '%' || LOWER(?) || '%')
				AND (? = '' OR EXISTS (
					SELECT 1 FROM mentor_skills ms
					WHERE ms.mentor_id = u.id AND LOWER(ms.skill_name) LIKE '%' || LOWER(?) || '%'
				))
				AND (? = '' OR LOWER(IFNULL(p.location, '')) LIKE '%' || LOWER(?) || '%')
			ORDER BY p.full_name ASC
			LIMIT ?
		`,
		[
			currentUserId,
			currentUserId,
			filters.q,
			filters.q,
			filters.q,
			filters.tag,
			filters.tag,
			filters.city,
			filters.city,
			filters.limit
		]
	);

	return rows.map((row) => ({
		id: row.id,
		fullName: row.full_name,
		profileImageUrl: ensureAvatar(row.profile_image_url),
		location: row.location,
		position: row.latest_position ?? 'Mentor',
		company: row.latest_company ?? 'MentorMatch',
		mentorSkills: row.skill_names ? row.skill_names.split(',').filter(Boolean) : [],
		expertise: parseJsonArray(row.latest_expertise_json)
	}));
}

export async function getMentorProfile(db: DatabaseClient, mentorId: number) {
	const mentor = await db.get<any>(
		`
			SELECT
				u.id,
				u.email,
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
			WHERE u.id = ? AND u.role = 'mentor' AND u.is_mentor_approved = 1
			LIMIT 1
		`,
		[mentorId]
	);

	if (!mentor) {
		throw new AppError(404, 'mentor_not_found', 'Mentor not found');
	}

	const [educations, experiences, mentorSkills, availability] = await Promise.all([
		db.all<any>(
			`
				SELECT id, university, degree, major, start_year, end_year, status, logo_url, description
				FROM educations
				WHERE user_id = ?
				ORDER BY start_year DESC
			`,
			[mentorId]
		),
		db.all<any>(
			`
				SELECT id, company, position, industry, expertise_json, start_year, end_year, status, description
				FROM experiences
				WHERE user_id = ?
				ORDER BY start_year DESC
			`,
			[mentorId]
		),
		db.all<{ skill_name: string }>('SELECT skill_name FROM mentor_skills WHERE mentor_id = ? ORDER BY skill_name ASC', [
			mentorId
		]),
		db.all<any>(
			`
				SELECT id, title, start_time, duration_mins, location_type, city, address, max_participants, note, is_booked
				FROM availability_slots
				WHERE mentor_id = ? AND start_time >= ? AND is_booked = 0
				ORDER BY start_time ASC
			`,
			[mentorId, new Date().toISOString()]
		)
	]);

	return {
		id: mentor.id,
		email: mentor.email,
		fullName: mentor.full_name,
		bio: mentor.bio,
		location: mentor.location,
		profileImageUrl: ensureAvatar(mentor.profile_image_url),
		linkedinUrl: mentor.linkedin_url,
		instagramUrl: mentor.instagram_url,
		facebookUrl: mentor.facebook_url,
		websiteUrl: mentor.website_url,
		phone: mentor.phone,
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
		availability: availability.map((slot) => ({
			id: slot.id,
			title: slot.title,
			startTime: slot.start_time,
			durationMins: slot.duration_mins,
			locationType: slot.location_type,
			city: slot.city,
			address: slot.address,
			maxParticipants: slot.max_participants,
			note: slot.note,
			isBooked: Boolean(slot.is_booked)
		}))
	};
}
