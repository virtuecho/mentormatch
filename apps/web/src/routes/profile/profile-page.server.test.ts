import { describe, expect, it } from 'vitest';
import type { DatabaseClient, QueryParams, QueryResult } from '@mentormatch/db';
import { actions } from './+page.server';

type UserRow = {
	id: number;
	email: string;
	role: 'mentee' | 'mentor' | 'admin';
	isMentorApproved: number;
};

type ProfileRow = {
	userId: number;
	fullName: string;
	bio: string | null;
	location: string | null;
	profileImageUrl: string | null;
	linkedinUrl: string | null;
	instagramUrl: string | null;
	facebookUrl: string | null;
	websiteUrl: string | null;
	phone: string | null;
};

class ProfilePageTestDatabase implements DatabaseClient {
	users: UserRow[] = [
		{ id: 1, email: 'admin@example.com', role: 'admin', isMentorApproved: 1 },
		{ id: 2, email: 'member@example.com', role: 'mentee', isMentorApproved: 0 }
	];

	profiles: ProfileRow[] = [
		{
			userId: 1,
			fullName: 'Admin User',
			bio: 'Admin bio',
			location: 'Shanghai',
			profileImageUrl: null,
			linkedinUrl: null,
			instagramUrl: null,
			facebookUrl: null,
			websiteUrl: null,
			phone: null
		},
		{
			userId: 2,
			fullName: 'Member User',
			bio: 'Member bio',
			location: 'Beijing',
			profileImageUrl: null,
			linkedinUrl: null,
			instagramUrl: null,
			facebookUrl: null,
			websiteUrl: null,
			phone: null
		}
	];

	async get<T>(sql: string, params: QueryParams = []): Promise<T | null> {
		if (sql.includes('SELECT id FROM users WHERE id = ?')) {
			const userId = Number(params[0]);
			const user = this.users.find((item) => item.id === userId);
			return (user ? { id: user.id } : null) as T | null;
		}

		if (sql.includes('FROM users u') && sql.includes('JOIN profiles p ON p.user_id = u.id')) {
			const userId = Number(params[0]);
			const user = this.users.find((item) => item.id === userId);
			const profile = this.profiles.find((item) => item.userId === userId);
			if (!user || !profile) {
				return null;
			}

			return {
				id: user.id,
				email: user.email,
				role: user.role,
				is_mentor_approved: user.isMentorApproved,
				full_name: profile.fullName,
				bio: profile.bio,
				location: profile.location,
				profile_image_url: profile.profileImageUrl,
				linkedin_url: profile.linkedinUrl,
				instagram_url: profile.instagramUrl,
				facebook_url: profile.facebookUrl,
				website_url: profile.websiteUrl,
				phone: profile.phone
			} as T;
		}

		if (sql.includes('FROM mentor_requests')) {
			return null;
		}

		throw new Error(`Unexpected get query: ${sql}`);
	}

	async all<T>(sql: string, params: QueryParams = []): Promise<T[]> {
		if (sql.includes('FROM educations')) {
			return [];
		}

		if (sql.includes('FROM experiences')) {
			return [];
		}

		if (sql.includes('SELECT skill_name FROM mentor_skills')) {
			return [];
		}

		throw new Error(`Unexpected all query: ${sql} :: ${JSON.stringify(params)}`);
	}

