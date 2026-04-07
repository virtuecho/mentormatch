import { redirect } from '@sveltejs/kit';
import {
	handleChangePasswordAction,
	handleDeleteAccountAction,
	handleToggleRoleAction,
	loadSettingsPage
} from '$lib/server/settings-page';
import { clearSessionCookie, requireDatabase, requireUser } from '$lib/server/http';

export async function load({ locals }) {
	const user = requireUser(locals);
	return loadSettingsPage(requireDatabase(locals), user.id);
}

export const actions = {
	toggleRole: async ({ request, locals }) => {
		const user = requireUser(locals);
		return handleToggleRoleAction(requireDatabase(locals), user, await request.formData());
	},
	changePassword: async ({ request, locals }) => {
		const user = requireUser(locals);
		return handleChangePasswordAction(requireDatabase(locals), user, await request.formData());
	},
	deleteAccount: async ({ request, locals, cookies, url }) => {
		const user = requireUser(locals);
		const result = await handleDeleteAccountAction(
			requireDatabase(locals),
			user,
			await request.formData()
		);

		if ('ok' in result && result.ok) {
			clearSessionCookie(cookies, url);
			throw redirect(303, '/');
		}

		return result;
	}
};
