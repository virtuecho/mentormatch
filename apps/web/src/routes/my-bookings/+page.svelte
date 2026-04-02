<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatLabel } from '@mentormatch/shared';
	import { PageHeader, Panel } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

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
		eyebrow="Booked sessions"
		title="Track your booked mentorship sessions"
		description="See upcoming sessions, pending requests, and recent updates in one place."
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
						<div class="mentor-card-header grow">
							<ProfileAvatar
								name={booking.counterpart.fullName}
								src={booking.counterpart.profileImageUrl}
							/>
							<div class="stack compact grow">
								<span class={`status ${booking.status.toLowerCase()}`}>
									{formatLabel(booking.status)}
								</span>
								<h3>{booking.topic}</h3>
								<p>{new Date(booking.slot.startTime).toLocaleString()}</p>
								<p>{booking.slot.city} · {booking.slot.address}</p>
								<p>Mentor: {booking.counterpart.fullName}</p>
							</div>
						</div>
						<div class="cta-row">
							<a
								class="button secondary"
								href={resolve('/mentor/[id]', { id: String(booking.counterpart.id) })}
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
