import { fail } from '@sveltejs/kit';
import {
	deleteAvailabilitySlotAsAdmin,
	listAdminAvailabilitySlots
} from '@mentormatch/feature-admin';
import { AppError } from '@mentormatch/shared';
import { requireDatabase, requirePermission } from '$lib/server/http';
import { getRequestLogContext, logError, logInfo } from '$lib/server/log';

function parseMentorId(value: string | null) {
	if (!value) {
		return null;
	}

	const mentorId = Number(value);
	return Number.isInteger(mentorId) && mentorId > 0 ? mentorId : null;
}

export async function load({ locals, url }) {
	requirePermission(locals, 'admin:manage_slots');
	const mentorId = parseMentorId(url.searchParams.get('mentorId'));

	return {
		selectedMentorId: mentorId,
		slots: await listAdminAvailabilitySlots(requireDatabase(locals), { mentorId })
	};
}

export const actions = {
	deleteSlot: async ({ request, locals }) => {
		const admin = requirePermission(locals, 'admin:manage_slots');
		const form = await request.formData();
		const slotId = Number(form.get('slotId'));

		try {
			await deleteAvailabilitySlotAsAdmin(
				requireDatabase(locals),
				{ id: admin.id, requestId: locals.requestId },
				slotId
			);
			logInfo(
				'admin_delete_slot_succeeded',
				getRequestLogContext(locals, { targetSlotId: slotId })
			);
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

			logError(
				'admin_delete_slot_failed',
				error,
				getRequestLogContext(locals, { targetSlotId: slotId })
			);
			return fail(500, {
				section: 'deleteSlot',
				slotId,
				message: 'Unable to update this slot right now.'
			});
		}
	}
};
