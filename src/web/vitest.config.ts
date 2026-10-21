/// <reference types="vitest" />
import { getViteConfig } from 'astro/config'

// getViteConfig gives the tests the same resolution as the app, so .astro
// components can be imported and rendered directly.
export default getViteConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
