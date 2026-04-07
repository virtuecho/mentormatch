<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader, Panel, StatCard } from '@mentormatch/ui';
	import MentorBrowseCard from '$lib/components/MentorBrowseCard.svelte';

	let { data } = $props();

	function getMentorHref(mentorId: number) {
		const href = new URL(
			resolve('/mentor/[id]', { id: String(mentorId) }),
			'https://mentormatch.local'
		);
		if (data.filters.city) {
			href.searchParams.set('city', data.filters.city);
		}
		if (data.filters.date) {
			href.searchParams.set('date', data.filters.date);
		}
		if (data.filters.time) {
			href.searchParams.set('time', data.filters.time);
		}
		return `${href.pathname}${href.search}`;
	}
</script>

<div class="page">
	<PageHeader
		eyebrow="Find a mentor"
		title="Find the right mentor for your next step"
		description="Search by topic, skill, or location and book time when you are ready."
	/>

	<Panel title="Search mentors">
		<form class="form-grid" method="GET">
			<div class="split">
				<div class="field">
					<label for="q">Name or keyword</label>
					<input
						id="q"
						name="q"
						type="search"
						value={data.filters.search}
						placeholder="Product, design, strategy..."
					/>
				</div>
				<div class="field">
					<label for="city">City</label>
					<input
						id="city"
						name="city"
						type="text"
						value={data.filters.city}
						placeholder="Melbourne"
					/>
				</div>
			</div>

			<div class="split">
				<div class="field">
					<label for="tag">Skill tag</label>
					<input
						id="tag"
						name="tag"
						type="text"
						value={data.filters.tag}
						placeholder="Career, JavaScript, Product"
					/>
				</div>
				<div class="field">
					<label for="date">Preferred date</label>
					<input id="date" name="date" type="date" value={data.filters.date} />
				</div>
			</div>

			<div class="split">
				<div class="field">
					<label for="time">Preferred time</label>
					<input id="time" name="time" type="time" value={data.filters.time} />
				</div>
				<div class="cta-row search-actions filter-panel-actions">
					<button class="button primary action-button" type="submit">Search mentors</button>
					<a class="button secondary action-button" href={resolve('/dashboard')}>Clear filters</a>
				</div>
			</div>
		</form>
	</Panel>

	<section class="grid stats">
		{#each data.stats as item (item.label)}
			<StatCard {...item} />
		{/each}
	</section>

	<section class="grid cards">
		{#if data.mentors.length === 0}
			<Panel>
				<div class="detail-card">
					<h3>No mentors found yet</h3>
					<p>Try a broader search or check back soon as more mentors join.</p>
				</div>
			</Panel>
		{:else}
			{#each data.mentors as mentor (mentor.id)}
				<Panel>
					<MentorBrowseCard
						{mentor}
						profileHref={getMentorHref(mentor.id)}
						primaryHref={getMentorHref(mentor.id)}
						summaryFallback="Available to help with your growth goals."
					/>
				</Panel>
			{/each}
		{/if}
	</section>
</div>
