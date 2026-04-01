<script lang="ts">
	import { PageHeader, Panel } from '@mentormatch/ui';

	let { form }: { form: { email?: string; message?: string } | null } = $props();
</script>

<div class="page">
	<PageHeader
		eyebrow="Welcome back"
		title="Log back in"
		description="Log in to manage your sessions, profile, and mentor activity."
	/>

	<div class="split">
		<Panel title="Account login">
			<form method="POST" class="form-grid">
				<div class="field">
					<label for="email">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						placeholder="you@example.com"
						value={form?.email ?? ''}
						autocomplete="email"
						required
					/>
				</div>
				<div class="field">
					<label for="password">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						placeholder="••••••••"
						autocomplete="current-password"
						required
					/>
				</div>
				{#if form?.message}
					<p class="form-error">{form.message}</p>
				{/if}
				<button class="button primary" type="submit">Log in</button>
			</form>
		</Panel>

		<Panel title="Why people use MentorMatch">
			<ul class="detail-list">
				<li>Find mentors who match your goals and experience level.</li>
				<li>Book sessions and keep all your requests in one place.</li>
				<li>Share your experience and mentor others when you are ready.</li>
			</ul>
		</Panel>
	</div>
</div>
