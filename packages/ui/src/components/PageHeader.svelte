<script lang="ts">
  interface Props {
    eyebrow?: string;
    title: string;
    description?: string;
  }

  let { eyebrow = '', title, description = '' }: Props = $props();
</script>

<header class="page-header">
  {#if eyebrow}
    <p class="eyebrow">{eyebrow}</p>
  {/if}
  <h1>{title}</h1>
  {#if description}
    <p class="description">{description}</p>
  {/if}
</header>

<style>
  .page-header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .eyebrow {
    margin: 0;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: #0f766e;
    font-weight: 700;
  }

  h1 {
    margin: 0;
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.05;
    color: #0f172a;
  }

  .description {
    margin: 0;
    max-width: 60ch;
    color: #475569;
    line-height: 1.6;
  }
</style>
