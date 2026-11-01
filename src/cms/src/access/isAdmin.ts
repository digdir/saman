import type { PayloadRequest } from 'payload'

// Administrators maintain content that applies across Digdir and use the
// admin panel (2.3). Everyone else only reads, through the web frontend.
export const isAdmin = (user: PayloadRequest['user']): boolean =>
  Boolean(user?.roles?.includes('admin'))
