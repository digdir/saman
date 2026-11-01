# ADR-0001: Login and sessions

- **Status:** Accepted (2026-11-01). Written afterwards, from the decisions made
  in #21 and #23.
- **Requirements:** NF-02, NF-11, NF-12, NF-13
- **Related:** [ADR-0002](0002-password-login-only-for-break-glass-accounts.md),
  #21 (specification), #23 (implementation), #27

## Context

Nothing in the first version of Saman is available without logging in (NF-11).
People log in with Entra ID, Digdir's existing login solution (NF-02). Payload's
own email and password login stays as a fallback (NF-12). Ansattporten is to be
added later as an alternative (NF-13).

Saman is two applications: the frontend (`src/web`, Astro with server-side
rendering) and the CMS (`src/cms`, Payload on Next.js), which owns the data and
the admin panel. Access control lives in Payload's collection access functions.
Several requirements decide visibility per user, such as AL-04 and TO-13, so
Payload has to know who is asking on every request, not only that someone has
logged in.

## Options

**Where the login runs**

- **In the CMS (chosen).** Payload runs the OpenID Connect flow and issues its
  own session. One session, and Payload always knows the user.
- **In the frontend**, with a library such as Auth.js. Astro would have its own
  session, and Payload would still need to be told who the user is: two sessions
  to keep in step, and a trust relationship between them.
- **In a proxy in front of both**, such as oauth2-proxy or Azure App Service
  authentication. It closes the whole site with little code, but Payload would
  still need a custom strategy that trusts the proxy's headers, and the design
  would depend on how Saman ends up hosted.

**How the OpenID Connect flow is implemented**

- **Our own code on `openid-client` (chosen).** About 350 lines that we
  understand and test, on a widely used, certified library.
- **A community Payload plugin.** Less code to write, but a small dependency in
  the most security-sensitive path, which would have to be reviewed and kept up
  with Payload's releases anyway.

**How a user is recognised**

- **By the provider's permanent ID for them (chosen)**, Entra ID's `oid`.
- **By email.** Email addresses and user principal names change, for example
  when someone changes their name.

## Decision

1. **Payload owns the session.** Every way of logging in ends with the same
   Payload session: the `payload-token` cookie, a JWT signed with
   `PAYLOAD_SECRET`. The session is stored on the user, so logging out revokes
   it. It lasts 8 hours.
2. **The CMS runs the OpenID Connect flow**, as an authorization code flow with
   PKCE, at `/api/brukere/oauth/<provider>/login` and `…/callback`. The values the
   callback checks (state, nonce, PKCE verifier) are kept in a signed cookie for
   10 minutes. After login, users are only sent back to the CMS or the frontend.
3. **Providers are a list** (`src/cms/src/auth/providers.ts`). Entra ID is the
   only entry. Each user has `identities`, a list of `{ provider, subject }`, so
   one user can log in several ways. Ansattporten becomes another entry.
4. **Users are recognised by `oid`.** The first login creates the user, or links
   the login to an existing user with the same email. Names are updated from the
   token on every login. Roles are managed in Saman, not taken from Entra ID.
5. **The frontend checks every request.** The Astro middleware asks Payload's
   `/api/brukere/me` who the cookie belongs to. Without a user it redirects to
   `/logg-inn`. If the CMS can't be reached, it answers 503 rather than letting
   anyone in.
6. **The frontend reads as the visitor.** Pages fetch from the CMS with the
   visitor's session, never with an API key or a service account, so the access
   functions decide what each person sees. Payload ignores its cookie on
   server-to-server requests, because they carry nothing for its CSRF check to
   go on, so the token is sent as `Authorization: JWT …` (`authHeaders` in
   `@saman/shared`).
7. **Only administrators** use the admin panel and change users and media.

## Consequences

- Access control is in one place and works the same whichever way someone
  logged in.
- Adding Ansattporten is mostly configuration, once open question 8 in the
  specification has settled how its logins map to users.
- The Entra ID flow can be tested end to end against a mock provider, without
  Entra ID and without secrets in CI.
- We maintain the OpenID Connect code ourselves, including keeping
  `openid-client` up to date.
- The Saman session is separate from the Microsoft session. Logging out of Saman
  doesn't log anyone out of Microsoft. Someone whose Entra ID account is disabled
  keeps their Saman session until it expires, at most 8 hours.
- There are two login pages: `/logg-inn` on the frontend for everyone, and
  `/admin/login` in the CMS for administrators. This is deliberate: the admin
  panel can still be reached if the frontend is down.
- In production, the frontend and the CMS must share the session cookie: serve
  them from one origin, or set the cookie domain. The cookie must be marked
  `Secure` (`auth.cookies.secure`).
- Password login is an exception to everything Entra ID enforces, such as MFA.
  Who may use it is the subject of
  [ADR-0002](0002-password-login-only-for-break-glass-accounts.md).
