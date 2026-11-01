import crypto from 'node:crypto'
import * as client from 'openid-client'
import { getFieldsToSign, jwtSign, type Endpoint, type Payload, type PayloadRequest } from 'payload'
import { addSessionToUser, generatePayloadCookie, parseCookies } from 'payload/shared'

import type { User } from '@/payload-types'
import { webURL } from '@/urls'
import type { Identity, OidcProvider, OidcSettings } from './providers'

// Login with an OpenID Connect provider (authorization code flow with PKCE).
// Payload stays the only session: after the provider has vouched for the
// user, the callback issues the same payload-token cookie as a password login,
// so access control works the same whichever way someone logged in.
//
//   GET /api/brukere/oauth/<provider>/login?redirect=<url>
//   GET /api/brukere/oauth/<provider>/callback

const COLLECTION = 'brukere'
const STATE_MAX_AGE = 10 * 60

const configurations = new Map<string, Promise<client.Configuration>>()

// Discovery fetches the provider's metadata and keys once per process. A
// failure isn't cached, so the next login tries again.
function configuration(settings: OidcSettings): Promise<client.Configuration> {
  const key = `${settings.issuer.href} ${settings.clientId}`
  let config = configurations.get(key)
  if (!config) {
    const local = settings.issuer.protocol === 'http:' && settings.issuer.hostname === 'localhost'
    config = client.discovery(
      settings.issuer,
      settings.clientId,
      undefined,
      client.ClientSecretPost(settings.clientSecret),
      // Only the mock provider in the tests runs without TLS.
      local ? { execute: [client.allowInsecureRequests] } : undefined,
    )
    config.catch(() => configurations.delete(key))
    configurations.set(key, config)
  }
  return config
}

const stateCookieName = (provider: OidcProvider) => `saman-oauth-${provider.id}`
const callbackURL = (payload: Payload, provider: OidcProvider) =>
  new URL(`/api/${COLLECTION}/oauth/${provider.id}/callback`, payload.config.serverURL)

type PendingLogin = { state: string; nonce: string; verifier: string; redirect: string }

// The values the callback must check, kept in a short-lived cookie that is
// signed so it can't be swapped for another login's.
function sign(payload: Payload, value: PendingLogin): string {
  const data = Buffer.from(JSON.stringify(value)).toString('base64url')
  const mac = crypto.createHmac('sha256', payload.secret).update(data).digest('base64url')
  return `${data}.${mac}`
}

function unsign(payload: Payload, cookie: string | undefined): PendingLogin | null {
  const [data, mac] = cookie?.split('.') ?? []
  if (!data || !mac) return null
  const expected = crypto.createHmac('sha256', payload.secret).update(data).digest()
  const given = Buffer.from(mac, 'base64url')
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null
  return JSON.parse(Buffer.from(data, 'base64url').toString())
}

