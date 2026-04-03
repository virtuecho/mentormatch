import {
	handleCancelBookingAction,
	handleCompleteBookingAction,
	handleCreateSlotAction,
	handleDeleteSlotAction,
	handleRespondBookingAction,
	handleUpdateSlotAction,
	loadMentorBookingsPage
} from '$lib/server/mentor-bookings-page';
import { requireApprovedMentor, requireDatabase } from '$lib/server/http';

export async function load({ locals, url }) {
	const user = requireApprovedMentor(locals);
	return loadMentorBookingsPage(requireDatabase(locals), user.id, url);
}

export const actions = {
	respond: async ({ request, locals }) => {
		const user = requireApprovedMentor(locals);
		return handleRespondBookingAction(requireDatabase(locals), user, await request.formData());
	},
	cancel: async ({ request, locals }) => {
		const user = requireApprovedMentor(locals);
		return handleCancelBookingAction(requireDatabase(locals), user, await request.formData());
	},
	complete: async ({ request, locals }) => {
		const user = requireApprovedMentor(locals);
		return handleCompleteBookingAction(requireDatabase(locals), user, await request.formData());
	},
	createSlot: async ({ request, locals }) => {
		const user = requireApprovedMentor(locals);
		return handleCreateSlotAction(requireDatabase(locals), user, await request.formData());
	},
	updateSlot: async ({ request, locals }) => {
		const user = requireApprovedMentor(locals);
		return handleUpdateSlotAction(requireDatabase(locals), user, await request.formData());
	},
	deleteSlot: async ({ request, locals }) => {
		const user = requireApprovedMentor(locals);
		return handleDeleteSlotAction(requireDatabase(locals), user, await request.formData());
	}
};
