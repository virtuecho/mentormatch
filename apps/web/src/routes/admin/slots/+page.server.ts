import { fail } from '@sveltejs/kit';
import {
	adminDeleteAvailabilitySlot,
	listAllAvailabilitySlots
} from '@mentormatch/feature-availability';
import { AppError } from '@mentormatch/shared';
import { requireDatabase, requireRole } from '$lib/server/http';

function parseMentorId(value: string | null) {
	if (!value) {
		return null;
	}

	const mentorId = Number(value);
	return Number.isInteger(mentorId) && mentorId > 0 ? mentorId : null;
}

export async function load({ locals, url }) {
	requireRole(locals, 'admin');
	const mentorId = parseMentorId(url.searchParams.get('mentorId'));

	return {
		selectedMentorId: mentorId,
		slots: await listAllAvailabilitySlots(requireDatabase(locals), { mentorId })
	};
}

export const actions = {
	deleteSlot: async ({ request, locals }) => {
		requireRole(locals, 'admin');
		const form = await request.formData();
		const slotId = Number(form.get('slotId'));

		try {
			await adminDeleteAvailabilitySlot(requireDatabase(locals), slotId);
			return {
				success: true,
				section: 'deleteSlot',
				slotId,
				message: 'Slot removed. Related booking requests were removed as well.'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'deleteSlot',
					slotId,
					message: error.message
				});
			}

			console.error(error);
			return fail(500, {
				section: 'deleteSlot',
				slotId,
				message: 'Unable to update this slot right now.'
			});
		}
	}
};
