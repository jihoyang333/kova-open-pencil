import fs from 'node:fs'

import { defineConfig } from '@playwright/test'

const SHOPIFY_AUTH_PATH = './tests/e2e/.auth/shopify-dev-store.json'

export default defineConfig({
  testDir: './tests',
  timeout: 15_000,
  workers: 1,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.3
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.3
    }
  },
  use: {
    baseURL: 'http://localhost:1420',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    launchOptions: {
      args: ['--enable-unsafe-swiftshader']
    }
  },
  projects: [
    {
      name: 'openpencil',
      testDir: './tests/e2e',
      fullyParallel: false
    },
    {
      name: 'figma',
      testDir: './tests/figma'
    },
    {
      // Shopify integration tests — requires a saved OAuth session.
      // Run `tests/e2e/helpers/shopify-auth.ts` once to generate
      // `tests/e2e/.auth/shopify-dev-store.json` before using this project.
      name: 'shopify',
      testDir: './tests/e2e',
      testMatch: '**/m9-shopify.spec.ts',
      fullyParallel: false,
      use: {
        storageState: fs.existsSync(SHOPIFY_AUTH_PATH)
          ? SHOPIFY_AUTH_PATH
          : undefined
      }
    }
  ],
  webServer: {
    command: 'bun run dev',
    port: 1420,
    reuseExistingServer: true
  }
})
