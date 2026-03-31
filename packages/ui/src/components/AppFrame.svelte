<script lang="ts">
  import type { Snippet } from 'svelte';

  type NavItem = {
    href: string;
    label: string;
  };

  type FrameUser = {
    fullName: string;
    email: string;
    role: string;
  };

  interface Props {
    title?: string;
    subtitle?: string;
    navItems?: readonly NavItem[];
    currentPath?: string;
    user?: FrameUser | null;
    children?: Snippet;
  }

  let {
    title = 'MentorMatch',
    subtitle = 'Find mentors, book time, and keep your next steps moving.',
    navItems = [],
    currentPath = '/',
    user = null,
    children
  }: Props = $props();
</script>

<div class="app-shell">
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark">MM</div>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>

    <nav>
      {#each navItems as item}
        <a class:active={currentPath === item.href} href={item.href}>
          {item.label}
        </a>
      {/each}
    </nav>

    {#if user}
      <div class="account-card">
        <p class="account-label">Signed in as</p>
        <strong>{user.fullName}</strong>
        <p>{user.email}</p>
        <span class="account-role">{user.role}</span>

        <form method="POST" action="/logout">
          <button class="logout-button" type="submit">Log out</button>
        </form>
      </div>
    {/if}
  </aside>

  <main class="content">
    {@render children?.()}
  </main>
</div>

<style>
  .app-shell {
    display: grid;
    grid-template-columns: minmax(240px, 280px) minmax(0, 1fr);
    min-height: 100vh;
    background:
      radial-gradient(circle at top right, rgba(14, 116, 144, 0.2), transparent 35%),
      linear-gradient(180deg, #f8fbff 0%, #edf4fb 100%);
  }

  .sidebar {
    padding: 2rem 1.25rem;
    border-right: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255, 255, 255, 0.78);
    backdrop-filter: blur(18px);
    position: sticky;
    top: 0;
    height: 100vh;
  }

  .brand {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 2rem;
  }

  .brand-mark {
    width: 3rem;
    height: 3rem;
    display: grid;
    place-items: center;
    border-radius: 1rem;
    background: linear-gradient(135deg, #0f766e, #2563eb);
    color: white;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .brand h1 {
    margin: 0;
    font-size: 1.05rem;
  }

  .brand p {
    margin: 0.2rem 0 0;
    color: #475569;
    font-size: 0.88rem;
    line-height: 1.4;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  nav a {
    color: #1e293b;
    text-decoration: none;
    padding: 0.82rem 0.95rem;
    border-radius: 1rem;
    transition: background 160ms ease, color 160ms ease, transform 160ms ease;
    font-weight: 600;
  }

  nav a:hover,
  nav a.active {
    background: rgba(37, 99, 235, 0.09);
    color: #1d4ed8;
    transform: translateX(2px);
  }

  .account-card {
    margin-top: 2rem;
    padding: 1rem;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 1rem;
    background: rgba(248, 250, 252, 0.9);
  }

  .account-label,
  .account-card p {
    margin: 0;
    color: #475569;
    font-size: 0.9rem;
  }

  .account-card strong {
    display: block;
    margin-top: 0.3rem;
    color: #0f172a;
  }

  .account-role {
    display: inline-flex;
    margin-top: 0.8rem;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    background: rgba(15, 118, 110, 0.1);
    color: #0f766e;
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: capitalize;
  }

  .logout-button {
    margin-top: 1rem;
    width: 100%;
    border: none;
    border-radius: 0.9rem;
    padding: 0.8rem 1rem;
    background: linear-gradient(135deg, #0f766e, #2563eb);
    color: white;
    font-weight: 700;
    cursor: pointer;
  }

  .logout-button:hover {
    opacity: 0.94;
  }

  .content {
    min-width: 0;
  }

  @media (max-width: 860px) {
    .app-shell {
      grid-template-columns: 1fr;
    }

    .sidebar {
      position: static;
      height: auto;
      border-right: none;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    }

    nav {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    }
  }
</style>
