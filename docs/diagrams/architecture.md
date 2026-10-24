# Architecture overview

The moving parts of Saman as it is meant to run: in Azure in Norway, with
sign-in through Microsoft Entra ID. Solid arrows are requests; dotted arrows are
sign-in redirects and the signing keys the CMS checks tokens against.

> **Status:** the application code exists and runs locally. Entra ID sign-in and
> the Azure hosting are decided but not built yet. See
> [Local development](#local-development) for how this maps to a developer machine
> today.

```mermaid
flowchart TB
    employee(["Employee<br/>browser"])
    editor(["Editor<br/>browser"])
    entra{{"Microsoft Entra ID<br/>Digdir tenant"}}

    subgraph azure["Azure — Norway East"]
        subgraph aks["AKS — DIS Core (Digdir Infrastructure Services)"]
            subgraph ns["Saman namespace"]
                subgraph web["Frontend — src/web, Astro 7 SSR"]
                    pages["Pages<br/>(server-rendered)"]
                    client["@saman/shared (src/shared)<br/>REST client + Payload types"]
                end

                subgraph cms["CMS — src/cms, Payload 3 on Next.js 16"]
                    rest["REST API<br/>/api/*"]
                    graphql["GraphQL API<br/>/api/graphql"]
                    admin["Admin UI<br/>/admin"]
                    core["Payload core<br/>collections, access control, hooks"]
                end
            end
        end

        db[("Azure Database for<br/>PostgreSQL")]
        media[("Azure Blob Storage<br/>uploaded files")]
    end

    employee -- "HTTPS" --> pages
    editor -- "HTTPS" --> admin
    entra <-. "sign-in, OIDC" .-> pages
    entra <-. "sign-in, OIDC" .-> admin
    pages -- "imports" --> client
    client -- "REST over HTTPS<br/>with the employee's token" --> rest
    rest --> core
    graphql --> core
    admin --> core
    entra -. "token signing keys" .-> core
    core -- "SQL" --> db
    core -- "file uploads" --> media
```

## Parts

| Part | Role |
| --- | --- |
| **DIS Core** | Digdir Infrastructure Services' shared AKS cluster. Saman gets its own namespace there, and both apps run in it. |
| **Frontend** (`src/web`) | The site employees use, running in Saman's namespace on DIS Core. Astro renders every page on the server and fetches content from the CMS during the request, so the browser never calls the CMS directly. |
| **CMS** (`src/cms`) | Runs in the same namespace as the frontend. Owns the content model, access control and data. Editors work in the admin UI; the frontend reads through the REST API. GraphQL is exposed but nothing uses it yet. CORS and CSRF only allow the frontend's URL. |
| **`@saman/shared`** (`src/shared`) | A pnpm workspace package, not a running service; it is drawn inside the frontend because that is where its code runs. It holds the types generated from the collection configs (`pnpm generate:types`) and a thin REST client, so the frontend is typed against the CMS schema. |
| **Microsoft Entra ID** | Identity provider for both employees and editors, through OpenID Connect against Digdir's tenant. It says who someone is; what editors may do is managed in Payload. It is a global Microsoft service, so it sits outside the Norway region in the diagram. |
| **Azure Database for PostgreSQL** | The only database. In Azure the schema is applied with migrations, not pushed on startup. |
| **Azure Blob Storage** | Files uploaded to Payload's `media` collection. |

Everything Saman stores — content in PostgreSQL and uploaded files in Blob
Storage — stays in Norway East.

## Authentication

1. An employee opens the frontend and is sent to Entra ID to sign in.
2. The frontend gets an access token for the CMS's API, issued for the CMS's own
   app registration, and keeps it in the employee's server-side session.
3. Every request from the frontend to the CMS carries that token. The CMS
   validates it against Entra ID's signing keys and maps it to a Payload user, so
   Payload's access control runs as the employee and not as a shared service
   account.
4. Editors sign in to the Payload admin with the same Entra ID account. Which
   collections they may edit comes from roles on their Payload user, managed in
   the admin, not from Entra ID groups.

The CMS needs a custom Payload auth strategy for steps 3 and 4. Payload's built-in
email and password login is only for local development.

## Local development

The same application code runs on a developer machine, with local stand-ins
for the Azure services:

| In Azure | Locally |
| --- | --- |
| Azure Database for PostgreSQL | PostgreSQL 17 in Docker on `:5432`, schema pushed on startup |
| Azure Blob Storage | Local disk, `src/cms/media` |
| Entra ID sign-in | Not built yet; the admin uses Payload's own email and password users |
| Saman namespace on DIS Core | `pnpm dev`: Astro on `:4321`, Payload on `:3000` |

The [agentctl Agent](../../agent/README.md) runs this same local stack inside a
sandbox, with Podman in place of Docker. The [prototype](../../prototype) is a
static HTML spec and is not part of the running system.

## Later: public pages

Saman is internal for now: every visitor is an employee who signs in. Public
pages will come later. Those requests carry no employee token, so the frontend
will need another way to read from the CMS, and the CMS will need access rules
for what anonymous visitors may see. How that works is not decided yet.
