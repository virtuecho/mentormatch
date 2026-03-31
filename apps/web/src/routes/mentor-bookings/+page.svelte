<script lang="ts">
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
		eyebrow="Mentor sessions"
		title="Manage requests and share new availability"
		description="Review incoming requests and open new times when you are ready to meet."
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

	<div class="split">
		<Panel title="Open a new time">
			<form class="form-grid" method="POST" action="?/createSlot">
				<div class="field">
					<label for="title">Session title</label>
					<input id="title" name="title" type="text" placeholder="Career planning session" />
				</div>
				<div class="split">
					<div class="field">
						<label for="startTime">Start time</label>
						<input id="startTime" name="startTime" type="datetime-local" required />
					</div>
					<div class="field">
						<label for="durationMins">Duration (minutes)</label>
						<input
							id="durationMins"
							name="durationMins"
							type="number"
							min="15"
							step="15"
							value="60"
							required
						/>
					</div>
				</div>
				<div class="split">
					<div class="field">
						<label for="locationType">Location type</label>
						<select id="locationType" name="locationType">
							<option value="in_person">In person</option>
							<option value="online">Online</option>
						</select>
					</div>
					<div class="field">
						<label for="maxParticipants">Max participants</label>
						<input
							id="maxParticipants"
							name="maxParticipants"
							type="number"
							min="1"
							value="2"
							required
						/>
					</div>
				</div>
				<div class="split">
					<div class="field">
						<label for="city">City</label>
						<input id="city" name="city" type="text" placeholder="Melbourne" required />
					</div>
					<div class="field">
						<label for="address">Address</label>
						<input
							id="address"
							name="address"
							type="text"
							placeholder="Office or meeting link"
							required
						/>
					</div>
				</div>
				<div class="field">
					<label for="note">Note</label>
					<textarea id="note" name="note" placeholder="Optional prep instructions"></textarea>
				</div>
				<button class="button primary" type="submit">Create meeting</button>
			</form>
		</Panel>

		<Panel title="Your available times">
			{#if data.slots.length === 0}
				<div class="detail-card">
					<p>No slots published yet.</p>
				</div>
			{:else}
				<div class="card-list">
					{#each data.slots as slot (slot.id)}
						<article class="detail-card">
							<div class="booking-row">
								<div>
									<h3>{slot.title ?? 'Mentorship session'}</h3>
									<p>{new Date(slot.startTime).toLocaleString()}</p>
									<p>{slot.city} · {slot.address}</p>
									<p>{slot.durationMins} minutes · {slot.maxParticipants} participant(s)</p>
								</div>
								<span class={`status ${slot.isBooked ? 'accepted' : 'pending'}`}>
									{slot.isBooked ? 'Booked' : 'Available'}
								</span>
							</div>
							{#if slot.note}
								<p>{slot.note}</p>
							{/if}
							<form method="POST" action="?/deleteSlot">
								<input type="hidden" name="slotId" value={slot.id} />
								<button class="button secondary" type="submit">Delete slot</button>
							</form>
						</article>
					{/each}
				</div>
			{/if}
		</Panel>
	</div>

	<section class="card-list">
		{#if filteredBookings.length === 0}
			<Panel>
				<div class="detail-card">
					<h3>No mentee requests yet</h3>
					<p>Incoming requests will appear here after mentees request your published slots.</p>
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
							<p>Mentee: {booking.counterpart.fullName}</p>
						</div>
						<div class="cta-row">
							{#if booking.status === 'pending'}
								<form method="POST" action="?/respond">
									<input type="hidden" name="bookingId" value={booking.id} />
									<input type="hidden" name="response" value="accepted" />
									<button class="button primary" type="submit">Accept</button>
								</form>
								<form method="POST" action="?/respond">
									<input type="hidden" name="bookingId" value={booking.id} />
									<input type="hidden" name="response" value="rejected" />
									<button class="button secondary" type="submit">Reject</button>
								</form>
							{:else if booking.status === 'accepted'}
								<form method="POST" action="?/cancel">
									<input type="hidden" name="bookingId" value={booking.id} />
									<button class="button secondary" type="submit">Cancel booking</button>
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
