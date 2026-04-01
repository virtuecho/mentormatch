import { fail } from '@sveltejs/kit';
import { AppError, type EducationRecord, type ExperienceRecord } from '@mentormatch/shared';
import { adminUpdateUser, getProfile, updateProfile } from '@mentormatch/feature-profile';
import { getFormError, handleApiError, requireDatabase, requireUser } from '$lib/server/http';

function parseRecordArray<T>(value: FormDataEntryValue | null): T[] {
	if (typeof value !== 'string' || !value.trim()) {
		return [];
	}

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? (parsed as T[]) : [];
	} catch {
		return [];
	}
}

function getTargetUserId(url: URL, viewer: NonNullable<App.Locals['user']>): number {
	if (viewer.role !== 'admin') {
		return viewer.id;
	}

	const requestedUserId = Number(url.searchParams.get('userId') ?? viewer.id);
	return Number.isInteger(requestedUserId) && requestedUserId > 0 ? requestedUserId : viewer.id;
}

export async function load({ locals, url }) {
	const user = requireUser(locals);
	const targetUserId = getTargetUserId(url, user);
	return {
		profile: await getProfile(requireDatabase(locals), targetUserId),
		isAdminManagingUser: user.role === 'admin' && targetUserId !== user.id,
		canManageAsAdmin: user.role === 'admin'
	};
}

export const actions = {
	save: async ({ request, locals, url }) => {
		const user = requireUser(locals);
		const targetUserId = getTargetUserId(url, user);
		const form = await request.formData();

		const educations = parseRecordArray<EducationRecord>(form.get('educationsJson'));
		const experiences = parseRecordArray<ExperienceRecord>(form.get('experiencesJson'));
		const payload = {
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

		try {
			if (user.role === 'admin') {
				await adminUpdateUser(requireDatabase(locals), targetUserId, payload);
			} else {
				await updateProfile(requireDatabase(locals), targetUserId, payload);
			}

			return {
				success: true,
				message:
					user.role === 'admin' && targetUserId !== user.id
						? 'User profile updated'
						: 'Profile updated'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					message: error.message
				});
			}

			const formError = getFormError(error, 'Unable to update the profile right now');
			if (formError.status >= 500) {
				handleApiError(error);
			}
			return fail(formError.status, {
				message: formError.message
			});
		}
	}
};
