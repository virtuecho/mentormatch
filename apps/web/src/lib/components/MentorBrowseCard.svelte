<script lang="ts">
	import { TagList } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

	type MentorBrowseCardData = {
		id: number;
		fullName: string;
		profileImageUrl: string | null;
		location: string | null;
		position: string;
		company: string;
		expertise: string[];
		mentorSkills: string[];
	};

	interface Props {
		mentor: MentorBrowseCardData;
		profileHref: string;
		profileLabel?: string;
		primaryHref?: string | null;
		primaryLabel?: string;
		summaryFallback?: string;
		avatarSize?: 'md' | 'lg';
	}

	let {
		mentor,
		profileHref,
		profileLabel = 'View profile',
		primaryHref = null,
		primaryLabel = 'Book session',
		summaryFallback = 'Open to mentoring conversations.',
		avatarSize = 'md'
	}: Props = $props();

	const summary = $derived(mentor.expertise.join(', ') || summaryFallback);
	const locationLabel = $derived(mentor.location ?? 'Remote');
</script>

<article class="mentor-browser-card">
	<div class="mentor-browser-header">
		<ProfileAvatar name={mentor.fullName} src={mentor.profileImageUrl} size={avatarSize} />

		<div class="mentor-browser-meta">
			<h3>{mentor.fullName}</h3>
			<p>{mentor.position} · {mentor.company}</p>
		</div>
	</div>

	<span class="pill mentor-browser-location">{locationLabel}</span>
	<p class="mentor-browser-summary">{summary}</p>

	<div class="mentor-browser-tags">
		<TagList tags={mentor.mentorSkills} />
	</div>

	<div class="cta-row mentor-browser-actions">
		<form method="GET" action={profileHref}>
			<button class="button secondary" type="submit">{profileLabel}</button>
		</form>
		{#if primaryHref}
			<form method="GET" action={primaryHref}>
				<button class="button primary" type="submit">{primaryLabel}</button>
			</form>
		{/if}
	</div>
</article>

<style>
	.mentor-browser-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: 100%;
	}

	.mentor-browser-header {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: start;
		gap: 1rem;
	}

	.mentor-browser-meta {
		display: grid;
		gap: 0.35rem;
		min-width: 0;
	}

	.mentor-browser-meta h3,
	.mentor-browser-meta p,
	.mentor-browser-summary {
		margin: 0;
	}

	.mentor-browser-meta h3 {
		line-height: 1.08;
	}

	.mentor-browser-meta p {
		color: var(--ink-muted, #617180);
		overflow-wrap: anywhere;
	}

	.mentor-browser-location {
		align-self: flex-start;
	}

	.mentor-browser-summary {
		min-height: 3.4em;
		font-size: 1.02rem;
		line-height: 1.65;
		color: var(--ink, #243647);
	}

	.mentor-browser-tags {
		min-height: 5.2rem;
	}

	.mentor-browser-actions {
		margin-top: auto;
		padding-top: 0.15rem;
	}

	.mentor-browser-actions form {
		display: flex;
	}

	@media (max-width: 640px) {
		.mentor-browser-summary,
		.mentor-browser-tags {
			min-height: 0;
		}

		.mentor-browser-actions form,
		.mentor-browser-actions .button {
			width: 100%;
		}
	}
</style>
