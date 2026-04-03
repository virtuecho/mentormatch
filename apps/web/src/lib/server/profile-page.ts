import type { DatabaseClient } from '@mentormatch/db';
import type { EducationRecord, ExperienceRecord } from '@mentormatch/shared';
import { adminUpdateUser, getProfile, updateProfile } from '@mentormatch/feature-profile';
import { parseRecordArray, parsePositiveUserId } from '$lib/server/form';
import { failWithFormError } from '$lib/server/http';

type SessionUser = NonNullable<App.Locals['user']>;

export function getManagedProfileTargetUserId(
	url: URL,
	viewer: SessionUser,
	form?: FormData
): number {
	if (viewer.role !== 'admin') {
		return viewer.id;
	}

	return (
		parsePositiveUserId(form?.get('targetUserId')) ??
		parsePositiveUserId(url.searchParams.get('userId')) ??
		viewer.id
	);
}

function buildProfileUpdatePayload(form: FormData) {
	const educations = parseRecordArray<EducationRecord>(form.get('educationsJson'));
	const experiences = parseRecordArray<ExperienceRecord>(form.get('experiencesJson'));

	return {
		fullName: String(form.get('fullName') ?? '').trim(),
		location: String(form.get('location') ?? '').trim() || null,
		phone: String(form.get('phone') ?? '').trim() || null,
		bio: String(form.get('bio') ?? '').trim() || null,
		profileImageUrl: String(form.get('profileImageUrl') ?? '').trim() || null,
		linkedinUrl: String(form.get('linkedinUrl') ?? '').trim() || null,
		instagramUrl: String(form.get('instagramUrl') ?? '').trim() || null,
		facebookUrl: String(form.get('facebookUrl') ?? '').trim() || null,
		websiteUrl: String(form.get('websiteUrl') ?? '').trim() || null,
		mentorSkills: String(form.get('mentorSkills') ?? '')
			.split(',')
			.map((skill) => skill.trim())
			.filter(Boolean),
		educations,
		experiences
	};
}

export async function loadProfilePage(db: DatabaseClient, user: SessionUser, url: URL) {
	const targetUserId = getManagedProfileTargetUserId(url, user);
	const isAdminManagingUser = user.role === 'admin' && targetUserId !== user.id;

	return {
		profile: await getProfile(db, targetUserId),
		isAdminManagingUser,
		canManageAsAdmin: user.role === 'admin',
		saveNotice:
			url.searchParams.get('updated') === '1'
				? isAdminManagingUser
					? 'User profile updated'
					: 'Profile updated'
				: null
	};
}

export async function handleProfileSaveAction(
	db: DatabaseClient,
	user: SessionUser,
	url: URL,
	form: FormData
) {
	const targetUserId = getManagedProfileTargetUserId(url, user, form);
	const payload = buildProfileUpdatePayload(form);

	try {
		if (user.role === 'admin') {
			await adminUpdateUser(db, targetUserId, payload);
		} else {
			await updateProfile(db, targetUserId, payload);
		}
	} catch (error) {
		return failWithFormError(error, 'Unable to update the profile right now', {});
	}

	return {
		targetUserId,
		managedByAdmin: user.role === 'admin' && targetUserId !== user.id
	};
}
