<script lang="ts">
	import { DEFAULT_AVATAR } from '@mentormatch/shared';
	import { PageHeader, Panel, TagList } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';
	let { data, form } = $props();

	function getEditableProfileImageUrl(profileImageUrl: string) {
		return profileImageUrl === DEFAULT_AVATAR ? '' : profileImageUrl;
	}
</script>

<div class="page">
	<PageHeader
		eyebrow="Profile"
		title={data.profile.profile.fullName}
		description={data.profile.profile.bio ??
			'Keep your profile up to date so people know how you can help.'}
	/>

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
				<p><strong>Role:</strong> {data.profile.role}</p>
				<p><strong>Location:</strong> {data.profile.profile.location ?? 'Not set'}</p>
				<p><strong>Phone:</strong> {data.profile.profile.phone ?? 'Not set'}</p>
				<TagList tags={data.profile.profile.mentorSkills} />
			</div>
		</Panel>

		<Panel title="Edit profile">
			<form class="form-grid" method="POST" action="?/save">
				<input
					type="hidden"
					name="educationsJson"
					value={JSON.stringify(data.profile.profile.educations)}
				/>
				<input
					type="hidden"
					name="experiencesJson"
					value={JSON.stringify(data.profile.profile.experiences)}
				/>

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

				{#if form?.message}
					<p class:form-success={form?.success} class="form-error">{form.message}</p>
				{/if}

				<button class="button primary" type="submit">Save changes</button>
			</form>
		</Panel>
	</div>

	<div class="split">
		<Panel title="Education">
			<div class="detail-list">
				{#if data.profile.profile.educations.length === 0}
					<article>
						<p>No education records yet.</p>
					</article>
				{:else}
					{#each data.profile.profile.educations as education (`${education.university}-${education.degree}-${education.startYear}`)}
						<article>
							<p><strong>{education.university}</strong></p>
							<p>{education.degree} · {education.major}</p>
							<p>{education.startYear} - {education.endYear ?? 'Present'}</p>
						</article>
					{/each}
				{/if}
			</div>
		</Panel>

		<Panel title="Experience">
			<div class="detail-list">
				{#if data.profile.profile.experiences.length === 0}
					<article>
						<p>No experience records yet.</p>
					</article>
				{:else}
					{#each data.profile.profile.experiences as experience (`${experience.company}-${experience.position}-${experience.startYear}`)}
						<article>
							<p><strong>{experience.company}</strong></p>
							<p>{experience.position}</p>
							<p>{experience.startYear} - {experience.endYear ?? 'Present'}</p>
							<TagList tags={experience.expertise} />
						</article>
					{/each}
				{/if}
			</div>
		</Panel>
	</div>
</div>
