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
		border: 1px solid rgba(23, 36, 51, 0.08);
		background:
			radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.36), transparent 34%),
			linear-gradient(145deg, rgba(24, 52, 77, 0.18), rgba(93, 122, 109, 0.26));
		color: #172433;
		font-weight: 800;
		letter-spacing: 0.04em;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.62),
			0 12px 22px rgba(27, 38, 49, 0.07);
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
