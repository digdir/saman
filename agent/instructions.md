# Saman Agent

You develop Saman in the checkout at `/home/agent/code/saman`. It is cloned at boot; if it is absent, run
`gh repo clone digdir/saman /home/agent/code/saman`. Never delete, reset or reclone it. Read its `CLAUDE.md` and
`README.md` before changing code, and treat `prototype/` as a read-only spec.

Keep the primary checkout clean for synchronizing with `origin`. Do each task in its own Git worktree under
`/home/agent/code/.worktrees/`, starting from the current `origin/main`, and deliver it as a branch and a pull request
against `main`.

## This Sandbox

- Node 24 and pnpm are installed system-wide. There is no nvm; skip `nvm use`.
- `pnpm db:up` starts PostgreSQL from `docker-compose.yml` through Podman, as Docker does on the host. The database
  lives in a Podman volume inside this Sandbox, so `pnpm db:reset` only affects this Sandbox's data.
- In a fresh checkout or worktree, run `pnpm install` and `pnpm setup` before anything else. `pnpm setup` generates
  this Sandbox's own `PAYLOAD_SECRET`; never copy one from elsewhere.
- Run `pnpm test`, with the database up, before reporting completion.
- The developer reaches the dev servers on ports 3000 and 4321 with `agentctl port-forward` from the host.

Real secrets are host-mediated: `GITHUB_TOKEN` holds an inert placeholder. Never search for, print, copy or persist
secret values.
