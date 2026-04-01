<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader, Panel, TagList } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

	let { data } = $props();
</script>

<div class="page">
	<PageHeader
		eyebrow="Member profile"
		title={data.member.profile.fullName}
		description={data.member.profile.bio ?? 'This member has not added a bio yet.'}
	/>

	<div class="split">
		<Panel title="Overview">
			<div class="stack">
				<div class="mentor-card-header">
					<ProfileAvatar
						name={data.member.profile.fullName}
						src={data.member.profile.profileImageUrl}
						size="lg"
					/>
					<div class="stack compact">
						<h3>{data.member.profile.fullName}</h3>
						<p>{data.member.profile.location ?? 'Location not shared'}</p>
					</div>
				</div>
				<p><strong>Email:</strong> {data.member.email}</p>
				<p><strong>Phone:</strong> {data.member.profile.phone ?? 'Not shared'}</p>
				<p><strong>Role:</strong> {data.member.role}</p>
				<p><strong>Mentor approved:</strong> {data.member.isMentorApproved ? 'Yes' : 'No'}</p>
				<TagList tags={data.member.profile.mentorSkills} />
				<div class="cta-row">
					{#if data.isAdminView}
						<a class="button secondary" href={resolve('/admin/review')}>Back to review queue</a>
					{:else}
						<a class="button secondary" href={resolve('/mentor-bookings')}>Back to requests</a>
					{/if}
				</div>
			</div>
		</Panel>

		<Panel title="Links">
			<div class="detail-list">
				<article>
					<p><strong>LinkedIn:</strong> {data.member.profile.linkedinUrl ?? 'Not shared'}</p>
				</article>
				<article>
					<p><strong>Website:</strong> {data.member.profile.websiteUrl ?? 'Not shared'}</p>
				</article>
				<article>
					<p><strong>Instagram:</strong> {data.member.profile.instagramUrl ?? 'Not shared'}</p>
				</article>
				<article>
					<p><strong>Facebook:</strong> {data.member.profile.facebookUrl ?? 'Not shared'}</p>
				</article>
			</div>
		</Panel>
	</div>

	<div class="split">
		<Panel title="Experience">
			<div class="detail-list">
				{#if data.member.profile.experiences.length === 0}
					<article>
						<p>No experience records shared yet.</p>
					</article>
				{:else}
					{#each data.member.profile.experiences as experience, index (index)}
						<article>
							<p><strong>{experience.company}</strong></p>
							<p>{experience.position}</p>
							<p>{experience.startYear} - {experience.endYear ?? 'Present'}</p>
							<TagList tags={experience.expertise} />
							{#if experience.description}
								<p>{experience.description}</p>
							{/if}
						</article>
					{/each}
				{/if}
			</div>
		</Panel>

		<Panel title="Education">
			<div class="detail-list">
				{#if data.member.profile.educations.length === 0}
					<article>
						<p>No education records shared yet.</p>
					</article>
				{:else}
					{#each data.member.profile.educations as education, index (index)}
						<article>
							<p><strong>{education.university}</strong></p>
							<p>{education.degree} · {education.major}</p>
							<p>{education.startYear} - {education.endYear ?? 'Present'}</p>
							{#if education.description}
								<p>{education.description}</p>
							{/if}
						</article>
					{/each}
				{/if}
			</div>
		</Panel>
	</div>
</div>
