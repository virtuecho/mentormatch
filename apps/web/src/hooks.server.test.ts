import { afterEach, describe, expect, it } from 'vitest';
import { LOCAL_DEVELOPMENT_AUTH_SECRET, readAuthSecret } from './hooks.server';

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
