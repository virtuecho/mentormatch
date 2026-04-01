import { fail } from '@sveltejs/kit';
import { listMentors } from '@mentormatch/feature-mentors';
import { revokeMentorApproval } from '@mentormatch/feature-profile';
import { AppError } from '@mentormatch/shared';
import { requireDatabase, requireRole } from '$lib/server/http';

export async function load({ locals }) {
	requireRole(locals, 'admin');

	return {
		mentors: await listMentors(requireDatabase(locals), null, {
			q: '',
			city: '',
			tag: '',
			limit: 200
		})
	};
}

export const actions = {
	revokeMentor: async ({ request, locals }) => {
		requireRole(locals, 'admin');
		const form = await request.formData();
		const mentorId = Number(form.get('mentorId'));

		try {
			await revokeMentorApproval(requireDatabase(locals), mentorId);
			return {
				success: true,
				section: 'revokeMentor',
				mentorId,
				message: 'Mentor access revoked. Upcoming slots were removed.'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'revokeMentor',
					mentorId,
					message: error.message
				});
			}

			console.error(error);
			return fail(500, {
				section: 'revokeMentor',
				mentorId,
				message: 'Unable to update this mentor right now.'
			});
		}
	}
};
