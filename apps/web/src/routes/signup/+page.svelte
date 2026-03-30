<script lang="ts">
	import { PageHeader, Panel } from '@mentormatch/ui';

	let { form } = $props();
</script>

<div class="page">
	<PageHeader
		eyebrow="Create account"
		title="Start as a mentee or mentor"
		description="Signup is now framed as part of the same application shell, ready to connect to Worker-side auth actions."
	/>

	<Panel title="Registration">
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
			<div class="field">
				<label for="role">Starting role</label>
				<select id="role" name="role">
					<option value="mentee" selected={form?.role !== 'mentor'}>Mentee</option>
					<option value="mentor" selected={form?.role === 'mentor'}>Mentor</option>
				</select>
			</div>
			<div class="field checkbox-field">
				<label class="checkbox-label" for="agreeToTerms">
					<input id="agreeToTerms" name="agreeToTerms" type="checkbox" required />
					<span>I agree to the terms of service and privacy policy</span>
				</label>
			</div>
			<div class="cta-row">
				{#if form?.message}
					<p class="form-error">{form.message}</p>
				{/if}
				<button class="button primary" type="submit">Create account</button>
			</div>
		</form>
	</Panel>
</div>
