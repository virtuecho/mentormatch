import { fail } from '@sveltejs/kit';
import {
	AppError,
	type EducationRecord,
	type ExperienceRecord,
	type RecordStatus
} from '@mentormatch/shared';
import {
	getProfile,
	submitMentorRequest,
	updateProfile,
	withdrawMentorRequest
} from '@mentormatch/feature-profile';
import { getFormError, requireDatabase, requireUser } from '$lib/server/http';

type ProfileData = Awaited<ReturnType<typeof getProfile>>;

function parseDelimitedList(value: string) {
	return value
		.split(/[\n,]/)
		.map((item) => item.trim())
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

function deriveExperienceRange(startYear: number | null | undefined) {
	if (!startYear) {
		return '';
	}

	const years = Math.max(1, new Date().getFullYear() - startYear);

	if (years <= 2) {
		return '1-2';
	}

	if (years <= 5) {
		return '3-5';
	}

	if (years <= 10) {
		return '6-10';
	}

	return '10+';
}

function parseApplicationNote(note: string | null | undefined) {
	const lines = (note ?? '')
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
	const mentorshipAreas: string[] = [];
	const freeformLines: string[] = [];

	for (const line of lines) {
		if (line.startsWith('Mentorship areas:')) {
			mentorshipAreas.push(...parseDelimitedList(line.replace('Mentorship areas:', '').trim()));
			continue;
		}

		if (
			line.startsWith('Current title:') ||
			line.startsWith('Company:') ||
			line.startsWith('Experience:')
		) {
			continue;
		}

		freeformLines.push(line);
	}

	return {
		mentorshipAreas: [...new Set(mentorshipAreas)].join(', '),
		note: freeformLines.join('\n')
	};
}

function buildApplicationDraft(profile: ProfileData) {
	const currentEducation = profile.profile.educations[0];
	const currentExperience = profile.profile.experiences[0];
	const parsedNote = parseApplicationNote(profile.profile.mentorRequest?.note);
	const professionalSkills =
		currentExperience?.expertise.length > 0
			? currentExperience.expertise
			: profile.profile.mentorSkills;
	const mentorshipAreas =
		parsedNote.mentorshipAreas ||
		profile.profile.mentorSkills.filter((skill) => !professionalSkills.includes(skill)).join(', ');

	return {
		fullName: profile.profile.fullName,
		phone: profile.profile.phone ?? '',
		linkedinUrl: profile.profile.linkedinUrl ?? '',
		experienceRange: deriveExperienceRange(currentExperience?.startYear),
		currentTitle: currentExperience?.position ?? '',
		company: currentExperience?.company ?? '',
		industry: currentExperience?.industry ?? '',
		professionalSkills: professionalSkills.join(', '),
		university: currentEducation?.university ?? '',
		degree: currentEducation?.degree ?? '',
		major: currentEducation?.major ?? '',
		bio: profile.profile.bio ?? '',
		mentorshipAreas,
		documentUrl: profile.profile.mentorRequest?.document_url ?? '',
		note: parsedNote.note
	};
}

function readApplicationValues(form: FormData) {
	return {
		fullName: String(form.get('fullName') ?? '').trim(),
		phone: String(form.get('phone') ?? '').trim(),
		linkedinUrl: String(form.get('linkedinUrl') ?? '').trim(),
		experienceRange: String(form.get('experienceRange') ?? '').trim(),
		currentTitle: String(form.get('currentTitle') ?? '').trim(),
		company: String(form.get('company') ?? '').trim(),
		industry: String(form.get('industry') ?? '').trim(),
		professionalSkills: String(form.get('professionalSkills') ?? '').trim(),
		university: String(form.get('university') ?? '').trim(),
		degree: String(form.get('degree') ?? '').trim(),
		major: String(form.get('major') ?? '').trim(),
		bio: String(form.get('bio') ?? '').trim(),
		mentorshipAreas: String(form.get('mentorshipAreas') ?? '').trim(),
		documentUrl: String(form.get('documentUrl') ?? '').trim(),
		note: String(form.get('note') ?? '').trim()
	};
}

function buildEducationRecords(
	existing: EducationRecord[],
	values: ReturnType<typeof readApplicationValues>
) {
	const { university, degree, major } = values;

	if (!university && !degree && !major) {
		return existing;
	}

	const currentYear = new Date().getFullYear();

	return [
		{
			id: existing[0]?.id ?? 1,
			university: university || existing[0]?.university || '',
			degree: degree || existing[0]?.degree || '',
			major: major || existing[0]?.major || '',
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
	values: ReturnType<typeof readApplicationValues>,
	professionalSkills: string[]
) {
	const currentExperience = existing[0];
	const hasExperienceDetails = Boolean(
		values.currentTitle || values.company || values.industry || values.experienceRange
	);

	if (!hasExperienceDetails) {
		if (!currentExperience || professionalSkills.length === 0) {
			return existing;
		}

		return [
			{
				...currentExperience,
				expertise: professionalSkills
			}
		];
	}

	return [
		{
			id: currentExperience?.id ?? 1,
			company: values.company || currentExperience?.company || '',
			position: values.currentTitle || currentExperience?.position || '',
			industry: values.industry || currentExperience?.industry || null,
			expertise:
				professionalSkills.length > 0 ? professionalSkills : (currentExperience?.expertise ?? []),
			startYear: values.experienceRange
				? inferStartYear(values.experienceRange)
				: (currentExperience?.startYear ?? new Date().getFullYear()),
			endYear: null,
			status: 'on_going',
			description: currentExperience?.description ?? null
		}
	];
}

export async function load({ locals }) {
	const user = requireUser(locals);
	const profile = await getProfile(requireDatabase(locals), user.id);

	return {
		profile,
		applicationDraft: buildApplicationDraft(profile)
	};
}

export const actions = {
	submit: async ({ request, locals }) => {
		const user = requireUser(locals);
		const db = requireDatabase(locals);
		const form = await request.formData();
		const values = readApplicationValues(form);
		const currentProfile = await getProfile(db, user.id);
		const professionalSkills = [...new Set(parseDelimitedList(values.professionalSkills))];
		const mentorshipAreas = [...new Set(parseDelimitedList(values.mentorshipAreas))];
		const combinedMentorSkills = [...new Set([...professionalSkills, ...mentorshipAreas])];
		const applicationNote = [
			values.note || null,
			values.currentTitle ? `Current title: ${values.currentTitle}` : null,
			values.company ? `Company: ${values.company}` : null,
			values.experienceRange ? `Experience: ${values.experienceRange}` : null,
			mentorshipAreas.length > 0 ? `Mentorship areas: ${mentorshipAreas.join(', ')}` : null
		]
			.filter(Boolean)
			.join('\n');

		try {
			await updateProfile(db, user.id, {
				fullName: values.fullName || currentProfile.profile.fullName,
				location: currentProfile.profile.location ?? null,
				phone: values.phone || (currentProfile.profile.phone ?? null),
				bio: values.bio || (currentProfile.profile.bio ?? null),
				profileImageUrl: currentProfile.profile.profileImageUrl ?? null,
				linkedinUrl: values.linkedinUrl || (currentProfile.profile.linkedinUrl ?? null),
				instagramUrl: currentProfile.profile.instagramUrl ?? null,
				facebookUrl: currentProfile.profile.facebookUrl ?? null,
				websiteUrl: currentProfile.profile.websiteUrl ?? null,
				mentorSkills: combinedMentorSkills,
				educations: buildEducationRecords(currentProfile.profile.educations, values),
				experiences: buildExperienceRecords(
					currentProfile.profile.experiences,
					values,
					professionalSkills
				)
			});

			await submitMentorRequest(db, user.id, {
				documentUrl: values.documentUrl || null,
				note: applicationNote || null
			});

			return {
				section: 'submit',
				success: true,
				message: 'Your mentor application has been sent to the MentorMatch team.'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'submit',
					values,
					message: error.message
				});
			}

			const formError = getFormError(error, 'Unable to send your mentor application right now.');
			if (formError.status >= 500) {
				console.error(error);
			}
			return fail(formError.status, {
				section: 'submit',
				values,
				message: formError.message
			});
		}
	},
	withdraw: async ({ locals }) => {
		const user = requireUser(locals);

		try {
			await withdrawMentorRequest(requireDatabase(locals), user.id);
			return {
				section: 'withdraw',
				success: true,
				message: 'Your mentor application has been withdrawn.'
			};
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, {
					section: 'withdraw',
					message: error.message
				});
			}

			const formError = getFormError(
				error,
				'Unable to withdraw your mentor application right now.'
			);
			if (formError.status >= 500) {
				console.error(error);
			}
			return fail(formError.status, {
				section: 'withdraw',
				message: formError.message
			});
		}
	}
};
