# MentorMatch

MentorMatch is a mentoring platform where people can create an account, find mentors, book sessions, manage their profile, and apply to become mentors. New accounts start as mentees, and mentor approval adds mentor tools without taking away the ability to keep booking other mentors. The product is delivered through a single SvelteKit application on Cloudflare Workers, with shared business logic split into workspace packages.

## Overview

- one repository
- one deployable application: `apps/web`
- one runtime target: Cloudflare Workers
- one primary database binding: `DB` for Cloudflare D1
- one language across the stack: TypeScript

The active application entrypoint is the SvelteKit Worker app in [apps/web](./apps/web/). Shared business logic, persistence, contracts, and UI primitives live in `packages/*`.

## Workspace Layout

```text
MentorMatch/
├── apps/
│   └── web/                    # SvelteKit app deployed to Cloudflare Workers
├── packages/
│   ├── config/                 # Shared toolchain configuration
│   ├── db/                     # D1 client, schema, migrations, persistence helpers
│   ├── features/               # Auth, mentors, availability, bookings, profile
│   ├── shared/                 # Contracts, schemas, types, utilities
│   └── ui/                     # Reusable Svelte UI components
├── tests/                      # Integration, fixtures, end-to-end test folders
├── .github/workflows/          # CI/CD workflows
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) covers system boundaries, package responsibilities, database relationships, state transitions, and request flow.

## Scheduling Model

- availability is captured in the mentor's chosen local time zone and normalized to UTC before it is stored
- recurring publication is expanded into separate slot occurrences so one middle session can be edited or deleted independently
- viewer-facing pages still regroup matching occurrences into a readable series so the product feels calendar-like without making writes rule-based

## Frontend Entry Points

Public pages:

- `/`
- `/login`
- `/signup`

Protected pages:

- `/dashboard`
- `/my-bookings`
- `/mentor-bookings`
- `/members/[id]`
- `/profile`
- `/settings`
- `/mentor-verification`
- `/admin/review` for admin users reviewing mentor applications

## Account And Approval Flows

- every signed-in user can log out from the main navigation
- account settings now include password changes and account deletion
- mentor applications are submitted from `/mentor-verification`
- mentor applications now open from a button-triggered full-width dialog instead of living in a fixed half-page column
- the mentor application keeps `Professional skills` and `Mentorship areas` as optional free-entry text fields, not required checkbox grids
- pending mentor applications can be withdrawn by the applicant and resubmitted later
- mentor applications are reviewed by admin accounts in `/admin/review`
- admin users can manage all users, public profiles, mentor access, and upcoming slots without changing login email or password
- admin profile edits are explicitly scoped to the selected user, so saving a managed profile can never overwrite the admin's own profile by mistake
- after an admin saves someone else's profile, the app redirects back to that same managed profile instead of falling back to the admin's own `/profile` page
- the profile `Skills` field accepts comma-separated entries and renders each one back out as an individual tag
- approved mentors keep access to mentee flows like `/dashboard` and `/my-bookings`
- mentor approval enables mentor tools and the admin entry is surfaced from the homepage for admin accounts
- profile, social, and document links can be pasted as bare domains and are normalized to `https://...`
- profile education and experience cards accept partial details now, and completely blank cards are ignored on save
- mentor availability defaults to the creator's current local time zone, but mentors can switch it before publishing
- mentors can publish one-off, daily, weekday, weekly, biweekly, or monthly recurring slots
- recurring availability is stored as separate occurrences so one middle session can be edited or deleted without rewriting the whole series
- accepted sessions are auto-completed after their scheduled end time, and mentors can also mark them complete early
- slots can either use a preset mentor agenda or let the mentee propose the topic at booking time
- booking safeguards now prevent duplicate requests for the same slot, overlapping active mentee requests, and double-accepting the same slot
- mentor availability is stored as UTC so it renders correctly per viewer locale
- the shell switches to a compact expandable navigation on phones so long menus and logout remain reachable
- the mobile topbar keeps visible spacing below the `Open navigation` control so the first page section does not press against it
- booking and request cards use denser metadata layouts so long session lists stay scannable on desktop and mobile
- the product hides the implementation details from end users and keeps the wording focused on account tasks and mentoring

Local frontend URL after starting the app:

```text
http://localhost:5173/
```

Deployed frontend URL:

- the root `workers.dev` or custom domain attached to the `mentormatch` Worker
- the homepage remains `/`

## Local Development

Prerequisites:

- Node.js 22+
- pnpm 10+

Install dependencies:

```bash
pnpm install
```

Start the app locally:

```bash
pnpm dev
```

Run the Worker preview locally:

```bash
pnpm cf:preview
```

## Common Commands

From the repository root:

```bash
pnpm dev
pnpm lint
pnpm check
pnpm test:unit
pnpm test:e2e
pnpm test
pnpm build
pnpm cf:preview
pnpm cf:upload
```

## Testing

The repository uses layered verification:

- unit tests for feature packages and app-level utilities
- end-to-end tests for browser-visible flows
- framework and type checks via `svelte-check` and TypeScript
- CI runs these checks so account creation, login, logout, settings, mentor review and withdrawal, profile editing, mobile-safe navigation, recurring slot creation, booking safeguards, and availability time handling stay covered

## Deployment

Cloudflare deployment is centered on the Worker app in `apps/web`, and the active deployment path is Cloudflare Workers Builds.

Important points:

- the Worker name is `mentormatch`
- the Worker build upload command is exposed at the repo root as `pnpm cf:upload`
- root-level [wrangler.jsonc](./wrangler.jsonc) lets Cloudflare Workers Builds run from the repository root
- `pnpm cf:upload` and `npx wrangler versions upload` both use the root Wrangler config, which runs `pnpm build` before uploading
- D1 migrations are sourced from `packages/db/migrations` through `migrations_dir` in the Wrangler config
- the D1 binding name is `DB`
- Cloudflare runtime bindings and secrets should be configured in Cloudflare, not GitHub Actions

GitHub Actions is used for validation only. Deployment is handled by Cloudflare Workers Builds.

## Admin Role SQL Operations

Admin access is controlled by the `users.role` column.

List all current admin accounts:

```sql
SELECT id, email, role, is_mentor_approved, created_at, updated_at
FROM users
WHERE role = 'admin'
ORDER BY id;
```

Promote a user to admin:

```sql
UPDATE users
SET role = 'admin',
    updated_at = datetime('now')
WHERE email = 'person@example.com';
```

Demote an admin back to a normal mentee account:

```sql
UPDATE users
SET role = 'mentee',
    updated_at = datetime('now')
WHERE email = 'person@example.com'
  AND role = 'admin';
```

Run the same queries against the remote Cloudflare D1 database with Wrangler:

```bash
pnpm exec wrangler d1 execute mentormatch --remote --command "SELECT id, email, role, is_mentor_approved, created_at, updated_at FROM users WHERE role = 'admin' ORDER BY id;"
pnpm exec wrangler d1 execute mentormatch --remote --command "UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE email = 'person@example.com';"
pnpm exec wrangler d1 execute mentormatch --remote --command "UPDATE users SET role = 'mentee', updated_at = datetime('now') WHERE email = 'person@example.com' AND role = 'admin';"
```

After changing a role, sign out and sign back in so the session reflects the updated permissions.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the request flow, package responsibilities, deployment model, data relationships, and state transitions.
