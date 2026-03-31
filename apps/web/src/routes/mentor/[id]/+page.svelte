<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader, Panel, TagList } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

	let { data, form } = $props();
</script>

<div class="page">
	<PageHeader
		eyebrow="Mentor profile"
		title={data.mentor.fullName}
		description={data.mentor.bio ?? 'Mentor profile'}
	/>

	{#if data.filters.city || data.filters.date || data.filters.time}
		<Panel title="Active filters">
			<div class="cta-row">
				{#if data.filters.city}
					<span class="pill">City: {data.filters.city}</span>
				{/if}
				{#if data.filters.date}
					<span class="pill">Date: {data.filters.date}</span>
				{/if}
				{#if data.filters.time}
					<span class="pill">Time: {data.filters.time}</span>
				{/if}
				<a class="button secondary" href={resolve('/mentor/[id]', { id: String(data.mentor.id) })}
					>Clear filters</a
				>
			</div>
		</Panel>
	{/if}

	<div class="split">
		<Panel title="Mentor summary">
			<div class="stack">
				<div class="mentor-card-header">
					<ProfileAvatar name={data.mentor.fullName} src={data.mentor.profileImageUrl} size="lg" />
					<div class="stack compact">
						<h3>{data.mentor.fullName}</h3>
						<p>{data.mentor.bio ?? 'Mentor profile'}</p>
					</div>
				</div>
				<p><strong>Email:</strong> {data.mentor.email}</p>
				<p><strong>City:</strong> {data.mentor.location ?? 'Remote'}</p>
				<p><strong>Phone:</strong> {data.mentor.phone ?? 'Not provided'}</p>
				<div class="cta-row">
					<a class="button secondary" href={resolve('/dashboard')}>Back to dashboard</a>
				</div>
				<TagList tags={data.mentor.mentorSkills} />
				<p>{data.mentor.bio ?? 'This mentor has not filled out a public bio yet.'}</p>
			</div>
		</Panel>

		<Panel title="Availability">
			{#if data.mentor.availability.length === 0}
				<div class="detail-card">
					<p>No upcoming availability has been published yet.</p>
				</div>
			{:else}
				<div class="card-list">
					{#each data.mentor.availability as slot (slot.id)}
						<article class="detail-card">
							<h3>{slot.title ?? 'Mentorship session'}</h3>
							<p>{new Date(slot.startTime).toLocaleString()}</p>
							<p>{slot.city} · {slot.address}</p>
							<p>{slot.durationMins} minutes · {slot.maxParticipants} participant(s)</p>
							{#if slot.bookingMode === 'preset'}
								<p><strong>Planned topic:</strong> {slot.presetTopic ?? slot.title ?? 'Session'}</p>
								{#if slot.presetDescription}
									<p>{slot.presetDescription}</p>
								{/if}
							{/if}

							{#if data.viewerCanBook}
								<form method="POST" action="?/book" class="form-grid">
									<input type="hidden" name="availabilitySlotId" value={slot.id} />
									{#if slot.bookingMode === 'preset'}
										<p class="subtle field-note">
											This slot already has a set agenda from the mentor, so you can request it
											directly.
										</p>
									{:else}
										<div class="field">
											<label for={`topic-${slot.id}`}>Topic</label>
											<input
												id={`topic-${slot.id}`}
												name="topic"
												type="text"
												placeholder="What do you want to discuss?"
												required
											/>
										</div>
										<div class="field">
											<label for={`description-${slot.id}`}>Description</label>
											<textarea
												id={`description-${slot.id}`}
												name="description"
												placeholder="Optional details or goals for this session"
											></textarea>
										</div>
									{/if}
									{#if form?.message}
										<p class:form-success={form?.success} class="form-error">{form.message}</p>
									{/if}
									<button class="button primary" type="submit">
										{slot.bookingMode === 'preset' ? 'Request this session' : 'Request this slot'}
									</button>
								</form>
							{/if}
						</article>
					{/each}
				</div>
			{/if}
		</Panel>
	</div>

	<div class="split">
		<Panel title="Experience">
			<div class="detail-list">
				{#if data.mentor.experiences.length === 0}
					<article>
						<p>No experience records published yet.</p>
					</article>
				{:else}
					{#each data.mentor.experiences as experience (`${experience.company}-${experience.position}-${experience.startYear}`)}
						<article>
							<p><strong>{experience.company}</strong></p>
							<p>{experience.position}</p>
							<p>{experience.startYear} - {experience.endYear ?? 'Present'}</p>
							<TagList tags={experience.expertise} />
						</article>
					{/each}
				{/if}
			</div>
		</Panel>

		<Panel title="Education">
			<div class="detail-list">
				{#if data.mentor.educations.length === 0}
					<article>
						<p>No education records published yet.</p>
					</article>
				{:else}
					{#each data.mentor.educations as education (`${education.university}-${education.degree}-${education.startYear}`)}
						<article>
							<p><strong>{education.university}</strong></p>
							<p>{education.degree} · {education.major}</p>
							<p>{education.startYear} - {education.endYear ?? 'Present'}</p>
						</article>
					{/each}
				{/if}
			</div>
		</Panel>
	</div>
</div>
