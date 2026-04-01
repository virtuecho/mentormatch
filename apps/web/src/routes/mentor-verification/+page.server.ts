import { fail } from '@sveltejs/kit';
import {
	AppError,
	type EducationRecord,
	type ExperienceRecord,
	type RecordStatus
} from '@mentormatch/shared';
import { getProfile, submitMentorRequest, updateProfile } from '@mentormatch/feature-profile';
import { getFormError, requireDatabase, requireUser } from '$lib/server/http';

const AVAILABLE_SKILLS = [
	'JavaScript',
	'Product Management',
	'UX Design',
	'Career Planning',
	'Leadership',
	'Data Analysis',
	'Marketing',
	'Startup Strategy'
];

const AVAILABLE_MENTORSHIP_AREAS = [
	'Interview Preparation',
	'Resume Review',
	'Leadership Coaching',
	'Career Transition',
	'Technical Growth',
	'Portfolio Feedback'
];

function parseArray(form: FormData, name: string) {
	return form
		.getAll(name)
		.map((value) => String(value).trim())
		.filter(Boolean);
}

function inferStartYear(experienceRange: string) {
	const currentYear = new Date().getFullYear();

	switch (experienceRange) {
		case '1-2':
			return currentYear - 2;
		case '3-5':
			return currentYear - 5;
		case '6-10':
			return currentYear - 10;
		case '10+':
			return currentYear - 10;
		default:
			return currentYear;
	}
}

function buildEducationRecords(existing: EducationRecord[], form: FormData): EducationRecord[] {
	const university = String(form.get('university') ?? '').trim();
	const degree = String(form.get('degree') ?? '').trim();
	const major = String(form.get('major') ?? '').trim();

	if (!university && !degree && !major) {
		return existing;
	}

	const currentYear = new Date().getFullYear();

	return [
		{
			id: existing[0]?.id ?? 1,
			university: university || existing[0]?.university || 'Unknown University',
			degree: degree || existing[0]?.degree || 'Degree',
			major: major || existing[0]?.major || 'General Studies',
			startYear: existing[0]?.startYear ?? currentYear,
			endYear: existing[0]?.endYear ?? null,
			status: (existing[0]?.status ?? 'on_going') as RecordStatus,
			logoUrl: existing[0]?.logoUrl ?? null,
			description: existing[0]?.description ?? null
		}
	];
}

function buildExperienceRecords(
	existing: ExperienceRecord[],
	form: FormData,
	expertise: string[]
): ExperienceRecord[] {
	const position = String(form.get('currentTitle') ?? '').trim();
	const company = String(form.get('company') ?? '').trim();
	const industry = String(form.get('industry') ?? '').trim();
	const experienceRange = String(form.get('experienceRange') ?? '').trim();

	if (!position && !company && !industry && !experienceRange && expertise.length === 0) {
		return existing;
	}

	return [
		{
			id: existing[0]?.id ?? 1,
			company: company || existing[0]?.company || 'Current Company',
			position: position || existing[0]?.position || 'Mentor',
			industry: industry || existing[0]?.industry || null,
			expertise: expertise.length > 0 ? expertise : (existing[0]?.expertise ?? []),
			startYear: existing[0]?.startYear ?? inferStartYear(experienceRange),
			endYear: null,
			status: 'on_going',
			description: existing[0]?.description ?? null
		}
	];
}

export async function load({ locals }) {
	const user = requireUser(locals);
	const profile = await getProfile(requireDatabase(locals), user.id);

	return {
		availableSkills: AVAILABLE_SKILLS,
		availableMentorshipAreas: AVAILABLE_MENTORSHIP_AREAS,
		profile
	};
}

export const actions = {
	submit: async ({ request, locals }) => {
		const user = requireUser(locals);
		const db = requireDatabase(locals);
		const form = await request.formData();
		const currentProfile = await getProfile(db, user.id);
		const expertise = parseArray(form, 'expertise');
		const mentorshipAreas = parseArray(form, 'mentorshipAreas');
		const documentUrl = String(form.get('documentUrl') ?? '').trim();
		const note = String(form.get('note') ?? '').trim();

		if (expertise.length === 0 || mentorshipAreas.length === 0) {
			return fail(400, {
				message: 'Select at least one skill and one mentorship area'
			});
		}

		try {
			await updateProfile(db, user.id, {
				fullName: String(form.get('fullName') ?? '').trim() || currentProfile.profile.fullName,
				location: currentProfile.profile.location ?? null,
				phone: String(form.get('phone') ?? '').trim() || (currentProfile.profile.phone ?? null),
				bio: String(form.get('bio') ?? '').trim() || (currentProfile.profile.bio ?? null),
				profileImageUrl: currentProfile.profile.profileImageUrl ?? null,
				linkedinUrl:
					String(form.get('linkedinUrl') ?? '').trim() ||
					(currentProfile.profile.linkedinUrl ?? null),
				instagramUrl: currentProfile.profile.instagramUrl ?? null,
				facebookUrl: currentProfile.profile.facebookUrl ?? null,
				websiteUrl: currentProfile.profile.websiteUrl ?? null,
				mentorSkills: [...new Set([...expertise, ...mentorshipAreas])],
				educations: buildEducationRecords(currentProfile.profile.educations, form),
				experiences: buildExperienceRecords(currentProfile.profile.experiences, form, expertise)
			});

			await submitMentorRequest(db, user.id, {
				documentUrl,
				note: [
					note,
					`Current title: ${String(form.get('currentTitle') ?? '').trim()}`,
					`Company: ${String(form.get('company') ?? '').trim()}`,
					`Experience: ${String(form.get('experienceRange') ?? '').trim()}`,
					`Mentorship areas: ${mentorshipAreas.join(', ')}`
				]
					.filter(Boolean)
					.join('\n')
			});

			return {
				success: true,
				message: 'Your mentor application has been sent to the MentorMatch team.'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					message: error.message
				});
			}

			const formError = getFormError(error, 'Unable to send your mentor application right now.');
			if (formError.status >= 500) {
				console.error(error);
			}
			return fail(formError.status, {
				message: formError.message
			});
		}
	}
};
