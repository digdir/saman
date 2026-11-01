import { defineMiddleware } from 'astro:middleware'
import { currentUser } from '@saman/shared'

// Every page needs a logged-in user (NF-11), except the login page itself.
// Payload owns the session: this only asks it who the cookie belongs to.
// Content is still protected in Payload, whose access control decides what
// each user may read.
const PUBLIC_PATHS = ['/logg-inn', '/logg-inn/']

export const onRequest = defineMiddleware(async (context, next) => {
  if (PUBLIC_PATHS.includes(context.url.pathname)) return next()

  let user
  try {
    user = await currentUser(context.request.headers.get('cookie'))
  } catch {
    // Without the CMS nobody can be checked, so nobody gets in.
    return new Response('Saman får ikke kontakt med innloggingen. Prøv igjen om litt.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (!user) {
    const target = context.url.pathname + context.url.search
    return context.redirect(`/logg-inn?redirect=${encodeURIComponent(target)}`)
  }

  context.locals.user = user
  return next()
})
