<script lang="ts">
  import type { Snippet } from "svelte";

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
    title = "MentorMatch",
    subtitle = "Find mentors, book time, and keep your next steps moving.",
    navItems = [],
    currentPath = "/",
    user = null,
    children,
  }: Props = $props();

  function getPublicLinkTone(item: NavItem) {
    if (item.href === "/signup") {
      return "primary";
    }

    if (item.href === "/login") {
      return "secondary";
    }

    return "plain";
  }
</script>

{#if user}
  <div class="workspace-shell">
    <section class="mobile-topbar">
      <div class="mobile-topbar-header">
        <a class="brand brand-link" href="/">
          <div class="brand-mark">MM</div>
          <div class="brand-copy">
            <p class="brand-kicker">Workspace</p>
            <h1>{title}</h1>
          </div>
        </a>
        <span class="mobile-role">{user.role}</span>
      </div>

      <details class="mobile-menu">
        <summary>Open navigation</summary>

        <div class="mobile-menu-panel">
          <nav class="nav-list">
            {#each navItems as item}
              <a class:active={currentPath === item.href} href={item.href}>
                {item.label}
              </a>
            {/each}
          </nav>

          <div class="account-card">
            <p class="account-label">Signed in as</p>
            <strong class="account-name">{user.fullName}</strong>
            <p class="account-email">{user.email}</p>
            <span class="account-role">{user.role}</span>

            <form method="POST" action="/logout">
              <button class="logout-button" type="submit">Log out</button>
            </form>
          </div>
        </div>
      </details>
    </section>

    <div class="workspace-grid">
      <aside class="sidebar">
        <div class="sidebar-frame">
          <a class="brand brand-link" href="/">
            <div class="brand-mark">MM</div>
            <div class="brand-copy">
              <p class="brand-kicker">Workspace</p>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </a>

          <nav class="nav-list">
            {#each navItems as item}
              <a class:active={currentPath === item.href} href={item.href}>
                {item.label}
              </a>
            {/each}
          </nav>

          <div class="account-card">
            <p class="account-label">Signed in as</p>
            <strong class="account-name">{user.fullName}</strong>
            <p class="account-email">{user.email}</p>
            <span class="account-role">{user.role}</span>

            <form method="POST" action="/logout">
              <button class="logout-button" type="submit">Log out</button>
            </form>
          </div>
        </div>
      </aside>

      <main class="content workspace-content">
        {@render children?.()}
      </main>
    </div>
  </div>
{:else}
  <div class="public-shell">
    <header class="public-topbar">
      <div class="public-topbar-inner">
        <a class="brand brand-link" href="/">
          <div class="brand-mark">MM</div>
          <div class="brand-copy">
            <p class="brand-kicker">Mentoring Platform</p>
            <h1>{title}</h1>
          </div>
        </a>

        <nav class="public-nav public-nav-desktop">
          {#each navItems as item}
            <a
              class={`public-nav-link ${getPublicLinkTone(item)}`}
              class:active={currentPath === item.href}
              href={item.href}
            >
              {item.label}
            </a>
          {/each}
        </nav>

        <details class="mobile-menu public-menu">
          <summary>Open navigation</summary>

          <div class="mobile-menu-panel">
            <nav class="nav-list public-nav-list">
              {#each navItems as item}
                <a class:active={currentPath === item.href} href={item.href}>
                  {item.label}
                </a>
              {/each}
            </nav>
          </div>
        </details>
      </div>
    </header>

    <main class="content public-content">
      {@render children?.()}
    </main>
  </div>
{/if}

<style>
  .workspace-shell,
  .public-shell {
    min-height: 100vh;
    color: var(--ink-strong, #172433);
  }

  .workspace-shell {
    background:
      radial-gradient(
        circle at top left,
        rgba(92, 122, 109, 0.16),
        transparent 24%
      ),
      radial-gradient(
        circle at top right,
        rgba(24, 52, 77, 0.12),
        transparent 26%
      ),
      linear-gradient(
        180deg,
        rgba(251, 247, 242, 0.98),
        rgba(244, 238, 228, 0.98)
      );
  }

  .public-shell {
    position: relative;
    background:
      radial-gradient(
        circle at top left,
        rgba(178, 138, 84, 0.08),
        transparent 20%
      ),
      radial-gradient(
        circle at top center,
        rgba(92, 122, 109, 0.1),
        transparent 30%
      ),
      linear-gradient(180deg, #fbf7f2 0%, #f2ebdf 100%);
  }

  .public-shell::before,
  .workspace-shell::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(23, 36, 51, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(23, 36, 51, 0.02) 1px, transparent 1px);
    background-size: 28px 28px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.25), transparent 88%);
  }

  .workspace-grid {
    display: grid;
    grid-template-columns: minmax(270px, 320px) minmax(0, 1fr);
    min-height: 100vh;
  }

  .sidebar {
    display: block;
    padding: 1.25rem;
  }

  .sidebar-frame {
    position: sticky;
    top: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
    height: calc(100vh - 2.4rem);
    padding: 1.2rem;
    border-radius: 2rem;
    background:
      linear-gradient(
        180deg,
        rgba(255, 252, 247, 0.9),
        rgba(249, 244, 237, 0.86)
      ),
      rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(23, 36, 51, 0.08);
    box-shadow:
      0 24px 54px rgba(27, 38, 49, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(22px);
    overflow-y: auto;
  }

  .public-topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    padding: 1rem clamp(1.1rem, 2.8vw, 2rem) 0;
  }

  .public-topbar-inner,
  .mobile-topbar,
  .mobile-topbar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .public-topbar-inner {
    width: min(1280px, 100%);
    margin: 0 auto;
    padding: 0.95rem 1rem;
    border-radius: 1.6rem;
    background: rgba(255, 252, 247, 0.82);
    border: 1px solid rgba(23, 36, 51, 0.08);
    box-shadow:
      0 18px 42px rgba(27, 38, 49, 0.07),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(18px);
  }

  .mobile-topbar {
    display: none;
    flex-direction: column;
    padding: 1rem 1rem 0;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.95rem;
    min-width: 0;
  }

  .brand-link {
    color: inherit;
    text-decoration: none;
  }

  .brand-mark {
    width: 3.2rem;
    height: 3.2rem;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    border-radius: 1.15rem;
    background:
      radial-gradient(
        circle at 30% 30%,
        rgba(255, 255, 255, 0.32),
        transparent 34%
      ),
      linear-gradient(145deg, #204a63 0%, #6b8574 100%);
    color: #fdfaf5;
    font-weight: 800;
    letter-spacing: 0.08em;
    box-shadow:
      0 16px 28px rgba(23, 50, 77, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }

  .brand-copy {
    min-width: 0;
  }

  .brand-kicker {
    margin: 0 0 0.15rem;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(24, 52, 77, 0.68);
  }

  .brand h1 {
    margin: 0;
    font-family: var(--font-body, "Segoe UI", sans-serif);
    font-size: 1.12rem;
    font-weight: 800;
    letter-spacing: -0.03em;
  }

  .brand p:last-child {
    margin: 0.28rem 0 0;
    max-width: 24ch;
    color: var(--ink-muted, #617180);
    font-size: 0.92rem;
    line-height: 1.55;
  }

  .nav-list {
    display: flex;
    flex-direction: column;
    gap: 0.38rem;
  }

  .nav-list a,
  .public-nav-link {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-height: 2.95rem;
    padding: 0.78rem 0.92rem;
    border-radius: 999px;
    color: var(--ink, #243647);
    text-decoration: none;
    font-weight: 700;
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      background 160ms ease,
      color 160ms ease,
      box-shadow 160ms ease;
  }

  .nav-list a {
    border: 1px solid transparent;
  }

  .nav-list a:hover,
  .nav-list a.active,
  .public-nav-link:hover,
  .public-nav-link.active {
    color: var(--ink-strong, #172433);
    background: rgba(255, 251, 245, 0.84);
    border-color: rgba(23, 36, 51, 0.09);
    box-shadow: 0 12px 24px rgba(27, 38, 49, 0.08);
    transform: translateY(-1px);
  }

  .public-nav {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.55rem;
  }

  .public-nav-link {
    padding-inline: 1rem;
    border: 1px solid rgba(23, 36, 51, 0.08);
    background: rgba(255, 252, 247, 0.66);
  }

  .public-nav-link.plain {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }

  .public-nav-link.secondary {
    background: rgba(255, 251, 245, 0.72);
  }

  .public-nav-link.primary {
    color: #fdfaf5;
    border-color: transparent;
    background: linear-gradient(135deg, #18344d, #5d7665);
    box-shadow: 0 16px 28px rgba(23, 50, 77, 0.18);
  }

  .public-nav-link.primary:hover,
  .public-nav-link.primary.active {
    color: #fdfaf5;
    background: linear-gradient(135deg, #214865, #6b8574);
    border-color: transparent;
  }

  .account-card {
    margin-top: auto;
    padding: 1rem;
    border-radius: 1.45rem;
    background: linear-gradient(
      180deg,
      rgba(255, 254, 251, 0.88),
      rgba(247, 242, 236, 0.88)
    );
    border: 1px solid rgba(23, 36, 51, 0.08);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.72),
      0 16px 32px rgba(27, 38, 49, 0.05);
  }

  .account-label,
  .account-card p {
    margin: 0;
    color: var(--ink-muted, #617180);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .account-card strong {
    display: block;
    margin-top: 0.3rem;
    font-size: 1.12rem;
    color: var(--ink-strong, #172433);
  }

  .account-name,
  .account-email {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .account-role,
  .mobile-role {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.32rem 0.72rem;
    border-radius: 999px;
    background: rgba(93, 122, 109, 0.14);
    color: #416052;
    font-size: 0.8rem;
    font-weight: 800;
    text-transform: capitalize;
  }

  .logout-button {
    margin-top: 1rem;
    width: 100%;
    border: none;
    border-radius: 999px;
    padding: 0.85rem 1rem;
    background: linear-gradient(135deg, #18344d, #5d7665);
    color: #fdfaf5;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 14px 24px rgba(23, 50, 77, 0.16);
    transition:
      transform 160ms ease,
      box-shadow 160ms ease;
  }

  .logout-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 28px rgba(23, 50, 77, 0.2);
  }

  .mobile-menu {
    display: none;
    width: 100%;
    border-radius: 1.3rem;
    background: rgba(255, 252, 247, 0.9);
    border: 1px solid rgba(23, 36, 51, 0.08);
    box-shadow:
      0 18px 36px rgba(27, 38, 49, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);
    overflow: hidden;
  }

  .mobile-menu summary {
    list-style: none;
    padding: 0.92rem 1rem;
    cursor: pointer;
    font-weight: 800;
    color: var(--ink-strong, #172433);
  }

  .mobile-menu summary::-webkit-details-marker {
    display: none;
  }

  .mobile-menu-panel {
    display: grid;
    gap: 0.9rem;
    padding: 0 0.9rem 0.9rem;
    border-top: 1px solid rgba(23, 36, 51, 0.08);
  }

  .public-nav-list {
    padding-top: 0.9rem;
  }

  .content {
    min-width: 0;
  }

  .public-content {
    padding-bottom: 3rem;
  }

  .workspace-content {
    padding-bottom: 2rem;
  }

  @media (max-width: 980px) {
    .workspace-grid {
      grid-template-columns: 1fr;
    }

    .sidebar {
      display: none;
    }

    .mobile-topbar {
      display: flex;
    }

    .mobile-menu {
      display: block;
    }

    .mobile-menu .nav-list {
      padding-top: 0.9rem;
    }
  }

  @media (max-width: 860px) {
    .public-topbar {
      padding-inline: 1rem;
    }

    .public-nav-desktop {
      display: none;
    }

    .public-menu {
      display: block;
      max-width: 14rem;
    }

    .public-topbar-inner {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .public-menu .nav-list {
      display: grid;
      gap: 0.5rem;
    }
  }

  @media (max-width: 640px) {
    .brand {
      align-items: flex-start;
    }

    .brand p:last-child {
      max-width: none;
    }

    .public-menu,
    .mobile-menu {
      max-width: none;
    }

    .mobile-topbar,
    .public-topbar {
      padding-inline: 0.9rem;
    }

    .nav-list a,
    .public-nav-link {
      width: 100%;
      justify-content: center;
    }
  }
</style>
