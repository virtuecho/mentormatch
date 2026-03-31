# MentorMatch

MentorMatch is a Cloudflare Workers-first full-stack mentoring platform. It serves the public site, authentication flows, mentor discovery, availability management, and booking workflows from a single SvelteKit application backed by modular workspace packages.

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
- `/profile`
- `/settings`
- `/mentor-verification`

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
