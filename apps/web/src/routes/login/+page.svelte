<script lang="ts">
	import { resolve } from '$app/paths';

	let { form }: { form: { email?: string; message?: string } | null } = $props();

	const loginBenefits = [
		{
			title: 'Find mentors that match the decision in front of you',
			copy: 'Explore focused profiles instead of generic marketplaces and keep the signal high.'
		},
		{
			title: 'Track requests, bookings, and hosted sessions in one place',
			copy: 'The product keeps session planning and follow-through attached to the same account.'
		},
		{
			title: 'Grow into mentoring when you are ready',
			copy: 'Start as a member today and apply for mentor access when you want to guide others.'
		}
	] as const;
</script>

<div class="page auth-page">
	<div class="auth-layout">
		<section class="auth-brand-panel">
			<p class="eyebrow">Welcome back</p>
			<h1>Return to the conversations shaping your next chapter.</h1>
			<p>
				Log in to manage your sessions, profile, and mentor activity without losing sight of what
				comes next.
			</p>

			<div class="auth-stat-grid">
				<div class="auth-stat">
					<strong>Focused</strong>
					<span>Mentor discovery</span>
				</div>
				<div class="auth-stat">
					<strong>Clean</strong>
					<span>Session tracking</span>
				</div>
				<div class="auth-stat">
					<strong>Shared</strong>
					<span>Growth momentum</span>
				</div>
			</div>

			<ul class="auth-proof-list">
				{#each loginBenefits as item (item.title)}
					<li>
						<strong>{item.title}</strong>
						<span>{item.copy}</span>
					</li>
				{/each}
			</ul>
		</section>

		<section class="auth-form-panel">
			<div class="auth-form-shell">
				<p class="surface-caption">Account login</p>
				<h2>Log back in</h2>
				<p>Log in to manage your sessions, profile, and mentor activity.</p>

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

				<p class="inline-note">
					New here? You can create an account first and apply to mentor later from inside your
					workspace.
				</p>

				<div class="auth-link-row">
					<a href={resolve('/signup')}>Create an account</a>
					<a href={resolve('/')}>Back to home</a>
				</div>
			</div>
		</section>
	</div>
</div>
