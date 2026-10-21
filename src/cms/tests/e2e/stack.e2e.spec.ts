import { test, expect } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

/**
 * The only test that exercises the whole chain:
 * browser -> Astro SSR (:4321) -> Payload REST (:3000) -> PostgreSQL.
 *
 * The other suites stub or skip a link in it: the frontend tests stub fetch,
 * and the integration tests talk to Payload directly.
 */

// 1x1 transparent PNG.
const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

const alt = 'stack e2e fixture'

test.describe('Full stack', () => {
  let mediaID: number | string

  test.beforeAll(async () => {
    const payload = await getPayload({ config })

    const created = await payload.create({
      collection: 'media',
      data: { alt },
      file: {
        data: pixel,
        mimetype: 'image/png',
        name: `stack-e2e-${Date.now()}.png`,
        size: pixel.byteLength,
      },
    })

    mediaID = created.id
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'media', id: mediaID })
  })

  test('renders data that came from the database', async ({ page }) => {
    const payload = await getPayload({ config })
    const { totalDocs } = await payload.count({ collection: 'media' })

    expect(totalDocs).toBeGreaterThan(0)

    await page.goto('http://localhost:4321')

    await expect(page.locator('body')).toContainText(
      `Connected — ${totalDocs} document(s) in the media collection.`,
    )
  })
})
