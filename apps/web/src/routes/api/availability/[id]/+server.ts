import { json } from '@sveltejs/kit';
import { deleteAvailabilitySlot } from '@mentormatch/feature-availability';
import { handleApiError, requireDatabase, requireUser } from '$lib/server/http';

export async function DELETE({ params, locals }) {
	try {
		const user = requireUser(locals);
		await deleteAvailabilitySlot(requireDatabase(locals), user.id, Number(params.id));
		return json({ ok: true });
	} catch (error) {
		return handleApiError(error);
	}
}
