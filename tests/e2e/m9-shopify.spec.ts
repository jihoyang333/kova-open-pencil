/**
 * M9 Shopify integration — end-to-end smoke test.
 *
 * Prerequisites:
 *   1. Run `tests/e2e/helpers/shopify-auth.ts` once to create
 *      `tests/e2e/.auth/shopify-dev-store.json`.
 *   2. Set env vars (see below) before running.
 *
 * Env vars required:
 *   VITE_SUPABASE_URL        – public Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY – service-role key (never VITE_ prefix)
 *   TEST_USER_EMAIL           – Kova test account email
 *   TEST_USER_PASSWORD        – Kova test account password
 *   SHOPIFY_DEV_STORE         – myshopify.com domain (e.g. kova-test.myshopify.com)
 *
 * Run:
 *   npx playwright test tests/e2e/m9-shopify.spec.ts --project=shopify
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env['VITE_SUPABASE_URL'] ?? ''
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
const TEST_EMAIL = process.env['TEST_USER_EMAIL'] ?? ''
const TEST_PASSWORD = process.env['TEST_USER_PASSWORD'] ?? ''
const DEV_STORE = process.env['SHOPIFY_DEV_STORE'] ?? ''

/** Maximum time to wait for the Shopify sync to reach `phase === 'done'`. */
const SYNC_TIMEOUT_MS = 5 * 60_000

/** How often to poll the Supabase REST API for sync progress. */
const POLL_INTERVAL_MS = 3_000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Polls `shopify_connections` via service-role REST until
 * `sync_progress.phase === 'done'` or the timeout is reached.
 *
 * Uses `fetch` against the Supabase REST API — no browser page required.
 * Throws if sync errors or the timeout elapses.
 */
async function waitForSyncDone(brandId: string): Promise<void> {
  const url =
    `${SUPABASE_URL}/rest/v1/shopify_connections` +
    `?brand_id=eq.${encodeURIComponent(brandId)}&select=sync_progress`

  const deadline = Date.now() + SYNC_TIMEOUT_MS

  while (Date.now() < deadline) {
    const res = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      throw new Error(
        `Supabase REST error ${res.status}: ${await res.text()}`,
      )
    }

    type Row = { sync_progress: { phase: string; error?: string } | null }
    const rows = (await res.json()) as Row[]
    const row = rows[0]

    if (row?.sync_progress?.phase === 'done') return

    if (row?.sync_progress?.phase === 'error') {
      throw new Error(
        `Shopify sync failed: ${row.sync_progress.error ?? 'unknown error'}`,
      )
    }

    // Wait before next poll — event-based where possible, fixed interval here
    // because we are outside the browser and cannot hook into websocket events.
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error(
    `Shopify sync did not reach phase=done within ${SYNC_TIMEOUT_MS / 1000}s`,
  )
}

/**
 * Logs the test user into Kova and returns the brand-id extracted from the
 * post-login redirect URL (`/dashboard/:brandId`).
 */
