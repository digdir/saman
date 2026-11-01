import { redirect } from 'next/navigation'

import { webURL } from '@/urls'

// The CMS has no pages of its own besides the admin panel. Visitors belong on
// the web frontend, which asks them to log in (NF-11).
export default function HomePage() {
  redirect(webURL)
}
