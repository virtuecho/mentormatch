import { getProfile } from '@mentormatch/feature-profile';
import { requireDatabase, requireUser } from '$lib/server/http';

export async function load({ params, locals }) {
	const user = requireUser(locals);
	const isAdminView = user.role === 'admin';

	return {
		member: await getProfile(requireDatabase(locals), Number(params.id)),
		isAdminView
	};
}
