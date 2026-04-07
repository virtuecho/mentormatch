import { json } from '@sveltejs/kit';
import { createBooking, listBookings } from '@mentormatch/feature-bookings';
import { bookingListSchema } from '@mentormatch/shared';
import { handleApiError, requireDatabase, requireMember } from '$lib/server/http';

export async function GET({ url, locals }) {
	try {
		const user = requireMember(locals);
		const { role } = bookingListSchema.parse({ role: url.searchParams.get('role') });
		const bookings = await listBookings(requireDatabase(locals), user.id, role);
		return json({ ok: true, bookings });
	} catch (error) {
		return handleApiError(error);
	}
}

export async function POST({ request, locals }) {
	try {
		const user = requireMember(locals);
		const booking = await createBooking(requireDatabase(locals), user.id, await request.json());
		return json({ ok: true, booking }, { status: 201 });
	} catch (error) {
		return handleApiError(error);
	}
}
