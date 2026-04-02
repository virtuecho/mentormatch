<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatLabel } from '@mentormatch/shared';
	import { PageHeader, Panel } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

	let { data, form } = $props();
</script>

<div class="page">
	<PageHeader
		eyebrow="Admin"
		title="Review mentor applications"
		description="MentorMatch team admins approve or reject mentor applications before members can start mentoring."
	/>

	<div class="cta-row">
		<a class="button secondary" href={resolve('/admin/mentors')}>Manage users</a>
		<a class="button secondary" href={resolve('/admin/slots')}>Manage slots</a>
	</div>

	{#if form?.message}
		<p class:form-success={form?.success} class="form-error">{form.message}</p>
	{/if}

	<section class="card-list">
		{#if data.requests.length === 0}
			<Panel>
				<div class="detail-card">
					<h3>No applications right now</h3>
					<p>New mentor applications will appear here for the team to review.</p>
				</div>
			</Panel>
		{:else}
			{#each data.requests as request (request.id)}
				<Panel>
					<div class="detail-card">
						<div class="booking-row">
							<div class="review-request-header">
								<ProfileAvatar
									name={request.user.fullName}
									src={request.user.profileImageUrl}
									size="lg"
								/>
								<div>
									<h3>{request.user.fullName}</h3>
									<p>{request.user.email}</p>
									<p>Submitted {new Date(request.submittedAt).toLocaleString()}</p>
								</div>
							</div>
							<span class={`status ${request.status}`}>{formatLabel(request.status)}</span>
						</div>

						<p>
							<strong>Document:</strong>
							{#if request.documentUrl}
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a href={request.documentUrl} target="_blank" rel="noreferrer">
									Open supporting file
								</a>
							{:else}
								No supporting file provided
							{/if}
						</p>

						{#if request.note}
							<p>{request.note}</p>
						{/if}

						<div class="cta-row">
							<a
								class="button secondary"
								href={resolve('/members/[id]', { id: String(request.user.id) })}
							>
								View applicant profile
							</a>

							{#if request.status === 'pending'}
								<form method="POST" action="?/review">
									<input type="hidden" name="requestId" value={request.id} />
									<input type="hidden" name="status" value="approved" />
									<button class="button primary" type="submit">Approve</button>
								</form>
								<form method="POST" action="?/review">
									<input type="hidden" name="requestId" value={request.id} />
									<input type="hidden" name="status" value="rejected" />
									<button class="button secondary" type="submit">Reject</button>
								</form>
							{/if}
						</div>

						{#if request.status === 'withdrawn'}
							<p>
								Withdrawn {request.reviewedAt
									? new Date(request.reviewedAt).toLocaleString()
									: 'recently'}.
							</p>
						{:else if request.status !== 'pending'}
							<p>
								Reviewed {request.reviewedAt
									? new Date(request.reviewedAt).toLocaleString()
									: 'recently'}.
							</p>
						{/if}
					</div>
				</Panel>
			{/each}
		{/if}
	</section>
</div>

<style>
	.review-request-header {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.review-request-header h3,
	.review-request-header p {
		margin: 0;
	}

	.review-request-header > div {
		display: grid;
		gap: 0.3rem;
	}

	@media (max-width: 640px) {
		.review-request-header {
			align-items: flex-start;
		}
	}
</style>
