import { fail } from '@sveltejs/kit';
import {
	approveMentorAsAdmin,
	listAdminUsers,
	revokeMentorAsAdmin
} from '@mentormatch/feature-admin';
import { AppError } from '@mentormatch/shared';
import { requireDatabase, requirePermission } from '$lib/server/http';
import { getRequestLogContext, logError, logInfo } from '$lib/server/log';

export async function load({ locals, url }) {
	requirePermission(locals, 'admin:manage_users');
	const result = await listAdminUsers(requireDatabase(locals), {
		q: url.searchParams.get('q') ?? '',
		role: url.searchParams.get('role') ?? 'all',
		sort: url.searchParams.get('sort') ?? 'role_then_name',
		page: url.searchParams.get('page') ?? '1'
	});

	return {
		users: result.items,
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
	approveMentor: async ({ request, locals }) => {
		const admin = requirePermission(locals, 'admin:manage_users');
		const form = await request.formData();
		const userId = Number(form.get('userId'));

		try {
			await approveMentorAsAdmin(
				requireDatabase(locals),
				{ id: admin.id, requestId: locals.requestId },
				userId
			);
			logInfo(
				'admin_approve_mentor_succeeded',
				getRequestLogContext(locals, { targetUserId: userId })
			);
			return {
				success: true,
				section: 'approveMentor',
				userId,
				message: 'Mentor access granted.'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'approveMentor',
					userId,
					message: error.message
				});
			}

			logError(
				'admin_approve_mentor_failed',
				error,
				getRequestLogContext(locals, { targetUserId: userId })
			);
			return fail(500, {
				section: 'approveMentor',
				userId,
				message: 'Unable to update this member right now.'
			});
		}
	},
	revokeMentor: async ({ request, locals }) => {
		const admin = requirePermission(locals, 'admin:manage_users');
		const form = await request.formData();
		const userId = Number(form.get('userId'));

		try {
			await revokeMentorAsAdmin(
				requireDatabase(locals),
				{ id: admin.id, requestId: locals.requestId },
				userId
			);
			logInfo(
				'admin_revoke_mentor_succeeded',
				getRequestLogContext(locals, { targetUserId: userId })
			);
			return {
				success: true,
				section: 'revokeMentor',
				userId,
				message: 'Mentor access revoked. Upcoming slots were removed.'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'revokeMentor',
					userId,
					message: error.message
				});
			}

			logError(
				'admin_revoke_mentor_failed',
				error,
				getRequestLogContext(locals, { targetUserId: userId })
			);
			return fail(500, {
				section: 'revokeMentor',
				userId,
				message: 'Unable to update this mentor right now.'
			});
		}
	}
};
