import { json } from '@sveltejs/kit';
import { createAvailabilitySlot, getMyAvailability } from '@mentormatch/feature-availability';
import { handleApiError, requireDatabase, requireUser } from '$lib/server/http';

export async function GET({ locals }) {
	try {
		const user = requireUser(locals);
		const slots = await getMyAvailability(requireDatabase(locals), user.id);
		return json({ ok: true, slots });
	} catch (error) {
		return handleApiError(error);
	}
}

export async function POST({ request, locals }) {
	try {
		const user = requireUser(locals);
		const slot = await createAvailabilitySlot(
			requireDatabase(locals),
			user.id,
			await request.json()
		);
		return json({ ok: true, slot }, { status: 201 });
	} catch (error) {
		return handleApiError(error);
	}
}
