import { fail } from '@sveltejs/kit';
import { cancelBooking, listBookings } from '@mentormatch/feature-bookings';
import { AppError } from '@mentormatch/shared';
import { handleApiError, requireDatabase, requireRole } from '$lib/server/http';

export async function load({ locals }) {
	const user = requireRole(locals, 'mentee');

	return {
		bookings: await listBookings(requireDatabase(locals), user.id, 'mentee')
	};
}

export const actions = {
	cancel: async ({ request, locals }) => {
		const user = requireRole(locals, 'mentee');
		const form = await request.formData();
		const bookingId = Number(form.get('bookingId'));

		try {
			await cancelBooking(requireDatabase(locals), user.id, bookingId);
			return {
				success: true,
				message: 'Booking cancelled'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					message: error.message
				});
			}

			handleApiError(error);
			return fail(500, {
				message: 'Unable to cancel the booking right now'
			});
		}
	}
};
