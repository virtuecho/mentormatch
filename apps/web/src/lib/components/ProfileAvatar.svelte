<script lang="ts">
	import { DEFAULT_AVATAR } from '@mentormatch/shared';

	type AvatarSize = 'md' | 'lg';

	interface Props {
		name: string;
		src?: string | null;
		size?: AvatarSize;
	}

	let { name, src = null, size = 'md' }: Props = $props();

	function getInitials(value: string) {
		return (
			value
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((part) => part[0]?.toUpperCase() ?? '')
				.join('') || 'MM'
		);
	}

	const hasCustomImage = $derived(Boolean(src && src !== DEFAULT_AVATAR));
	const initials = $derived(getInitials(name));
</script>

<div class={`avatar ${size}`}>
	{#if hasCustomImage}
		<img {src} alt={`${name} profile photo`} loading="lazy" />
	{:else}
		<span aria-hidden="true">{initials}</span>
	{/if}
</div>

<style>
	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		overflow: hidden;
		border-radius: 999px;
		background: linear-gradient(135deg, rgba(15, 118, 110, 0.16), rgba(37, 99, 235, 0.2));
		color: #0f172a;
		font-weight: 800;
		letter-spacing: 0.04em;
	}

	.avatar.md {
		width: 3rem;
		height: 3rem;
		font-size: 1rem;
	}

	.avatar.lg {
		width: 4.5rem;
		height: 4.5rem;
		font-size: 1.35rem;
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
