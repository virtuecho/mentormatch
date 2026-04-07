import { fail } from '@sveltejs/kit';
import type { DatabaseClient } from '@mentormatch/db';
import { changePassword, deleteAccount } from '@mentormatch/feature-auth';
import { getProfile, toggleRole } from '@mentormatch/feature-profile';
import { formatLabel } from '@mentormatch/shared';
import { getFormString, getTrimmedFormString } from '$lib/server/form';
import { failWithFormError } from '$lib/server/http';

type SessionUser = NonNullable<App.Locals['user']>;

export async function loadSettingsPage(db: DatabaseClient, userId: number) {
	return {
		profile: await getProfile(db, userId)
	};
}

export async function handleToggleRoleAction(
	db: DatabaseClient,
	user: SessionUser,
	form: FormData
) {
	try {
		const result = await toggleRole(db, user.id, {
			role: getTrimmedFormString(form, 'role') || undefined
		});

		return {
			section: 'role',
			success: true,
			message: `You are now in ${formatLabel(result.role)} mode.`,
			role: result.role
		};
	} catch (error) {
		return failWithFormError(error, 'Unable to update the role right now', {
			section: 'role'
		});
	}
}

export async function handleChangePasswordAction(
	db: DatabaseClient,
	user: SessionUser,
	form: FormData
) {
	const currentPassword = getFormString(form, 'currentPassword');
	const newPassword = getFormString(form, 'newPassword');
	const confirmPassword = getFormString(form, 'confirmPassword');

	if (newPassword !== confirmPassword) {
		return fail(400, {
			section: 'password',
			message: 'Your new passwords do not match.'
		});
	}

	try {
		await changePassword(db, user.id, {
			currentPassword,
			newPassword
		});

		return {
			section: 'password',
			success: true,
			message: 'Your password has been updated.'
		};
	} catch (error) {
		return failWithFormError(error, 'Unable to update your password right now.', {
			section: 'password'
		});
	}
}

export async function handleDeleteAccountAction(
	db: DatabaseClient,
	user: SessionUser,
	form: FormData
) {
	const password = getFormString(form, 'password');
	const confirmation = getTrimmedFormString(form, 'confirmation');

	if (confirmation !== 'DELETE') {
		return fail(400, {
			section: 'delete',
			message: 'Type DELETE to confirm account removal.'
		});
	}

	try {
		await deleteAccount(db, user.id, { password });
		return { ok: true };
	} catch (error) {
		return failWithFormError(error, 'Unable to delete your account right now.', {
			section: 'delete'
		});
	}
}
