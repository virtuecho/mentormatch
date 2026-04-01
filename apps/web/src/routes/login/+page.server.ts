import { fail, redirect } from '@sveltejs/kit';
import { loginUser } from '@mentormatch/feature-auth';
import { AppError, type SessionUser } from '@mentormatch/shared';
import { getDefaultAuthenticatedPath } from '$lib/navigation';
import { requireAuthSecret, requireDatabase, setSessionCookie } from '$lib/server/http';

function getRedirectTarget(url: URL, user: Pick<SessionUser, 'role' | 'isMentorApproved'>) {
	const requested = url.searchParams.get('redirect');
	if (requested && requested.startsWith('/')) {
		return requested;
	}

	return getDefaultAuthenticatedPath(user);
}

export const actions = {
	default: async ({ request, locals, cookies, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		let target: string;

		try {
			const session = await loginUser(
				requireDatabase(locals),
				{ email, password },
				requireAuthSecret(locals)
			);

			setSessionCookie(cookies, url, session.token);
			target = getRedirectTarget(url, session.user);
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					email,
					message: error.message
				});
			}

			console.error(error);
			return fail(500, {
				message: 'Unable to log in right now'
			});
		}

		throw redirect(303, target);
	}
};
