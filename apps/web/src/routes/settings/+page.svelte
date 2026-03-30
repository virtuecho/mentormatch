<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader, Panel } from '@mentormatch/ui';
	let { data, form } = $props();
</script>

<div class="page">
	<PageHeader
		eyebrow="Settings"
		title="Account and mentor mode"
		description="Settings now live inside the same full-stack app, with role switching and verification state backed by Worker-side actions."
	/>

	<div class="split">
		<Panel title="Account">
			<div class="stack">
				<p><strong>Email:</strong> {data.profile.email}</p>
				<p><strong>Current role:</strong> <span class="pill">{data.profile.role}</span></p>
				<p>
					<strong>Mentor approval:</strong>
					{data.profile.isMentorApproved ? 'Approved' : 'Not approved yet'}
				</p>
			</div>
		</Panel>

		<Panel title="Mentor mode">
			<form class="form-grid" method="POST" action="?/toggleRole">
				<input
					type="hidden"
					name="role"
					value={data.profile.role === 'mentor' ? 'mentee' : 'mentor'}
				/>
				<p>
					Switch between mentee and mentor mode. If mentor approval has not been granted yet, the
					server will reject the switch.
				</p>

				{#if form?.message}
					<p class:form-success={form?.success} class="form-error">{form.message}</p>
				{/if}

				<button class="button primary" type="submit">
					Switch to {data.profile.role === 'mentor' ? 'mentee' : 'mentor'} mode
				</button>

				{#if !data.profile.isMentorApproved}
					<a class="button secondary" href={resolve('/mentor-verification')}
						>Apply for mentor verification</a
					>
				{/if}
			</form>
		</Panel>
	</div>

	<Panel title="Account management">
		<div class="detail-list">
			<article>
				<p>
					Change password and account deactivation flows have not been wired yet in the new app.
				</p>
			</article>
		</div>
	</Panel>
</div>
