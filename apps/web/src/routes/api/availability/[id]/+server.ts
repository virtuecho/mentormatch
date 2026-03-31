import { json } from '@sveltejs/kit';
import { deleteAvailabilitySlot } from '@mentormatch/feature-availability';
import { handleApiError, requireApprovedMentor, requireDatabase } from '$lib/server/http';

export async function DELETE({ params, locals }) {
	try {
		const user = requireApprovedMentor(locals);
		await deleteAvailabilitySlot(requireDatabase(locals), user.id, Number(params.id));
		return json({ ok: true });
	} catch (error) {
		return handleApiError(error);
	}
}
