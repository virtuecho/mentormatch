import { json } from '@sveltejs/kit';
import { respondToBooking } from '@mentormatch/feature-bookings';
import { handleApiError, requireDatabase, requireRole } from '$lib/server/http';

export async function PATCH({ params, request, locals }) {
	try {
		const user = requireRole(locals, 'mentor');
		const result = await respondToBooking(
			requireDatabase(locals),
			user.id,
			Number(params.id),
			await request.json()
		);
		return json({ ok: true, ...result });
	} catch (error) {
		return handleApiError(error);
	}
}
