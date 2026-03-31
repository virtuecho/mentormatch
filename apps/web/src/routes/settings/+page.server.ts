import { fail, redirect } from '@sveltejs/kit';
import { changePassword, deleteAccount } from '@mentormatch/feature-auth';
import { AppError } from '@mentormatch/shared';
import { getProfile, toggleRole } from '@mentormatch/feature-profile';
import { clearSessionCookie, requireDatabase, requireUser } from '$lib/server/http';

export async function load({ locals }) {
	const user = requireUser(locals);
	return {
		profile: await getProfile(requireDatabase(locals), user.id)
	};
}

export const actions = {
	toggleRole: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const role = String(form.get('role') ?? '').trim();

		try {
			const result = await toggleRole(requireDatabase(locals), user.id, {
				role: role || undefined
			});

			return {
				section: 'role',
				success: true,
				message: `You are now in ${result.role} mode.`,
				role: result.role
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'role',
					message: error.message
				});
			}

			console.error(error);
			return fail(500, {
				section: 'role',
				message: 'Unable to update the role right now'
			});
		}
	},
	changePassword: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const currentPassword = String(form.get('currentPassword') ?? '');
		const newPassword = String(form.get('newPassword') ?? '');
		const confirmPassword = String(form.get('confirmPassword') ?? '');

		if (newPassword !== confirmPassword) {
			return fail(400, {
				section: 'password',
				message: 'Your new passwords do not match.'
			});
		}

		try {
			await changePassword(requireDatabase(locals), user.id, {
				currentPassword,
				newPassword
			});

			return {
				section: 'password',
				success: true,
				message: 'Your password has been updated.'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'password',
					message: error.message
				});
			}

			console.error(error);
			return fail(500, {
				section: 'password',
				message: 'Unable to update your password right now.'
			});
		}
	},
	deleteAccount: async ({ request, locals, cookies, url }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const confirmation = String(form.get('confirmation') ?? '').trim();

		if (confirmation !== 'DELETE') {
			return fail(400, {
				section: 'delete',
				message: 'Type DELETE to confirm account removal.'
			});
		}

		try {
			await deleteAccount(requireDatabase(locals), user.id, { password });
			clearSessionCookie(cookies, url);
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'delete',
					message: error.message
				});
			}

			console.error(error);
			return fail(500, {
				section: 'delete',
				message: 'Unable to delete your account right now.'
			});
		}

		throw redirect(303, '/');
	}
};
