<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    title?: string;
    padded?: boolean;
    children?: Snippet;
  }

  let { title = "", padded = true, children }: Props = $props();
</script>

<section class:padded class="panel">
  <div class="panel-glow" aria-hidden="true"></div>
  {#if title}
    <div class="panel-header">
      <h2>{title}</h2>
    </div>
  {/if}
  <div class="panel-body">
    {@render children?.()}
  </div>
</section>

<style>
  .panel {
    position: relative;
    border-radius: 1.8rem;
    background: linear-gradient(
      180deg,
      rgba(255, 254, 250, 0.94),
      rgba(250, 245, 238, 0.92)
    );
    border: 1px solid rgba(23, 36, 51, 0.08);
    box-shadow:
      0 26px 60px rgba(27, 38, 49, 0.07),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);
    overflow: hidden;
    isolation: isolate;
  }

  .panel-glow {
    position: absolute;
    inset: 0 auto auto 0;
    width: 100%;
    height: 7rem;
    background: linear-gradient(
      135deg,
      rgba(178, 138, 84, 0.12),
      transparent 65%
    );
    pointer-events: none;
  }

  .panel.padded {
    padding: 1.45rem;
  }

  .panel-header {
    position: relative;
    z-index: 1;
    margin-bottom: 1rem;
  }

  h2 {
    margin: 0;
    font-family: var(--font-display, Georgia, serif);
    color: #172433;
    font-size: 1.3rem;
    line-height: 1.05;
    letter-spacing: -0.03em;
  }

  .panel-body {
    position: relative;
    z-index: 1;
  }
</style>
