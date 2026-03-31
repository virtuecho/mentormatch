import type { DatabaseClient, QueryParams, QueryResult } from '@mentormatch/db';
import type { UserRole } from '@mentormatch/shared';

type UserRow = {
	id: number;
	email: string;
	password_hash: string;
	role: UserRole;
	is_mentor_approved: number;
};

type ProfileRow = {
	user_id: number;
	full_name: string;
	profile_image_url: string | null;
};

export class AuthTestDatabase implements DatabaseClient {
	private nextUserId = 1;
	private users: UserRow[] = [];
	private profiles: ProfileRow[] = [];

	async get<T>(sql: string, params: QueryParams = []): Promise<T | null> {
		if (sql.includes('SELECT id FROM users WHERE email = ?')) {
			const email = String(params[0]);
			const user = this.users.find((item) => item.email === email);
			return (user ? { id: user.id } : null) as T | null;
		}

		if (sql.includes('WHERE u.email = ?')) {
			const email = String(params[0]);
			const user = this.users.find((item) => item.email === email);
			if (!user) return null;

			const profile = this.profiles.find((item) => item.user_id === user.id);
			return {
				...user,
				full_name: profile?.full_name ?? 'Unknown',
				profile_image_url: profile?.profile_image_url ?? null
			} as T;
		}

		if (sql.includes('WHERE u.id = ?')) {
			const id = Number(params[0]);
			const user = this.users.find((item) => item.id === id);
			if (!user) return null;

			const profile = this.profiles.find((item) => item.user_id === user.id);
			return {
				id: user.id,
				email: user.email,
				role: user.role,
				is_mentor_approved: user.is_mentor_approved,
				full_name: profile?.full_name ?? 'Unknown',
				profile_image_url: profile?.profile_image_url ?? null
			} as T;
		}

		throw new Error(`Unexpected get query: ${sql}`);
	}

	async all<T>(): Promise<T[]> {
		return [];
	}

	async run(sql: string, params: QueryParams = []): Promise<QueryResult> {
		if (sql.includes('INSERT INTO users')) {
			const [email, passwordHash, role, isMentorApproved] = params;
			const id = this.nextUserId++;
			this.users.push({
				id,
				email: String(email),
				password_hash: String(passwordHash),
				role: role as UserRole,
				is_mentor_approved: Number(isMentorApproved)
			});

			return { changes: 1, lastRowId: id };
		}

		if (sql.includes('INSERT INTO profiles')) {
			const [userId, fullName] = params;
			this.profiles.push({
				user_id: Number(userId),
				full_name: String(fullName),
				profile_image_url: null
			});

			return { changes: 1, lastRowId: null };
		}

		throw new Error(`Unexpected run query: ${sql}`);
	}
}
