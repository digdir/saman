import type { User } from './payload-types'

export * from './payload-types'

const CMS_URL = import.meta.env?.PUBLIC_CMS_URL ?? process.env.PUBLIC_CMS_URL ?? 'http://localhost:3000'

export type PaginatedDocs<T> = {
  docs: T[]
  totalDocs: number
  page: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/** Thin wrapper around the Payload REST API. */
export async function cmsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CMS_URL}/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!res.ok) {
    throw new Error(`CMS ${res.status} ${res.statusText} on ${path}`)
  }

  return (await res.json()) as T
}

/**
 * Headers that make a request to the CMS on behalf of the visitor whose
 * cookies these are, so Payload's access control sees who is asking.
 *
 * Payload ignores its session cookie on server-to-server requests, which carry
 * no Origin or Sec-Fetch-Site header for its CSRF check, so the token goes in
 * the Authorization header instead.
 */
export function authHeaders(cookie: string | null): Record<string, string> {
  const token = cookie
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('payload-token='))
    ?.slice('payload-token='.length)
  return token ? { Authorization: `JWT ${token}` } : {}
}

/**
 * Fetch a page of documents from a collection, e.g.
 * find('personer', 'limit=10', { headers: authHeaders(cookie) }).
 */
export function find<T>(collection: string, query = '', init?: RequestInit): Promise<PaginatedDocs<T>> {
  return cmsFetch<PaginatedDocs<T>>(`/${collection}${query ? `?${query}` : ''}`, init)
}

/** The user a request's cookies belong to, or null if they aren't logged in. */
export async function currentUser(cookie: string | null): Promise<User | null> {
  const headers = authHeaders(cookie)
  if (!headers.Authorization) return null
  const { user } = await cmsFetch<{ user: User | null }>('/brukere/me', { headers })
  return user
}

export type LoginProvider = { id: string; label: string }

/** The login providers configured in the CMS, besides email and password. */
export async function loginProviders(): Promise<LoginProvider[]> {
  const { providers } = await cmsFetch<{ providers: LoginProvider[] }>('/brukere/oauth/providers')
  return providers
}

/** The CMS's URL for logging in with a provider and coming back to `redirect`. */
export const providerLoginURL = (provider: string, redirect: string) =>
  `${CMS_URL}/api/brukere/oauth/${provider}/login?redirect=${encodeURIComponent(redirect)}`

/**
 * Log in with email and password (NF-12). Returns the session cookies to pass
 * on to the browser, or null if Payload refused the login.
 */
export async function login(email: string, password: string): Promise<string[] | null> {
  const res = await fetch(`${CMS_URL}/api/brukere/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return res.ok ? res.headers.getSetCookie() : null
}

/** End the session the cookie belongs to. Returns the cookies that clear it. */
export async function logout(cookie: string | null): Promise<string[]> {
  const res = await fetch(`${CMS_URL}/api/brukere/logout`, {
    method: 'POST',
    headers: authHeaders(cookie),
  })
  return res.headers.getSetCookie()
}
