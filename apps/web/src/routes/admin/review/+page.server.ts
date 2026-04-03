import { fail } from '@sveltejs/kit';
import { AppError, formatLabel } from '@mentormatch/shared';
import { listAdminMentorRequests, reviewMentorRequestAsAdmin } from '@mentormatch/feature-admin';
import { requireDatabase, requirePermission } from '$lib/server/http';
import { getRequestLogContext, logError, logInfo } from '$lib/server/log';

export async function load({ locals, url }) {
	requirePermission(locals, 'admin:review_applications');
	const result = await listAdminMentorRequests(requireDatabase(locals), {
		q: url.searchParams.get('q') ?? '',
		status: url.searchParams.get('status') ?? 'all',
		sort: url.searchParams.get('sort') ?? 'status_then_submitted',
		page: url.searchParams.get('page') ?? '1'
	});

	return {
		requests: result.items,
		filters: result.filters,
		pagination: {
			page: result.page,
			pageSize: result.pageSize,
			total: result.total,
			totalPages: result.totalPages
		},
		summary: result.summary
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
