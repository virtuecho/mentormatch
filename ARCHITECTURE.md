# Architecture

MentorMatch is structured as a single-deploy full-stack workspace. The application is served from one Cloudflare Worker while keeping business logic, persistence, UI, and shared contracts split into maintainable packages.

## High-Level Model

```text
Browser
  -> apps/web route or page
    -> feature module
      -> database layer
        -> Cloudflare D1
```

Only the web application is deployed. Shared packages are bundled into the deployed Worker as dependencies and are not deployed independently.

## Repository Structure

```text
MentorMatch/
├── apps/
│   └── web/
│       ├── src/routes/         # public pages and explicit API handlers
│       ├── src/lib/server/     # Worker-only server helpers
│       └── src/lib/            # app-local frontend and shared helpers
├── packages/
│   ├── db/                     # database schema, migrations, repositories
│   ├── features/               # business domains
│   ├── shared/                 # types, contracts, validation schemas
│   ├── ui/                     # reusable Svelte UI building blocks
│   └── config/                 # shared tooling configuration
├── tests/
│   ├── integration/
│   └── e2e/
└── .github/workflows/
```

## Deployment Model

The intended production topology is:

- one deployable app: `apps/web`
- one Worker runtime: Cloudflare Workers
- one database binding: `DB` for Cloudflare D1
- optional future external adapters if database strategy changes

This keeps routing, auth, server-side logic, and UI delivery in one runtime while avoiding the split deployment model of the previous frontend and backend repositories.

## Layer Responsibilities

### `apps/web`

This is the presentation and transport layer.

- SvelteKit pages render the user experience
- explicit HTTP endpoints live under route handlers
- request-scoped auth and cookie/session handling live here
- page loads, actions, and API handlers call feature modules rather than embedding business rules directly

### `packages/features/*`

Each business domain lives in its own feature package:

- `auth`
- `profile`
- `mentors`
- `availability`
- `bookings`

Each package should own:

- domain rules
- input validation orchestration
- service-level logic
- test fixtures close to the feature

This keeps new functionality additive and modular rather than spreading changes across unrelated folders.

### `packages/db`

This package isolates persistence concerns:

- schema definitions
- migrations
- repository functions
- database client wiring

Business packages depend on database abstractions from here instead of embedding SQL in UI or route files.

### `packages/shared`

This package holds code that must remain framework-agnostic:

- types
- schemas
- API contracts
- reusable utility functions

### `packages/ui`

This package contains reusable Svelte components and visual primitives shared across pages or features.

## Request Flow

### Page Request

```text
Browser
  -> SvelteKit page/load/action
    -> feature service
      -> repository
        -> D1
```

### API Request

```text
Browser or client
  -> apps/web/src/routes/api/*
    -> feature service
      -> repository
        -> D1
```

## Public vs Hidden Backend Surface

The architecture supports both patterns:

- public API handlers for explicit integrations
- server-only logic executed during page loads or actions

Database access and secrets remain server-side. Only routes intentionally exposed under the app become public HTTP surfaces.

## Testing Strategy

The workspace is designed for layered verification:

- unit tests inside features and shared packages
- integration tests for route wiring and repository behavior
- Playwright end-to-end tests for user flows

This allows business logic to be tested independently from the browser UI while keeping the deployed Worker behavior covered.

## CI/CD

The repository uses GitHub Actions for:

- install and dependency setup with pnpm
- linting
- framework and type checks
- unit tests
- end-to-end tests
- deployment to Cloudflare Workers on `main`

## Design Goals

This structure optimizes for:

- one repository
- one deployable application
- one primary language across the stack
- modular feature growth
- easier onboarding
- Cloudflare Workers compatibility
- clear test boundaries
