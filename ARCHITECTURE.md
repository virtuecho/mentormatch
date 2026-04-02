# Architecture

MentorMatch is organized as a single-deploy full-stack workspace. The active application is a SvelteKit Worker in `apps/web`, while database access, business rules, contracts, and UI building blocks are isolated into separate packages.

## High-Level Model

```text
Browser
  -> apps/web page, action, or API route
    -> packages/features/*
      -> packages/db
        -> Cloudflare D1
```

Only `apps/web` is deployed. Everything under `packages/*` is bundled into that Worker as internal dependencies.

## Core Product Flows

- guests can browse the homepage, sign up, and log in
- signed-in users can search mentors, manage bookings, edit their profile, log out, change their password, and delete their account
- new accounts are created as mentees first
- users who want to mentor submit an application on `/mentor-verification`
- the mentor application is launched from a full-width dialog so the review form is not constrained to a half-page column
- admin accounts review mentor applications on `/admin/review`
- admin accounts can also manage users, public profile details, mentor access, and upcoming slots from dedicated admin routes
- `Professional skills` and `Mentorship areas` are optional free-entry fields, and applicants can withdraw a pending request before admin review
- approved users gain mentor tools while still keeping mentee booking flows
- profile and application links are normalized to `https://...` before validation
- profile education and experience records can be saved with partial details, while completely blank cards are skipped
- availability defaults to the mentor's current browser time zone, but the mentor can switch to another IANA time zone before publishing
- mentors can create either a one-off slot or a recurring series using daily, weekday, weekly, biweekly, or monthly presets
- recurring slots are persisted as separate occurrences so a single middle session can be edited or deleted independently
- accepted sessions automatically become completed after their scheduled end time, and mentors can manually complete them earlier when needed
- slots support two booking modes: preset mentor agenda or open topic chosen by the mentee
- booking rules prevent duplicate same-slot requests, overlapping active mentee requests, and multiple accepted bookings on a single slot
- booking and hosted-session cards use a denser metadata layout so filtering large lists stays readable on smaller screens
- availability is converted to UTC on submit and rendered back in each viewer's locale
- the shared app shell collapses navigation on small screens and keeps account actions, including logout, reachable in a mobile menu

## Repository Structure

```text
MentorMatch/
├── apps/
│   └── web/
│       ├── src/routes/         # public pages, page.server files, explicit API handlers
│       ├── src/lib/server/     # Worker-only helpers for auth, db access, cookies, errors
│       ├── src/lib/            # app-local utilities, styles, navigation, assets
│       └── wrangler.jsonc      # Worker configuration and D1 binding
├── packages/
│   ├── db/                     # D1 client, SQL helpers, migrations
│   ├── features/               # auth, mentors, availability, bookings, profile
│   ├── shared/                 # contracts, schemas, errors, shared types
│   ├── ui/                     # reusable Svelte components
│   └── config/                 # shared toolchain config
├── tests/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
└── .github/workflows/
```

## Deployment Model

The current deployment target is:

- one Worker script: `mentormatch`
- one D1 binding: `DB`
- one SvelteKit app build output under `apps/web/.svelte-kit/cloudflare`

The repository root exposes a deployable [wrangler.jsonc](/Users/admin/mentormatch/wrangler.jsonc).

The root upload path is:

1. `pnpm cf:upload`
2. or `npx wrangler versions upload`

Both commands run from the repository root, and Wrangler triggers `pnpm build` before uploading the Worker version. This keeps Cloudflare Workers Builds aligned with the monorepo root while still publishing the SvelteKit output from `apps/web`.

## Layer Responsibilities

### `apps/web`

This package owns:

- page rendering
- page loads and actions
- explicit HTTP APIs under `src/routes/api/*`
- request-scoped auth/session wiring in [hooks.server.ts](/Users/admin/MentorMatch/apps/web/src/hooks.server.ts)
- Worker-facing config in [wrangler.jsonc](/Users/admin/MentorMatch/apps/web/wrangler.jsonc)

It is the only package that should know about SvelteKit route structure and Worker deployment details.

### `packages/features/*`

Feature packages hold business logic by domain:

- `auth`
- `profile`
- `mentors`
- `availability`
- `bookings`

These packages own:

- validation orchestration
- domain rules
- service-level logic
- unit tests close to the feature

### `packages/db`

The database package owns:

- the D1 client
- SQL execution helpers
- schema migrations
- persistence adapters used by feature packages

Route handlers and Svelte components should not embed direct SQL.

### `packages/shared`

This package contains framework-agnostic shared code:

- error types
- validation schemas
- shared types
- contracts and utility helpers

### `packages/ui`

This package contains reusable Svelte UI primitives used across the Worker app.

## Request Flows

### Public Page

```text
Browser
  -> /
  -> /login
  -> /signup
```

These pages are available without a session.

### Authenticated Page

```text
Browser
  -> apps/web/src/routes/+layout.server.ts
    -> session lookup via hooks.server.ts
      -> protected page load/action
        -> feature module
          -> db
```

Protected routes redirect unauthenticated users to `/login`.

### API Request

```text
Browser or client
  -> apps/web/src/routes/api/*
    -> feature module
      -> packages/db
        -> D1
```

## Runtime Bindings

The Worker currently expects:

- `DB` for D1
- `ASSETS` for static assets
- `AUTH_SECRET` for session/auth operations

If `DB` or `AUTH_SECRET` are missing, public pages can still render basic content, but authenticated flows and data-backed operations will be limited.

## Testing Strategy

The current workspace uses:

- `pnpm lint`
- `pnpm check`
- `pnpm test:unit`
- `pnpm test:e2e`
- `pnpm build`

Coverage is split so feature logic can be tested separately from browser-visible flows.
The current test suite covers signup, login, logout, settings, mentor application review and withdrawal, profile link normalization, recurring availability creation, booking guardrails, and the mentor/mentee routing rules that connect them.

## CI/CD

GitHub Actions provide:

- linting
- Svelte and TypeScript checks
- unit tests
- Playwright end-to-end tests

Deployment is handled by Cloudflare Workers Builds, which calls the root upload script and uses the bindings configured for the `mentormatch` Worker.
