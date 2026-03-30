# MentorMatch Web

This package is the deployable SvelteKit application for MentorMatch.

It is responsible for:

- rendering the public and authenticated pages
- exposing explicit API handlers under `src/routes/api/*`
- wiring auth, cookies, and request-scoped Worker context
- producing the Cloudflare Worker build consumed by Wrangler

## Run From the Repository Root

The workspace is managed from the repository root. Use these root commands:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm check
pnpm test:unit
pnpm test:e2e
pnpm cf:preview
pnpm cf:upload
```

## Local Frontend URLs

Public pages:

- `http://localhost:5173/`
- `http://localhost:5173/login`
- `http://localhost:5173/signup`

Protected pages require an authenticated session and the Worker runtime bindings:

- `/dashboard`
- `/my-bookings`
- `/mentor-bookings`
- `/profile`
- `/settings`
- `/mentor-verification`

## Cloudflare

The package-level Worker config lives in [wrangler.jsonc](/Users/admin/MentorMatch/apps/web/wrangler.jsonc).

Important bindings:

- `DB`
- `ASSETS`
- `AUTH_SECRET`

The current Worker name is `mentormatch`.