function stateCookie(payload: Payload, provider: OidcProvider, value: string, maxAge: number) {
  const secure = new URL(payload.config.serverURL).protocol === 'https:'
  return [
    `${stateCookieName(provider)}=${value}`,
    `Path=/api/${COLLECTION}/oauth/${provider.id}`,
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ')
}

// Only send people on to the CMS or the web frontend, never to another site.
export function safeRedirect(target: string | null, payload: Payload): string {
  const fallback = `${webURL}/`
  if (!target) return fallback
  try {
    const url = new URL(target, payload.config.serverURL)
    const allowed = [payload.config.serverURL, webURL].map((u) => new URL(u).origin)
    return allowed.includes(url.origin) ? url.href : fallback
  } catch {
    return fallback
  }
}

const redirect = (location: string, cookies: string[] = []) => {
  const headers = new Headers({ Location: location })
  for (const cookie of cookies) headers.append('Set-Cookie', cookie)
  return new Response(null, { status: 302, headers })
}

const loginFailed = (provider: OidcProvider, cookies: string[] = []) =>
  redirect(`${webURL}/logg-inn?feil=${encodeURIComponent(provider.id)}`, cookies)

// Finds the user the provider identified, by the provider's ID for them.
// Someone logging in for the first time is matched on email, so an existing
// account (such as an administrator's) gets the identity added, or a new user
// is created without roles.
async function findOrCreateUser(
  req: PayloadRequest,
  provider: OidcProvider,
  identity: Identity,
): Promise<User> {
  const { payload } = req
  const hasIdentity = (user: User) =>
    user.identities?.some((i) => i.provider === provider.id && i.subject === identity.subject)

  const { docs: linked } = await payload.find({
    collection: COLLECTION,
    where: { 'identities.subject': { equals: identity.subject } },
    depth: 0,
    req,
  })
  const user = linked.find(hasIdentity)
  if (user) {
    if (user.email === identity.email && user.name === identity.name) return user
    return payload.update({
      collection: COLLECTION,
      id: user.id,
      data: { email: identity.email, name: identity.name },
      depth: 0,
      req,
    })
  }

  const { docs: byEmail } = await payload.find({
    collection: COLLECTION,
    where: { email: { equals: identity.email } },
    depth: 0,
    req,
  })
  const newIdentity = { provider: provider.id, subject: identity.subject }
  if (byEmail[0]) {
    return payload.update({
      collection: COLLECTION,
      id: byEmail[0].id,
      data: {
        name: identity.name,
        identities: [...(byEmail[0].identities ?? []), newIdentity],
      },
      depth: 0,
      req,
    })
  }

  return payload.create({
    collection: COLLECTION,
    data: {
      email: identity.email,
      name: identity.name,
      identities: [newIdentity],
      // Payload requires a password. Nobody knows this one, so the user can
      // only use the password login (NF-12) if an administrator sets one.
      password: crypto.randomBytes(32).toString('base64url'),
    },
    context: { createdByLogin: true },
    depth: 0,
    req,
  })
}

// Issues a Payload session the same way a password login does.
async function sessionCookie(req: PayloadRequest, user: User): Promise<string> {
  const { payload } = req
  const collectionConfig = payload.collections[COLLECTION].config
  // addSessionToUser saves the whole document it is given, so give it the
  // stored one rather than the API's view of it.
  const stored = await payload.db.findOne<User>({
    collection: COLLECTION,
    where: { id: { equals: user.id } },
    req,
  })
  if (!stored) throw new Error(`User ${user.id} disappeared during login`)
  const sessionUser = { ...stored, collection: COLLECTION } as const
  const { sid } = await addSessionToUser({ collectionConfig, payload, req, user: sessionUser })
  const fieldsToSign = getFieldsToSign({ collectionConfig, email: stored.email, sid, user: sessionUser })
  const { token } = await jwtSign({
    fieldsToSign,
    secret: payload.secret,
    tokenExpiration: collectionConfig.auth.tokenExpiration,
  })
  return generatePayloadCookie({
    collectionAuthConfig: collectionConfig.auth,
    cookiePrefix: payload.config.cookiePrefix,
    token,
  })
}

// Which providers the login pages should offer. Public, and only names them.
export const providersEndpoint = (providers: OidcProvider[]): Endpoint => ({
  path: '/oauth/providers',
  method: 'get',
  handler: () =>
    Response.json({
      providers: providers.filter((p) => p.settings()).map(({ id, label }) => ({ id, label })),
    }),
})

export function oidcEndpoints(provider: OidcProvider): Endpoint[] {
  const notConfigured = () =>
    Response.json({ message: `${provider.label} is not configured` }, { status: 404 })

  return [
    {
      path: `/oauth/${provider.id}/login`,
      method: 'get',
      handler: async (req) => {
        const settings = provider.settings()
        if (!settings) return notConfigured()

        let config: client.Configuration
        try {
          config = await configuration(settings)
        } catch (err) {
          req.payload.logger.error({ err, msg: `${provider.label} discovery failed` })
          return loginFailed(provider)
        }

        const pending: PendingLogin = {
          state: client.randomState(),
          nonce: client.randomNonce(),
          verifier: client.randomPKCECodeVerifier(),
          redirect: safeRedirect(new URL(req.url!).searchParams.get('redirect'), req.payload),
        }
        const authorizationURL = client.buildAuthorizationUrl(config, {
          redirect_uri: callbackURL(req.payload, provider).href,
          scope: provider.scope,
          state: pending.state,
          nonce: pending.nonce,
          code_challenge: await client.calculatePKCECodeChallenge(pending.verifier),
          code_challenge_method: 'S256',
        })
        return redirect(authorizationURL.href, [
          stateCookie(req.payload, provider, sign(req.payload, pending), STATE_MAX_AGE),
        ])
      },
    },
    {
      path: `/oauth/${provider.id}/callback`,
      method: 'get',
      handler: async (req) => {
        const settings = provider.settings()
        if (!settings) return notConfigured()

        const pending = unsign(req.payload, parseCookies(req.headers).get(stateCookieName(provider)))
        const clearState = stateCookie(req.payload, provider, '', 0)
        if (!pending) return loginFailed(provider)

        // Built from serverURL, not req.url, so it matches the registered
        // redirect URI behind a proxy too.
        const currentURL = callbackURL(req.payload, provider)
        currentURL.search = new URL(req.url!).search

        let identity: Identity | null
        try {
          const config = await configuration(settings)
          const tokens = await client.authorizationCodeGrant(config, currentURL, {
            pkceCodeVerifier: pending.verifier,
            expectedState: pending.state,
            expectedNonce: pending.nonce,
            idTokenExpected: true,
          })
          identity = provider.identify(tokens.claims()!)
        } catch (err) {
          req.payload.logger.warn({ err, msg: `${provider.label} login failed` })
          return loginFailed(provider, [clearState])
        }
        if (!identity) {
          req.payload.logger.warn({ msg: `${provider.label} login refused: unexpected claims` })
          return loginFailed(provider, [clearState])
        }

        const user = await findOrCreateUser(req, provider, identity)
        return redirect(pending.redirect, [clearState, await sessionCookie(req, user)])
      },
    },
  ]
}
