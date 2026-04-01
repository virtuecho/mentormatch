import { fail } from '@sveltejs/kit';
import {
	approveUserAsMentor,
	listUsersForAdmin,
	revokeMentorApproval
} from '@mentormatch/feature-profile';
import { AppError } from '@mentormatch/shared';
import { requireDatabase, requireRole } from '$lib/server/http';

export async function load({ locals }) {
	requireRole(locals, 'admin');
	const users = await listUsersForAdmin(requireDatabase(locals));

	return {
		users,
		admins: users.filter((user) => user.role === 'admin'),
		mentors: users.filter((user) => user.isMentorApproved),
		members: users.filter((user) => user.role !== 'admin' && !user.isMentorApproved)
	};
}

export const actions = {
	approveMentor: async ({ request, locals }) => {
		requireRole(locals, 'admin');
		const form = await request.formData();
		const userId = Number(form.get('userId'));

		try {
			await approveUserAsMentor(requireDatabase(locals), userId);
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

			console.error(error);
			return fail(500, {
				section: 'approveMentor',
				userId,
				message: 'Unable to update this member right now.'
			});
		}
	},
	revokeMentor: async ({ request, locals }) => {
		requireRole(locals, 'admin');
		const form = await request.formData();
		const userId = Number(form.get('userId'));

		try {
			await revokeMentorApproval(requireDatabase(locals), userId);
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

			console.error(error);
			return fail(500, {
				section: 'revokeMentor',
				userId,
				message: 'Unable to update this mentor right now.'
			});
		}
	}
};
