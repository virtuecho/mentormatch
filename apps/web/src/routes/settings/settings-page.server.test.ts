import type { ActionFailure } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { loginUser, registerUser } from '@mentormatch/feature-auth';
import { AuthTestDatabase } from '$lib/server/auth-test-db';
import { actions } from './+page.server';

type SettingsActionEvent = Parameters<(typeof actions)['changePassword']>[0];

function createLocals(db = new AuthTestDatabase()): App.Locals {
	return {
		db,
		authSecret: 'test-secret',
		user: {
			id: 1,
			email: 'ada@example.com',
			role: 'mentee',
			isMentorApproved: false,
			fullName: 'Ada Lovelace',
			profileImageUrl: ''
		}
	};
}

function createRequest(fields: Record<string, string>) {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		form.set(key, value);
	}

	return new Request('http://localhost:5173/settings', {
		method: 'POST',
		body: form
	});
}

describe('settings actions', () => {
	it('returns role-scoped errors when mentor mode is blocked', async () => {
		const db = new AuthTestDatabase();
		const registration = await registerUser(db, {
			fullName: 'Ada Lovelace',
			email: 'ada@example.com',
			password: 'password123',
			role: 'mentee'
		});

		const result = (await actions.toggleRole({
			request: createRequest({
				role: 'mentor'
			}),
			locals: {
				...createLocals(db),
				user: {
					...createLocals(db).user!,
					id: registration.user.id
				}
			}
		} as unknown as Parameters<(typeof actions)['toggleRole']>[0])) as ActionFailure<{
			message: string;
			section: string;
		}>;

		expect(result.status).toBe(403);
		expect(result.data.section).toBe('role');
		expect(result.data.message).toMatch(/approval required/i);
	});

	it('validates password confirmation before updating the password', async () => {
		const result = (await actions.changePassword({
			request: createRequest({
				currentPassword: 'password123',
				newPassword: 'newpassword456',
				confirmPassword: 'different'
			}),
			locals: createLocals()
		} as unknown as SettingsActionEvent)) as ActionFailure<{ message: string; section: string }>;

		expect(result.status).toBe(400);
		expect(result.data.section).toBe('password');
		expect(result.data.message).toMatch(/do not match/i);
	});

	it('deletes the account and clears the session when the confirmation is valid', async () => {
		const db = new AuthTestDatabase();
		const registration = await registerUser(db, {
			fullName: 'Ada Lovelace',
			email: 'ada@example.com',
			password: 'password123',
			role: 'mentee'
		});

		const deletes: Array<{ name: string }> = [];

		await expect(
			actions.deleteAccount({
				request: createRequest({
					password: 'password123',
					confirmation: 'DELETE'
				}),
				locals: {
					...createLocals(db),
					user: {
						...createLocals(db).user!,
						id: registration.user.id
					}
				},
				cookies: {
					delete(name: string) {
						deletes.push({ name });
					}
				},
				url: new URL('http://localhost:5173/settings')
			} as unknown as Parameters<(typeof actions)['deleteAccount']>[0])
		).rejects.toMatchObject({
			status: 303,
			location: '/'
		});

		expect(deletes).toHaveLength(1);
		await expect(
			loginUser(db, { email: 'ada@example.com', password: 'password123' }, 'test-secret')
		).rejects.toMatchObject({
			status: 401,
			code: 'invalid_credentials'
		});
	});
});
