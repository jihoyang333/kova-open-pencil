/**
 * Cluster 02 T39 — first-brand onboarding flow E2E.
 *
 * Requires:
 *   - dev server running at http://localhost:1420 (bun run dev)
 *   - test user fixture (Cluster 01 auth helpers)
 *
 * Skipped automatically in CI without E2E credentials. Foundation for
 * full E2E coverage of the 5-step wizard.
 */
import { test, expect } from '@playwright/test'

const TEST_USER_EMAIL = process.env.E2E_TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.E2E_TEST_USER_PASSWORD

test.describe('Onboarding first-brand flow', () => {
  test.skip(
    !TEST_USER_EMAIL || !TEST_USER_PASSWORD,
    'E2E_TEST_USER_EMAIL + E2E_TEST_USER_PASSWORD must be set'
  )

  test('happy path: brand → skip Shopify → skip Brand Kit → splash → workspace', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USER_EMAIL!)
    await page.fill('input[type="password"]', TEST_USER_PASSWORD!)
    await page.click('button[type="submit"]')

    await page.waitForURL('**/onboarding/brand', { timeout: 10000 })

    await page.fill('input[name="brandName"]', 'Nike')
    await page.fill('input[name="brandUrl"]', 'nike.com')
    await page.click('[data-test-id="brand-identity-continue"]')

    // Shopify step (skip with "Something else" or "No store yet")
    await page.waitForSelector('[data-test-id="onboarding-store-type-step"]')
    await page.click('[data-test-id="store-type-no-store"]')

    // Brand-kit step
    await page.waitForSelector('[data-test-id="onboarding-brand-kit-step"]')
    await page.click('[data-test-id="brand-kit-skip"]')

    // Splash
    await page.waitForSelector('[data-test-id="onboarding-splash-step"]')
    await expect(page.locator('h1')).toContainText("You're in.")
    await page.click('[data-test-id="splash-enter"]')

    await page.waitForURL(/\/brand\/.+/, { timeout: 10000 })
  })

  test('no access_token in any URL during Shopify OAuth start (T03 security)', async ({ page }) => {
    const seenUrls: string[] = []
    page.on('request', (req) => seenUrls.push(req.url()))

    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USER_EMAIL!)
    await page.fill('input[type="password"]', TEST_USER_PASSWORD!)
    await page.click('button[type="submit"]')

    await page.waitForURL('**/onboarding/brand', { timeout: 10000 })
    await page.fill('input[name="brandName"]', 'Nike')
    await page.fill('input[name="brandUrl"]', 'nike.com')
    await page.click('[data-test-id="brand-identity-continue"]')

    await page.click('[data-test-id="store-type-shopify"]')
    await page.fill('[data-test-id="store-type-shop-input"]', 'test-store')
    await page.click('[data-test-id="store-type-connect"]')

    for (const u of seenUrls) {
      expect(u).not.toContain('access_token=')
    }
  })
})
