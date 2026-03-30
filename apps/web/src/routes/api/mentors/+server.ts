import { json } from '@sveltejs/kit';
import { listMentors } from '@mentormatch/feature-mentors';
import { handleApiError, requireDatabase } from '$lib/server/http';

export async function GET({ url, locals }) {
	try {
		const filters = {
			q: url.searchParams.get('q') ?? '',
			city: url.searchParams.get('city') ?? '',
			tag: url.searchParams.get('tag') ?? '',
			limit: url.searchParams.get('limit') ?? '12'
		};
		const mentors = await listMentors(requireDatabase(locals), locals.user?.id ?? null, filters);
		return json({ ok: true, mentors });
	} catch (error) {
		return handleApiError(error);
	}
}