async function loginAndGetBrandId(page: Page): Promise<string> {
  await page.goto('/login')
  await page.locator('[data-test-id="login-email-input"]').fill(TEST_EMAIL)
  await page.locator('[data-test-id="login-password-input"]').fill(TEST_PASSWORD)

  await Promise.all([
    page.waitForURL('**/dashboard**'),
    page.locator('[data-test-id="login-submit-button"]').click(),
  ])

  // The dashboard redirects to `/dashboard/:brandId` for the first brand.
  await page.waitForURL(/\/dashboard\/[^/]+$/)
  const match = page.url().match(/\/dashboard\/([^/?#]+)/)
  if (!match) throw new Error(`Cannot extract brandId from URL: ${page.url()}`)
  return match[1]
}

/**
 * Drags the first product card from the Shop panel onto the canvas center
 * and waits for the resulting API response that confirms the drop was handled.
 *
 * Returns the formatted price string as displayed in the Shop panel card so
 * the test can later assert it against the canvas frame's price text node.
 */
async function dragFirstProductOntoCanvas(
  page: Page,
): Promise<string> {
  // Switch to Shop tab in the left panel
  await page.locator('[data-test-id="left-panel-tab-shop"]').click()

  // Wait for at least one product card to appear
  const firstCard = page
    .locator('[data-test-id="shop-product-card"]')
    .first()
  await firstCard.waitFor({ timeout: 30_000 })

  // Capture the price text shown in the panel card
  const panelPrice = (
    await firstCard.locator('div.text-\\[10px\\]').textContent()
  )?.trim() ?? ''

  // Perform the drag from the product card onto the canvas center
  const canvas = page.locator('canvas')
  const canvasBox = await canvas.boundingBox()
  if (!canvasBox) throw new Error('Canvas has no bounding box')

  const cardBox = await firstCard.boundingBox()
  if (!cardBox) throw new Error('Product card has no bounding box')

  const dragFromX = cardBox.x + cardBox.width / 2
  const dragFromY = cardBox.y + cardBox.height / 2
  const dropX = canvasBox.x + canvasBox.width / 2
  const dropY = canvasBox.y + canvasBox.height / 2

  await page.mouse.move(dragFromX, dragFromY)
  await page.mouse.down()
  await page.mouse.move(dropX, dropY, { steps: 15 })

  // Wait for the canvas drop handler to fire before releasing
  await page.mouse.up()

  // Allow the frame creation round-trip to complete
  await page.waitForFunction(
    () => document.querySelector('canvas[data-ready="1"]') !== null,
  )
  // Extra rAF to let Vue reactivity flush the new binding into the DOM
  await page.evaluate(() => new Promise(requestAnimationFrame))

  return panelPrice
}

/**
 * Reads the price text node value from the ProductVariantInspector panel.
 * After a product drop the right panel shows the inspector for the selected frame.
 */
async function readPriceFromInspector(page: Page): Promise<string> {
  // Click the canvas center to select the newly created frame
  const canvas = page.locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas has no bounding box')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.evaluate(() => new Promise(requestAnimationFrame))

  // The PropertiesPanel shows the ProductVariantInspector for product frames.
  // The "In stock" badge contains the inventory count; the variant select shows
  // the price inline. We read the variant option text which follows the pattern
  // `<title> · $<price>` and extract the currency-formatted price portion.
  const variantOption = page.locator(
    '[data-test-id="properties-panel"] select option:checked',
  )
  const optionText = (await variantOption.textContent())?.trim() ?? ''
  // Option text: "Default Title · $29.99" — split on ` · ` and take last part
  const parts = optionText.split(' · ')
  return parts[parts.length - 1] ?? ''
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('M9 — Shopify integration', () => {
  test.describe.configure({ mode: 'serial' })

  let page: Page
  let context: BrowserContext
  let brandId: string
  let canvasId: string

  test.beforeAll(async ({ browser }) => {
    // The `shopify` project in playwright.config.ts sets storageState so the
    // browser already carries the Shopify OAuth session from the dev store.
    context = await browser.newContext()
    page = await context.newPage()
  })

  test.afterAll(async () => {
    await page.close()
    await context.close()
  })

  // -------------------------------------------------------------------------
  // Step 1 — Login
  // -------------------------------------------------------------------------
  test('1. login to Kova', async () => {
    brandId = await loginAndGetBrandId(page)
    await expect(page.locator('[data-test-id="dashboard-view"]')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Step 2 — Create a new brand via onboarding
  // -------------------------------------------------------------------------
  test('2. create brand via onboarding — name step', async () => {
    // Navigate to onboarding to create a fresh brand for this test run
    await page.goto('/onboarding')
    await page
      .locator('[data-test-id="onboarding-view"]')
      .waitFor({ timeout: 15_000 })

    // Step 1 — Welcome
    await page
      .locator('[data-test-id="onboarding-get-started"]')
      .click()

    // Step 2 — Name
    await page
      .locator('[data-test-id="onboarding-name-input"]')
      .waitFor()
    await page
      .locator('[data-test-id="onboarding-name-input"]')
      .fill('E2E Test User')
    await page.locator('[data-test-id="onboarding-continue"]').click()

    // Step 3 — Brand name (triggers route push to /onboarding/store-type)
    await page
      .locator('[data-test-id="onboarding-brand-name-input"]')
      .waitFor()
    await page
      .locator('[data-test-id="onboarding-brand-name-input"]')
      .fill('E2E Test Brand')
    await page.locator('[data-test-id="onboarding-continue"]').click()
  })

  // -------------------------------------------------------------------------
  // Step 3 — Click Shopify on the store-type step
  // -------------------------------------------------------------------------
  test('3. store-type step — select Shopify', async () => {
    await page
      .locator('[data-test-id="onboarding-store-type-step"]')
      .waitFor({ timeout: 15_000 })

    await page.locator('[data-test-id="store-type-shopify"]').click()
    await page
      .locator('[data-test-id="store-type-shop-input"]')
      .waitFor()
    await expect(
      page.locator('[data-test-id="store-type-shop-input"]'),
    ).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Step 4 — OAuth flow using stored dev-store session (storageState)
  // -------------------------------------------------------------------------
  test('4. Shopify OAuth — complete using stored dev-store session', async () => {
    await page
      .locator('[data-test-id="store-type-shop-input"]')
      .fill(DEV_STORE)

    // The storageState loaded by the `shopify` project already has the
    // Shopify session cookies for the dev store. The OAuth popup will
    // therefore skip the Shopify login screen and auto-approve the app.
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('[data-test-id="store-type-connect"]').click(),
    ])

    // Wait for the callback to close the popup and redirect the main page
    await popup.waitForEvent('close', { timeout: 60_000 })

    // Main page should navigate to the dashboard after OAuth callback
    await page.waitForURL('**/dashboard**', { timeout: 30_000 })

    // Extract the new brand-id from the post-onboarding redirect
    const match = page.url().match(/\/dashboard\/([^/?#]+)/)
    if (match) brandId = match[1]
  })

  // -------------------------------------------------------------------------
  // Step 5 — Poll Supabase until sync_progress.phase === 'done'
  // -------------------------------------------------------------------------
  test('5. wait for Shopify sync to complete (up to 5 minutes)', async () => {
    test.setTimeout(SYNC_TIMEOUT_MS + 30_000)
    await waitForSyncDone(brandId)
  })

  // -------------------------------------------------------------------------
  // Step 6 — Open a new canvas
  // -------------------------------------------------------------------------
  test('6. create and open a new canvas', async () => {
    // Navigate to the brand's canvas grid
    await page.goto(`/dashboard/${brandId}`)
    await page
      .locator('[data-test-id="canvas-grid-view"]')
      .waitFor({ timeout: 15_000 })

    // Click the "New Canvas" card
    await Promise.all([
      page.waitForURL(/\/editor\/.+/),
      page.locator('[data-test-id="canvas-new-card"]').click(),
    ])

    const editorRoot = page.locator('[data-test-id="editor-root"]')
    await editorRoot.waitFor({ timeout: 30_000 })

    // Extract the canvas id from the URL for later use
    const urlMatch = page.url().match(/\/editor\/([^/?#]+)/)
    if (!urlMatch) throw new Error(`Cannot extract canvasId from URL: ${page.url()}`)
    canvasId = urlMatch[1]

    // Wait for the canvas to be fully initialised
    await page.locator('canvas[data-ready="1"]').waitFor({ timeout: 30_000 })
    expect(canvasId).toBeTruthy()
  })

  // -------------------------------------------------------------------------
  // Step 7 — Drag first product from Shop panel onto canvas
  // -------------------------------------------------------------------------
  let panelPriceText: string

  test('7. drag first product from Shop panel onto canvas', async () => {
    panelPriceText = await dragFirstProductOntoCanvas(page)
    // Confirm a frame was created — layers panel should show ≥ 1 node
    await expect(
      page.locator('[data-test-id="shop-product-card"]').first(),
    ).toBeVisible()
    expect(panelPriceText).toMatch(/\$[\d,]+\.\d{2}/)
  })

  // -------------------------------------------------------------------------
  // Step 8 — Assert the frame's price text child equals the variant price
  // -------------------------------------------------------------------------
  test('8. product frame price text matches variant price', async () => {
    const inspectorPrice = await readPriceFromInspector(page)

    // Both values come from the same Intl.NumberFormat call so they must match
    expect(inspectorPrice).toBe(panelPriceText)
  })

  // -------------------------------------------------------------------------
  // Step 9 — Settings → Brand → Integrations → Disconnect
  // -------------------------------------------------------------------------
  test('9. navigate to Integrations settings and disconnect Shopify', async () => {
    await page.goto(`/dashboard/${brandId}/settings/integrations`)

    const integrationsView = page.locator(
      '[data-test-id="settings-integrations-view"]',
    )
    await integrationsView.waitFor({ timeout: 15_000 })

    // Wait for the connected state to render
    await page
      .locator('[data-test-id="integrations-connected"]')
      .waitFor({ timeout: 15_000 })

    // Click Disconnect — this opens the confirmation modal
    await page
      .locator('[data-test-id="integrations-disconnect-btn"]')
      .click()

    // Confirm disconnect in the modal
    const confirmBtn = page.locator(
      '[data-test-id="integrations-disconnect-confirm"]',
    )
    await confirmBtn.waitFor()

    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('shopify_connections') &&
          (resp.status() === 200 || resp.status() === 204),
      ),
      confirmBtn.click(),
    ])

    // The view should now show the not-connected state
    await page
      .locator('[data-test-id="integrations-not-connected"]')
      .waitFor({ timeout: 15_000 })
  })

  // -------------------------------------------------------------------------
  // Step 10 — Verify the frame shows the 'Unavailable' badge
  // -------------------------------------------------------------------------
  test('10. product frame shows Unavailable badge after disconnect', async () => {
    // Navigate back to the canvas that has the product frame
    await page.goto(`/editor/${canvasId}`)
    await page.locator('canvas[data-ready="1"]').waitFor({ timeout: 30_000 })

    // Click the canvas center where we dropped the product frame
    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas has no bounding box')
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.evaluate(() => new Promise(requestAnimationFrame))

    // The ProductVariantInspector should now show the 'Unavailable' badge
    // because the shopify_connections row is gone (no variant data).
    const unavailableBadge = page.locator(
      'text=Unavailable',
    )
    await unavailableBadge.waitFor({ timeout: 15_000 })
    await expect(unavailableBadge).toBeVisible()
  })
})
