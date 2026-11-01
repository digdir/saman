# Architecture decision records

Why Saman is built the way it is. Each record describes one technical decision:
the situation, the options, what we chose and what follows from it.

The requirements specification has its own log,
[`docs/specification/decisions.md`](../specification/decisions.md), for why a
*requirement* changed. A record here is about *how* we build something. A
decision can need both: a changed requirement goes in the log, and the design
that implements it goes here.

## When to write one

Write a record when a decision:

- is hard or expensive to reverse, such as how users log in or where data lives
- picks one of several reasonable options, so someone will later ask "why not X?"
- sets a rule that future code has to follow

Small, local choices belong in code comments and PR descriptions.

## How

1. Copy the template below to `NNNN-short-title.md`, with the next free number.
2. Open a pull request with the status **Proposed**. The discussion happens as
   review comments on the pull request.
3. When the decision is made, set the status to **Accepted** or **Rejected**,
   with the date, and merge. Implement it in its own pull request.

Records are not rewritten afterwards. When a decision changes, write a new
record and set the old one's status to **Superseded by [ADR-NNNN](…)**.

The repository is public. Describe designs and their trade-offs, but not how to
exploit a weakness that hasn't been fixed yet.

## Records

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-login-and-sessions.md) | Login and sessions | Accepted |
| [0002](0002-password-login-only-for-break-glass-accounts.md) | Password login only for break-glass accounts | Proposed |
| [0003](0003-imports-from-the-authoritative-source.md) | Imports from the authoritative source | Proposed |

## Template

```markdown
# ADR-NNNN: Title

- **Status:** Proposed | Accepted (YYYY-MM-DD) | Rejected (YYYY-MM-DD) | Superseded by ADR-NNNN
- **Requirements:** the requirement IDs this concerns
- **Related:** other records, pull requests

## Context

The situation and the forces at play: requirements, constraints, what makes
this a decision at all.

## Options

What we considered, with the main arguments for and against each.

## Decision

What we do, in plain words.

## Consequences

What becomes easier, what becomes harder, and what we now have to remember.
```
