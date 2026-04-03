import { fail } from '@sveltejs/kit';
import { AppError, formatLabel } from '@mentormatch/shared';
import { listAdminMentorRequests, reviewMentorRequestAsAdmin } from '@mentormatch/feature-admin';
import { requireDatabase, requirePermission } from '$lib/server/http';
import { getRequestLogContext, logError, logInfo } from '$lib/server/log';

export async function load({ locals }) {
	requirePermission(locals, 'admin:review_applications');

	return {
		requests: await listAdminMentorRequests(requireDatabase(locals))
	};
}

export const actions = {
	review: async ({ request, locals }) => {
		const admin = requirePermission(locals, 'admin:review_applications');
		const form = await request.formData();
		const requestId = Number(form.get('requestId'));
		const status = String(form.get('status') ?? '');

		try {
			const result = await reviewMentorRequestAsAdmin(
				requireDatabase(locals),
				{ id: admin.id, requestId: locals.requestId },
				requestId,
				{ status }
			);
			logInfo(
				'admin_review_mentor_request_succeeded',
				getRequestLogContext(locals, { targetRequestId: requestId, status: result.status })
			);
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

			logError(
				'admin_review_mentor_request_failed',
				error,
				getRequestLogContext(locals, { targetRequestId: requestId, status })
			);
			return fail(500, {
				message: 'Unable to review this application right now.'
			});
		}
	}
};
