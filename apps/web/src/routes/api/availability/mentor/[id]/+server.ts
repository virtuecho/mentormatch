import { json } from '@sveltejs/kit';
import { getMentorAvailability } from '@mentormatch/feature-availability';
import { handleApiError, requireDatabase } from '$lib/server/http';

export async function GET({ params, locals }) {
	try {
		const slots = await getMentorAvailability(
			requireDatabase(locals),
			Number(params.id),
			locals.user?.id ?? null
		);
		return json({ ok: true, slots });
	} catch (error) {
		return handleApiError(error);
	}
}
