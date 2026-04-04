<script lang="ts">
  interface Props {
    label: string;
    value: string;
    tone?: "teal" | "blue" | "amber" | "slate";
  }

  let { label, value, tone = "slate" }: Props = $props();
</script>

<article class={`stat-card ${tone}`}>
  <p>{label}</p>
  <strong>{value}</strong>
</article>

<style>
  .stat-card {
    position: relative;
    padding: 1.2rem 1.15rem 1.15rem;
    border-radius: 1.35rem;
    border: 1px solid rgba(23, 36, 51, 0.08);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.62),
      0 16px 32px rgba(27, 38, 49, 0.05);
    overflow: hidden;
  }

  .stat-card::before {
    content: "";
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 0.85rem;
    height: 0.85rem;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.16;
  }

  p {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(23, 36, 51, 0.6);
  }

  strong {
    display: block;
    margin-top: 0.55rem;
    font-family: var(--font-display, Georgia, serif);
    font-size: clamp(2rem, 3vw, 2.6rem);
    line-height: 0.95;
    letter-spacing: -0.05em;
    color: #172433;
  }

  .slate {
    background: linear-gradient(
      180deg,
      rgba(255, 252, 247, 0.9),
      rgba(240, 234, 226, 0.9)
    );
    color: #506274;
  }

  .teal {
    background: linear-gradient(
      180deg,
      rgba(221, 234, 228, 0.95),
      rgba(240, 246, 243, 0.95)
    );
    color: #5d7665;
  }

  .blue {
    background: linear-gradient(
      180deg,
      rgba(224, 232, 241, 0.96),
      rgba(239, 244, 248, 0.96)
    );
    color: #18344d;
  }

  .amber {
    background: linear-gradient(
      180deg,
      rgba(247, 235, 212, 0.96),
      rgba(252, 247, 236, 0.96)
    );
    color: #8c6635;
  }
</style>
