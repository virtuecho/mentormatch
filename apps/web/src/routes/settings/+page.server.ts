import { fail } from '@sveltejs/kit';
import { AppError } from '@mentormatch/shared';
import { getProfile, toggleRole } from '@mentormatch/feature-profile';
import { handleApiError, requireDatabase, requireUser } from '$lib/server/http';

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
				success: true,
				message: `Role switched to ${result.role}`,
				role: result.role
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					message: error.message
				});
			}

			handleApiError(error);
			return fail(500, {
				message: 'Unable to update the role right now'
			});
		}
	}
};
