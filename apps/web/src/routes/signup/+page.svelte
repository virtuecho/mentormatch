<script lang="ts">
	import { PageHeader, Panel } from '@mentormatch/ui';

	let { form } = $props();
</script>

<div class="page">
	<PageHeader
		eyebrow="Create account"
		title="Create your MentorMatch account"
		description="Create an account to browse mentors, book sessions, and manage everything in one place."
	/>

	<Panel title="Create your account">
		<form method="POST" class="split">
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
			<div class="field checkbox-field">
				<label class="checkbox-label" for="agreeToTerms">
					<input id="agreeToTerms" name="agreeToTerms" type="checkbox" required />
					<span>I agree to the terms of service and privacy policy</span>
				</label>
			</div>
			<p class="helper-copy">You can apply to become a mentor later from your account settings.</p>
			<div class="cta-row">
				{#if form?.message}
					<p class="form-error">{form.message}</p>
				{/if}
				<button class="button primary" type="submit">Create account</button>
			</div>
		</form>
	</Panel>
</div>

<style>
	.helper-copy {
		margin: 0;
		color: #475569;
	}
</style>
