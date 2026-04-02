<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatLabel } from '@mentormatch/shared';
	import { PageHeader, Panel } from '@mentormatch/ui';

	let { data, form } = $props();

	let showApplicationDialog = $state(false);

	const latestRequest = $derived(data.profile.profile.mentorRequest);
	const applicationDraft = $derived(
		form?.section === 'submit' && form?.values
			? { ...data.applicationDraft, ...form.values }
			: data.applicationDraft
	);

	$effect(() => {
		if (form?.section === 'submit') {
			showApplicationDialog = !form.success;
		}
	});

	function getApplicationActionLabel(status: string | null | undefined) {
		switch (status) {
			case 'pending':
				return 'Review application';
			case 'rejected':
				return 'Update application';
			case 'withdrawn':
				return 'Apply again';
			default:
				return 'Start application';
		}
	}

	function getStatusHeadline(status: string | null | undefined) {
		switch (status) {
			case 'pending':
				return 'Application under review';
			case 'approved':
				return 'Approved to mentor';
			case 'rejected':
				return 'Application needs updates';
			case 'withdrawn':
				return 'Application withdrawn';
			default:
				return 'Ready when you are';
		}
	}

	function getStatusCopy(status: string | null | undefined) {
		switch (status) {
			case 'pending':
				return 'Your latest submission is in the review queue. You can still update the form and resubmit, or withdraw it until an admin reviews it.';
			case 'approved':
				return 'The MentorMatch admin team has approved your application. You can host sessions now and still book other mentors as a mentee.';
			case 'rejected':
				return 'Your last application was reviewed but not approved yet. Update the optional details below and send a refreshed version whenever you want.';
			case 'withdrawn':
				return 'You pulled back your last application before review. Nothing is locked, and you can send a new version whenever you are ready.';
			default:
				return 'The application is intentionally lightweight. If your public profile is already set up, you can submit with little or no extra information.';
		}
	}
</script>

