import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testUser = {
  email: 'dev@payloadcms.com',
  password: 'test',
}

// An administrator, so the admin panel tests can get in.

/**
 * Seeds an administrator for the e2e tests.
 */
export async function seedTestUser(user = testUser): Promise<void> {
  const payload = await getPayload({ config })

  // Delete existing test user if any
  await payload.delete({
    collection: 'brukere',
    where: {
      email: {
        equals: user.email,
      },
    },
  })

  // Create fresh test user
  await payload.create({
    collection: 'brukere',
    data: { ...user, roles: ['admin'] },
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(user = testUser): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'brukere',
    where: {
      email: {
        equals: user.email,
      },
    },
  })
}
