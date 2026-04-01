<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader, Panel, TagList } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

	let { data, form } = $props();
</script>

<div class="page">
	<PageHeader
		eyebrow="Admin"
		title="Manage mentors"
		description="Review the active mentor roster, inspect public profiles, and revoke mentor access when needed."
	/>

	<div class="cta-row">
		<a class="button secondary" href={resolve('/admin/review')}>Review applications</a>
		<a class="button secondary" href={resolve('/admin/slots')}>Manage slots</a>
	</div>

	<section class="card-list">
		{#if data.mentors.length === 0}
			<Panel>
				<div class="detail-card">
					<h3>No active mentors</h3>
					<p>Approved mentors will appear here once applications are accepted.</p>
				</div>
			</Panel>
		{:else}
			{#each data.mentors as mentor (mentor.id)}
				<Panel>
					<div class="detail-card">
						<div class="mentor-card-header">
							<ProfileAvatar name={mentor.fullName} src={mentor.profileImageUrl} />
							<div class="stack compact grow">
								<h3>{mentor.fullName}</h3>
								<p>{mentor.position} · {mentor.company}</p>
								<p>{mentor.location ?? 'Remote'}</p>
							</div>
							<span class="pill">Mentor</span>
						</div>

						{#if mentor.expertise.length > 0}
							<p>{mentor.expertise.join(', ')}</p>
						{/if}
						<TagList tags={mentor.mentorSkills} />

						<div class="cta-row">
							<a class="button secondary" href={resolve('/mentor/[id]', { id: String(mentor.id) })}>
								View profile
							</a>
							<a class="button secondary" href={resolve('/admin/slots') + `?mentorId=${mentor.id}`}>
								View slots
							</a>
							<form method="POST" action="?/revokeMentor">
								<input type="hidden" name="mentorId" value={mentor.id} />
								<button class="button secondary" type="submit">Revoke mentor</button>
							</form>
						</div>

						{#if form?.section === 'revokeMentor' && form?.mentorId === mentor.id && form?.message}
							<p class:form-success={form?.success} class="form-error">{form.message}</p>
						{/if}
					</div>
				</Panel>
			{/each}
		{/if}
	</section>
</div>
