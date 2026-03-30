import { json } from '@sveltejs/kit';
import { loginUser } from '@mentormatch/feature-auth';
import {
	handleApiError,
	requireAuthSecret,
	requireDatabase,
	setSessionCookie
} from '$lib/server/http';

export async function POST({ request, locals, cookies }) {
	try {
		const session = await loginUser(
			requireDatabase(locals),
			await request.json(),
			requireAuthSecret(locals)
		);
		setSessionCookie(cookies, new URL(request.url), session.token);
		return json({ ok: true, user: session.user });
	} catch (error) {
		return handleApiError(error);
	}
}
