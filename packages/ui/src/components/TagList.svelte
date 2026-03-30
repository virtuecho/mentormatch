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
    gap: 0.45rem;
  }

  span {
    display: inline-flex;
    align-items: center;
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    background: rgba(15, 118, 110, 0.12);
    color: #0f766e;
    font-size: 0.8rem;
    font-weight: 600;
  }
</style>
