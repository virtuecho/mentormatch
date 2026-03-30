import type { Handle } from '@sveltejs/kit';
import { createD1Client } from '@mentormatch/db';
import { getSessionUser } from '@mentormatch/feature-auth';
import { SESSION_COOKIE_NAME } from '$lib/server/http';

function readAuthSecret(event: Parameters<Handle>[0]['event']): string | null {
	const envSecret = event.platform?.env?.AUTH_SECRET;
	if (typeof envSecret === 'string' && envSecret.trim()) {
		return envSecret;
	}

	if (typeof process !== 'undefined' && process.env.AUTH_SECRET?.trim()) {
		return process.env.AUTH_SECRET.trim();
	}

	return null;
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.db = event.platform?.env?.DB ? createD1Client(event.platform.env.DB) : null;
	event.locals.authSecret = readAuthSecret(event);
	event.locals.user =
		event.locals.db && event.locals.authSecret
			? await getSessionUser(
					event.locals.db,
					event.cookies.get(SESSION_COOKIE_NAME),
					event.locals.authSecret
				)
			: null;

	return resolve(event);
};
