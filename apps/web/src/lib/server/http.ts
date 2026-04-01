import { json, type Cookies } from '@sveltejs/kit';
import { AppError, type UserRole } from '@mentormatch/shared';
import { ZodError } from 'zod';

export const SESSION_COOKIE_NAME = 'mentormatch_session';
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function requireDatabase(locals: App.Locals) {
	if (!locals.db) {
		throw new AppError(503, 'missing_database_binding', 'Database binding is not configured');
	}

	return locals.db;
}

export function requireAuthSecret(locals: App.Locals) {
	if (!locals.authSecret) {
		throw new AppError(500, 'missing_auth_secret', 'AUTH_SECRET is not configured');
	}

	return locals.authSecret;
}

export function requireUser(locals: App.Locals) {
	if (!locals.user) {
		throw new AppError(401, 'unauthorized', 'Authentication required');
	}

	return locals.user;
}

export function requireRole(locals: App.Locals, role: UserRole) {
	const user = requireUser(locals);

	if (user.role !== role) {
		throw new AppError(403, 'forbidden', `This action requires the ${role} role`);
	}

	return user;
}

export function requireMember(locals: App.Locals) {
	const user = requireUser(locals);

	if (user.role === 'admin') {
		throw new AppError(403, 'forbidden', 'Admin accounts cannot use member booking flows');
	}

	return user;
}

export function requireApprovedMentor(locals: App.Locals) {
	const user = requireMember(locals);

	if (!user.isMentorApproved) {
		throw new AppError(403, 'mentor_approval_required', 'Mentor approval required');
	}

	return user;
}

function getSessionCookieOptions(url: URL) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: url.protocol === 'https:',
		maxAge: SESSION_COOKIE_MAX_AGE_SECONDS
	};
}

export function setSessionCookie(cookies: Pick<Cookies, 'set'>, url: URL, token: string) {
	cookies.set(SESSION_COOKIE_NAME, token, {
		...getSessionCookieOptions(url)
	});
}

export function clearSessionCookie(cookies: Pick<Cookies, 'delete'>, url: URL) {
	cookies.delete(SESSION_COOKIE_NAME, getSessionCookieOptions(url));
}

export function handleApiError(error: unknown) {
	if (error instanceof AppError) {
		return json({ ok: false, error: error.message, code: error.code }, { status: error.status });
	}

	console.error(error);
	return json(
		{ ok: false, error: 'Internal server error', code: 'internal_server_error' },
		{ status: 500 }
	);
}

export function getFormError(error: unknown, fallbackMessage: string) {
	if (error instanceof AppError) {
		return {
			status: error.status,
			message: error.message
		};
	}

	if (error instanceof ZodError) {
		return {
			status: 400,
			message: error.issues[0]?.message ?? 'Please review the form fields and try again.'
		};
	}

	console.error(error);
	return {
		status: 500,
		message: fallbackMessage
	};
}
