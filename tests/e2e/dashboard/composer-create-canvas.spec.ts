/**
 * Cluster 02 T39 — composer → canvas-creation transition → editor.
 *
 * Requires onboarded test user. Skip-guarded if creds missing.
 */
import { test, expect } from '@playwright/test'

const TEST_USER_EMAIL = process.env.E2E_TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.E2E_TEST_USER_PASSWORD

test.describe('Dashboard composer → canvas', () => {
  test.skip(
    !TEST_USER_EMAIL || !TEST_USER_PASSWORD,
    'E2E_TEST_USER_EMAIL + E2E_TEST_USER_PASSWORD must be set'
  )

  test('chip click seeds composer + submit routes to /editor/:id', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USER_EMAIL!)
    await page.fill('input[type="password"]', TEST_USER_PASSWORD!)
    await page.click('button[type="submit"]')

    await page.waitForURL(/\/brand\/.+/, { timeout: 10000 })

    await page.click('[data-test-id="composer-chip-sale"]')
    await expect(page.locator('[data-test-id="composer-input"]')).toContainText('Promote a sale')

    await page.locator('[data-test-id="composer-input"]').click()
    await page.keyboard.type('Spring sale')
    await page.click('[data-test-id="composer-submit"]')

    await page.waitForURL(/\/editor\/.+/, { timeout: 15000 })
  })
})
