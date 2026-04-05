<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader, Panel, StatCard, TagList } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

	let { data } = $props();

	const processSteps = [
		{
			label: 'Search',
			title: 'Find & Explore Mentors',
			description:
				'Browse our verified mentor directory using filters such as expertise, location, and availability to find the right match.'
		},
		{
			label: 'Calendar',
			title: 'Book a Session',
			description:
				'Select your preferred time slot and meeting mode (online or in-person), then confirm your booking in just a few clicks.'
		},
		{
			label: 'Chat',
			title: 'Start Learning',
			description:
				'Engage in meaningful conversations with your mentor, receive personalized guidance, and track your progress towards your goals.'
		},
		{
			label: 'Growth',
			title: 'Grow & Improve',
			description:
				'Apply the insights and knowledge gained from your mentoring sessions to achieve your career goals and unlock new opportunities.'
		}
	] as const;

	const heroHighlights = [
		{
			title: 'Verified mentor directory',
			copy: 'Explore trusted profiles with clear expertise, location, and session details.'
		},
		{
			title: 'Thoughtful booking flow',
			copy: 'Book focused conversations, track requests, and keep every next step in one place.'
		}
	] as const;
</script>

<div class="page landing-page">
	<section class="landing-hero">
		<div class="landing-hero-copy stack">
			<div class="hero-kicker">
				<p class="eyebrow">MentorMatch</p>
			</div>

			<h1 class="hero-title">Find the perfect mentor to help you achieve your goals</h1>
			<p class="hero-copy-large">
				Connect with experienced professionals in your field and gain valuable insights to
				accelerate your career.
			</p>

			<div class="hero-actions">
				{#if data.user?.role === 'mentor' && !data.user.isMentorApproved}
					<a class="button primary" href={resolve('/mentor-verification')}>
						Continue mentor application
					</a>
				{:else if data.user?.role === 'mentor'}
					<a class="button primary" href={resolve('/mentor-bookings')}>Open hosted sessions</a>
				{:else if data.user?.role === 'admin'}
					<a class="button primary" href={resolve('/admin/review')}>Review applications</a>
				{:else if data.user}
					<a class="button primary" href={resolve('/dashboard')}>Find a mentor</a>
				{:else}
					<a class="button primary" href={resolve('/signup')}>Sign Up</a>
				{/if}

				{#if data.user}
					<a class="button secondary" href={resolve('/settings')}>Account settings</a>
				{:else}
					<a class="button secondary" href={resolve('/login')}>Log In</a>
				{/if}
			</div>

			<div class="trust-row">
				<span class="trust-pill">Professional growth, without the noise</span>
				<span class="trust-pill">Online and in-person session formats</span>
				<span class="trust-pill">One home for requests, notes, and follow-through</span>
			</div>

			<ul class="hero-support-list">
				{#each heroHighlights as item (item.title)}
					<li>
						<strong>{item.title}</strong>
						<span>{item.copy}</span>
					</li>
				{/each}
			</ul>

			{#if data.user?.role === 'admin'}
				<p class="inline-note">
					Admin mode is active. Jump from here to
					<a href={resolve('/admin/review')}>review applications</a>,
					<a href={resolve('/admin/mentors')}>manage users</a>, or
					<a href={resolve('/admin/slots')}>inspect slots</a>.
				</p>
			{:else if data.user?.isMentorApproved}
				<p class="inline-note">
					Your mentor tools are active. Publish hosted sessions and still book time with other
					mentors from the same account.
				</p>
			{/if}
		</div>

		<div class="landing-hero-aside stack">
			<p class="surface-caption">Community snapshot</p>
			<div class="stat-stack grid stats">
				{#each data.stats as item (item.label)}
					<StatCard {...item} />
				{/each}
			</div>

			{#if data.spotlightMentor}
				<div class="request-card detail-card">
					<p class="surface-caption">Featured mentor</p>
					<div class="mentor-card-header">
						<ProfileAvatar
							name={data.spotlightMentor.fullName}
							src={data.spotlightMentor.profileImageUrl}
							size="lg"
						/>
						<div class="featured-meta">
							<h3>{data.spotlightMentor.fullName}</h3>
							<p>{data.spotlightMentor.position} · {data.spotlightMentor.company}</p>
							<p>{data.spotlightMentor.location ?? 'Remote'}</p>
						</div>
					</div>
					<p class="featured-headline">
						{data.spotlightMentor.expertise.join(', ') || 'Open to mentoring conversations.'}
					</p>
					<TagList tags={data.spotlightMentor.mentorSkills} />
					<p class="spotlight-note">
						One mentor from today’s rotating featured set. Explore the grid below for a different
						perspective.
					</p>
					<div class="cta-row spotlight-actions">
						<a
							class="button secondary"
							href={resolve('/mentor/[id]', { id: String(data.spotlightMentor.id) })}
						>
							View mentor
						</a>
						{#if data.user}
							<a
								class="button primary"
								href={resolve('/mentor/[id]', { id: String(data.spotlightMentor.id) })}
							>
								Book session
							</a>
						{:else}
							<a class="button primary" href={resolve('/signup')}>Sign Up to book</a>
						{/if}
					</div>
				</div>
			{:else}
				<div class="request-card detail-card">
					<p class="surface-caption">Coming into focus</p>
					<h3>New mentors are joining the network.</h3>
					<p>
						As mentor profiles go live, this area becomes a curated front door into the community.
					</p>
				</div>
			{/if}
		</div>
	</section>

	<section class="stack">
		<div class="section-intro">
			<p class="eyebrow">Our simple process</p>
			<h2>
				MentorMatch makes it easy to connect with experienced professionals and accelerate your
				career.
			</h2>
			<p>
				A focused booking flow keeps discovery, scheduling, conversations, and progress in one place
				so mentorship feels intentional instead of fragmented.
			</p>
		</div>

		<div class="process-grid">
			{#each processSteps as step, index (step.label)}
				<article class="process-card" data-step={`0${index + 1}`}>
					<p class="process-card-kicker">{step.label}</p>
					<h3>{step.title}</h3>
					<p>{step.description}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="stack">
		<PageHeader
			eyebrow="Featured mentors"
			title="Browse mentors ready for thoughtful, goal-focused conversations"
			description="Browse a few mentors from the community and explore the conversations they can help with."
		/>

		<div class="featured-grid">
			{#if data.featuredMentors.length === 0}
				<Panel>
					<div class="detail-card">
						<h3>
							{data.spotlightMentor ? 'More mentors are rotating in soon' : 'No public mentors yet'}
						</h3>
						<p>
							{data.spotlightMentor
								? 'The spotlight card above is active now. As more approved mentors are available, this grid will rotate in a wider set.'
								: 'We are adding mentors now. Please check back soon.'}
						</p>
					</div>
				</Panel>
			{:else}
				{#each data.featuredMentors as mentor (mentor.id)}
					<Panel>
						<div class="featured-card">
							<div class="mentor-card-header">
								<ProfileAvatar name={mentor.fullName} src={mentor.profileImageUrl} size="lg" />
								<div class="featured-meta grow">
									<h3>{mentor.fullName}</h3>
									<p>{mentor.position} · {mentor.company}</p>
									<p>{mentor.location ?? 'Remote'}</p>
								</div>
								<span class="pill">Available</span>
							</div>
							<p class="featured-headline">
								{mentor.expertise.join(', ') || 'Open to mentoring conversations.'}
							</p>
							<TagList tags={mentor.mentorSkills} />
							<div class="cta-row">
								<a
									class="button secondary"
									href={resolve('/mentor/[id]', { id: String(mentor.id) })}>View profile</a
								>
								{#if data.user}
									<a
										class="button primary"
										href={resolve('/mentor/[id]', { id: String(mentor.id) })}>Book session</a
									>
								{/if}
							</div>
						</div>
					</Panel>
				{/each}
			{/if}
		</div>
	</section>

	<section class="cta-banner">
		<div class="stack compact">
			<p class="surface-caption">Ready to get moving?</p>
			<h2>Find a mentor who can sharpen your next career decision.</h2>
			<p>
				Create an account, browse mentors, and start booking focused conversations that turn good
				intentions into progress.
			</p>
		</div>
		<div class="cta-row">
			{#if data.user}
				<a class="button secondary" href={resolve('/dashboard')}>Open mentor directory</a>
				<a class="button secondary" href={resolve('/settings')}>Account settings</a>
			{:else}
				<a class="button secondary" href={resolve('/signup')}>Sign Up</a>
				<a class="button secondary" href={resolve('/login')}>Log In</a>
			{/if}
		</div>
	</section>
</div>
