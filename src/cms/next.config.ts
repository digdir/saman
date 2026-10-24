import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  // The pnpm virtual store lives at the repo root, so Turbopack's workspace
  // root has to include it or `next` itself resolves outside the root.
  turbopack: {
    root: path.resolve(dirname, '../..'),
  },
  // Don't generate AGENTS.md / CLAUDE.md on dev server start.
  agentRules: false,
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
