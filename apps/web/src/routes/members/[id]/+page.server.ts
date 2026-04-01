import { getProfile } from '@mentormatch/feature-profile';
import { requireDatabase, requireMember } from '$lib/server/http';

export async function load({ params, locals }) {
	requireMember(locals);

	return {
		member: await getProfile(requireDatabase(locals), Number(params.id))
	};
}
