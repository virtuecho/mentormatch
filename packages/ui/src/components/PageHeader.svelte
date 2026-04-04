<script lang="ts">
  interface Props {
    eyebrow?: string;
    title: string;
    description?: string;
  }

  let { eyebrow = "", title, description = "" }: Props = $props();
</script>

<header class="page-header">
  {#if eyebrow}
    <div class="eyebrow-row">
      <p class="eyebrow">{eyebrow}</p>
      <span class="eyebrow-rule" aria-hidden="true"></span>
    </div>
  {/if}
  <h1>{title}</h1>
  {#if description}
    <p class="description">{description}</p>
  {/if}
</header>

<style>
  .page-header {
    display: grid;
    gap: 0.8rem;
    max-width: 68rem;
  }

  .eyebrow-row {
    display: inline-flex;
    align-items: center;
    gap: 0.85rem;
  }

  .eyebrow {
    margin: 0;
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.28em;
    color: #5d7665;
    font-weight: 800;
  }

  .eyebrow-rule {
    width: 3.2rem;
    height: 1px;
    background: linear-gradient(90deg, rgba(178, 138, 84, 0.5), transparent);
  }

  h1 {
    margin: 0;
    max-width: 14ch;
    font-family: var(--font-display, Georgia, serif);
    font-size: clamp(2.35rem, 5vw, 4.8rem);
    line-height: 0.94;
    letter-spacing: -0.05em;
    text-wrap: balance;
    color: #172433;
  }

  .description {
    margin: 0;
    max-width: 60ch;
    color: #617180;
    font-size: clamp(1rem, 1.2vw, 1.1rem);
    line-height: 1.7;
    text-wrap: pretty;
  }

  @media (max-width: 640px) {
    .eyebrow-row {
      gap: 0.6rem;
    }

    .eyebrow-rule {
      width: 2rem;
    }

    h1 {
      max-width: none;
    }
  }
</style>
