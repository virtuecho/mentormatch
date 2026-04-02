<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { formatDateTimeLocalInTimeZone, formatLabel } from '@mentormatch/shared';
	import { PageHeader, Panel } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

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
	const repeatOptions = [
		{ value: 'once', label: 'Does not repeat' },
		{ value: 'daily', label: 'Every day' },
		{ value: 'weekdays', label: 'Every weekday' },
		{ value: 'weekly', label: 'Every week' },
		{ value: 'biweekly', label: 'Every 2 weeks' },
		{ value: 'monthly', label: 'Every month' }
	] as const;
	let activeFilter = $state('all');
	let title = $state('');
	let startTimeLocal = $state('');
	let browserTimeZone = $state('your local time zone');
	let selectedTimeZone = $state('UTC');
	let timezoneOffsetMinutes = $state(0);
	let bookingMode = $state<'open' | 'preset'>('open');
	let repeatMode = $state<(typeof repeatOptions)[number]['value']>('once');
	let repeatCount = $state(4);
	let presetTopic = $state('');
	let presetDescription = $state('');
	let durationMins = $state(60);
	let locationType = $state<'in_person' | 'online'>('in_person');
	let maxParticipants = $state(2);
	let city = $state('');
	let address = $state('');
	let note = $state('');
	let timeZoneOptions = $state([...supportedTimeZones]);
	let hydratedEditKey = $state('');

	function applyFormDefaults(preferredTimeZone: string) {
		const editingSlot = data.editingSlot;
		title = editingSlot?.title ?? '';
		bookingMode = editingSlot?.bookingMode ?? 'open';
		repeatMode = 'once';
		repeatCount = 4;
		presetTopic = editingSlot?.presetTopic ?? '';
		presetDescription = editingSlot?.presetDescription ?? '';
		durationMins = editingSlot?.durationMins ?? 60;
		locationType = (editingSlot?.locationType as 'in_person' | 'online' | undefined) ?? 'in_person';
		maxParticipants = editingSlot?.maxParticipants ?? 2;
		city = editingSlot?.city ?? '';
		address = editingSlot?.address ?? '';
		note = editingSlot?.note ?? '';
		selectedTimeZone = preferredTimeZone;
		startTimeLocal = editingSlot
			? (formatDateTimeLocalInTimeZone(editingSlot.startTime, preferredTimeZone) ?? '')
			: '';
	}

	onMount(() => {
		const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
		browserTimeZone = resolvedTimeZone;
		timezoneOffsetMinutes = new Date().getTimezoneOffset();

		if (!timeZoneOptions.includes(resolvedTimeZone)) {
			timeZoneOptions = [resolvedTimeZone, ...timeZoneOptions];
		}

		applyFormDefaults(resolvedTimeZone);
	});

	$effect(() => {
		if (browserTimeZone === 'your local time zone') {
			return;
		}

		const nextKey = data.editingSlot
			? `${data.editingSlot.id}:${data.editingSlot.startTime}`
			: 'new';
		if (nextKey !== hydratedEditKey) {
			applyFormDefaults(browserTimeZone);
			hydratedEditKey = nextKey;
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
	const formNotice = $derived(
		form?.section === 'createSlot' || form?.section === 'updateSlot' ? form : null
	);
</script>

<div class="page">
	<PageHeader
		eyebrow="Hosted sessions"
		title="Manage hosted sessions and share your next available time"
		description="Review incoming requests and open new times when you are ready to meet."
	/>

	<div class="split">
		<Panel title={data.editingSlot ? 'Edit this session' : 'Share a new time'}>
			<form
				class="form-grid"
				method="POST"
				action={data.editingSlot ? '?/updateSlot' : '?/createSlot'}
			>
				{#if data.editingSlot}
					<input type="hidden" name="slotId" value={data.editingSlot.id} />
					<div class="detail-card compact-card">
						<p><strong>Editing one session only</strong></p>
						<p>
							This change applies only to the selected occurrence. Other repeated sessions stay as
							they are.
						</p>
						<a class="button secondary" href={resolve('/mentor-bookings')}>Cancel editing</a>
					</div>
				{/if}
				<input type="hidden" name="timezoneOffsetMinutes" value={String(timezoneOffsetMinutes)} />
				<div class="field">
					<label for="title">Session title</label>
					<input
						id="title"
						name="title"
						type="text"
						bind:value={title}
						placeholder="Career planning session"
					/>
				</div>
				<div class="split">
					<div class="field">
						<label for="bookingMode">Session format</label>
						<select id="bookingMode" name="bookingMode" bind:value={bookingMode}>
							<option value="open">Mentee chooses the topic</option>
							<option value="preset">Mentor sets the agenda</option>
						</select>
					</div>
					{#if !data.editingSlot}
						<div class="field">
							<label for="repeatRule">Repeats</label>
							<select id="repeatRule" name="repeatRule" bind:value={repeatMode}>
								{#each repeatOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					{/if}
					{#if !data.editingSlot && repeatMode !== 'once'}
						<div class="field">
							<label for="repeatCount">Occurrences</label>
							<input
								id="repeatCount"
								name="repeatCount"
								type="number"
								min="2"
								max="30"
								bind:value={repeatCount}
								required
							/>
						</div>
					{/if}
				</div>
				{#if !data.editingSlot}
					<p class="subtle field-note">
						Repeated sessions are published as separate occurrences, so you can edit or delete one
						middle session later without changing the rest.
					</p>
				{/if}
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
							bind:value={durationMins}
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
							bind:value={presetTopic}
							placeholder="Mock interview debrief"
							required
						/>
					</div>
					<div class="field">
						<label for="presetDescription">Preset description</label>
						<textarea
							id="presetDescription"
							name="presetDescription"
							bind:value={presetDescription}
							placeholder="Tell mentees what this session already covers."
						></textarea>
					</div>
				{/if}
				<div class="split">
					<div class="field">
						<label for="locationType">Location type</label>
						<select id="locationType" name="locationType" bind:value={locationType}>
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
							max="20"
							inputmode="numeric"
							bind:value={maxParticipants}
							required
						/>
						<p class="subtle field-note">Use a whole number from 1 to 20.</p>
					</div>
				</div>
				<div class="split">
					<div class="field">
						<label for="city">City</label>
						<input
							id="city"
							name="city"
							type="text"
							bind:value={city}
							placeholder="Melbourne"
							required
						/>
					</div>
					<div class="field">
						<label for="address">Address</label>
						<input
							id="address"
							name="address"
							type="text"
							bind:value={address}
							placeholder="Office or meeting link"
							required
						/>
					</div>
				</div>
				<div class="field">
					<label for="note">Note</label>
					<textarea id="note" name="note" bind:value={note} placeholder="Optional prep instructions"
					></textarea>
				</div>
				{#if formNotice?.message}
					<p class:form-success={formNotice?.success} class="form-error">{formNotice.message}</p>
				{/if}
				<button class="button primary" type="submit">
					{data.editingSlot
						? 'Update this session'
						: repeatMode === 'once'
							? 'Publish session'
							: 'Publish recurring sessions'}
				</button>
			</form>
		</Panel>

		<Panel title="Your available times">
			{#if data.slots.length === 0}
				<div class="detail-card">
					<p>No slots published yet.</p>
				</div>
			{:else}
				<p class="subtle field-note slot-list-note">
					Each row below is one real occurrence. Editing or deleting here affects only that single
					session.
				</p>
				<div class="card-list slot-list">
					{#each data.slots as slot (slot.id)}
						<article class="detail-card request-card slot-card">
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
								<span
									class={`status ${slot.bookingStatus === 'completed' ? 'completed' : slot.isBooked ? 'accepted' : 'pending'}`}
								>
									{slot.bookingStatus === 'completed'
										? 'Completed'
										: slot.isBooked
											? 'Booked'
											: 'Available'}
								</span>
							</div>
							{#if slot.note}
								<p>{slot.note}</p>
							{/if}
							{#if slot.currentBookingId && slot.bookingStatus === 'accepted'}
								<div class="cta-row">
									<form method="POST" action="?/complete">
										<input type="hidden" name="bookingId" value={slot.currentBookingId} />
										<button class="button primary" type="submit">Mark complete</button>
									</form>
									<form method="POST" action="?/cancel">
										<input type="hidden" name="bookingId" value={slot.currentBookingId} />
										<button class="button secondary" type="submit">Cancel session</button>
									</form>
								</div>
								<p class="subtle field-note">
									Booked sessions stay locked. Finish or cancel the live booking instead of editing
									the slot.
								</p>
							{:else if slot.bookingStatus === 'completed'}
								<p class="subtle field-note">
									This session has been completed and is kept here for record keeping until the time
									passes.
								</p>
							{:else}
								<div class="cta-row">
									<form method="GET" action={resolve('/mentor-bookings')}>
										<input type="hidden" name="editSlotId" value={slot.id} />
										<button class="button secondary" type="submit">Edit this session</button>
									</form>
									<form method="POST" action="?/deleteSlot">
										<input type="hidden" name="slotId" value={slot.id} />
										<button class="button secondary" type="submit">Remove availability</button>
									</form>
								</div>
							{/if}
							{#if (form?.section === 'deleteSlot' && form?.slotId === slot.id && form?.message) || ((form?.section === 'cancel' || form?.section === 'complete') && form?.bookingId === slot.currentBookingId && form?.message)}
								<p class:form-success={form?.success} class="form-error">{form.message}</p>
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
			<div class="cta-row filter-row booking-filter-row">
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

		<section class="card-list booking-results">
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
						<div class="request-compact-card">
							<div class="request-compact-header">
								<div class="mentor-card-header grow">
									<ProfileAvatar
										name={booking.counterpart.fullName}
										src={booking.counterpart.profileImageUrl}
									/>
									<div class="request-compact-title">
										<h3>{booking.topic}</h3>
										<p>Mentee: {booking.counterpart.fullName}</p>
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
									href={resolve('/members/[id]', { id: String(booking.counterpart.id) })}
								>
									View mentee
								</a>
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
									<form method="POST" action="?/complete">
										<input type="hidden" name="bookingId" value={booking.id} />
										<button class="button primary" type="submit">Mark complete</button>
									</form>
									<form method="POST" action="?/cancel">
										<input type="hidden" name="bookingId" value={booking.id} />
										<button class="button secondary" type="submit">Cancel session</button>
									</form>
								{/if}
							</div>
						</div>
						{#if (form?.section === 'respond' || form?.section === 'cancel' || form?.section === 'complete') && form?.bookingId === booking.id && form?.message}
							<p class:form-success={form?.success} class="form-error">{form.message}</p>
						{/if}
					</article>
				{/each}
			{/if}
		</section>
	</Panel>
</div>

<style>
	.compact-card {
		padding: 0.95rem 1rem;
		border: 1px solid rgba(15, 23, 42, 0.08);
		border-radius: 1rem;
		background: rgba(248, 250, 252, 0.92);
	}

	.compact-card p {
		margin: 0;
	}

	.slot-list-note {
		margin-bottom: 1rem;
	}

	.slot-card {
		gap: 0.85rem;
	}
</style>