	async run(sql: string, params: QueryParams = []): Promise<QueryResult> {
		if (sql.includes('UPDATE profiles')) {
			const [
				fullName,
				bio,
				location,
				profileImageUrl,
				linkedinUrl,
				instagramUrl,
				facebookUrl,
				websiteUrl,
				phone,
				,
				userId
			] = params;
			const profile = this.profiles.find((item) => item.userId === Number(userId));
			if (!profile) {
				return { changes: 0, lastRowId: null };
			}

			profile.fullName = String(fullName);
			profile.bio = bio == null ? null : String(bio);
			profile.location = location == null ? null : String(location);
			profile.profileImageUrl = profileImageUrl == null ? null : String(profileImageUrl);
			profile.linkedinUrl = linkedinUrl == null ? null : String(linkedinUrl);
			profile.instagramUrl = instagramUrl == null ? null : String(instagramUrl);
			profile.facebookUrl = facebookUrl == null ? null : String(facebookUrl);
			profile.websiteUrl = websiteUrl == null ? null : String(websiteUrl);
			profile.phone = phone == null ? null : String(phone);
			return { changes: 1, lastRowId: null };
		}

		if (
			sql.includes('DELETE FROM educations WHERE user_id = ?') ||
			sql.includes('DELETE FROM experiences WHERE user_id = ?') ||
			sql.includes('DELETE FROM mentor_skills WHERE mentor_id = ?')
		) {
			return { changes: 1, lastRowId: null };
		}

		if (sql.includes('INSERT INTO audit_logs')) {
			return { changes: 1, lastRowId: 1 };
		}

		throw new Error(`Unexpected run query: ${sql} :: ${JSON.stringify(params)}`);
	}

	async batch(statements: Array<{ sql: string; params?: QueryParams }>): Promise<QueryResult[]> {
		const userSnapshot = this.users.map((user) => ({ ...user }));
		const profileSnapshot = this.profiles.map((profile) => ({ ...profile }));

		try {
			const results: QueryResult[] = [];
			for (const statement of statements) {
				results.push(await this.run(statement.sql, statement.params ?? []));
			}
			return results;
		} catch (error) {
			this.users = userSnapshot;
			this.profiles = profileSnapshot;
			throw error;
		}
	}
}

function createRequest(fields: Record<string, string>) {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		form.set(key, value);
	}

	return new Request('http://localhost:5173/profile', {
		method: 'POST',
		body: form
	});
}

function createBaseFields(overrides: Record<string, string> = {}) {
	return {
		fullName: 'Updated Name',
		location: 'London',
		phone: '12345',
		bio: 'Updated bio',
		profileImageUrl: '',
		linkedinUrl: '',
		instagramUrl: '',
		facebookUrl: '',
		websiteUrl: '',
		mentorSkills: '',
		educationsJson: '[]',
		experiencesJson: '[]',
		...overrides
	};
}

describe('profile page save action', () => {
	it('updates the selected managed user instead of the admin when targetUserId is posted', async () => {
		const db = new ProfilePageTestDatabase();

		await expect(
			actions.save({
				request: createRequest(
					createBaseFields({
						targetUserId: '2',
						fullName: 'Managed Member'
					})
				),
				locals: {
					db,
					authSecret: 'test-secret',
					user: {
						id: 1,
						email: 'admin@example.com',
						role: 'admin',
						isMentorApproved: true,
						fullName: 'Admin User',
						profileImageUrl: ''
					}
				},
				url: new URL('http://localhost:5173/profile')
			} as unknown as Parameters<(typeof actions)['save']>[0])
		).rejects.toMatchObject({
			status: 303,
			location: '/profile?userId=2&updated=1'
		});
		expect(db.profiles.find((item) => item.userId === 1)?.fullName).toBe('Admin User');
		expect(db.profiles.find((item) => item.userId === 2)?.fullName).toBe('Managed Member');
	});

	it('ignores a forged targetUserId for non-admin users and keeps the save scoped to self', async () => {
		const db = new ProfilePageTestDatabase();

		const result = await actions.save({
			request: createRequest(
				createBaseFields({
					targetUserId: '1',
					fullName: 'Member Self Edit'
				})
			),
			locals: {
				db,
				authSecret: 'test-secret',
				user: {
					id: 2,
					email: 'member@example.com',
					role: 'mentee',
					isMentorApproved: false,
					fullName: 'Member User',
					profileImageUrl: ''
				}
			},
			url: new URL('http://localhost:5173/profile')
		} as unknown as Parameters<(typeof actions)['save']>[0]);

		expect(result).toMatchObject({
			success: true,
			message: 'Profile updated'
		});
		expect(db.profiles.find((item) => item.userId === 1)?.fullName).toBe('Admin User');
		expect(db.profiles.find((item) => item.userId === 2)?.fullName).toBe('Member Self Edit');
	});
});
