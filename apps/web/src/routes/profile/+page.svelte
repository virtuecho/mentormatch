<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		DEFAULT_AVATAR,
		formatLabel,
		type EducationRecord,
		type ExperienceRecord,
		type RecordStatus
	} from '@mentormatch/shared';
	import { PageHeader, Panel, TagList } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

	type EducationDraft = {
		id?: number;
		university: string;
		degree: string;
		major: string;
		startYear: number;
		endYear: number | '';
		status: RecordStatus;
		logoUrl: string;
		description: string;
	};

	type ExperienceDraft = {
		id?: number;
		company: string;
		position: string;
		industry: string;
		expertiseText: string;
		startYear: number;
		endYear: number | '';
		status: RecordStatus;
		description: string;
	};

	let { data, form } = $props();

	const currentYear = new Date().getFullYear();
	const recordStatuses = [
		{ value: 'on_going', label: 'Ongoing' },
		{ value: 'completed', label: 'Completed' }
	] as const;

	function getEditableProfileImageUrl(profileImageUrl: string) {
		return profileImageUrl === DEFAULT_AVATAR ? '' : profileImageUrl;
	}

	function toEducationDraft(record: EducationRecord): EducationDraft {
		return {
			id: record.id,
			university: record.university,
			degree: record.degree,
			major: record.major,
			startYear: record.startYear,
			endYear: record.endYear ?? '',
			status: record.status,
			logoUrl: record.logoUrl ?? '',
			description: record.description ?? ''
		};
	}

	function toExperienceDraft(record: ExperienceRecord): ExperienceDraft {
		return {
			id: record.id,
			company: record.company,
			position: record.position,
			industry: record.industry ?? '',
			expertiseText: record.expertise.join(', '),
			startYear: record.startYear,
			endYear: record.endYear ?? '',
			status: record.status,
			description: record.description ?? ''
		};
	}

	function createEducationDraft(): EducationDraft {
		return {
			university: '',
			degree: '',
			major: '',
			startYear: currentYear,
			endYear: '',
			status: 'on_going',
			logoUrl: '',
			description: ''
		};
	}

	function createExperienceDraft(): ExperienceDraft {
		return {
			company: '',
			position: '',
			industry: '',
			expertiseText: '',
			startYear: currentYear,
			endYear: '',
			status: 'on_going',
			description: ''
		};
	}

	function serializeEducations(records: EducationDraft[]): EducationRecord[] {
		return records
			.filter(
				(record) =>
					record.university.trim() ||
					record.degree.trim() ||
					record.major.trim() ||
					record.logoUrl.trim() ||
					record.description.trim()
			)
			.map((record) => ({
				...(record.id ? { id: record.id } : {}),
				university: record.university.trim(),
				degree: record.degree.trim(),
				major: record.major.trim(),
				startYear: Number(record.startYear),
				endYear: record.endYear === '' ? null : Number(record.endYear),
				status: record.status,
				logoUrl: record.logoUrl.trim() || null,
				description: record.description.trim() || null
			}));
	}

	function serializeExperiences(records: ExperienceDraft[]): ExperienceRecord[] {
		return records
			.filter(
				(record) =>
					record.company.trim() ||
					record.position.trim() ||
					record.industry.trim() ||
					record.expertiseText.trim() ||
					record.description.trim()
			)
			.map((record) => ({
				...(record.id ? { id: record.id } : {}),
				company: record.company.trim(),
				position: record.position.trim(),
				industry: record.industry.trim() || null,
				expertise: record.expertiseText
					.split(',')
					.map((value) => value.trim())
					.filter(Boolean),
				startYear: Number(record.startYear),
				endYear: record.endYear === '' ? null : Number(record.endYear),
				status: record.status,
				description: record.description.trim() || null
			}));
	}

	let educations = $state<EducationDraft[]>([]);
	let experiences = $state<ExperienceDraft[]>([]);

	$effect(() => {
		educations =
			data.profile.profile.educations.length > 0
				? data.profile.profile.educations.map(toEducationDraft)
				: [];
		experiences =
			data.profile.profile.experiences.length > 0
				? data.profile.profile.experiences.map(toExperienceDraft)
				: [];
	});

	function addEducation() {
		educations = [...educations, createEducationDraft()];
	}

	function removeEducation(index: number) {
		educations = educations.filter((_, currentIndex) => currentIndex !== index);
	}

	function addExperience() {
		experiences = [...experiences, createExperienceDraft()];
	}

	function removeExperience(index: number) {
		experiences = experiences.filter((_, currentIndex) => currentIndex !== index);
	}

	const serializedEducations = $derived(JSON.stringify(serializeEducations(educations)));
	const serializedExperiences = $derived(JSON.stringify(serializeExperiences(experiences)));
