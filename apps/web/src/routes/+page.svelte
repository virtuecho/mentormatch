<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader, Panel, StatCard, TagList } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';
	let { data } = $props();
</script>

<div class="page">
	<section class="hero">
		<div class="hero-copy">
			<p class="eyebrow">Mentorship that feels personal</p>
			<h1>Find the mentor who can help with your next step.</h1>
			<p>Meet experienced professionals, book time that works, and keep your plans in one place.</p>
			<div class="cta-row">
				{#if data.user?.role === 'mentor' && !data.user.isMentorApproved}
					<a class="button primary" href={resolve('/mentor-verification')}>
						Continue mentor application
					</a>
				{:else if data.user?.role === 'mentor'}
					<a class="button primary" href={resolve('/mentor-bookings')}>Open mentor sessions</a>
				{:else if data.user?.role === 'admin'}
					<a class="button primary" href={resolve('/admin/review')}>Review applications</a>
				{:else if data.user}
					<a class="button primary" href={resolve('/dashboard')}>Find a mentor</a>
				{:else}
					<a class="button primary" href={resolve('/signup')}>Get started</a>
				{/if}

				{#if data.user}
					<a class="button secondary" href={resolve('/settings')}>Account settings</a>
				{:else}
					<a class="button secondary" href={resolve('/login')}>Log in</a>
				{/if}
			</div>
			{#if data.user?.role === 'admin'}
				<p class="subtle">
					Admin mode:
					<a href={resolve('/admin/review')}>Review applications</a>,
					<a href={resolve('/admin/mentors')}>manage users</a>, or
					<a href={resolve('/admin/slots')}>inspect slots</a>.
				</p>
			{:else if data.user?.isMentorApproved}
				<p class="subtle">
					Your mentor tools are active. You can publish sessions and still book other mentors from
					your dashboard.
				</p>
			{/if}
		</div>

		<Panel title="Community snapshot">
			<div class="grid stats">
				{#each data.stats as item (item.label)}
					<StatCard {...item} />
				{/each}
			</div>
		</Panel>
	</section>

	<PageHeader
		eyebrow="Featured mentors"
		title="Meet mentors members can book today"
		description="Browse a few mentors from the community and explore the conversations they can help with."
	/>

	<section class="grid cards">
		{#if data.featuredMentors.length === 0}
			<Panel>
				<div class="detail-card">
					<h3>No public mentors yet</h3>
					<p>We are adding mentors now. Please check back soon.</p>
				</div>
			</Panel>
		{:else}
			{#each data.featuredMentors as mentor (mentor.id)}
				<Panel>
					<div class="detail-card">
						<div class="mentor-card-header">
							<ProfileAvatar name={mentor.fullName} src={mentor.profileImageUrl} />
							<div class="stack compact">
								<h3>{mentor.fullName}</h3>
								<p>{mentor.position} · {mentor.company}</p>
							</div>
							<span class="pill">{mentor.location ?? 'Remote'}</span>
						</div>
						<p>{mentor.expertise.join(', ') || 'Open to mentoring conversations.'}</p>
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
