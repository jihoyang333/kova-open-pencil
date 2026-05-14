/**
 * Shopify dev-store OAuth session capture helper.
 *
 * Run this once manually before the Shopify E2E suite to persist the
 * authenticated Shopify OAuth session to disk. The saved storageState
 * is then consumed by the `shopify` Playwright project so tests skip
 * the OAuth popup entirely.
 *
 * Works for both fresh accounts (onboarding) and already-onboarded accounts
 * (uses Settings → Brand → Integrations page).
 *
 * Usage:
 *   SHOPIFY_DEV_STORE=your-store.myshopify.com \
 *   TEST_USER_EMAIL=you@example.com \
 *   TEST_USER_PASSWORD=secret \
 *   bun tests/e2e/helpers/shopify-auth.ts
 */

import fs from 'node:fs'
import path from 'node:path'

import { chromium, type Page } from '@playwright/test'

const STORAGE_STATE_PATH = path.resolve(
  __dirname,
  '../.auth/shopify-dev-store.json',
)
const BASE_URL = 'http://localhost:1420'

const DEV_STORE = process.env['SHOPIFY_DEV_STORE'] ?? ''
const TEST_EMAIL = process.env['TEST_USER_EMAIL'] ?? ''
const TEST_PASSWORD = process.env['TEST_USER_PASSWORD'] ?? ''

if (!DEV_STORE || !TEST_EMAIL || !TEST_PASSWORD) {
  console.error(
    'Missing env vars: SHOPIFY_DEV_STORE, TEST_USER_EMAIL, TEST_USER_PASSWORD',
  )
  process.exit(1)
}

export async function setupShopifyDevStore(): Promise<void> {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ baseURL: BASE_URL })
  const page = await context.newPage()

  // --- 1. Log into Kova ---
  await page.goto('/login', { timeout: 60_000, waitUntil: 'load' })
  await page.locator('[data-test-id="login-email-input"]').fill(TEST_EMAIL)
  await page.locator('[data-test-id="login-password-input"]').fill(TEST_PASSWORD)
  await page.locator('[data-test-id="login-submit-button"]').click()

  // Wait for auto-redirect to first brand dashboard
  await page.waitForURL(/\/dashboard\/[0-9a-f-]{36}/, { timeout: 30_000 })

  const url = page.url()
  const match = url.match(/\/dashboard\/([0-9a-f-]{36})/)
  if (!match) {
    throw new Error(
      `Could not extract brand ID from URL: ${url}. Make sure you have at least one brand created.`,
    )
  }

  const brandId = match[1]
  console.log(`Using brand ID: ${brandId}`)

  await page.goto(`/dashboard/${brandId}/settings/integrations`, {
    timeout: 60_000,
    waitUntil: 'load',
  })

  await page
    .locator('[data-test-id="settings-integrations-view"]')
    .waitFor({ timeout: 15_000 })

  // --- 2. Wait for loading state to clear ---
  await page
    .locator('[data-test-id="integrations-loading"]')
    .waitFor({ state: 'hidden', timeout: 15_000 })
    .catch(() => null)

  // --- 3. Wait for any stable (non-loading) state to settle ---
  // Combined waitFor eliminates the race where isVisible() fires before
  // Vue has swapped the loading skeleton for the real UI.
  await page
    .locator(
      '[data-test-id="integrations-connected"], ' +
        '[data-test-id="integrations-not-connected"], ' +
        '[data-test-id="integrations-reauthorize"]',
    )
    .first()
    .waitFor({ timeout: 15_000 })

  const isConnected = await page
    .locator('[data-test-id="integrations-connected"]')
    .isVisible()
  const isReauthorize = await page
    .locator('[data-test-id="integrations-reauthorize"]')
    .isVisible()

  // --- 4. Handle OAuth only if brand is not already connected ---
  // storageState just captures Kova's Supabase session cookies — it does
  // NOT need the Shopify OAuth step re-run. If the brand already has an
  // active connection in the DB, skip OAuth entirely.
  if (!isConnected) {
    let popup: Page

    if (isReauthorize) {
      console.log('Brand in reauthorize state — using reauthorize button.')
      const result = await Promise.all([
        context.waitForEvent('page'),
        page.locator('[data-test-id="integrations-reauthorize-btn"]').click(),
      ])
      popup = result[0]
    } else {
      await page
        .locator('[data-test-id="integrations-connect-btn"]')
        .waitFor({ timeout: 15_000 })
      await page.locator('[data-test-id="integrations-connect-btn"]').click()
      await page
        .locator('[data-test-id="integrations-shop-input"]')
        .fill(DEV_STORE)
      const result = await Promise.all([
        context.waitForEvent('page'),
        page.locator('[data-test-id="integrations-confirm-connect"]').click(),
      ])
      popup = result[0]
    }

    console.log(
      'Shopify OAuth popup opened — click Install in the browser window.',
    )
    await popup.waitForEvent('close', { timeout: 5 * 60_000 })

    // Composable receives shopify_oauth_success postMessage and flips state
    await page
      .locator('[data-test-id="integrations-connected"]')
      .waitFor({ timeout: 60_000 })
  } else {
    console.log(
      'Brand already connected — skipping OAuth, saving storageState directly.',
    )
  }

  // --- 5. Save storageState ---
  const dir = path.dirname(STORAGE_STATE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  await context.storageState({ path: STORAGE_STATE_PATH })
  console.log(`Shopify dev-store session saved to ${STORAGE_STATE_PATH}`)

  await browser.close()
}

// Bun / Node direct invocation
const isMain =
  typeof require !== 'undefined'
    ? require.main === module
    : import.meta.url === `file://${process.argv[1]}`

if (isMain) {
  setupShopifyDevStore().catch((err: unknown) => {
    console.error(err)
    process.exit(1)
  })
}
