# Saman

Prototype of the Saman application. See README.md for the full setup.

## Layout

- `src/cms` — Payload 3 on Next.js, admin panel and REST/GraphQL API
- `src/web` — Astro frontend, SSR, reads the CMS over REST
- `src/shared` — generated Payload types + REST client, imported as `@saman/shared`
- `docs/specification/kravspesifikasjon.md` — the requirements specification
  (Norwegian). The intention and starting point for the implementation, not a
  fixed contract. See «Specification» below before changing it.
- `docs/specification/decisions.md` — log of why the specification has changed.
- `prototype/` — the original clickable HTML prototype. Use it for look, flow and
  wording, not as the specification. Never modify it.
- `agent/` — the agentctl Agent for developing Saman in a sandbox. See `agent/README.md`.

## Specification

`docs/specification/kravspesifikasjon.md` describes the intention behind Saman and
is the starting point for the implementation. It is the master copy of the
specification and is owned by Organisasjonslæring (VSU). It is a good start, but
requirements will change as we build, test with users and learn. If a Word version
is needed, generate it from the markdown
(`pandoc docs/specification/kravspesifikasjon.md -o kravspesifikasjon.docx`); never
edit a Word copy and treat it as the source.

- **Change the specification when the implementation changes it.** When the
  implementation needs to differ from a requirement — because it is unclear, turns
  out to be wrong, or a better solution emerges — update
  `docs/specification/kravspesifikasjon.md` so it describes what we actually build.
- **Make specification changes visible.** Put changes to the specification in their
  own commit, separate from code, and list the affected requirement IDs in the PR
  description. Add an entry to `docs/specification/decisions.md` with the reason.
  Keep existing requirement IDs stable: change the text of a requirement rather
  than renumbering, and mark removed requirements as removed instead of reusing
  their IDs.
- **Order of precedence.** An explicit instruction from the user comes first, then
  the specification, then the prototype.
  The prototype is useful for layout, interaction and texts, but it is older than
  most decisions. When the specification and the prototype disagree, follow the
  specification and mention the difference.
- **Safeguards are not a starting point.** Requirements that restrict access to or
  sharing of personal data (`AL-04`, `TO-13`, `NF-09`, `NF-10`, `AI-03`) only change
  when the user explicitly asks for it, and the change must be logged in
  `docs/specification/decisions.md`. Never relax them to simplify an implementation.
- **Requirement IDs.** Every requirement has an ID (e.g. `TO-01`, `AL-04`, `NF-09`).
  Reference the ID in commit messages, PR descriptions and test names for the code
  that implements it.
- **Priorities.** `Må`, `Bør` and `Kan` are MoSCoW (must, should, could). Build `Må`
  before `Bør` and `Bør` before `Kan` within a functional area.
- **Safeguards ship with the feature.** Some `Må` requirements restrict a feature
  that is itself `Bør` or `Kan` (allocation visibility, the personal user manual in
  the team contract, analytics, the AI assistant). Implement the restriction in the
  same change as the feature, never as a follow-up.
- **Access control lives in Payload.** Enforce visibility and edit rights in the
  collection access functions. Hiding a field or button in the frontend is not
  access control.
- **Open questions are not ours to decide.** The section «Åpne avklaringer» lists
  questions that need decisions outside the team. If a task depends on one of them,
  stop and ask instead of picking an answer in code.
- **Personal data.** Do not send personal data about employees to third parties
  (analytics, language models, external APIs) beyond what the specification allows.

### Known differences between prototype and specification (2026-10-24)

Follow the specification here, not the prototype, unless the specification is changed:

| Area | Prototype | Specification |
| --- | --- | --- |
| Folk / allocation | Visible and editable by everyone; shows an even split when nothing is registered | Visible only to the employee, team lead, team owner and line manager (`AL-04`); show nothing until allocation is registered |
| Team contract | Personal user manual visible to everyone | Visible only to team members (`TO-13`) |
| Analytics | Sends names of viewed colleagues; tracks after the user declines | No personal data about others (`NF-09`); anonymous without identifiers after decline (`NF-10`) |
| Innsatsområde | Status page about an ongoing decision | Overview of focus areas, owner and linked teams (`IO-01`–`IO-06`) |
| Team data | Imported from Baksia | Baksia is not a data source; the data in the prototype is test data |
| Employees and units | Built from team members; units mostly missing | Fetched automatically from the HR system or Entra ID (`NF-07`, open question 6) |
| Porteføljestyring | Explanatory page | Placeholder without requirements (open question 5); do not build yet |

Remove a row when the prototype has been updated.

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

- Collections have a Norwegian `slug` and Norwegian `labels`, which show in the
  admin panel and the REST/GraphQL API, and an English `dbName` for the table:
  `slug: 'lokasjoner', dbName: 'locations'`. Field names and the TypeScript
  interface (`typescript.interface`) stay in English.
- `.env` files are per machine and never committed. `PAYLOAD_SECRET` is generated
  per environment; changing it logs everyone out and makes encrypted values and
  API keys unreadable.
- The e2e tests write to whatever `DATABASE_URL` points at — they seed and delete
  a user and a media document. Local databases only.

## Branches

Name branches `<type>/<short-description>`, or `<type>/<issue>-<short-description>`
when there is an issue: lowercase kebab-case, in English, describing the change.
One branch per PR, deleted after merge.

| Type | For | Example |
| --- | --- | --- |
| `feat/` | New functionality | `feat/42-ansattmottak-batch-endpoint` |
| `fix/` | Bug fixes | `fix/media-upload-alt-text` |
| `docs/` | Documentation only | `docs/architecture` |
| `refactor/` | Restructuring without changing behaviour | `refactor/shared-rest-client` |
| `test/` | Adding or fixing tests only | `test/e2e-admin-login` |
| `chore/` | Tooling, dependencies, setup, CI | `chore/agentctl-setup` |
