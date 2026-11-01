import { getPayload } from 'payload'
import config from '@payload-config'

// Makes an existing user an administrator: `pnpm make-admin kari@digdir.no`.
// For databases from before roles existed, and for the first administrator
// who logs in with Entra ID. The user must have logged in once.

const email = process.argv[2]?.toLowerCase()
if (!email) {
  console.error('Usage: pnpm make-admin <email>')
  process.exit(1)
}

const payload = await getPayload({ config })
const { docs } = await payload.find({ collection: 'brukere', where: { email: { equals: email } } })
const user = docs[0]

if (!user) {
  console.error(`No user with the email ${email}. Log in once first.`)
} else {
  const roles = Array.from(new Set([...(user.roles ?? []), 'admin' as const]))
  await payload.update({ collection: 'brukere', id: user.id, data: { roles } })
  console.log(`${email} is now an administrator.`)
}

await payload.destroy()
process.exit(user ? 0 : 1)
