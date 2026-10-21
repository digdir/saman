import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'pnpm dev',
      reuseExistingServer: true,
      url: 'http://localhost:3000',
    },
    {
      // --ignore-lock keeps Astro in the foreground. Without it the dev server
      // daemonizes when it detects an agent session, and Playwright sees the
      // spawned process exit immediately.
      command: 'pnpm --filter web exec astro dev --ignore-lock',
      // This package runs Playwright with `--import=tsx/esm` in NODE_OPTIONS,
      // which the spawned process inherits — and tsx only exists here, so the
      // frontend would fail to boot with ERR_MODULE_NOT_FOUND.
      env: { NODE_OPTIONS: '--no-deprecation' },
      reuseExistingServer: true,
      url: 'http://localhost:4321',
    },
  ],
})
