import { getProfile } from '@mentormatch/feature-profile';
import { requireDatabase, requireUser } from '$lib/server/http';

export async function load({ params, locals }) {
	const user = requireUser(locals);

	return {
		member: await getProfile(requireDatabase(locals), Number(params.id)),
		backHref: user.role === 'admin' ? '/admin/review' : '/mentor-bookings',
		backLabel: user.role === 'admin' ? 'Back to review queue' : 'Back to requests'
	};
}