</script>

<div class="page">
	<PageHeader
		eyebrow={data.isAdminManagingUser ? 'Admin' : 'Profile'}
		title={data.isAdminManagingUser
			? `Manage ${data.profile.profile.fullName}`
			: data.profile.profile.fullName}
		description={data.isAdminManagingUser
			? 'Update this user’s public profile information. Login email and password remain private to the user.'
			: (data.profile.profile.bio ??
				'Keep your profile up to date so people know how you can help.')}
	/>

	{#if data.isAdminManagingUser}
		<div class="cta-row">
			<a class="button secondary" href={resolve('/admin/mentors')}>Back to user management</a>
		</div>
	{/if}

	<div class="split">
		<Panel title="Profile at a glance">
			<div class="stack">
				<div class="mentor-card-header">
					<ProfileAvatar
						name={data.profile.profile.fullName}
						src={data.profile.profile.profileImageUrl}
						size="lg"
					/>
					<div class="stack compact">
						<h3>{data.profile.profile.fullName}</h3>
						<p>
							{data.profile.profile.bio ?? 'Add a short intro so people know how you can help.'}
						</p>
					</div>
				</div>
				<p><strong>Email:</strong> {data.profile.email}</p>
				<p><strong>Role:</strong> {formatLabel(data.profile.role)}</p>
				<p><strong>Location:</strong> {data.profile.profile.location ?? 'Not set'}</p>
				<p><strong>Phone:</strong> {data.profile.profile.phone ?? 'Not set'}</p>
				{#if data.canManageAsAdmin}
					<p class="subtle">
						Admins can edit profile fields here, but not login email or password.
					</p>
				{/if}
				<TagList tags={data.profile.profile.mentorSkills} />
			</div>
		</Panel>

		<Panel title="What people can see">
			<div class="stack">
				<p>
					Add your education, experience, and links so mentors and mentees can understand your
					background.
				</p>
				{#if data.canManageAsAdmin}
					<p>
						Admin edits here are limited to public profile information and mentor-related details.
					</p>
				{:else}
					<p>
						Your mentor application can reuse this profile, so keeping it complete here saves you
						work later.
					</p>
				{/if}
			</div>
		</Panel>
	</div>

	<form class="stack" method="POST" action="?/save">
		<input type="hidden" name="educationsJson" value={serializedEducations} />
		<input type="hidden" name="experiencesJson" value={serializedExperiences} />

		<Panel title="Edit profile">
			<div class="form-grid">
				<div class="split">
					<div class="field">
						<label for="fullName">Full name</label>
						<input
							id="fullName"
							name="fullName"
							type="text"
							value={data.profile.profile.fullName}
							required
						/>
					</div>
					<div class="field">
						<label for="location">Location</label>
						<input
							id="location"
							name="location"
							type="text"
							value={data.profile.profile.location ?? ''}
						/>
					</div>
				</div>

				<div class="split">
					<div class="field">
						<label for="phone">Phone</label>
						<input id="phone" name="phone" type="text" value={data.profile.profile.phone ?? ''} />
					</div>
					<div class="field">
						<label for="profileImageUrl">Profile image URL</label>
						<input
							id="profileImageUrl"
							name="profileImageUrl"
							type="text"
							inputmode="url"
							autocomplete="url"
							value={getEditableProfileImageUrl(data.profile.profile.profileImageUrl)}
							placeholder="images.example.com/photo.jpg"
						/>
					</div>
				</div>

				<div class="field">
					<label for="bio">Bio</label>
					<textarea id="bio" name="bio">{data.profile.profile.bio ?? ''}</textarea>
				</div>

				<p class="subtle field-note">You can paste links with or without https://.</p>

				<div class="split">
					<div class="field">
						<label for="linkedinUrl">LinkedIn URL</label>
						<input
							id="linkedinUrl"
							name="linkedinUrl"
							type="text"
							inputmode="url"
							autocomplete="url"
							value={data.profile.profile.linkedinUrl ?? ''}
							placeholder="linkedin.com/in/your-name"
						/>
					</div>
					<div class="field">
						<label for="websiteUrl">Website URL</label>
						<input
							id="websiteUrl"
							name="websiteUrl"
							type="text"
							inputmode="url"
							autocomplete="url"
							value={data.profile.profile.websiteUrl ?? ''}
							placeholder="your-site.com"
						/>
					</div>
				</div>

				<div class="split">
					<div class="field">
						<label for="instagramUrl">Instagram URL</label>
						<input
							id="instagramUrl"
							name="instagramUrl"
							type="text"
							inputmode="url"
							autocomplete="url"
							value={data.profile.profile.instagramUrl ?? ''}
							placeholder="instagram.com/your-name"
						/>
					</div>
					<div class="field">
						<label for="facebookUrl">Facebook URL</label>
						<input
							id="facebookUrl"
							name="facebookUrl"
							type="text"
							inputmode="url"
							autocomplete="url"
							value={data.profile.profile.facebookUrl ?? ''}
							placeholder="facebook.com/your-name"
						/>
					</div>
				</div>

				<div class="field">
					<label for="mentorSkills">Skills</label>
					<input
						id="mentorSkills"
						name="mentorSkills"
						type="text"
						value={data.profile.profile.mentorSkills.join(', ')}
						placeholder="Career, Product, Leadership"
					/>
				</div>
			</div>
		</Panel>

		<div class="split">
			<Panel title="Education">
				<div class="form-grid">
					{#if educations.length === 0}
						<p class="subtle">
							Add schools, degrees, and majors so other members understand your background.
						</p>
					{:else}
						<p class="subtle field-note">
							Fill only the education details you want to show. Completely blank cards are ignored
							when you save.
						</p>
					{/if}

					<div class="record-list">
						{#each educations as education, index (index)}
							<article class="request-card record-card">
								<div class="split">
									<div class="field">
										<label for={`education-university-${index}`}>University</label>
										<input
											id={`education-university-${index}`}
											type="text"
											bind:value={education.university}
											placeholder="University of Melbourne"
										/>
									</div>
									<div class="field">
										<label for={`education-degree-${index}`}>Degree</label>
										<input
											id={`education-degree-${index}`}
											type="text"
											bind:value={education.degree}
											placeholder="Bachelor of Science"
										/>
									</div>
								</div>
								<div class="split">
									<div class="field">
										<label for={`education-major-${index}`}>Major</label>
										<input
											id={`education-major-${index}`}
											type="text"
											bind:value={education.major}
											placeholder="Computer Science"
										/>
									</div>
									<div class="field">
										<label for={`education-status-${index}`}>Status</label>
										<select id={`education-status-${index}`} bind:value={education.status}>
											{#each recordStatuses as status (status.value)}
												<option value={status.value}>{status.label}</option>
											{/each}
										</select>
									</div>
								</div>
								<div class="split">
									<div class="field">
										<label for={`education-start-${index}`}>Start year</label>
										<input
											id={`education-start-${index}`}
											type="number"
											min="1900"
											max="2100"
											bind:value={education.startYear}
										/>
									</div>
									<div class="field">
										<label for={`education-end-${index}`}>End year</label>
										<input
											id={`education-end-${index}`}
											type="number"
											min="1900"
											max="2100"
											value={education.endYear}
											oninput={(event) => {
												const value = event.currentTarget.value;
												education.endYear = value ? Number(value) : '';
											}}
										/>
									</div>
								</div>
								<div class="field">
									<label for={`education-description-${index}`}>Description</label>
									<textarea
										id={`education-description-${index}`}
										bind:value={education.description}
										placeholder="Optional details about focus, honors, or extracurricular work"
									></textarea>
								</div>
								<div class="record-card-actions">
									<button
										class="button secondary"
										type="button"
										onclick={() => removeEducation(index)}
									>
										Remove education
									</button>
								</div>
							</article>
						{/each}
					</div>

					<button class="button secondary" type="button" onclick={addEducation}
						>Add education</button
					>
				</div>
			</Panel>

			<Panel title="Experience">
				<div class="form-grid">
					{#if experiences.length === 0}
						<p class="subtle">
							Add work history, roles, and skills so other members know how you can help.
						</p>
					{:else}
						<p class="subtle field-note">
							Fill only the experience details you want to show. Completely blank cards are ignored
							when you save.
						</p>
					{/if}

					<div class="record-list">
						{#each experiences as experience, index (index)}
							<article class="request-card record-card">
								<div class="split">
									<div class="field">
										<label for={`experience-company-${index}`}>Company</label>
										<input
											id={`experience-company-${index}`}
											type="text"
											bind:value={experience.company}
											placeholder="MentorMatch"
										/>
									</div>
									<div class="field">
										<label for={`experience-position-${index}`}>Position</label>
										<input
											id={`experience-position-${index}`}
											type="text"
											bind:value={experience.position}
											placeholder="Product Manager"
										/>
									</div>
								</div>
								<div class="split">
									<div class="field">
										<label for={`experience-industry-${index}`}>Industry</label>
										<input
											id={`experience-industry-${index}`}
											type="text"
											bind:value={experience.industry}
											placeholder="Technology"
										/>
									</div>
									<div class="field">
										<label for={`experience-status-${index}`}>Status</label>
										<select id={`experience-status-${index}`} bind:value={experience.status}>
											{#each recordStatuses as status (status.value)}
												<option value={status.value}>{status.label}</option>
											{/each}
										</select>
									</div>
								</div>
								<div class="split">
									<div class="field">
										<label for={`experience-start-${index}`}>Start year</label>
										<input
											id={`experience-start-${index}`}
											type="number"
											min="1900"
											max="2100"
											bind:value={experience.startYear}
										/>
									</div>
									<div class="field">
										<label for={`experience-end-${index}`}>End year</label>
										<input
											id={`experience-end-${index}`}
											type="number"
											min="1900"
											max="2100"
											value={experience.endYear}
											oninput={(event) => {
												const value = event.currentTarget.value;
												experience.endYear = value ? Number(value) : '';
											}}
										/>
									</div>
								</div>
								<div class="field">
									<label for={`experience-skills-${index}`}>Skills</label>
									<input
										id={`experience-skills-${index}`}
										type="text"
										bind:value={experience.expertiseText}
										placeholder="Career, Leadership, Product"
									/>
									<p class="subtle field-note">Separate skill tags with commas.</p>
								</div>
								<div class="field">
									<label for={`experience-description-${index}`}>Description</label>
									<textarea
										id={`experience-description-${index}`}
										bind:value={experience.description}
										placeholder="Optional scope, achievements, or responsibilities"
									></textarea>
								</div>
								<div class="record-card-actions">
									<button
										class="button secondary"
										type="button"
										onclick={() => removeExperience(index)}
									>
										Remove experience
									</button>
								</div>
							</article>
						{/each}
					</div>

					<button class="button secondary" type="button" onclick={addExperience}
						>Add experience</button
					>
				</div>
			</Panel>
		</div>

		{#if form?.message}
			<p class:form-success={form?.success} class="form-error">{form.message}</p>
		{/if}

		<button class="button primary" type="submit">Save changes</button>
	</form>
</div>

<style>
	.record-list {
		display: grid;
		gap: 1.15rem;
	}

	.record-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.15rem;
	}

	.record-card-actions {
		display: flex;
		justify-content: flex-start;
	}

	@media (max-width: 640px) {
		.record-list {
			gap: 0.95rem;
		}

		.record-card {
			padding: 1rem;
		}

		.record-card-actions .button {
			width: 100%;
		}
	}
</style>
