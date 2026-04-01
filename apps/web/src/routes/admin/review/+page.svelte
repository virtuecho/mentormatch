<script lang="ts">
	import { PageHeader, Panel } from '@mentormatch/ui';

	let { data, form } = $props();
</script>

<div class="page">
	<PageHeader
		eyebrow="Admin"
		title="Review mentor applications"
		description="MentorMatch team admins approve or reject mentor applications before members can start mentoring."
	/>

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
							<div>
								<h3>{request.user.fullName}</h3>
								<p>{request.user.email}</p>
								<p>Submitted {new Date(request.submittedAt).toLocaleString()}</p>
							</div>
							<span class={`status ${request.status}`}>{request.status}</span>
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

						{#if request.status === 'pending'}
							<div class="cta-row">
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
							</div>
						{:else}
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
