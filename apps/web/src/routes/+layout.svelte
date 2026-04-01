<script lang="ts">
	import { page } from '$app/state';
	import { AppFrame } from '@mentormatch/ui';

	import '$lib/styles/app.css';

	let { data, children } = $props();
</script>

<AppFrame navItems={data.navItems} currentPath={page.url.pathname} user={data.user}>
	{@render children()}
</AppFrame>
