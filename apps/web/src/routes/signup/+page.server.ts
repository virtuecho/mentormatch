import { fail, redirect } from '@sveltejs/kit';
import { registerUser } from '@mentormatch/feature-auth';
import { AppError } from '@mentormatch/shared';
import { handleApiError, requireDatabase } from '$lib/server/http';

export const actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const fullName = String(form.get('fullName') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const confirmPassword = String(form.get('confirmPassword') ?? '');
		const role = String(form.get('role') ?? 'mentee');
		const agreeToTerms = form.get('agreeToTerms') === 'on';

		if (password !== confirmPassword) {
			return fail(400, {
				fullName,
				email,
				role,
				message: 'Passwords do not match'
			});
		}

		if (!agreeToTerms) {
			return fail(400, {
				fullName,
				email,
				role,
				message: 'You must agree to the terms before signing up'
			});
		}

		try {
			await registerUser(requireDatabase(locals), {
				fullName,
				email,
				password,
				role
			});

			const redirectTarget = url.searchParams.get('redirect');
			const target = redirectTarget?.startsWith('/') ? redirectTarget : '/login';
			throw redirect(303, target);
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					fullName,
					email,
					role,
					message: error.message
				});
			}

			handleApiError(error);
			return fail(500, {
				fullName,
				email,
				role,
				message: 'Unable to create your account right now'
			});
		}
	}
};
