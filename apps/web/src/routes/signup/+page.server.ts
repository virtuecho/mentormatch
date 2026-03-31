import { fail, redirect } from '@sveltejs/kit';
import { registerUser } from '@mentormatch/feature-auth';
import { AppError } from '@mentormatch/shared';
import { requireDatabase } from '$lib/server/http';

export const actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const fullName = String(form.get('fullName') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const confirmPassword = String(form.get('confirmPassword') ?? '');
		const agreeToTerms = form.get('agreeToTerms') === 'on';

		if (password !== confirmPassword) {
			return fail(400, {
				fullName,
				email,
				message: 'Passwords do not match.'
			});
		}

		if (!agreeToTerms) {
			return fail(400, {
				fullName,
				email,
				message: 'You must agree to the terms before creating your account.'
			});
		}

		try {
			await registerUser(requireDatabase(locals), {
				fullName,
				email,
				password
			});
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					fullName,
					email,
					message: error.message
				});
			}

			console.error(error);
			return fail(500, {
				fullName,
				email,
				message: 'Unable to create your account right now'
			});
		}

		const redirectTarget = url.searchParams.get('redirect');
		const target = redirectTarget?.startsWith('/') ? redirectTarget : '/login';
		throw redirect(303, target);
	}
};
