<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader, Panel, TagList } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

	let { data, form } = $props();

	function formatDateTime(value: string) {
		return new Date(value).toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}
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
					<a class="button secondary" href={data.backHref}>{data.backLabel}</a>
				</div>
				<TagList tags={data.mentor.mentorSkills} />
				<p>{data.mentor.bio ?? 'This mentor has not filled out a public bio yet.'}</p>
			</div>
		</Panel>

		<Panel title="Availability">
			{#if data.availabilityGroups.length === 0}
				<div class="detail-card">
					<p>No upcoming availability has been published yet.</p>
				</div>
			{:else}
				<div class="availability-series-list">
					{#each data.availabilityGroups as group (group.key)}
						<details class="availability-series" open={group.slots.length === 1}>
							<summary class="series-summary">
								<div class="series-summary-copy">
									<div class="series-heading">
										<h3>{group.title}</h3>
										<span class="series-badge">{group.seriesLabel}</span>
									</div>
									<p><strong>Next:</strong> {formatDateTime(group.nextStartTime)}</p>
									<p>{group.city} · {group.address}</p>
									<p>{group.durationMins} minutes · {group.maxParticipants} participant(s)</p>
								</div>
								<span class="series-count">
									{group.availableCount} open
								</span>
							</summary>

							{#if data.viewerCanBook}
								<form method="POST" action="?/book" class="form-grid series-form">
									<input type="hidden" name="groupKey" value={group.key} />

									{#if group.bookingMode === 'preset'}
										<div class="detail-card compact-card">
											<p>
												<strong>Preset agenda:</strong>
												{group.presetTopic ?? group.title ?? 'Mentorship session'}
											</p>
											{#if group.presetDescription}
												<p>{group.presetDescription}</p>
											{:else}
												<p class="subtle">
													The mentor has already set the agenda. Pick one or more upcoming session
													times below.
												</p>
											{/if}
										</div>
									{:else}
										<p class="subtle field-note">
											Select one or more upcoming times. The same topic and description will be used
											for every selected session.
										</p>
										<div class="field">
											<label for={`topic-${group.domId}`}>Topic</label>
											<input
												id={`topic-${group.domId}`}
												name="topic"
												type="text"
												placeholder="What do you want to discuss?"
												required
											/>
										</div>
										<div class="field">
											<label for={`description-${group.domId}`}>Description</label>
											<textarea
												id={`description-${group.domId}`}
												name="description"
												placeholder="Optional details or goals for this session"
											></textarea>
										</div>
									{/if}

									<div class="occurrence-list">
										{#each group.slots as slot (slot.id)}
											<label
												class="occurrence-row"
												class:occurrence-row-disabled={slot.isRequested}
											>
												<input
													type="checkbox"
													name="availabilitySlotId"
													value={slot.id}
													checked={group.slots.length === 1 && !slot.isRequested}
													disabled={slot.isRequested}
												/>
												<div class="occurrence-copy">
													<strong>{formatDateTime(slot.startTime)}</strong>
													{#if slot.note}
														<p>{slot.note}</p>
													{:else}
														<p class="subtle">
															{slot.bookingMode === 'preset'
																? 'Mentor-defined agenda'
																: 'Open agenda'}
														</p>
													{/if}
												</div>
												<span class={`status ${slot.isRequested ? 'completed' : 'pending'}`}>
													{slot.isRequested ? 'Requested' : 'Available'}
												</span>
											</label>
										{/each}
									</div>

									{#if group.allRequested}
										<p class="subtle">
											You already have an active request for every upcoming time in this series.
										</p>
									{/if}

									{#if form?.section === 'book' && form?.groupKey === group.key && form?.message}
										<p class:form-success={form?.success} class="form-error">{form.message}</p>
									{/if}

									<button class="button primary" type="submit" disabled={group.allRequested}>
										{group.slots.length > 1
											? 'Request selected sessions'
											: group.bookingMode === 'preset'
												? 'Request this session'
												: 'Request this slot'}
									</button>
								</form>
							{/if}
						</details>
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

<style>
	.availability-series-list {
		display: grid;
		gap: 0.9rem;
	}

	.availability-series {
		border: 1px solid rgba(15, 23, 42, 0.08);
		border-radius: 1rem;
		background: rgba(248, 250, 252, 0.82);
		overflow: hidden;
	}

	.series-summary {
		list-style: none;
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.05rem;
		cursor: pointer;
		align-items: flex-start;
	}

	.series-summary::-webkit-details-marker {
		display: none;
	}

	.series-summary-copy {
		display: grid;
		gap: 0.35rem;
	}

	.series-summary-copy p,
	.compact-card p,
	.occurrence-copy p {
		margin: 0;
	}

	.series-heading {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		align-items: center;
	}

	.series-heading h3 {
		margin: 0;
	}

	.series-badge,
	.series-count {
		display: inline-flex;
		align-items: center;
		padding: 0.28rem 0.65rem;
		border-radius: 999px;
		background: rgba(37, 99, 235, 0.1);
		color: #1d4ed8;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.series-count {
		white-space: nowrap;
	}

	.series-form {
		padding: 0 1.05rem 1.05rem;
		border-top: 1px solid rgba(15, 23, 42, 0.08);
	}

	.compact-card {
		padding: 0.9rem 1rem;
		background: white;
		border: 1px solid rgba(15, 23, 42, 0.06);
		border-radius: 0.9rem;
	}

	.occurrence-list {
		display: grid;
		gap: 0.65rem;
	}

	.occurrence-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 0.8rem;
		align-items: flex-start;
		padding: 0.85rem 0.95rem;
		border: 1px solid rgba(15, 23, 42, 0.08);
		border-radius: 0.95rem;
		background: white;
	}

	.occurrence-row input {
		margin-top: 0.25rem;
	}

	.occurrence-row-disabled {
		opacity: 0.68;
	}

	.occurrence-copy {
		min-width: 0;
		display: grid;
		gap: 0.25rem;
	}

	@media (max-width: 640px) {
		.series-summary {
			flex-direction: column;
		}

		.occurrence-row {
			grid-template-columns: 1fr;
		}

		.series-count {
			align-self: flex-start;
		}
	}
</style>
