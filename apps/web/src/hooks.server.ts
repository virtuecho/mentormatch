import type { Handle } from '@sveltejs/kit';
import { createD1Client } from '@mentormatch/db';
import { getSessionUser } from '@mentormatch/feature-auth';
import { SESSION_COOKIE_NAME } from '$lib/server/http';

const LOCAL_AUTH_HOSTNAMES = new Set(['127.0.0.1', '0.0.0.0', '::1', 'localhost']);
export const LOCAL_DEVELOPMENT_AUTH_SECRET = 'mentormatch-local-development-secret';

function isLocalRequest(url: URL): boolean {
	return LOCAL_AUTH_HOSTNAMES.has(url.hostname);
}

export function readAuthSecret(event: Parameters<Handle>[0]['event']): string | null {
	const envSecret = event.platform?.env?.AUTH_SECRET;
	if (typeof envSecret === 'string' && envSecret.trim()) {
		return envSecret.trim();
	}

	if (typeof process !== 'undefined' && process.env.AUTH_SECRET?.trim()) {
		return process.env.AUTH_SECRET.trim();
	}

	// Keep localhost auth flows usable during local development and preview.
	if (isLocalRequest(event.url)) {
		return LOCAL_DEVELOPMENT_AUTH_SECRET;
	}

	return null;
}

export function createRequestId(request: Request) {
	return request.headers.get('x-request-id')?.trim() || crypto.randomUUID();
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId = createRequestId(event.request);
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

	const response = await resolve(event);
	response.headers.set('x-request-id', event.locals.requestId);
	return response;
};
