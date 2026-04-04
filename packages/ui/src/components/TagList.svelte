<script lang="ts">
  interface Props {
    tags?: string[];
  }

  let { tags = [] }: Props = $props();
</script>

<div class="tag-list">
  {#each tags as tag}
    <span>{tag}</span>
  {/each}
</div>

<style>
  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  span {
    display: inline-flex;
    align-items: center;
    padding: 0.4rem 0.78rem;
    border-radius: 999px;
    border: 1px solid rgba(23, 36, 51, 0.08);
    background: linear-gradient(
      180deg,
      rgba(247, 243, 236, 0.95),
      rgba(255, 252, 247, 0.96)
    );
    color: #4b6255;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.7),
      0 10px 20px rgba(27, 38, 49, 0.04);
  }
</style>
