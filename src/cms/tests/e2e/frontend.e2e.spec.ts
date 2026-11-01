import { test, expect } from '@playwright/test'

test.describe('CMS front page', () => {
  test('sends visitors on to the web frontend, which asks them to log in (NF-11)', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await expect(page).toHaveURL('http://localhost:4321/logg-inn?redirect=%2F')
  })
})
