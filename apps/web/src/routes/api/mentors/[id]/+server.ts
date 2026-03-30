import { json } from '@sveltejs/kit';
import { getMentorProfile } from '@mentormatch/feature-mentors';
import { handleApiError, requireDatabase } from '$lib/server/http';

export async function GET({ params, locals }) {
	try {
		const mentor = await getMentorProfile(requireDatabase(locals), Number(params.id));
		return json({ ok: true, mentor });
	} catch (error) {
		return handleApiError(error);
	}
}
