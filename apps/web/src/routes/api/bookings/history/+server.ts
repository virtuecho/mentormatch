import { json } from '@sveltejs/kit';
import { getBookingHistory } from '@mentormatch/feature-bookings';
import { bookingHistorySchema } from '@mentormatch/shared';
import { handleApiError, requireDatabase, requireUser } from '$lib/server/http';

export async function GET({ url, locals }) {
	try {
		const user = requireUser(locals);
		const { role } = bookingHistorySchema.parse({ role: url.searchParams.get('role') });
		const bookings = await getBookingHistory(requireDatabase(locals), user.id, role);
		return json({ ok: true, bookings });
	} catch (error) {
		return handleApiError(error);
	}
}
