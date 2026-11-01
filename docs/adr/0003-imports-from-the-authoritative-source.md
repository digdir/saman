# ADR-0003: Imports from the authoritative source

- **Status:** Proposed
- **Requirements:** NF-07, LO-01, LO-02, FO-02
- **Related:** [ADR-0001](0001-login-and-sessions.md),
  [ADR-0002](0002-password-login-only-for-break-glass-accounts.md),
  [unit import contract](../integrations/unit-import.md),
  [architecture overview](../diagrams/architecture.md), #30

## Context

Units, people and locations come from Digdir's authoritative source (NF-07),
and nobody can change them in Saman. Units come in a file of their own. The
collections exist (#30), but nothing fills them yet.

The sending system sets the limits:

- It runs a PowerShell script on a server in Digdir's server room in
  Leikanger, and can make an HTTP POST to an endpoint Saman provides.
- The data is a CSV file.
- The script should not have to wait while Saman updates the database.

Units come first. People and locations will follow the same pattern, so the
choices here apply to all three.

## Options

**How the file is handled**

- **Accept, validate and queue (chosen).** The endpoint checks the file,
  stores it and answers at once. A job in Payload's jobs queue updates the
  database moments later.
- **Import during the request.** Simplest, but the script waits for every
  database update, and a timeout halfway leaves it unclear what happened.
- **A separate pipeline**, such as Blob Storage with a triggered function.
  More infrastructure to run, for a few hundred rows.

**What a file contains**

- **Everything, every time (chosen).** Each file is a full snapshot. The
  import corrects any drift by itself, and a unit missing from the file has
  been closed.
- **Only changes.** Smaller files, but a lost or failed file leaves Saman
  wrong until someone notices, and closing a unit needs its own signal.

**How the file is sent**

- **The CSV file as the request body (chosen)**, with
  `Content-Type: text/csv`. One line in PowerShell
  (`Invoke-RestMethod -InFile`).
- **Multipart form data.** Awkward in Windows PowerShell 5.1.
- **JSON.** Ruled out: the sender produces CSV.

**Where the file is kept**

- **In an import run document (chosen).** A collection of its own, readable
  by administrators, with the file, the result and any errors. The job only
  gets the run's ID.
- **In the job's input.** Payload hides its jobs collection and deletes jobs
  when they finish, so there would be no record of what came in.

**How the sender authenticates**

- **A Payload API key on a dedicated integration user (chosen)**, as the
  architecture overview already describes for Ansattmottak.
- **An Entra ID app with client credentials.** Keeps every credential in
  Entra ID, but the CMS would need a second authentication strategy that
  validates Entra ID access tokens. It can replace the API key later without
  changing anything else here.

**When the job runs**

- **Payload's `autoRun` in the CMS, every 10 seconds (chosen).** One way to
  start jobs, which also covers retries.
- **Start the job right after the response**, with Next.js `after()`. Faster,
  but a second way for jobs to start. Worth adding only if 10 seconds is too
  slow.
- **A separate worker process** (`payload jobs:run`). Can replace `autoRun`
  once the hosting needs it, without changing the jobs.

## Decision

1. **An endpoint per kind of data**, starting with `POST /api/enheter/import`.
   The body is the CSV file. The [contract](../integrations/unit-import.md)
   describes the format, the responses and an example script.
2. **Only the integration user may call it.** `brukere` gets API keys, and a
   new role, `integration`, that may call the import endpoints and nothing
   else: no admin panel, no content, no password login.
3. **Every row is validated before the file is accepted**: the columns,
   required values, valid levels, unique IDs, parents that exist in the file,
   and no unit that is its own ancestor. A file with errors is refused as a
   whole with `400`, listing every error with its line number, and nothing is
   queued.
4. **An accepted file becomes an import run** (`importkjoringer`): the kind of
   data, the time, the sender, the file, the number of rows, the status and
   the result. The endpoint answers `202 Accepted` with the run's ID and a
   status URL, which the script may poll.
5. **A job, `importUnits`, applies the file** in one database transaction:
   - create or update each unit, matched on `externalUnitId`
   - set `parent` and `leader` from the external IDs, once all units exist
   - mark units missing from the file as inactive, never delete them
   - link people's `units` again from their `externalUnitIds`, so the order
     of the people and unit imports doesn't matter
   - write the result to the import run: created, updated, deactivated, and
     leaders not found in `personer`

   If anything fails, nothing changes.
6. **One unit import at a time.** The task uses Payload's concurrency control
   with the key `units`, `exclusive` and `supersedes`: two imports never run
   together, and a newer file replaces an older one that hasn't started.
7. **Retries.** A failed job is retried up to 3 times with backoff. The import
   is idempotent, so a retry is safe.

### Still to agree

- [ ] **Column names.** The contract uses Saman's field names for now. The
  source may end up with its own; the mapping is in one place.
- [ ] **Protection against a truncated file.** Every row is checked, but a
  file that is cut off or nearly empty is still valid row by row, and as a
  full snapshot it would deactivate the units it lacks. Proposed: refuse a
  file with fewer than half as many units as are active today, until an
  administrator confirms it.
- [ ] **How long files are kept.** Proposed: 90 days. It matters most for the
  people file, which contains personal data.
- [ ] **The network path** from Leikanger to the CMS, an open question in the
  architecture overview.

## Consequences

- The sender gets an answer in milliseconds, and every error in the file at
  once.
- Administrators can see in the admin panel what came in, when, and what it
  changed.
- A failed or partial import never leaves a half-updated organisation chart.
- Closed units stay in Saman, marked inactive, with their history.
- The people and location imports reuse the endpoint pattern, the import runs,
  the integration user and the job setup.
- The API key is a way into Saman that doesn't go through Entra ID. It is
  limited to the import endpoints, kept on the sending server, and each use is
  recorded on an import run. Changing `PAYLOAD_SECRET` makes it unreadable, so
  the sender then needs a new key.
- Jobs run inside the CMS process. With several CMS replicas, each runs
  `autoRun`; the concurrency control keeps them from running the same import
  twice.
