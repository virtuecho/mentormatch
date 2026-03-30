<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader, Panel, StatCard, TagList } from '@mentormatch/ui';

	let { data } = $props();
</script>

<div class="page">
	<PageHeader
		eyebrow="Dashboard"
		title="Browse mentors with a tighter, modular front-end shell"
		description="The dashboard keeps the mentor discovery workflow intact while shifting the data layer behind shared Worker-first modules."
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
				<div class="cta-row">
					<button class="button primary" type="submit">Search</button>
					<a class="button secondary" href={resolve('/dashboard')}>Clear</a>
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
					<p>As soon as approved mentors exist in the D1 database, they will appear here.</p>
				</div>
			</Panel>
		{:else}
			{#each data.mentors as mentor (mentor.id)}
				<Panel>
					<div class="detail-card">
						<div class="booking-row">
							<div>
								<h3>{mentor.fullName}</h3>
								<p>{mentor.position} · {mentor.company}</p>
							</div>
							<span class="pill">{mentor.location ?? 'Remote'}</span>
						</div>
						<p>{mentor.expertise.join(', ') || 'Mentorship profile ready for review.'}</p>
						<TagList tags={mentor.mentorSkills} />
						<div class="cta-row">
							<form method="GET" action={resolve('/mentor/[id]', { id: String(mentor.id) })}>
								<input type="hidden" name="city" value={data.filters.city} />
								<input type="hidden" name="date" value={data.filters.date} />
								<input type="hidden" name="time" value={data.filters.time} />
								<button class="button secondary" type="submit">Review mentor</button>
							</form>
							<form method="GET" action={resolve('/mentor/[id]', { id: String(mentor.id) })}>
								<input type="hidden" name="city" value={data.filters.city} />
								<input type="hidden" name="date" value={data.filters.date} />
								<input type="hidden" name="time" value={data.filters.time} />
								<button class="button primary" type="submit">Book session</button>
							</form>
						</div>
					</div>
				</Panel>
			{/each}
		{/if}
	</section>
</div>
