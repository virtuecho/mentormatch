import { redirect } from '@sveltejs/kit';
import { handleProfileSaveAction, loadProfilePage } from '$lib/server/profile-page';
import { requireDatabase, requireUser } from '$lib/server/http';

export async function load({ locals, url }) {
	const user = requireUser(locals);
	return loadProfilePage(requireDatabase(locals), user, url);
}

export const actions = {
	save: async ({ request, locals, url }) => {
		const user = requireUser(locals);
		const result = await handleProfileSaveAction(
			requireDatabase(locals),
			user,
			url,
			await request.formData()
		);

		if ('targetUserId' in result && result.managedByAdmin) {
			throw redirect(303, `/profile?userId=${result.targetUserId}&updated=1`);
		}

		return {
			success: true,
			message: 'Profile updated'
		};
	}
};
