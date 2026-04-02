<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatLabel } from '@mentormatch/shared';
	import { PageHeader, Panel, TagList } from '@mentormatch/ui';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

	let { data, form } = $props();

	function getSections() {
		return [
			{
				key: 'admins',
				title: 'Admins',
				description:
					'Admin accounts can have their public profile information updated, but their role stays locked.',
				users: data.admins
			},
			{
				key: 'mentors',
				title: 'Mentors',
				description:
					'Approved mentors can be reviewed, edited, filtered in slot management, or revoked back to mentee mode.',
				users: data.mentors
			},
			{
				key: 'members',
				title: 'Members',
				description:
					'Mentee accounts can be edited directly and promoted into mentor mode without a separate application flow.',
				users: data.members
			}
		];
	}

	function getRoleLabel(user: (typeof data.users)[number]) {
		if (user.role === 'admin') {
			return 'Admin';
		}

		return user.isMentorApproved ? 'Mentor' : 'Mentee';
	}

	function getRequestLabel(status: string | null) {
		if (!status) {
			return null;
		}

		return formatLabel(status);
	}
</script>

<div class="page">
	<PageHeader
		eyebrow="Admin"
		title="Manage users"
		description="Review every account, edit public profile information, and promote or revoke mentor access without touching personal passwords."
	/>

	<div class="cta-row">
		<a class="button secondary" href={resolve('/admin/review')}>Review applications</a>
		<a class="button secondary" href={resolve('/admin/slots')}>Manage slots</a>
	</div>

	<div class="grid stats">
		<Panel title="All users">
			<p class="stat-value">{data.users.length}</p>
		</Panel>
		<Panel title="Mentors">
			<p class="stat-value">{data.mentors.length}</p>
		</Panel>
		<Panel title="Members">
			<p class="stat-value">{data.members.length}</p>
		</Panel>
	</div>

	{#each getSections() as section (section.key)}
		<section class="stack">
			<div class="section-copy">
				<h2>{section.title}</h2>
				<p>{section.description}</p>
			</div>

			<div class="card-list">
				{#if section.users.length === 0}
					<Panel>
						<div class="detail-card">
							<h3>No users in this section</h3>
							<p>{section.title} will appear here when available.</p>
						</div>
					</Panel>
				{:else}
					{#each section.users as user (user.id)}
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
											Application {getRequestLabel(user.latestMentorRequestStatus)}
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
			</div>
		</section>
	{/each}
</div>

<style>
	.stat-value {
		margin: 0;
		font-size: 2.4rem;
		font-weight: 800;
		line-height: 1;
	}

	.section-copy h2,
	.section-copy p,
	.meta-row p {
		margin: 0;
	}

	.section-copy p {
		color: #475569;
		max-width: 70ch;
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}
</style>
