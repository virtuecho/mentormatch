import { json } from '@sveltejs/kit';
import { registerUser } from '@mentormatch/feature-auth';
import { handleApiError, requireDatabase } from '$lib/server/http';

export async function POST({ request, locals }) {
	try {
		const result = await registerUser(requireDatabase(locals), await request.json());
		return json({ ok: true, user: result.user }, { status: 201 });
	} catch (error) {
		return handleApiError(error);
	}
}
