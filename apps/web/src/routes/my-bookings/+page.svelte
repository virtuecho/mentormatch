<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatLabel } from '@mentormatch/shared';
	import { PageHeader, Panel } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

	let { data, form } = $props();
	let activeFilter = $state('all');
	const bookingFilters = [
		{ value: 'all', label: 'All' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'accepted', label: 'Accepted' },
		{ value: 'rejected', label: 'Rejected' },
		{ value: 'completed', label: 'Completed' }
	] as const;
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

	<div class="cta-row booking-filter-row">
		{#each bookingFilters as filter (filter.value)}
			<button
				class="button filter-chip"
				class:primary={activeFilter === filter.value}
				class:secondary={activeFilter !== filter.value}
				type="button"
				aria-pressed={activeFilter === filter.value}
				onclick={() => (activeFilter = filter.value)}
			>
				{filter.label}
			</button>
		{/each}
	</div>

	<section class="card-list booking-results">
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
					<div class="request-compact-card">
						<div class="request-compact-header">
							<div class="mentor-card-header grow">
								<ProfileAvatar
									name={booking.counterpart.fullName}
									src={booking.counterpart.profileImageUrl}
								/>
								<div class="request-compact-title">
									<h3>{booking.topic}</h3>
									<p>Mentor: {booking.counterpart.fullName}</p>
									<p>{booking.counterpart.email}</p>
								</div>
							</div>
							<span class={`status ${booking.status.toLowerCase()}`}>
								{formatLabel(booking.status)}
							</span>
						</div>

						<div class="booking-meta-grid">
							<div class="booking-meta-item">
								<p class="booking-meta-label">When</p>
								<p>{new Date(booking.slot.startTime).toLocaleString()}</p>
							</div>
							<div class="booking-meta-item">
								<p class="booking-meta-label">Where</p>
								<p>{booking.slot.city} · {booking.slot.address}</p>
							</div>
						</div>

						<div class="cta-row booking-card-actions">
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
