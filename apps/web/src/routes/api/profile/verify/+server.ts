import { json } from '@sveltejs/kit';
import { submitMentorRequest } from '@mentormatch/feature-profile';
import { handleApiError, requireDatabase, requireUser } from '$lib/server/http';

export async function POST({ request, locals }) {
	try {
		const user = requireUser(locals);
		const payload = await request.json();
		await submitMentorRequest(requireDatabase(locals), user.id, payload);
		return json({ ok: true });
	} catch (error) {
		return handleApiError(error);
	}
}
