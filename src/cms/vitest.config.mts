import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // The integration tests exercise Payload's Local API, which needs Node
    // builtins — under jsdom, `url` resolves to a browser shim and
    // fileURLToPath in payload.config.ts is undefined. Component tests can
    // opt back in per file with `// @vitest-environment jsdom`.
    environment: 'node',
    // Every file calls getPayload, which pushes the schema in development.
    // In parallel, two files race to create the same new tables, and they
    // share one database anyway, so run them one at a time.
    fileParallelism: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
  },
})
