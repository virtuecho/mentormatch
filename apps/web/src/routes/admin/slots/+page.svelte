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
		description="Inspect every upcoming mentor slot and remove anything that should no longer stay bookable."
	/>

	<div class="cta-row">
		<a class="button secondary" href={resolve('/admin/review')}>Review applications</a>
		<a class="button secondary" href={resolve('/admin/mentors')}>Manage mentors</a>
		{#if data.selectedMentorId}
			<a class="button secondary" href={resolve('/admin/slots')}>Clear mentor filter</a>
		{/if}
	</div>

	<section class="card-list">
		{#if data.slots.length === 0}
			<Panel>
				<div class="detail-card">
					<h3>No upcoming slots</h3>
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
</div>
