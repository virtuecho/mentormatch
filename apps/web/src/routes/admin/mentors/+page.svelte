<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatLabel } from '@mentormatch/shared';
	import { PageHeader, Panel, TagList } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

	let { data, form } = $props();

	function getRoleLabel(user: (typeof data.users)[number]) {
		if (user.role === 'admin') {
			return 'Admin';
		}

		return user.isMentorApproved ? 'Mentor' : 'Mentee';
	}
</script>

<div class="page">
	<PageHeader
		eyebrow="Admin"
		title="Manage users"
		description="Search every account, edit public profile information, and promote or revoke mentor access without touching personal passwords."
	/>

	<div class="cta-row">
		<a class="button secondary" href={resolve('/admin/review')}>Review applications</a>
		<a class="button secondary" href={resolve('/admin/slots')}>Manage slots</a>
	</div>

	<div class="grid stats">
		<Panel title="All users">
			<p class="stat-value">{data.summary.totalUsers}</p>
		</Panel>
		<Panel title="Admins">
			<p class="stat-value">{data.summary.admins}</p>
		</Panel>
		<Panel title="Mentors">
			<p class="stat-value">{data.summary.mentors}</p>
		</Panel>
		<Panel title="Members">
			<p class="stat-value">{data.summary.members}</p>
		</Panel>
	</div>

	<Panel title="Filter users">
		<form class="form-grid" method="GET">
			<div class="split">
				<div class="field">
					<label for="q">Name, email, or keyword</label>
					<input
						id="q"
						name="q"
						type="search"
						value={data.filters.q}
						placeholder="Search users, skills, or location"
					/>
				</div>
				<div class="field">
					<label for="role">Role group</label>
					<select id="role" name="role" value={data.filters.role}>
						<option value="all">All users</option>
						<option value="admin">Admins</option>
						<option value="mentor">Mentors</option>
						<option value="mentee">Members</option>
					</select>
				</div>
			</div>

			<div class="split">
				<div class="field">
					<label for="sort">Sort by</label>
					<select id="sort" name="sort" value={data.filters.sort}>
						<option value="role_then_name">Role then name</option>
						<option value="name_asc">Name A to Z</option>
						<option value="name_desc">Name Z to A</option>
						<option value="newest">Newest account created first</option>
					</select>
				</div>
				<div class="cta-row search-actions filter-panel-actions">
					<button class="button primary action-button" type="submit">Apply filters</button>
					<a class="button secondary action-button" href={resolve('/admin/mentors')}
						>Clear filters</a
					>
				</div>
			</div>
		</form>

		<p class="subtle results-meta">
			Showing {data.users.length} of {data.pagination.total} matching users.
			{#if data.pagination.total !== data.summary.totalUsers}
				{data.summary.totalUsers} total accounts remain available to review.
			{/if}
		</p>
	</Panel>

	<section class="card-list">
		{#if data.users.length === 0}
			<Panel>
				<div class="detail-card">
					<h3>No users match these filters</h3>
					<p>Try a broader search or clear the current role filter.</p>
				</div>
			</Panel>
		{:else}
			{#each data.users as user (user.id)}
				<Panel>
					<div class="detail-card">
						<div class="mentor-card-header">
							<ProfileAvatar name={user.fullName} src={user.profileImageUrl} />
							<div class="stack compact grow">
								<h3>{user.fullName}</h3>
								<p>{user.email}</p>
								<p>{user.position} · {user.company}</p>
								<p>{user.location ?? 'Location not shared'}</p>
							</div>
							<span class="pill">{getRoleLabel(user)}</span>
						</div>

						<div class="meta-row">
							{#if user.latestMentorRequestStatus}
								<span class={`status ${user.latestMentorRequestStatus}`}>
									Application {formatLabel(user.latestMentorRequestStatus)}
								</span>
							{/if}

							{#if user.expertise.length > 0}
								<p>{user.expertise.join(', ')}</p>
							{/if}
						</div>

						{#if user.mentorSkills.length > 0}
							<TagList tags={user.mentorSkills} />
						{/if}

						<div class="cta-row">
							<form method="GET" action={resolve('/profile')}>
								<input type="hidden" name="userId" value={user.id} />
								<button class="button secondary" type="submit">Edit profile</button>
							</form>

							{#if user.isMentorApproved}
								<form method="GET" action={resolve('/admin/slots')}>
									<input type="hidden" name="mentorId" value={user.id} />
									<button class="button secondary" type="submit">View slots</button>
								</form>
								<form method="POST" action="?/revokeMentor">
									<input type="hidden" name="userId" value={user.id} />
									<button class="button secondary" type="submit">Revoke mentor</button>
								</form>
							{:else if user.role !== 'admin'}
								<form method="POST" action="?/approveMentor">
									<input type="hidden" name="userId" value={user.id} />
									<button class="button primary" type="submit">Promote to mentor</button>
								</form>
							{/if}
						</div>

						{#if form?.userId === user.id && form?.message}
							<p class:form-success={form?.success} class="form-error">{form.message}</p>
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
					<form method="GET" action={resolve('/admin/mentors')}>
						<input type="hidden" name="q" value={data.filters.q} />
						<input type="hidden" name="role" value={data.filters.role} />
						<input type="hidden" name="sort" value={data.filters.sort} />
						<input type="hidden" name="page" value={data.pagination.page - 1} />
						<button class="button secondary" type="submit">Previous</button>
					</form>
				{/if}
				{#if data.pagination.page < data.pagination.totalPages}
					<form method="GET" action={resolve('/admin/mentors')}>
						<input type="hidden" name="q" value={data.filters.q} />
						<input type="hidden" name="role" value={data.filters.role} />
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

	.meta-row p {
		margin: 0;
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.results-meta {
		margin: 0;
	}
</style>
