<script lang="ts">
	import { PageHeader, Panel } from '@mentormatch/ui';

	let { form }: { form: { email?: string; message?: string } | null } = $props();
</script>

<div class="page">
	<PageHeader
		eyebrow="Access"
		title="Log back in"
		description="This shell keeps authentication inside the same full-stack app, ready for cookie-based sessions on the Worker."
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

		<Panel title="What changes with the new stack">
			<ul class="detail-list">
				<li>Frontend and backend now share one Worker deployment target.</li>
				<li>Auth flows can stay server-side instead of being split across two deployments.</li>
				<li>New features can plug into shared feature packages and route handlers.</li>
			</ul>
		</Panel>
	</div>
</div>
