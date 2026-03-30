import { redirect } from '@sveltejs/kit';

export function load({ params, url }) {
	throw redirect(307, `/mentor/${params.id}${url.search}`);
}
