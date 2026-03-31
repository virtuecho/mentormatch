# MentorMatch

MentorMatch is a mentoring platform where people can create an account, find mentors, book sessions, manage their profile, and apply to become mentors. New accounts start as mentees, and mentor approval adds mentor tools without taking away the ability to keep booking other mentors. The product is delivered through a single SvelteKit application on Cloudflare Workers, with shared business logic split into workspace packages.

## Overview

- one repository
- one deployable application: `apps/web`
- one runtime target: Cloudflare Workers
- one primary database binding: `DB` for Cloudflare D1
- one language across the stack: TypeScript

The active application entrypoint is the SvelteKit Worker app in [apps/web](/Users/admin/MentorMatch/apps/web). Shared business logic, persistence, contracts, and UI primitives live in `packages/*`.

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
├── docs/                       # Supporting docs and ADR folders
├── .github/workflows/          # CI/CD workflows
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

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
- mentor applications are reviewed by admin accounts in `/admin/review`
- approved mentors keep access to mentee flows like `/dashboard` and `/my-bookings`
- mentor approval enables mentor tools and the admin entry is surfaced from the homepage for admin accounts
- profile, social, and document links can be pasted as bare domains and are normalized to `https://...`
- mentor availability defaults to the creator's current local time zone, but mentors can switch it before publishing
- mentors can publish one-off or weekly recurring slots
- slots can either use a preset mentor agenda or let the mentee propose the topic at booking time
- booking safeguards now prevent duplicate requests for the same slot, overlapping active mentee requests, and double-accepting the same slot
- mentor availability is stored as UTC so it renders correctly per viewer locale
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
- CI runs these checks so account creation, login, logout, settings, mentor review, profile editing, slot creation, booking safeguards, and availability time handling stay covered

## Deployment

Cloudflare deployment is centered on the Worker app in `apps/web`, and the active deployment path is Cloudflare Workers Builds.

Important points:

- the Worker name is `mentormatch`
- the Worker build upload command is exposed at the repo root as `pnpm cf:upload`
- root-level [wrangler.jsonc](/Users/admin/mentormatch/wrangler.jsonc) lets Cloudflare Workers Builds run from the repository root
- `pnpm cf:upload` and `npx wrangler versions upload` both use the root Wrangler config, which runs `pnpm build` before uploading
- the D1 binding name is `DB`
- Cloudflare runtime bindings and secrets should be configured in Cloudflare, not GitHub Actions

GitHub Actions is used for validation only. Deployment is handled by Cloudflare Workers Builds.

## Architecture

See [ARCHITECTURE.md](/Users/admin/MentorMatch/ARCHITECTURE.md) for the request flow, package responsibilities, and deployment model.
