# ADR-0002: Password login only for break-glass accounts

- **Status:** Proposed
- **Requirements:** NF-12, NF-02, NF-05
- **Related:** [ADR-0001](0001-login-and-sessions.md), #23

## Context

[ADR-0001](0001-login-and-sessions.md) keeps Payload's own email and password
login as the fallback for when Entra ID doesn't work (NF-12). NF-12 doesn't say
who the fallback is for, and that matters.

A password login doesn't go through Entra ID. It therefore doesn't get Entra
ID's MFA and conditional access, and it keeps working for someone whose Entra ID
account has been disabled. Every account with a password is a way into Saman
that Entra ID doesn't control.

Today any user can have a password: the first user is created with one, and
administrators can set one for anyone. Payload also lets users reset their own
password by email, which would work for everyone as soon as an email adapter is
configured. Payload's password login has no second factor.

## Options

**(a) Only a few named break-glass accounts**

- During an Entra ID outage, only the people holding these accounts get in.
  Everyone else waits until Entra ID is back. An Entra ID outage usually takes
  Teams and Outlook down too.
- The accounts are not personal, so they are not tied to one person's
  employment, and their email addresses are not guessable.
- Their passwords are long and random, kept in a password vault, and rotated by
  administrators.

**(b) Everyone who has a password**

- Employees can still use Saman during an Entra ID outage.
- Every password is a way around MFA and around disabling the account in Entra
  ID, and people have one more password to look after.

## Decision

Proposed: **(a)**.

- Users get a field, "may log in with password", that only administrators can
  set. Payload refuses a password login for everyone else, even with the right
  password. Users created by an Entra ID login never get it.
- Nobody can set or reset their own password. Payload's forgot-password and
  reset operations are turned off; administrators set and rotate the passwords
  of break-glass accounts.
- Password logins are rate-limited per client, in the frontend's `/logg-inn`
  and in the CMS's login endpoint, in addition to Payload's account lock.
- Every password login is logged, so each use of a break-glass account is
  noticed.
- Personal accounts that have a password today, including the first user,
  stop being able to use it, and log in with Entra ID.

To be agreed before this is accepted:

- [ ] (a) or (b)
- [ ] How many break-glass accounts, who holds them, where the credentials are
  kept, and who is told when one is used

## Consequences

If (a) is accepted:

- The text of NF-12 is sharpened to say the fallback is for named break-glass
  accounts, with an entry in `docs/specification/decisions.md`.
- Every way into Saman except a handful of accounts goes through Entra ID and
  what it enforces.
- During an Entra ID outage, Saman is available to administrators only.
- Break-glass accounts are single-factor. Long random passwords, the vault and
  logging are what protect them, so the routine around them has to be kept up.
- The end-to-end tests log in with a password, so the users they create must be
  marked as allowed to.
