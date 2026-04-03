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
		description="Approve or reject mentor applications with searchable queues instead of a single flat list."
	/>

	<div class="cta-row">
		<a class="button secondary" href={resolve('/admin/mentors')}>Manage users</a>
		<a class="button secondary" href={resolve('/admin/slots')}>Manage slots</a>
	</div>

	<div class="grid stats">
		<Panel title="All applications">
			<p class="stat-value">{data.summary.totalRequests}</p>
		</Panel>
		<Panel title="Pending">
			<p class="stat-value">{data.summary.pending}</p>
		</Panel>
		<Panel title="Approved">
			<p class="stat-value">{data.summary.approved}</p>
		</Panel>
		<Panel title="Rejected">
			<p class="stat-value">{data.summary.rejected}</p>
		</Panel>
	</div>

	<Panel title="Filter applications">
		<form class="form-grid" method="GET">
			<div class="split">
				<div class="field">
					<label for="q">Applicant or note</label>
					<input
						id="q"
						name="q"
						type="search"
						value={data.filters.q}
						placeholder="Search applicant, email, or note"
					/>
				</div>
				<div class="field">
					<label for="status">Status</label>
					<select id="status" name="status" value={data.filters.status}>
						<option value="all">All statuses</option>
						<option value="pending">Pending</option>
						<option value="approved">Approved</option>
						<option value="rejected">Rejected</option>
						<option value="withdrawn">Withdrawn</option>
					</select>
				</div>
			</div>

			<div class="split">
				<div class="field">
					<label for="sort">Sort by</label>
					<select id="sort" name="sort" value={data.filters.sort}>
						<option value="status_then_submitted">Status then newest</option>
						<option value="submitted_desc">Newest submitted first</option>
						<option value="submitted_asc">Oldest submitted first</option>
					</select>
				</div>
				<div class="cta-row search-actions filter-panel-actions">
					<button class="button primary action-button" type="submit">Apply filters</button>
					<a class="button secondary action-button" href={resolve('/admin/review')}>Clear filters</a
					>
				</div>
			</div>
		</form>

		<p class="subtle results-meta">
			Showing {data.requests.length} of {data.pagination.total} matching applications.
			{#if data.pagination.total !== data.summary.totalRequests}
				{data.summary.totalRequests} total applications remain in the review archive.
			{/if}
		</p>
	</Panel>

	{#if form?.message}
		<p class:form-success={form?.success} class="form-error">{form.message}</p>
	{/if}

	<section class="card-list">
		{#if data.requests.length === 0}
			<Panel>
				<div class="detail-card">
					<h3>No applications match these filters</h3>
					<p>Try a broader search or switch back to all statuses.</p>
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

	{#if data.pagination.totalPages > 1}
		<div class="pagination-row">
			<p class="subtle pagination-summary">
				Page {data.pagination.page} of {data.pagination.totalPages}
			</p>
			<div class="cta-row">
				{#if data.pagination.page > 1}
					<form method="GET" action={resolve('/admin/review')}>
						<input type="hidden" name="q" value={data.filters.q} />
						<input type="hidden" name="status" value={data.filters.status} />
						<input type="hidden" name="sort" value={data.filters.sort} />
						<input type="hidden" name="page" value={data.pagination.page - 1} />
						<button class="button secondary" type="submit">Previous</button>
					</form>
				{/if}
				{#if data.pagination.page < data.pagination.totalPages}
					<form method="GET" action={resolve('/admin/review')}>
						<input type="hidden" name="q" value={data.filters.q} />
						<input type="hidden" name="status" value={data.filters.status} />
						<input type="hidden" name="sort" value={data.filters.sort} />
						<input type="hidden" name="page" value={data.pagination.page + 1} />
						<button class="button secondary" type="submit">Next</button>
					</form>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.stat-value {
		margin: 0;
		font-size: 2.4rem;
		font-weight: 800;
		line-height: 1;
	}

	.results-meta {
		margin: 0;
	}

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
