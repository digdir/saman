import { test, expect } from '@playwright/test'

/**
 * The only test that exercises the whole chain:
 * browser -> Astro SSR (:4321) -> Payload REST (:3000) -> PostgreSQL.
 *
 * The other suites stub or skip a link in it: the frontend tests stub fetch,
 * and the integration tests talk to Payload directly. The page calls the
 * CMS health endpoint, which only answers once it has queried the database.
 */
test.describe('Full stack', () => {
  test('renders a page that reached the database', async ({ page }) => {
    await page.goto('http://localhost:4321')

    await expect(page.locator('body')).toContainText('Connected — the CMS reached its database.')
  })
})
