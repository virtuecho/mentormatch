<script lang="ts">
  interface Props {
    label: string;
    value: string;
    tone?: 'teal' | 'blue' | 'amber' | 'slate';
  }

  let { label, value, tone = 'slate' }: Props = $props();
</script>

<article class={`stat-card ${tone}`}>
  <p>{label}</p>
  <strong>{value}</strong>
</article>

<style>
  .stat-card {
    padding: 1rem 1.1rem;
    border-radius: 1.2rem;
    color: #0f172a;
  }

  .stat-card p {
    margin: 0;
    font-size: 0.88rem;
    color: #475569;
  }

  .stat-card strong {
    display: block;
    margin-top: 0.35rem;
    font-size: 1.8rem;
    line-height: 1;
  }

  .slate {
    background: rgba(148, 163, 184, 0.15);
  }

  .teal {
    background: rgba(20, 184, 166, 0.16);
  }

  .blue {
    background: rgba(59, 130, 246, 0.14);
  }

  .amber {
    background: rgba(245, 158, 11, 0.16);
  }
</style>
