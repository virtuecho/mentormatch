<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader, Panel } from '@mentormatch/ui';

	let { data, form } = $props();
	let activeFilter = $state('all');
	const filteredBookings = $derived(
		activeFilter === 'all'
			? data.bookings
			: data.bookings.filter((booking) => booking.status === activeFilter)
	);
</script>

<div class="page">
	<PageHeader
		eyebrow="Mentee view"
		title="Track your upcoming mentorship sessions"
		description="Bookings remain visible from one shell, with room for Worker-powered actions and incremental server-side updates."
	/>

	<div class="cta-row">
		<button class="button secondary" type="button" onclick={() => (activeFilter = 'all')}
			>All</button
		>
		<button class="button secondary" type="button" onclick={() => (activeFilter = 'pending')}
			>Pending</button
		>
		<button class="button secondary" type="button" onclick={() => (activeFilter = 'accepted')}
			>Accepted</button
		>
		<button class="button secondary" type="button" onclick={() => (activeFilter = 'rejected')}
			>Rejected</button
		>
		<button class="button secondary" type="button" onclick={() => (activeFilter = 'completed')}
			>Completed</button
		>
	</div>

	<section class="card-list">
		{#if filteredBookings.length === 0}
			<Panel>
				<div class="detail-card">
					<h3>No bookings yet</h3>
					<p>Your booking requests will appear here once you submit them.</p>
					<a class="button secondary" href={resolve('/dashboard')}>Browse mentors</a>
				</div>
			</Panel>
		{:else}
			{#each filteredBookings as booking (booking.id)}
				<Panel>
					<div class="booking-row">
						<div class="stack">
							<span class={`status ${booking.status.toLowerCase()}`}>{booking.status}</span>
							<h3>{booking.topic}</h3>
							<p>{new Date(booking.slot.startTime).toLocaleString()}</p>
							<p>{booking.slot.city} · {booking.slot.address}</p>
							<p>Mentor: {booking.counterpart.fullName}</p>
						</div>
						<div class="cta-row">
							<a
								class="button secondary"
								href={resolve('/mentor-profile/[id]', { id: String(booking.counterpart.id) })}
							>
								View mentor
							</a>
							{#if booking.status === 'pending' || booking.status === 'accepted'}
								<form method="POST" action="?/cancel">
									<input type="hidden" name="bookingId" value={booking.id} />
									<button class="button primary" type="submit">Cancel</button>
								</form>
							{/if}
						</div>
					</div>
				</Panel>
			{/each}
		{/if}
	</section>

	{#if form?.message}
		<p class:form-success={form?.success} class="form-error">{form.message}</p>
	{/if}
</div>
