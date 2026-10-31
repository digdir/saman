import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Media, User } from '@/payload-types'

import { health } from '@/endpoints/health'

let payload: Payload
let user: User
let media: Media

// Prefix for every test row, so cleanup never touches other data.
const prefix = `int-media-${Date.now()}`

// 1x1 transparent PNG.
const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

describe('Media', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    user = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}@example.com`, password: 'test-password' },
    })
    media = await payload.create({
      collection: 'medier',
      data: { alt: prefix },
      file: { data: pixel, mimetype: 'image/png', name: `${prefix}.png`, size: pixel.byteLength },
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'medier', where: { alt: { equals: prefix } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('lets signed-in users read media', async () => {
    const found = await payload.findByID({
      collection: 'medier',
      id: media.id,
      overrideAccess: false,
      user,
    })
    expect(found.alt).toBe(prefix)
  })

  it('hides media, such as photos of employees, from anonymous users', async () => {
    await expect(
      payload.findByID({ collection: 'medier', id: media.id, overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('answers the health check without revealing content', async () => {
    const res = await health.handler({ payload } as Parameters<typeof health.handler>[0])
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})
