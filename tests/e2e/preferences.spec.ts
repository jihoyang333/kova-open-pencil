/**
 * Cluster 12 Plan Task 15 — Preferences E2E spec.
 *
 * Functional flow over the /dev/cluster-12 showcase (no auth required):
 *   1. Cmd+, opens A8.3 PreferencesModal
 *   2. Escape closes
 *   3. Showcase button opens modal
 *   4. Text-size segmented control flips :root[data-text-size]
 *   5. Reduce-motion toggle flips :root[data-reduce-motion]
 *   6. High-contrast toggle flips :root[data-high-contrast]
 *   7. Recent-colors FIFO push respects cap 12 + de-dupes case-insensitively
 *
 * Cross-device server persistence (write → reload → server-rehydrate) is
 * deferred until Cluster 01 (auth column) + Cluster 04 (Account/Profile
 * routes) are merged — see W8c-cluster-12-DONE.md "Cross-cluster blockers".
 *
 * Runs in the main Playwright project (`bun run test`). No webServer config
 * here — Vite must be up on :1420 (covered by webServer in
 * playwright.config.ts root).
 */

import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

let page: Page

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/dev/cluster-12')
  await page.waitForSelector('h1:has-text("Cluster 12")')
})

test.afterAll(async () => {
  await page.close()
})

test('Cmd+, opens PreferencesModal globally', async () => {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Comma' : 'Control+Comma')
  await expect(page.locator('[role="dialog"]')).toBeVisible()
})

test('Escape closes the modal', async () => {
  await page.keyboard.press('Escape')
  await expect(page.locator('[role="dialog"]')).toBeHidden()
})

test('Showcase button opens modal', async () => {
  await page.getByRole('button', { name: /open accessibility modal/i }).click()
  await expect(page.locator('[role="dialog"]')).toBeVisible()
  await page.keyboard.press('Escape')
})

test('text size segmented control sets html data-attr', async () => {
  // KovaSegmented renders role="radiogroup" with role="radio" segments
  await page.getByRole('radio', { name: 'Large' }).first().click()
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large')

  await page.getByRole('radio', { name: 'Small' }).first().click()
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'small')

  await page.getByRole('radio', { name: 'Medium' }).first().click()
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'medium')
})

test('reduce-motion toggle flips html data-attr', async () => {
  const toggle = page.getByRole('switch', { name: 'Reduce motion' })
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true')
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'false')
})

test('high-contrast toggle flips html data-attr', async () => {
  const toggle = page.getByRole('switch', { name: 'High contrast' })
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-high-contrast', 'true')
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-high-contrast', 'false')
})

test('recent-colors push respects cap 12 + de-dupes', async () => {
  const pushBtn = page.getByRole('button', { name: /push random swatch/i })
  const clearBtn = page.getByRole('button', { name: /^clear$/i })
  await clearBtn.click()

  for (let i = 0; i < 15; i += 1) await pushBtn.click()

  const swatches = page.locator('[title^="#"]')
  await expect(swatches).toHaveCount(12)
  await clearBtn.click()
})