<div class="page">
	<PageHeader
		eyebrow="Become a mentor"
		title="Apply to become a MentorMatch mentor"
		description="Start with a lightweight application, add extra detail only when it helps, and manage the request from one place."
	/>

	<Panel title="Mentor status">
		<div class="application-overview">
			<div class="status-grid">
				<article class="detail-card status-card">
					<p class="eyebrow">Account role</p>
					<h3>{formatLabel(data.profile.role)}</h3>
				</article>
				<article class="detail-card status-card">
					<p class="eyebrow">Mentor access</p>
					<h3>{data.profile.isMentorApproved ? 'Approved' : 'Not yet approved'}</h3>
				</article>
				<article class="detail-card status-card">
					<p class="eyebrow">Latest application</p>
					<h3>{latestRequest?.status ? formatLabel(latestRequest.status) : 'Not submitted yet'}</h3>
					{#if latestRequest?.submitted_at}
						<p>Submitted {new Date(latestRequest.submitted_at).toLocaleString()}</p>
					{/if}
				</article>
			</div>

			<div class="detail-card status-copy-card">
				<h3>{getStatusHeadline(latestRequest?.status)}</h3>
				<p>{getStatusCopy(latestRequest?.status)}</p>
			</div>

			<div class="cta-row">
				{#if data.profile.isMentorApproved}
					<a class="button primary" href={resolve('/mentor-bookings')}>Open hosted sessions</a>
					<a class="button secondary" href={resolve('/dashboard')}>Book other mentors</a>
				{:else}
					<button
						class="button primary"
						type="button"
						onclick={() => (showApplicationDialog = true)}
					>
						{getApplicationActionLabel(latestRequest?.status)}
					</button>
					{#if latestRequest?.status === 'pending'}
						<form method="POST" action="?/withdraw">
							<button class="button secondary" type="submit">Withdraw application</button>
						</form>
					{/if}
				{/if}
			</div>

			{#if form?.section === 'withdraw' && form?.message}
				<p class:form-success={form?.success} class="form-error">{form.message}</p>
			{/if}
			{#if form?.section === 'submit' && form?.success && form?.message}
				<p class="form-success">{form.message}</p>
			{/if}
		</div>
	</Panel>

	{#if showApplicationDialog && !data.profile.isMentorApproved}
		<div
			class="application-modal-backdrop"
			role="presentation"
			onclick={(event) => {
				if (event.target === event.currentTarget) {
					showApplicationDialog = false;
				}
			}}
		>
			<div
				class="application-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="mentor-application-title"
			>
				<div class="application-modal-header">
					<div class="stack compact">
						<p class="eyebrow">Mentor application</p>
						<h2 id="mentor-application-title">Submit your mentor application</h2>
						<p class="subtle">
							Everything here is optional. Use commas or line breaks for skills and mentorship
							areas.
						</p>
					</div>
					<button
						class="button secondary modal-close"
						type="button"
						onclick={() => (showApplicationDialog = false)}
					>
						Close
					</button>
				</div>

				{#if latestRequest?.status === 'pending'}
					<div class="detail-card compact-card">
						<p><strong>Updating an existing request</strong></p>
						<p>
							Submitting again replaces your current pending application instead of creating a
							duplicate.
						</p>
					</div>
				{/if}

				<form class="form-grid application-form" method="POST" action="?/submit">
					<div class="split">
						<div class="field">
							<label for="fullName">Full name</label>
							<input id="fullName" name="fullName" type="text" value={applicationDraft.fullName} />
						</div>
						<div class="field">
							<label for="phone">Phone</label>
							<input id="phone" name="phone" type="text" value={applicationDraft.phone} />
						</div>
					</div>

					<div class="split">
						<div class="field">
							<label for="linkedinUrl">LinkedIn URL</label>
							<input
								id="linkedinUrl"
								name="linkedinUrl"
								type="text"
								inputmode="url"
								autocomplete="url"
								value={applicationDraft.linkedinUrl}
								placeholder="linkedin.com/in/your-name"
							/>
						</div>
						<div class="field">
							<label for="experienceRange">Experience range</label>
							<select
								id="experienceRange"
								name="experienceRange"
								value={applicationDraft.experienceRange}
							>
								<option value="">Select experience</option>
								<option value="1-2">1-2 years</option>
								<option value="3-5">3-5 years</option>
								<option value="6-10">6-10 years</option>
								<option value="10+">10+ years</option>
							</select>
						</div>
					</div>

					<div class="split">
						<div class="field">
							<label for="currentTitle">Current position</label>
							<input
								id="currentTitle"
								name="currentTitle"
								type="text"
								value={applicationDraft.currentTitle}
								placeholder="Senior Software Engineer"
							/>
						</div>
						<div class="field">
							<label for="company">Current company</label>
							<input
								id="company"
								name="company"
								type="text"
								value={applicationDraft.company}
								placeholder="MentorMatch"
							/>
						</div>
					</div>

					<div class="field">
						<label for="industry">Industry</label>
						<input
							id="industry"
							name="industry"
							type="text"
							value={applicationDraft.industry}
							placeholder="Technology"
						/>
					</div>

					<div class="split">
						<div class="field">
							<label for="professionalSkills">Professional skills</label>
							<textarea
								id="professionalSkills"
								name="professionalSkills"
								placeholder="Product strategy, UX research, stakeholder management"
								>{applicationDraft.professionalSkills}</textarea
							>
							<p class="subtle field-note">
								Optional. Separate multiple entries with commas or line breaks.
							</p>
						</div>
						<div class="field">
							<label for="mentorshipAreas">Mentorship areas</label>
							<textarea
								id="mentorshipAreas"
								name="mentorshipAreas"
								placeholder="Career transitions, interview prep, leadership coaching"
								>{applicationDraft.mentorshipAreas}</textarea
							>
							<p class="subtle field-note">Optional. Describe the topics you want to mentor on.</p>
						</div>
					</div>

					<div class="split">
						<div class="field">
							<label for="university">University</label>
							<input
								id="university"
								name="university"
								type="text"
								value={applicationDraft.university}
							/>
						</div>
						<div class="field">
							<label for="degree">Degree</label>
							<input id="degree" name="degree" type="text" value={applicationDraft.degree} />
						</div>
					</div>

					<div class="field">
						<label for="major">Major</label>
						<input id="major" name="major" type="text" value={applicationDraft.major} />
					</div>

					<div class="field">
						<label for="bio">Personal bio</label>
						<textarea id="bio" name="bio" placeholder="What perspective would mentees benefit from?"
							>{applicationDraft.bio}</textarea
						>
					</div>

					<div class="field">
						<label for="documentUrl">Supporting document link</label>
						<input
							id="documentUrl"
							name="documentUrl"
							type="text"
							inputmode="url"
							autocomplete="url"
							value={applicationDraft.documentUrl}
							placeholder="drive.google.com/file/... or your-site.com/resume.pdf"
						/>
						<p class="subtle field-note">
							Optional. Paste a full link or just the domain. We will format it for you.
						</p>
					</div>

					<div class="field">
						<label for="note">Anything else we should know?</label>
						<textarea
							id="note"
							name="note"
							placeholder="Briefly describe your mentoring background or context"
							>{applicationDraft.note}</textarea
						>
					</div>

					{#if form?.section === 'submit' && form?.message && !form?.success}
						<p class="form-error">{form.message}</p>
					{/if}

					<div class="cta-row">
						<button class="button primary" type="submit">
							{latestRequest ? 'Submit updated application' : 'Send application'}
						</button>
						<button
							class="button secondary"
							type="button"
							onclick={() => (showApplicationDialog = false)}
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

<style>
	.application-overview {
		display: grid;
		gap: 1rem;
	}

	.status-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	}

	.status-card {
		padding: 1rem;
		border-radius: 1rem;
		background: rgba(248, 250, 252, 0.85);
		border: 1px solid rgba(15, 23, 42, 0.08);
	}

	.status-card h3,
	.status-card p,
	.status-copy-card h3,
	.status-copy-card p {
		margin: 0;
	}

	.status-copy-card {
		padding: 1.1rem 1.15rem;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.86);
		border: 1px solid rgba(15, 23, 42, 0.08);
	}

	.application-modal-backdrop {
		position: fixed;
		inset: 0;
		padding: 1rem;
		display: grid;
		place-items: center;
		background: rgba(15, 23, 42, 0.45);
		backdrop-filter: blur(8px);
		z-index: 40;
	}

	.application-modal {
		width: min(100%, 70rem);
		max-height: min(92vh, 72rem);
		overflow: auto;
		padding: 1.25rem;
		border-radius: 1.4rem;
		background: linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(237, 244, 251, 0.98));
		box-shadow: 0 30px 80px rgba(15, 23, 42, 0.22);
		border: 1px solid rgba(255, 255, 255, 0.55);
		display: grid;
		gap: 1rem;
	}

	.application-modal-header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
	}

	.application-modal-header h2,
	.application-modal-header p {
		margin: 0;
	}

	.modal-close {
		flex: 0 0 auto;
	}

	.application-form {
		gap: 1.1rem;
	}

	.application-form textarea {
		min-height: 7.5rem;
	}

	.compact-card {
		padding: 0.95rem 1rem;
		border: 1px solid rgba(15, 23, 42, 0.08);
		border-radius: 1rem;
		background: rgba(248, 250, 252, 0.92);
	}

	.compact-card p {
		margin: 0;
	}

	@media (max-width: 720px) {
		.application-modal-backdrop {
			padding: 0.65rem;
		}

		.application-modal {
			max-height: 100vh;
			padding: 1rem;
			border-radius: 1.1rem;
		}

		.application-modal-header {
			flex-direction: column;
			align-items: stretch;
		}

		.modal-close,
		.application-form .button {
			width: 100%;
		}
	}
</style>
