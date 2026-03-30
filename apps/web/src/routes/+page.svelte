<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader, Panel, StatCard, TagList } from '@mentormatch/ui';
	let { data } = $props();
</script>

<div class="page">
	<section class="hero">
		<div class="hero-copy">
			<p class="eyebrow">Mentorship, rebuilt</p>
			<h1>One deploy, one app, one cleaner path to mentor discovery.</h1>
			<p>
				MentorMatch now lives as a single Cloudflare Workers-first full-stack application. The
				frontend experience and the backend booking flow sit behind the same deployable shell.
			</p>
			<div class="cta-row">
				<a class="button primary" href={resolve('/signup')}>Create account</a>
				<a class="button secondary" href={resolve('/dashboard')}>Explore mentors</a>
			</div>
		</div>

		<Panel title="Launch snapshot">
			<div class="grid stats">
				{#each data.stats as item (item.label)}
					<StatCard {...item} />
				{/each}
			</div>
		</Panel>
	</section>

	<PageHeader
		eyebrow="Featured mentors"
		title="A discoverable mentor network with sharper profiles"
		description="This first shell keeps the core journeys visible while the backend modules are rewired into feature packages."
	/>

	<section class="grid cards">
		{#if data.featuredMentors.length === 0}
			<Panel>
				<div class="detail-card">
					<h3>No public mentors yet</h3>
					<p>Approve or seed mentor accounts in D1 to populate the public homepage.</p>
				</div>
			</Panel>
		{:else}
			{#each data.featuredMentors as mentor (mentor.id)}
				<Panel>
					<div class="detail-card">
						<span class="pill">{mentor.location ?? 'Remote'}</span>
						<h3>{mentor.fullName}</h3>
						<p>
							{mentor.position} · {mentor.company}
						</p>
						<p>{mentor.expertise.join(', ') || 'Mentor profile ready for review.'}</p>
						<TagList tags={mentor.mentorSkills} />
						<div class="cta-row">
							<a class="button secondary" href={resolve('/mentor/[id]', { id: String(mentor.id) })}
								>View profile</a
							>
						</div>
					</div>
				</Panel>
			{/each}
		{/if}
	</section>
</div>
