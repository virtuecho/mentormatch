import { fail } from '@sveltejs/kit';
import { AppError, formatLabel } from '@mentormatch/shared';
import { listMentorRequests, reviewMentorRequest } from '@mentormatch/feature-profile';
import { requireDatabase, requireRole } from '$lib/server/http';

export async function load({ locals }) {
	requireRole(locals, 'admin');

	return {
		requests: await listMentorRequests(requireDatabase(locals))
	};
}

export const actions = {
	review: async ({ request, locals }) => {
		requireRole(locals, 'admin');
		const form = await request.formData();
		const requestId = Number(form.get('requestId'));
		const status = String(form.get('status') ?? '');

		try {
			const result = await reviewMentorRequest(requireDatabase(locals), requestId, { status });
			return {
				success: true,
				message: `Application ${formatLabel(result.status)}.`
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					message: error.message
				});
			}

			console.error(error);
			return fail(500, {
				message: 'Unable to review this application right now.'
			});
		}
	}
};
