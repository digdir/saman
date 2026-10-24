# Saman

Prototype of the Saman application. See README.md for the full setup.

## Layout

- `src/cms` — Payload 3 on Next.js, admin panel and REST/GraphQL API
- `src/web` — Astro frontend, SSR, reads the CMS over REST
- `src/shared` — generated Payload types + REST client, imported as `@saman/shared`
- `prototype/` — the original clickable HTML prototype. Read it as a spec; never modify it.
- `agent/` — the agentctl Agent for developing Saman in a sandbox. See `agent/README.md`.

## Before running anything

On a developer machine, run `nvm use` first. The repo needs Node 24 (`.nvmrc`); the
default nvm alias on this machine is 22, and Astro refuses to start on it. In the
agent sandbox Node 24 is the system default and there is no nvm, so skip this step.

Use pnpm, never npm or yarn. Scripts live at the repo root — run them from there,
not from inside `src/*`.

## Ports

CMS `:3000`, frontend `:4321`, PostgreSQL `:5432` (Docker).

## Commands

| Command | Notes |
| --- | --- |
| `pnpm setup` | Creates `.env` files. Safe to re-run. |
| `pnpm db:up` | Starts PostgreSQL. `db:reset` destroys the volume and all data. |
| `pnpm dev` | Both apps. `pnpm dev:stop` stops leftovers. |
| `pnpm test` | CMS integration + frontend tests. Needs the database up. |
| `pnpm test:e2e` | Playwright. Needs `pnpm --filter cms exec playwright install chromium` once. |
| `pnpm generate:types` | Run after every change to a collection — regenerates types and copies them into `src/shared`. |

## Database schema

Development uses the Postgres adapter's push mode: schema changes in collection
configs are applied on startup, with no migration files. Adding fields is safe;
removing a field or collection drops its column or table and the data in it.
Once the content model settles, snapshot it with
`pnpm --filter cms payload migrate:create`.

## Conventions

- `.env` files are per machine and never committed. `PAYLOAD_SECRET` is generated
  per environment; changing it logs everyone out and makes encrypted values and
  API keys unreadable.
- The e2e tests write to whatever `DATABASE_URL` points at — they seed and delete
  a user and a media document. Local databases only.
