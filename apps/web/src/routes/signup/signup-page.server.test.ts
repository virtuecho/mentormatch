import type { ActionFailure } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { AuthTestDatabase } from '$lib/server/auth-test-db';
import { actions } from './+page.server';

type SignupActionEvent = Parameters<(typeof actions)['default']>[0];

function createSignupRequest(overrides: Record<string, string> = {}) {
	const form = new FormData();
	const baseFields = {
		fullName: 'Ada Lovelace',
		email: 'ada@example.com',
		password: 'password123',
		confirmPassword: 'password123',
		role: 'mentor',
		agreeToTerms: 'on'
	};

	for (const [key, value] of Object.entries({ ...baseFields, ...overrides })) {
		form.set(key, value);
	}

	return new Request('http://localhost:5173/signup', {
		method: 'POST',
		body: form
	});
}

function createLocals(db = new AuthTestDatabase()): App.Locals {
	return {
		db,
		authSecret: null,
		user: null
	};
}

function createSignupEvent(db = new AuthTestDatabase()): SignupActionEvent {
	return {
		request: createSignupRequest(),
		locals: createLocals(db),
		url: new URL('http://localhost:5173/signup')
	} as unknown as SignupActionEvent;
}

describe('signup page action', () => {
	it('redirects to the login page after a successful registration', async () => {
		await expect(actions.default(createSignupEvent())).rejects.toMatchObject({
			status: 303,
			location: '/login'
		});
	});

	it('returns a 409 form failure when the email already exists', async () => {
		const db = new AuthTestDatabase();

		await expect(actions.default(createSignupEvent(db))).rejects.toMatchObject({
			status: 303,
			location: '/login'
		});

		const result = (await actions.default(createSignupEvent(db))) as ActionFailure<{
			message: string;
		}>;

		expect(result.status).toBe(409);
		expect(result.data.message).toMatch(/existing account/i);
	});
});
