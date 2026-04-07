import { afterEach, describe, expect, it } from 'vitest';
import {
	LOCAL_DEVELOPMENT_AUTH_SECRET,
	createRequestId,
	handle,
	readAuthSecret
} from './hooks.server';

const ORIGINAL_AUTH_SECRET = process.env.AUTH_SECRET;

function createEvent(url: string, authSecret?: string) {
	return {
		url: new URL(url),
		platform: authSecret
			? {
					env: {
						AUTH_SECRET: authSecret
					}
				}
			: undefined
	} as Parameters<typeof readAuthSecret>[0];
}

afterEach(() => {
	if (ORIGINAL_AUTH_SECRET === undefined) {
		delete process.env.AUTH_SECRET;
		return;
	}

	process.env.AUTH_SECRET = ORIGINAL_AUTH_SECRET;
});

describe('readAuthSecret', () => {
	it('prefers the Worker binding when it is present', () => {
		process.env.AUTH_SECRET = 'process-secret';

		expect(readAuthSecret(createEvent('http://localhost:5173/login', 'binding-secret'))).toBe(
			'binding-secret'
		);
	});

	it('falls back to process env when the Worker binding is missing', () => {
		process.env.AUTH_SECRET = 'process-secret';

		expect(readAuthSecret(createEvent('https://app.example.com/login'))).toBe('process-secret');
	});

	it('uses the localhost development secret when nothing is configured', () => {
		delete process.env.AUTH_SECRET;

		expect(readAuthSecret(createEvent('http://localhost:5173/login'))).toBe(
			LOCAL_DEVELOPMENT_AUTH_SECRET
		);
	});

	it('returns null for non-local requests without any configured secret', () => {
		delete process.env.AUTH_SECRET;

		expect(readAuthSecret(createEvent('https://app.example.com/login'))).toBeNull();
	});
});

describe('request ids', () => {
	it('prefers an incoming request id header', () => {
		const request = new Request('https://app.example.com/profile', {
			headers: {
				'x-request-id': 'incoming-request-id'
			}
		});

		expect(createRequestId(request)).toBe('incoming-request-id');
	});

	it('adds an x-request-id response header during handle', async () => {
		const response = await handle({
			event: {
				request: new Request('https://app.example.com/profile'),
				url: new URL('https://app.example.com/profile'),
				platform: undefined,
				cookies: {
					get: () => undefined
				},
				locals: {}
			},
			resolve: async () => new Response('ok')
		} as unknown as Parameters<typeof handle>[0]);

		expect(response.headers.get('x-request-id')).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
		);
	});
});
