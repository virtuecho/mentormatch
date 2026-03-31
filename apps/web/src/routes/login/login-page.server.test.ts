import type { ActionFailure } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { registerUser } from '@mentormatch/feature-auth';
import { SESSION_COOKIE_NAME } from '$lib/server/http';
import { AuthTestDatabase } from '$lib/server/auth-test-db';
import { actions } from './+page.server';

type LoginActionEvent = Parameters<(typeof actions)['default']>[0];

type CookieWrite = {
	name: string;
	value: string;
	options: Record<string, unknown>;
};

function createLoginRequest(overrides: Record<string, string> = {}) {
	const form = new FormData();
	const baseFields = {
		email: 'ada@example.com',
		password: 'password123'
	};

	for (const [key, value] of Object.entries({ ...baseFields, ...overrides })) {
		form.set(key, value);
	}

	return new Request('http://localhost:5173/login', {
		method: 'POST',
		body: form
	});
}

function createCookies() {
	const writes: CookieWrite[] = [];

	return {
		writes,
		cookies: {
			set(name: string, value: string, options: Record<string, unknown>) {
				writes.push({ name, value, options });
			}
		}
	};
}

function createLocals(
	db = new AuthTestDatabase(),
	authSecret: string | null = 'test-secret'
): App.Locals {
	return {
		db,
		authSecret,
		user: null
	};
}

function createLoginEvent(
	db = new AuthTestDatabase(),
	cookies = createCookies().cookies,
	authSecret: string | null = 'test-secret',
	url = new URL('http://localhost:5173/login')
): LoginActionEvent {
	return {
		request: createLoginRequest(),
		locals: createLocals(db, authSecret),
		cookies,
		url
	} as unknown as LoginActionEvent;
}

describe('login page action', () => {
	it('sets the session cookie and redirects after a successful login', async () => {
		const db = new AuthTestDatabase();
		await registerUser(db, {
			fullName: 'Ada Lovelace',
			email: 'ada@example.com',
			password: 'password123',
			role: 'mentor'
		});

		const cookieJar = createCookies();

		await expect(
			actions.default(
				createLoginEvent(
					db,
					cookieJar.cookies,
					'test-secret',
					new URL('http://localhost:5173/login?redirect=/profile')
				)
			)
		).rejects.toMatchObject({
			status: 303,
			location: '/profile'
		});

		expect(cookieJar.writes).toHaveLength(1);
		expect(cookieJar.writes[0]?.name).toBe(SESSION_COOKIE_NAME);
		expect(cookieJar.writes[0]?.value).toMatch(/\./);
		expect(cookieJar.writes[0]?.options.httpOnly).toBe(true);
	});

	it('returns a 500 form failure when the auth secret is missing', async () => {
		const db = new AuthTestDatabase();
		await registerUser(db, {
			fullName: 'Ada Lovelace',
			email: 'ada@example.com',
			password: 'password123',
			role: 'mentor'
		});

		const cookieJar = createCookies();
		const result = (await actions.default(
			createLoginEvent(db, cookieJar.cookies, null)
		)) as ActionFailure<{ message: string }>;

		expect(result.status).toBe(500);
		expect(result.data.message).toBe('AUTH_SECRET is not configured');
		expect(cookieJar.writes).toHaveLength(0);
	});

	it('sends admin users to the review queue by default', async () => {
		const db = new AuthTestDatabase();
		const registration = await registerUser(db, {
			fullName: 'Admin User',
			email: 'admin@example.com',
			password: 'password123',
			role: 'mentee'
		});
		await db.run('UPDATE users SET role = ?, updated_at = ? WHERE id = ?', [
			'admin',
			new Date().toISOString(),
			registration.user.id
		]);

		await expect(
			actions.default({
				request: createLoginRequest({
					email: 'admin@example.com',
					password: 'password123'
				}),
				locals: createLocals(db),
				cookies: createCookies().cookies,
				url: new URL('http://localhost:5173/login')
			} as unknown as LoginActionEvent)
		).rejects.toMatchObject({
			status: 303,
			location: '/admin/review'
		});
	});

	it('sends unapproved mentor accounts to the mentor application page by default', async () => {
		const db = new AuthTestDatabase();
		const registration = await registerUser(db, {
			fullName: 'Pending Mentor',
			email: 'mentor@example.com',
			password: 'password123',
			role: 'mentor'
		});
		await db.run('UPDATE users SET role = ?, updated_at = ? WHERE id = ?', [
			'mentor',
			new Date().toISOString(),
			registration.user.id
		]);

		await expect(
			actions.default({
				request: createLoginRequest({
					email: 'mentor@example.com',
					password: 'password123'
				}),
				locals: createLocals(db),
				cookies: createCookies().cookies,
				url: new URL('http://localhost:5173/login')
			} as unknown as LoginActionEvent)
		).rejects.toMatchObject({
			status: 303,
			location: '/mentor-verification'
		});
	});
});
