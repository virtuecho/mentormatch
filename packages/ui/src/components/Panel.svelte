<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    padded?: boolean;
    children?: Snippet;
  }

  let { title = '', padded = true, children }: Props = $props();
</script>

<section class:padded class="panel">
  {#if title}
    <h2>{title}</h2>
  {/if}
  {@render children?.()}
</section>

<style>
  .panel {
    border-radius: 1.4rem;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);
  }

  .panel.padded {
    padding: 1.4rem;
  }

  h2 {
    margin: 0 0 1rem;
    color: #0f172a;
    font-size: 1.05rem;
  }
</style>
