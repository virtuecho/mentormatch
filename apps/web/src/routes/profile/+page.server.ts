import { fail } from '@sveltejs/kit';
import { AppError, type EducationRecord, type ExperienceRecord } from '@mentormatch/shared';
import { getProfile, updateProfile } from '@mentormatch/feature-profile';
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

export async function load({ locals }) {
	const user = requireUser(locals);
	return {
		profile: await getProfile(requireDatabase(locals), user.id)
	};
}

export const actions = {
	save: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();

		const educations = parseRecordArray<EducationRecord>(form.get('educationsJson'));
		const experiences = parseRecordArray<ExperienceRecord>(form.get('experiencesJson'));

		try {
			await updateProfile(requireDatabase(locals), user.id, {
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
			});

			return {
				success: true,
				message: 'Profile updated'
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
