import { json } from '@sveltejs/kit';
import { clearSessionCookie, handleApiError } from '$lib/server/http';

export async function POST({ url, cookies }) {
	try {
		clearSessionCookie(cookies, url);
		return json({ ok: true, message: 'Logged out' });
	} catch (error) {
		return handleApiError(error);
	}
}
