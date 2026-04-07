<script lang="ts">
	import { resolve } from '$app/paths';

	let { form } = $props();

	const signupBenefits = [
		{
			title: 'A cleaner way to find the right mentor',
			copy: 'Browse by expertise, location, and availability without losing context between pages.'
		},
		{
			title: 'Booking and follow-through in the same workspace',
			copy: 'Request sessions, track status, and keep the relationship moving after the calendar invite.'
		},
		{
			title: 'Become a mentor when your experience is ready to serve others',
			copy: 'You can apply for mentor access later without opening a second account.'
		}
	] as const;
</script>

<div class="page auth-page">
	<div class="auth-layout">
		<section class="auth-brand-panel">
			<p class="eyebrow">Create account</p>
			<h1>Create your MentorMatch account</h1>
			<p>Create an account to browse mentors, book sessions, and manage everything in one place.</p>

			<ul class="signup-commitments">
				{#each signupBenefits as item (item.title)}
					<li>
						<strong>{item.title}</strong>
						<span>{item.copy}</span>
					</li>
				{/each}
			</ul>
		</section>

		<section class="auth-form-panel">
			<div class="auth-form-shell">
				<p class="surface-caption">Membership setup</p>
				<h2>Create your account</h2>
				<p>You can apply to become a mentor later from your account settings.</p>

				<form method="POST" class="form-grid">
					<div class="split">
						<div class="field">
							<label for="name">Full name</label>
							<input
								id="name"
								name="fullName"
								type="text"
								placeholder="Jordan Ellis"
								value={form?.fullName ?? ''}
								autocomplete="name"
								required
							/>
						</div>
						<div class="field">
							<label for="signup-email">Email</label>
							<input
								id="signup-email"
								name="email"
								type="email"
								placeholder="jordan@example.com"
								value={form?.email ?? ''}
								autocomplete="email"
								required
							/>
						</div>
					</div>

					<div class="split">
						<div class="field">
							<label for="signup-password">Password</label>
							<input
								id="signup-password"
								name="password"
								type="password"
								placeholder="At least 8 characters"
								autocomplete="new-password"
								required
							/>
						</div>
						<div class="field">
							<label for="signup-password-confirm">Confirm password</label>
							<input
								id="signup-password-confirm"
								name="confirmPassword"
								type="password"
								placeholder="Repeat your password"
								autocomplete="new-password"
								required
							/>
						</div>
					</div>

					<div class="request-card form-grid">
						<label class="checkbox-label" for="agreeToTerms">
							<input id="agreeToTerms" name="agreeToTerms" type="checkbox" required />
							<span>I agree to the terms of service and privacy policy</span>
						</label>
						<p class="inline-note">
							You will start as a member account and can apply to mentor later.
						</p>
					</div>

					{#if form?.message}
						<p class="form-error">{form.message}</p>
					{/if}

					<button class="button primary" type="submit">Create account</button>
				</form>

				<div class="auth-link-row">
					<a href={resolve('/login')}>Already have an account? Log in.</a>
					<a href={resolve('/')}>Back to home</a>
				</div>
			</div>
		</section>
	</div>
</div>
