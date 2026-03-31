<script lang="ts">
	import { onMount } from 'svelte';
	import { PageHeader, Panel } from '@mentormatch/ui';

	let { data, form } = $props();
	const bookingFilters = [
		{ value: 'all', label: 'All' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'accepted', label: 'Accepted' },
		{ value: 'cancelled', label: 'Cancelled' },
		{ value: 'rejected', label: 'Rejected' },
		{ value: 'completed', label: 'Completed' }
	] as const;
	const fallbackTimeZones = [
		'UTC',
		'America/Los_Angeles',
		'America/New_York',
		'Europe/London',
		'Europe/Paris',
		'Asia/Shanghai',
		'Asia/Singapore',
		'Asia/Tokyo',
		'Australia/Sydney'
	] as const;
	const supportedTimeZones =
		typeof Intl.supportedValuesOf === 'function'
			? Intl.supportedValuesOf('timeZone')
			: [...fallbackTimeZones];
	let activeFilter = $state('all');
	let startTimeLocal = $state('');
	let browserTimeZone = $state('your local time zone');
	let selectedTimeZone = $state('UTC');
	let timezoneOffsetMinutes = $state(0);
	let bookingMode = $state<'open' | 'preset'>('open');
	let repeatMode = $state<'once' | 'weekly'>('once');
	let repeatCount = $state(4);
	let timeZoneOptions = $state([...supportedTimeZones]);

	onMount(() => {
		const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
		browserTimeZone = resolvedTimeZone;
		selectedTimeZone = resolvedTimeZone;
		timezoneOffsetMinutes = new Date().getTimezoneOffset();

		if (!timeZoneOptions.includes(resolvedTimeZone)) {
			timeZoneOptions = [resolvedTimeZone, ...timeZoneOptions];
		}
	});

	const timeZoneDescription = $derived(
		selectedTimeZone === browserTimeZone
			? `This slot will use ${selectedTimeZone}. Members will see it in their own local time.`
			: `This slot will use ${selectedTimeZone}. Your device is currently set to ${browserTimeZone}. Members will still see it in their own local time.`
	);

	const filteredBookings = $derived(
		activeFilter === 'all'
			? data.bookings
			: data.bookings.filter((booking) => booking.status === activeFilter)
	);
</script>

<div class="page">
	<PageHeader
		eyebrow="Mentor sessions"
		title="Manage requests and share your next available time"
		description="Review incoming requests and open new times when you are ready to meet."
	/>

	<div class="split">
		<Panel title="Share a new time">
			<form class="form-grid" method="POST" action="?/createSlot">
				<input type="hidden" name="timezoneOffsetMinutes" value={String(timezoneOffsetMinutes)} />
				<div class="field">
					<label for="title">Session title</label>
					<input id="title" name="title" type="text" placeholder="Career planning session" />
				</div>
				<div class="split">
					<div class="field">
						<label for="bookingMode">Session format</label>
						<select id="bookingMode" name="bookingMode" bind:value={bookingMode}>
							<option value="open">Mentee chooses the topic</option>
							<option value="preset">Mentor sets the agenda</option>
						</select>
					</div>
					<div class="field">
						<label for="repeatWeekly">Repeats</label>
						<select id="repeatWeekly" name="repeatWeekly" bind:value={repeatMode}>
							<option value="once">One time only</option>
							<option value="weekly">Repeat every week</option>
						</select>
					</div>
					{#if repeatMode === 'weekly'}
						<div class="field">
							<label for="repeatCount">How many weeks</label>
							<input
								id="repeatCount"
								name="repeatCount"
								type="number"
								min="2"
								max="26"
								bind:value={repeatCount}
								required
							/>
						</div>
					{/if}
				</div>
				<div class="split">
					<div class="field">
						<label for="startTime">Start time</label>
						<input
							id="startTime"
							name="startTimeLocal"
							type="datetime-local"
							bind:value={startTimeLocal}
							required
						/>
					</div>
					<div class="field">
						<label for="timeZone">Time zone</label>
						<input
							id="timeZone"
							name="timeZone"
							type="text"
							list="time-zone-options"
							bind:value={selectedTimeZone}
							placeholder="Asia/Shanghai"
							required
						/>
						<datalist id="time-zone-options">
							{#each timeZoneOptions as timeZone (timeZone)}
								<option value={timeZone}></option>
							{/each}
						</datalist>
						<p class="subtle field-note">{timeZoneDescription}</p>
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
				{#if bookingMode === 'preset'}
					<div class="field">
						<label for="presetTopic">Preset topic</label>
						<input
							id="presetTopic"
							name="presetTopic"
							type="text"
							placeholder="Mock interview debrief"
							required
						/>
					</div>
					<div class="field">
						<label for="presetDescription">Preset description</label>
						<textarea
							id="presetDescription"
							name="presetDescription"
							placeholder="Tell mentees what this session already covers."
						></textarea>
					</div>
				{/if}
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
				{#if form?.section === 'createSlot' && form?.message}
					<p class:form-success={form?.success} class="form-error">{form.message}</p>
				{/if}
				<button class="button primary" type="submit">Publish time</button>
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
									<p>
										{slot.bookingMode === 'preset'
											? `Fixed agenda: ${slot.presetTopic ?? 'Mentorship session'}`
											: 'Open agenda: mentees can request their own topic'}
									</p>
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
							{#if form?.section === 'deleteSlot' && form?.slotId === slot.id && form?.message}
								<p class="form-error">{form.message}</p>
							{/if}
						</article>
					{/each}
				</div>
			{/if}
		</Panel>
	</div>

	<Panel title="Incoming requests">
		<div class="section-header">
			<p class="subtle section-copy">
				Filter mentee requests by status. Your published availability stays separate on the right.
			</p>
			<div class="cta-row filter-row">
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
		</div>

		<section class="card-list">
			{#if filteredBookings.length === 0}
				<div class="detail-card">
					<h3>
						{data.bookings.length === 0 ? 'No mentee requests yet' : 'No requests in this view'}
					</h3>
					<p>
						{data.bookings.length === 0
							? 'Incoming requests will appear here after mentees request your published slots.'
							: 'Try another status filter to review the rest of your requests.'}
					</p>
				</div>
			{:else}
				{#each filteredBookings as booking (booking.id)}
					<article class="detail-card request-card">
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
					</article>
				{/each}
			{/if}
		</section>
	</Panel>

	{#if (form?.section === 'respond' || form?.section === 'cancel') && form?.message}
		<p class:form-success={form?.success} class="form-error">{form.message}</p>
	{/if}
</div>
