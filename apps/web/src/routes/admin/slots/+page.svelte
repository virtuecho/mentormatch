<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader, Panel } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

	let { data, form } = $props();
</script>

<div class="page">
	<PageHeader
		eyebrow="Admin"
		title="Manage slots"
		description="Inspect upcoming mentor availability with searchable filters, booking state, and direct moderation actions."
	/>

	<div class="cta-row">
		<a class="button secondary" href={resolve('/admin/review')}>Review applications</a>
		<a class="button secondary" href={resolve('/admin/mentors')}>Manage users</a>
		{#if data.selectedMentorId}
			<a class="button secondary" href={resolve('/admin/slots')}>Clear mentor filter</a>
		{/if}
	</div>

	<div class="grid stats">
		<Panel title="All upcoming slots">
			<p class="stat-value">{data.summary.totalSlots}</p>
		</Panel>
		<Panel title="Open">
			<p class="stat-value">{data.summary.open}</p>
		</Panel>
		<Panel title="Booked">
			<p class="stat-value">{data.summary.booked}</p>
		</Panel>
		<Panel title="Matching">
			<p class="stat-value">{data.summary.matchingSlots}</p>
		</Panel>
	</div>

	<Panel title="Filter slots">
		<form class="form-grid" method="GET">
			{#if data.selectedMentorId}
				<input type="hidden" name="mentorId" value={data.selectedMentorId} />
			{/if}

			<div class="split">
				<div class="field">
					<label for="q">Title, mentor, or location</label>
					<input
						id="q"
						name="q"
						type="search"
						value={data.filters.q}
						placeholder="Search mentor, topic, or city"
					/>
				</div>
				<div class="field">
					<label for="status">Booking state</label>
					<select id="status" name="status" value={data.filters.status}>
						<option value="all">All slots</option>
						<option value="open">Open only</option>
						<option value="booked">Booked only</option>
					</select>
				</div>
			</div>

			<div class="split">
				<div class="field">
					<label for="sort">Sort by</label>
					<select id="sort" name="sort" value={data.filters.sort}>
						<option value="start_asc">Soonest first</option>
						<option value="start_desc">Latest first</option>
					</select>
				</div>
				<div class="cta-row search-actions">
					<button class="button primary action-button" type="submit">Apply filters</button>
				</div>
			</div>
		</form>

		<div class="cta-row search-actions">
			<form method="GET" action={resolve('/admin/slots')}>
				{#if data.selectedMentorId}
					<input type="hidden" name="mentorId" value={data.selectedMentorId} />
				{/if}
				<button class="button secondary action-button" type="submit">Clear filters</button>
			</form>
		</div>

		<p class="subtle results-meta">
			Showing {data.slots.length} of {data.pagination.total} matching slots.
			{#if data.selectedMentorId}
				The current list is already scoped to one mentor.
			{/if}
		</p>
	</Panel>

	<section class="card-list">
		{#if data.slots.length === 0}
			<Panel>
				<div class="detail-card">
					<h3>No upcoming slots match these filters</h3>
					<p>Future mentor availability will appear here for admin review.</p>
				</div>
			</Panel>
		{:else}
			{#each data.slots as slot (slot.id)}
				<Panel>
					<div class="detail-card">
						<div class="booking-row">
							<div class="stack compact grow">
								<h3>{slot.title ?? 'Mentorship session'}</h3>
								<p>{new Date(slot.startTime).toLocaleString()}</p>
								<p>{slot.city} · {slot.address}</p>
								<p>{slot.durationMins} minutes · {slot.maxParticipants} participant(s)</p>
								<div class="mentor-card-header">
									<ProfileAvatar name={slot.mentor.fullName} src={slot.mentor.profileImageUrl} />
									<div class="stack compact">
										<p><strong>{slot.mentor.fullName}</strong></p>
										<p>{slot.mentor.email}</p>
									</div>
								</div>
							</div>
							<span class={`status ${slot.isBooked ? 'accepted' : 'pending'}`}>
								{slot.isBooked ? 'Booked' : 'Open'}
							</span>
						</div>

						<p>
							<strong>Format:</strong>
							{slot.bookingMode === 'preset'
								? `Preset agenda${slot.presetTopic ? ` · ${slot.presetTopic}` : ''}`
								: 'Open agenda'}
						</p>
						<p>
							<strong>Requests:</strong>
							{slot.acceptedRequestCount} accepted · {slot.pendingRequestCount} pending
						</p>
						{#if slot.presetDescription}
							<p>{slot.presetDescription}</p>
						{/if}
						{#if slot.note}
							<p>{slot.note}</p>
						{/if}

						<div class="cta-row">
							<a
								class="button secondary"
								href={resolve('/mentor/[id]', { id: String(slot.mentor.id) })}
							>
								View mentor
							</a>
							<form method="POST" action="?/deleteSlot">
								<input type="hidden" name="slotId" value={slot.id} />
								<button class="button secondary" type="submit">Remove slot</button>
							</form>
						</div>

						<p class="subtle field-note">
							Removing a slot also removes related booking requests for that slot.
						</p>

						{#if form?.section === 'deleteSlot' && form?.slotId === slot.id && form?.message}
							<p class:form-success={form?.success} class="form-error">{form.message}</p>
						{/if}
					</div>
				</Panel>
			{/each}
		{/if}
	</section>

	{#if data.pagination.totalPages > 1}
		<div class="pagination-row">
			<p class="subtle pagination-summary">
				Page {data.pagination.page} of {data.pagination.totalPages}
			</p>
			<div class="cta-row">
				{#if data.pagination.page > 1}
					<form method="GET" action={resolve('/admin/slots')}>
						{#if data.selectedMentorId}
							<input type="hidden" name="mentorId" value={data.selectedMentorId} />
						{/if}
						<input type="hidden" name="q" value={data.filters.q} />
						<input type="hidden" name="status" value={data.filters.status} />
						<input type="hidden" name="sort" value={data.filters.sort} />
						<input type="hidden" name="page" value={data.pagination.page - 1} />
						<button class="button secondary" type="submit">Previous</button>
					</form>
				{/if}
				{#if data.pagination.page < data.pagination.totalPages}
					<form method="GET" action={resolve('/admin/slots')}>
						{#if data.selectedMentorId}
							<input type="hidden" name="mentorId" value={data.selectedMentorId} />
						{/if}
						<input type="hidden" name="q" value={data.filters.q} />
						<input type="hidden" name="status" value={data.filters.status} />
						<input type="hidden" name="sort" value={data.filters.sort} />
						<input type="hidden" name="page" value={data.pagination.page + 1} />
						<button class="button secondary" type="submit">Next</button>
					</form>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.stat-value {
		margin: 0;
		font-size: 2.4rem;
		font-weight: 800;
		line-height: 1;
	}

	.results-meta {
		margin: 0;
	}
</style>
