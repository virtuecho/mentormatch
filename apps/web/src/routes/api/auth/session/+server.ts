import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
	return json({ ok: true, user: locals.user });
}
