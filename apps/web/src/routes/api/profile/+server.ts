import { json } from '@sveltejs/kit';
import { getProfile, updateProfile } from '@mentormatch/feature-profile';
import { handleApiError, requireDatabase, requireUser } from '$lib/server/http';

export async function GET({ locals }) {
	try {
		const user = requireUser(locals);
		const profile = await getProfile(requireDatabase(locals), user.id);
		return json({ ok: true, profile });
	} catch (error) {
		return handleApiError(error);
	}
}

export async function PATCH({ request, locals }) {
	try {
		const user = requireUser(locals);
		const profile = await updateProfile(requireDatabase(locals), user.id, await request.json());
		return json({ ok: true, profile });
	} catch (error) {
		return handleApiError(error);
	}
}
