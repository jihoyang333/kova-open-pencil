/**
 * Shopify dev-store OAuth session capture helper.
 *
 * Run this once manually before the Shopify E2E suite to persist the
 * authenticated Shopify OAuth session to disk. The saved storageState
 * is then consumed by the `shopify` Playwright project so tests skip
 * the OAuth popup entirely.
 *
 * Usage:
 *   SHOPIFY_DEV_STORE=your-store.myshopify.com \
 *   TEST_USER_EMAIL=you@example.com \
 *   TEST_USER_PASSWORD=secret \
 *   npx ts-node tests/e2e/helpers/shopify-auth.ts
 *
 * Or run via Playwright's globalSetup:
 *   npx playwright test --project=shopify-setup
 */

import fs from 'node:fs'
import path from 'node:path'

import { chromium } from '@playwright/test'

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

/**
 * Logs the test user into Kova, navigates through onboarding to the
 * store-type step, triggers the Shopify OAuth popup, completes it in
 * a headed browser so you can log into the Shopify dev store, then
 * saves the resulting page storageState to disk.
 *
 * The saved file contains cookies + localStorage so subsequent test
 * runs can skip login and the OAuth handshake entirely.
 */
export async function setupShopifyDevStore(): Promise<void> {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ baseURL: BASE_URL })
  const page = await context.newPage()

  // --- 1. Log into Kova ---
  await page.goto('/login')
  await page.locator('[data-test-id="login-email-input"]').fill(TEST_EMAIL)
  await page.locator('[data-test-id="login-password-input"]').fill(TEST_PASSWORD)

  await Promise.all([
    page.waitForURL('**/dashboard**'),
    page.locator('[data-test-id="login-submit-button"]').click(),
  ])

  // --- 2. Navigate to onboarding store-type step ---
  // The route is only accessible while onboarding is incomplete.
  // For a fresh dev account this works directly; for an already-onboarded
  // account you may need to clear the onboarding flag in Supabase first.
  await page.goto('/onboarding/store-type')
  await page
    .locator('[data-test-id="onboarding-store-type-step"]')
    .waitFor({ timeout: 15_000 })

  // --- 3. Select Shopify and enter the dev-store domain ---
  await page.locator('[data-test-id="store-type-shopify"]').click()
  await page.locator('[data-test-id="store-type-shop-input"]').fill(DEV_STORE)

  // --- 4. Trigger OAuth popup and wait for the callback ---
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('[data-test-id="store-type-connect"]').click(),
  ])

  // The popup navigates to Shopify's OAuth login page.
  // Because this is a headed run you can manually approve the app
  // install in the popup. Wait until it closes (callback redirects
  // back to the Kova callback handler which closes the window).
  await popup.waitForEvent('close', { timeout: 5 * 60_000 })

  // --- 5. Wait for the connection to reach a terminal state ---
  await page.waitForURL('**/dashboard**', { timeout: 30_000 })

  // --- 6. Save storageState ---
  const dir = path.dirname(STORAGE_STATE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  await context.storageState({ path: STORAGE_STATE_PATH })
  console.log(`Shopify dev-store session saved to ${STORAGE_STATE_PATH}`)

  await browser.close()
}

// Allow direct invocation: `node tests/e2e/helpers/shopify-auth.ts`
if (require.main === module) {
  setupShopifyDevStore().catch((err: unknown) => {
    console.error(err)
    process.exit(1)
  })
}
