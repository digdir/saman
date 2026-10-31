# Saman

Prototype of the Saman application.

- `prototype/` — the original clickable HTML prototype. Reference/spec only; not part of the build. Published to <https://digdir.github.io/saman/> on every change.
- `src/cms/` — Payload 3 (on Next.js 16), admin UI and REST/GraphQL API.
- `src/web/` — Astro 7 frontend (SSR via `@astrojs/node`).
- `src/shared/` — generated Payload types + a thin REST client shared by the frontend.
- `agent/` — an [agentctl](https://github.com/digdir/digdir-agents/tree/main/agentctl) Agent for developing Saman in a sandbox; see [`agent/README.md`](agent/README.md).

## Requirements

- Node 24 (`nvm use` — pinned in `.nvmrc`; Astro 7 requires >= 22.23.4)
- pnpm 12
- Docker (PostgreSQL only)

## Getting started

```bash
nvm use
pnpm install
pnpm setup      # creates .env files, generates a PAYLOAD_SECRET
pnpm db:up      # PostgreSQL 17 in Docker on localhost:5432
pnpm dev        # CMS on :3000, frontend on :4321
```

On first run, open http://localhost:3000/admin to create the admin user.
http://localhost:4321 shows a page that verifies the frontend can reach the CMS.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run CMS and frontend together |
| `pnpm dev:cms` / `pnpm dev:web` | Run one of them |
| `pnpm dev:stop` | Stop both dev servers (Astro runs as a detached daemon, so Ctrl+C alone leaves it running) |
| `pnpm build` | Production build of both |
| `pnpm setup` | Create missing `.env` files from the examples (safe to re-run) |
| `pnpm db:up` / `pnpm db:down` | Start/stop PostgreSQL |
| `pnpm db:reset` | Drop the volume and start a fresh database |
| `pnpm generate:types` | Regenerate Payload types into `src/shared` |
| `pnpm test` | All non-browser tests (CMS + frontend) |
| `pnpm test:int` | CMS integration tests (vitest, Payload Local API) |
| `pnpm test:web` | Frontend render tests (vitest, Astro container API) |
| `pnpm test:e2e` | End-to-end tests (Playwright, needs browsers installed) |

## Ports

| Service | Port |
| --- | --- |
| PostgreSQL | 5432 |
| Payload / Next.js | 3000 |
| Astro | 4321 |

## Tests

`pnpm test` runs both non-browser suites:

- `pnpm test:int` — CMS integration tests against the running database, using
  Payload's Local API directly. No dev server needed, but the database must be up.
- `pnpm test:web` — frontend tests that render `.astro` pages through Astro's
  container API with `fetch` stubbed, so they need neither a server nor a database.
  They cover the seam to the CMS: the URL that gets requested, the rendered
  result, and the failure path when the CMS is unreachable.

`pnpm test:e2e` drives a real browser against the CMS and reuses a dev server on
:3000 if one is running. Install the browser once first:

```bash
pnpm --filter cms exec playwright install chromium
```

The e2e tests seed and then delete a `dev@payloadcms.com` user in whatever
database `DATABASE_URL` points at, so don't run them against anything but a
local database.

## Database schema

In development the Postgres adapter pushes the schema from the collection configs
on startup — no migration files needed while the content model is in flux. Before
anything is shared or deployed, snapshot it:

```bash
pnpm --filter cms payload migrate:create
```

and run `pnpm --filter cms payload migrate` on deploy with push disabled.

## Environment variables

`pnpm setup` creates both `.env` files from the committed `.env.example`
templates and generates a `PAYLOAD_SECRET` for this machine. Existing files are
left alone, so it is safe to re-run.

`PAYLOAD_SECRET` is not shared between developers: it signs session tokens and
encrypts encrypted fields, so each environment has its own. Changing it after
the fact logs everyone out and makes existing API keys and encrypted values
unreadable, so keep it stable once an environment is running.

The database credentials in the examples are local-only throwaways that match
`docker-compose.yml`.
