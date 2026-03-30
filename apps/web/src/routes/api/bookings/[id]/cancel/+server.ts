import { json } from '@sveltejs/kit';
import { cancelBooking } from '@mentormatch/feature-bookings';
import { handleApiError, requireDatabase, requireUser } from '$lib/server/http';

export async function POST({ params, locals }) {
	try {
		const user = requireUser(locals);
		await cancelBooking(requireDatabase(locals), user.id, Number(params.id));
		return json({ ok: true });
	} catch (error) {
		return handleApiError(error);
	}
}
