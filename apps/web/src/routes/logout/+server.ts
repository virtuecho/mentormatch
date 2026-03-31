import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/http';

export function POST({ cookies, url }) {
	clearSessionCookie(cookies, url);
	throw redirect(303, '/');
}
