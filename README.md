# MentorMatch

MentorMatch is a Cloudflare Workers-first full-stack workspace for matching mentees with mentors, publishing mentor availability, and managing bookings in a single deployable application.

This repository is organized as a modern JavaScript/TypeScript workspace:

- `apps/web` is the only deployable application. It contains the SvelteKit frontend and the Worker-side HTTP entrypoints.
- `packages/features/*` contains business modules such as auth, mentors, availability, bookings, and profile.
- `packages/db` contains the database layer, migrations, and persistence helpers.
- `packages/shared` contains shared contracts, types, schemas, and utilities.
- `packages/ui` contains reusable design-system level UI components.

The target deployment model is:

- One Cloudflare Worker deployment for the full application
- One external database, with Cloudflare D1 as the default target
- Optional future database adapters if the project later moves to another provider

## Why This Structure

The previous MentorMatch codebase used separate frontend and backend projects. This workspace consolidates them into a single full-stack application while preserving clear module boundaries:

- one repository
- one primary deployment target
- one language across frontend and backend: TypeScript
- modular feature packages for future growth
- testable boundaries for unit, integration, and end-to-end coverage

## Repository Layout

```text
MentorMatch/
├── apps/
│   └── web/                    # SvelteKit app deployed to Cloudflare Workers
├── packages/
│   ├── config/                 # Shared toolchain config
│   ├── db/                     # Database schema, migrations, repositories
│   ├── features/               # Business feature modules
│   │   ├── auth/
│   │   ├── profile/
│   │   ├── mentors/
│   │   ├── availability/
│   │   └── bookings/
│   ├── shared/                 # Cross-cutting contracts, types, schemas, utils
│   └── ui/                     # Reusable UI primitives and composed components
├── tests/                      # Integration and end-to-end suites
├── docs/                       # Architecture notes and ADRs
├── .github/workflows/          # CI/CD automation
├── pnpm-workspace.yaml         # Workspace boundaries
└── turbo.json                  # Task orchestration
```

## Local Development

Prerequisites:

- Node.js 22+
- pnpm 10+

Install dependencies:

```bash
pnpm install
```

Start the local application:

```bash
pnpm dev
```

## Common Scripts

From the repository root:

```bash
pnpm dev
pnpm lint
pnpm check
pnpm test:unit
pnpm test
pnpm build
pnpm cf:preview
pnpm cf:deploy
```

## Testing Strategy

The repository is designed for layered testing:

- unit tests for feature logic and utilities
- integration tests for route handlers, repositories, and module wiring
- Playwright end-to-end tests for the app experience

## CI/CD

GitHub Actions are configured for:

- linting
- type and framework checks
- unit tests
- Playwright end-to-end tests
- production deployment to Cloudflare Workers

The deploy workflow expects these repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Database bindings and other runtime secrets should be configured in Cloudflare.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the module breakdown, request flow, and deployment model.
