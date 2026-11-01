import type { IDToken } from 'openid-client'

import type { User } from '@/payload-types'

// The OpenID Connect providers people can log in with, next to Payload's own
// email and password login (NF-12). Entra ID is the only one so far (NF-02).
// Ansattporten (NF-13) goes here too, once open question 8 settles how its
// logins map to users.

export type OidcSettings = {
  issuer: URL
  clientId: string
  clientSecret: string
}

export type Identity = {
  subject: string
  email: string
  firstName?: string
  lastName?: string
}

/** The providers in the users' identities field, generated from `providers`. */
export type ProviderId = NonNullable<User['identities']>[number]['provider']

export type OidcProvider = {
  id: ProviderId
  label: string
  scope: string
  /** Null when the provider isn't configured in this environment. */
  settings: () => OidcSettings | null
  /** Who a validated ID token is about, or null to refuse the login. */
  identify: (claims: IDToken) => Identity | null
}

export const entra: OidcProvider = {
  id: 'entra',
  label: 'Entra ID',
  scope: 'openid profile email',
  settings: () => {
    const { ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET, ENTRA_ISSUER } = process.env
    if (!ENTRA_TENANT_ID || !ENTRA_CLIENT_ID || !ENTRA_CLIENT_SECRET) return null
    return {
      // ENTRA_ISSUER only exists so the tests can point at a mock provider.
      issuer: new URL(ENTRA_ISSUER || `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/v2.0`),
      clientId: ENTRA_CLIENT_ID,
      clientSecret: ENTRA_CLIENT_SECRET,
    }
  },
  identify: (claims) => {
    // The issuer check already pins the tenant; this guards against a
    // misconfigured issuer letting another tenant's accounts in.
    if (claims.tid !== process.env.ENTRA_TENANT_ID) return null
    // oid is the account's stable ID in the tenant. Email and UPN can change.
    const subject = claims.oid
    const email = claims.email ?? claims.preferred_username
    if (typeof subject !== 'string' || typeof email !== 'string') return null
    // given_name and family_name are optional claims that the app
    // registration has to add to the ID token. Without them the names stay
    // empty: the display name (name) can't be split reliably, since it is
    // written «Birkeli, Ronny».
    const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined)
    return {
      subject,
      email: email.toLowerCase(),
      firstName: text(claims.given_name),
      lastName: text(claims.family_name),
    }
  },
}

export const providers: OidcProvider[] = [entra]
