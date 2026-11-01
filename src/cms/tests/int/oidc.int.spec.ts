import { OAuth2Server } from 'oauth2-mock-server'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { oidcEndpoints, safeRedirect } from '@/auth/oidc'
import { entra } from '@/auth/providers'
import { webURL } from '@/urls'

// The Entra ID login (NF-02) against a mock OpenID provider, from the
// redirect to the provider to the Payload session cookie.

let payload: Payload
let provider: OAuth2Server
let claims: Record<string, unknown>

const prefix = `int-oidc-${Date.now()}`
const email = (n: number | string) => `${prefix}-${n}@example.com`
const tenant = 'test-tenant'

const savedEnv = { ...process.env }
const [loginEndpoint, callbackEndpoint] = oidcEndpoints(entra)

const request = (url: string, cookie?: string) =>
  ({
    payload,
    url,
    headers: new Headers(cookie ? { cookie } : {}),
  }) as unknown as PayloadRequest

const cookiesOf = (res: Response) => res.headers.getSetCookie().map((c) => c.split(';')[0]!)

// Runs the whole flow and returns the callback's response.
async function logIn(redirect = `${webURL}/team`, tamper?: (cookie: string) => string) {
  const start = await loginEndpoint!.handler(
    request(`${payload.config.serverURL}/api/brukere/oauth/entra/login?redirect=${encodeURIComponent(redirect)}`),
  )
  expect(start.status).toBe(302)
  const stateCookie = cookiesOf(start)[0]!

  // The mock provider "authenticates" at once and sends the browser back.
  const authorized = await fetch(start.headers.get('Location')!, { redirect: 'manual' })
  const callbackURL = authorized.headers.get('Location')!
  expect(callbackURL).toContain('/api/brukere/oauth/entra/callback?code=')

  return callbackEndpoint!.handler(request(callbackURL, tamper ? tamper(stateCookie) : stateCookie))
}

const sessionUser = async (res: Response) => {
  const token = cookiesOf(res).find((c) => c.startsWith('payload-token='))?.split('=')[1]
  if (!token) return null
  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  return user
}

describe('Login with Entra ID', () => {
  beforeAll(async () => {
    provider = new OAuth2Server()
    await provider.issuer.keys.generate('RS256')
    await provider.start(0, 'localhost')
    provider.service.on('beforeTokenSigning', (token) => Object.assign(token.payload, claims))

    process.env.ENTRA_ISSUER = provider.issuer.url!
    process.env.ENTRA_TENANT_ID = tenant
    process.env.ENTRA_CLIENT_ID = 'saman-test'
    process.env.ENTRA_CLIENT_SECRET = 'test-secret'

    payload = await getPayload({ config: await config })
  })

  beforeEach(() => {
    claims = { tid: tenant, oid: `${prefix}-oid-1`, email: email(1), name: 'Kari Nordmann' }
  })

  afterAll(async () => {
    process.env = savedEnv
    await provider.stop()
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('creates the user on the first login and sends them back with a session', async () => {
    const res = await logIn()

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe(`${webURL}/team`)
    const user = await sessionUser(res)
    expect(user).toMatchObject({ email: email(1), name: 'Kari Nordmann' })
    expect(user?.roles ?? []).toEqual([])
    expect(user?.identities).toMatchObject([{ provider: 'entra', subject: `${prefix}-oid-1` }])
  })

  it('finds the same user by oid when the email has changed', async () => {
    const first = await sessionUser(await logIn())
    claims.email = email('renamed')

    const second = await sessionUser(await logIn())

    expect(second?.id).toBe(first?.id)
    expect(second?.email).toBe(email('renamed'))
  })

  it('links an existing account with the same email, keeping its roles', async () => {
    const existing = await payload.create({
      collection: 'brukere',
      data: { email: email('admin'), password: 'test-password', roles: ['admin'] },
    })
    claims = { ...claims, oid: `${prefix}-oid-admin`, email: email('admin').toUpperCase() }

    const user = await sessionUser(await logIn())

    expect(user?.id).toBe(existing.id)
    expect(user?.roles).toEqual(['admin'])
  })

  it('refuses accounts from another tenant', async () => {
    claims.tid = 'another-tenant'
    claims.oid = `${prefix}-oid-other`

    const res = await logIn()

    expect(res.headers.get('Location')).toBe(`${webURL}/logg-inn?feil=entra`)
    expect(await sessionUser(res)).toBeNull()
    const { totalDocs } = await payload.count({
      collection: 'brukere',
      where: { 'identities.subject': { equals: `${prefix}-oid-other` } },
    })
    expect(totalDocs).toBe(0)
  })

  it('refuses a callback whose state cookie was tampered with', async () => {
    // Changes the signed data, as if someone swapped in their own state.
    const res = await logIn(undefined, (cookie) => cookie.replace('=', '=x'))

    expect(res.headers.get('Location')).toBe(`${webURL}/logg-inn?feil=entra`)
    expect(await sessionUser(res)).toBeNull()
  })

  it('only redirects to the CMS or the web frontend after login', () => {
    expect(safeRedirect('/admin', payload)).toBe(`${payload.config.serverURL}/admin`)
    expect(safeRedirect(`${webURL}/folk`, payload)).toBe(`${webURL}/folk`)
    expect(safeRedirect('https://evil.example/', payload)).toBe(`${webURL}/`)
    expect(safeRedirect('//evil.example/', payload)).toBe(`${webURL}/`)
  })

  it('is off when Entra ID is not configured', async () => {
    delete process.env.ENTRA_CLIENT_SECRET
    try {
      const res = await loginEndpoint!.handler(request(`${payload.config.serverURL}/api/brukere/oauth/entra/login`))
      expect(res.status).toBe(404)
    } finally {
      process.env.ENTRA_CLIENT_SECRET = 'test-secret'
    }
  })
})
