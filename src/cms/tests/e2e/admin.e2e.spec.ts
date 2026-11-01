import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

test.describe('Admin Panel', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('can navigate to dashboard', async () => {
    await page.goto('http://localhost:3000/admin')
    await expect(page).toHaveURL('http://localhost:3000/admin')
    const dashboardArtifact = page.locator('span[title="Dashboard"]').first()
    await expect(dashboardArtifact).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto('http://localhost:3000/admin/collections/brukere')
    // The list view may add its default query (?depth=1&limit=10) once loaded.
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/admin\/collections\/brukere(\?.*)?$/)
    const listViewArtifact = page.locator('h1', { hasText: 'Brukere' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto('http://localhost:3000/admin/collections/brukere/create')
    await expect(page).toHaveURL(/\/admin\/collections\/brukere\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="email"]')
    await expect(editViewArtifact).toBeVisible()
  })

  // Swedish has Payload translations but isn't enabled, so it falls back to Norwegian.
  for (const [locale, loginLabel] of [
    ['nb-NO', 'Logg inn'],
    ['en-US', 'Login'],
    ['sv-SE', 'Logg inn'],
  ]) {
    test(`shows the admin panel in the right language for ${locale}`, async ({ browser }) => {
      const context = await browser.newContext({ locale })
      const localePage = await context.newPage()
      await localePage.goto('http://localhost:3000/admin/login')
      await expect(localePage.locator('button[type="submit"]')).toHaveText(loginLabel)
      await context.close()
    })
  }
})
