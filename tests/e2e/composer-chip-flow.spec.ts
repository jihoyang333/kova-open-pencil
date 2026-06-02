import { expect, test } from '@playwright/test'

/**
 * Cluster 10 Plan Task 18 — E2E composer-chip flow.
 *
 * GATED (`test.describe.skip`): these specs drive UI that lands in Tasks 15–17
 * plus the Cluster 06 right-panel host (`[data-test-id="right-panel-tab-ai"]`,
 * `shop-panel-product`, `shop-panel-import-button`, `chat-new-tab`). Cluster 06
 * is NOT in the `feat/m9-shopify` base this branch was cut from, so the host
 * does not exist yet. The browser-equipped session that completes Tasks 15–17
 * (see `W12b-cluster-10-VUE-HANDOFF.md`) must:
 *   1. remove the `.skip`,
 *   2. seed a brand with Shopify connected + ≥25 products (test fixture),
 *   3. run `bun run dev` + `bunx playwright test tests/e2e/composer-chip-flow.spec.ts`.
 *
 * The chip components, store, single-mutation contract, and ChatInput wiring
 * they exercise are already built + unit-tested in this branch (Tasks 4, 12–14).
 */

test.describe.skip('Composer chip flow', () => {
  test.beforeEach(async ({ page: _page }) => {
    // Login + open a canvas in a brand that has Shopify connected (test fixture).
  })

  test('import 3 products → 3 chips → reload → persist → remove 1 → 2 chips', async ({ page }) => {
    await page.locator('[data-test-id="right-panel-tab-ai"]').click()

    await page.locator('[data-test-id="shop-panel-product"]').nth(0).click()
    await page.locator('[data-test-id="shop-panel-product"]').nth(1).click()
    await page.locator('[data-test-id="shop-panel-product"]').nth(2).click()
    await page.locator('[data-test-id="shop-panel-import-button"]').click()

    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(3)

    await page.reload()
    await page.locator('[data-test-id="right-panel-tab-ai"]').click()
    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(3)

    await page.locator('[data-test-id="chip-remove"]').nth(0).click()
    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(2)
  })

  test('20-chip cap disables import button', async ({ page }) => {
    for (let batch = 0; batch < 5; batch++) {
      for (let i = 0; i < 4; i++) {
        await page.locator('[data-test-id="shop-panel-product"]').nth(batch * 4 + i).click()
      }
      await page.locator('[data-test-id="shop-panel-import-button"]').click()
    }
    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(20)
    await page.locator('[data-test-id="shop-panel-product"]').nth(20).click()
    await expect(page.locator('[data-test-id="shop-panel-import-button"]')).toBeDisabled()
  })

  test('chips persist across send (do not clear)', async ({ page }) => {
    await page.locator('[data-test-id="right-panel-tab-ai"]').click()
    await page.locator('[data-test-id="shop-panel-product"]').nth(0).click()
    await page.locator('[data-test-id="shop-panel-import-button"]').click()
    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(1)
    await page.locator('[data-test-id="chat-input"]').fill('Build me a hero')
    await page.locator('[data-test-id="chat-send-button"]').click()
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(1)
  })

  test('per-conversation scope: new chat tab has no chips', async ({ page }) => {
    await page.locator('[data-test-id="right-panel-tab-ai"]').click()
    await page.locator('[data-test-id="shop-panel-product"]').nth(0).click()
    await page.locator('[data-test-id="shop-panel-import-button"]').click()
    await page.locator('[data-test-id="chat-new-tab"]').click()
    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(0)
  })
})
