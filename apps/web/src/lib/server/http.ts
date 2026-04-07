import { fail, json, type Cookies } from '@sveltejs/kit';
import { AppError, formatLabel, type UserRole } from '@mentormatch/shared';
import { ZodError } from 'zod';

export const SESSION_COOKIE_NAME = 'mentormatch_session';
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
type AppPermission = 'admin:review_applications' | 'admin:manage_users' | 'admin:manage_slots';

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

const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
	admin: ['admin:review_applications', 'admin:manage_users', 'admin:manage_slots'],
	mentor: [],
	mentee: []
};

export function requirePermission(locals: App.Locals, permission: AppPermission) {
	const user = requireUser(locals);

	if (!ROLE_PERMISSIONS[user.role].includes(permission)) {
		throw new AppError(403, 'forbidden', `Missing permission: ${permission}`);
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

function formatIssuePath(path: (string | number)[]) {
	if (path.length === 0) {
		return '';
	}

	const labelAliases: Record<string, string> = {
		educations: 'Education',
		experiences: 'Experience',
		mentorSkills: 'Skill'
	};
	const labels: string[] = [];

	for (const part of path) {
		if (typeof part === 'number') {
			const lastIndex = labels.length - 1;
			if (lastIndex >= 0) {
				labels[lastIndex] = `${labels[lastIndex]} ${part + 1}`;
			}
			continue;
		}

		const label = labelAliases[part] ?? formatLabel(part);
		if (label) {
			labels.push(label);
		}
	}

	return labels.join(' ');
}

export function getFormError(error: unknown, fallbackMessage: string) {
	if (error instanceof AppError) {
		return {
			status: error.status,
			message: error.message
		};
	}

	if (error instanceof ZodError) {
		const issue = error.issues[0];
		const pathLabel = formatIssuePath(
			issue?.path.filter(
				(part): part is string | number => typeof part === 'string' || typeof part === 'number'
			) ?? []
		);
		const message = issue?.message ?? 'Please review the form fields and try again.';

		return {
			status: 400,
			message:
				pathLabel && !message.toLowerCase().startsWith(pathLabel.toLowerCase())
					? `${pathLabel}: ${message}`
					: message
		};
	}

	console.error(error);
	return {
		status: 500,
		message: fallbackMessage
	};
}

export function failWithFormError<T extends Record<string, unknown>>(
	error: unknown,
	fallbackMessage: string,
	data: T
) {
	const formError = getFormError(error, fallbackMessage);
	return fail(formError.status, {
		...data,
		message: formError.message
	});
}
