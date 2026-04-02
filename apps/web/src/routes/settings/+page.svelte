<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatLabel } from '@mentormatch/shared';
	import { PageHeader, Panel } from '@mentormatch/ui';
	let { data, form } = $props();

	function getMentorStatusLabel(profile: (typeof data)['profile']) {
		if (profile.role === 'admin') {
			return 'Not applicable';
		}

		if (profile.isMentorApproved) {
			return 'Approved';
		}

		if (profile.profile.mentorRequest?.status === 'pending') {
			return 'Under review';
		}

		if (profile.profile.mentorRequest?.status === 'rejected') {
			return 'Needs updates';
		}

		if (profile.profile.mentorRequest?.status === 'withdrawn') {
			return 'Withdrawn';
		}

		return 'Not submitted';
	}

	function getMentorActionLabel(
		mentorRequest: (typeof data)['profile']['profile']['mentorRequest']
	) {
		if (mentorRequest?.status === 'rejected') {
			return 'Update mentor application';
		}

		if (mentorRequest?.status === 'withdrawn') {
			return 'Apply again';
		}

		if (mentorRequest) {
			return 'View mentor application';
		}

		return 'Apply to mentor';
	}
</script>

<div class="page">
	<PageHeader
		eyebrow="Settings"
		title="Account settings"
		description="Manage your account, password, mentor status, and personal preferences."
	/>

	<div class="split">
		<Panel title="Account">
			<div class="stack">
				<p><strong>Email:</strong> {data.profile.email}</p>
				<p>
					<strong>Current role:</strong> <span class="pill">{formatLabel(data.profile.role)}</span>
				</p>
				<p><strong>Mentor status:</strong> {getMentorStatusLabel(data.profile)}</p>
			</div>
		</Panel>

		{#if data.profile.role !== 'admin'}
			<Panel title="Mentor status">
				<div class="form-grid">
					<p>
						Apply to mentor from this page, then wait for a MentorMatch admin to review your
						application. Once approved, mentor tools are added to your account and you can still
						book other mentors as a mentee.
					</p>

					{#if data.profile.isMentorApproved}
						<p>Your mentor approval stays active. Existing accepted sessions remain in place.</p>
						<div class="cta-row">
							<a class="button primary" href={resolve('/mentor-bookings')}>Open hosted sessions</a>
							<a class="button secondary" href={resolve('/dashboard')}>Book other mentors</a>
						</div>
					{:else}
						<a class="button primary" href={resolve('/mentor-verification')}>
							{getMentorActionLabel(data.profile.profile.mentorRequest)}
						</a>
					{/if}
				</div>
			</Panel>
		{:else}
			<Panel title="Admin mode">
				<div class="form-grid">
					<p>
						MentorMatch admins approve mentor applications from the review queue before someone can
						start mentoring. You can enter the same admin view from Home or directly here.
					</p>
					<a class="button primary" href={resolve('/admin/review')}>Open review applications</a>
				</div>
			</Panel>
		{/if}
	</div>

	<div class="split">
		<Panel title="Change password">
			<form class="form-grid" method="POST" action="?/changePassword">
				<div class="field">
					<label for="currentPassword">Current password</label>
					<input
						id="currentPassword"
						name="currentPassword"
						type="password"
						autocomplete="current-password"
						required
					/>
				</div>
				<div class="split">
					<div class="field">
						<label for="newPassword">New password</label>
						<input
							id="newPassword"
							name="newPassword"
							type="password"
							autocomplete="new-password"
							required
						/>
					</div>
					<div class="field">
						<label for="confirmPassword">Confirm new password</label>
						<input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							autocomplete="new-password"
							required
						/>
					</div>
				</div>

				{#if form?.section === 'password' && form?.message}
					<p class:form-success={form?.success} class="form-error">{form.message}</p>
				{/if}

				<button class="button primary" type="submit">Update password</button>
			</form>
		</Panel>

		{#if data.profile.role === 'admin'}
			<Panel title="Account protection">
				<div class="form-grid">
					<p>Admin accounts are protected and cannot be deleted from account settings.</p>
					<p class="subtle">
						Use a separate non-admin account if you need to test account deletion.
					</p>
				</div>
			</Panel>
		{:else}
			<Panel title="Delete account">
				<form class="form-grid" method="POST" action="?/deleteAccount">
					<p>This will permanently remove your account, profile, sessions, and requests.</p>
					<div class="field">
						<label for="deletePassword">Password</label>
						<input
							id="deletePassword"
							name="password"
							type="password"
							autocomplete="current-password"
							required
						/>
					</div>
					<div class="field">
						<label for="confirmation">Type DELETE to confirm</label>
						<input
							id="confirmation"
							name="confirmation"
							type="text"
							placeholder="DELETE"
							required
						/>
					</div>

					{#if form?.section === 'delete' && form?.message}
						<p class="form-error">{form.message}</p>
					{/if}

					<button class="button secondary" type="submit">Delete account</button>
				</form>
			</Panel>
		{/if}
	</div>
</div>
