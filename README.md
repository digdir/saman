# Saman

Prototype of the Saman application.

- `prototype/` — the original clickable HTML prototype. Reference/spec only; not part of the build.
- `src/cms/` — Payload 3 (on Next.js 16), admin UI and REST/GraphQL API.
- `src/web/` — Astro 7 frontend (SSR via `@astrojs/node`).
- `src/shared/` — generated Payload types + a thin REST client shared by the frontend.

## Requirements

- Node 24 (`nvm use` — pinned in `.nvmrc`; Astro 7 requires >= 22.23.4)
- pnpm 12
- Docker (PostgreSQL only)

## Getting started

```bash
nvm use
pnpm install
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
| `pnpm db:up` / `pnpm db:down` | Start/stop PostgreSQL |
| `pnpm db:reset` | Drop the volume and start a fresh database |
| `pnpm generate:types` | Regenerate Payload types into `src/shared` |

## Ports

| Service | Port |
| --- | --- |
| PostgreSQL | 5432 |
| Payload / Next.js | 3000 |
| Astro | 4321 |

## Database schema

In development the Postgres adapter pushes the schema from the collection configs
on startup — no migration files needed while the content model is in flux. Before
anything is shared or deployed, snapshot it:

```bash
pnpm --filter cms payload migrate:create
```

and run `pnpm --filter cms payload migrate` on deploy with push disabled.

## Environment variables

Copy `.env.example` to `.env` in `src/cms` and `src/web`. The committed defaults
point at the local Docker database and throwaway credentials.
