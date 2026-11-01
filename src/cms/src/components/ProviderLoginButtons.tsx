import type { ServerProps } from 'payload'
import React from 'react'

import { providers } from '@/auth/providers'

// Login buttons for the configured providers, under the admin panel's email
// and password form. That form stays as the fallback (NF-12).
export function ProviderLoginButtons({ i18n }: ServerProps) {
  const configured = providers.filter((p) => p.settings())
  if (configured.length === 0) return null

  const text = i18n.language === 'en' ? 'Log in with' : 'Logg inn med'
  return (
    <div style={{ display: 'grid', gap: 'var(--base)', marginTop: 'var(--base)' }}>
      {configured.map(({ id, label }) => (
        <a
          className="btn btn--style-secondary btn--size-large"
          href={`/api/brukere/oauth/${id}/login?redirect=/admin`}
          key={id}
        >
          {text} {label}
        </a>
      ))}
    </div>
  )
}
