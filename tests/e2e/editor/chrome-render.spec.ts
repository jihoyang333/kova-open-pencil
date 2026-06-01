/**
 * Cluster 06 chrome — load/render + founder-ratification regression guards.
 *
 * Target: the public /dev/cluster-06 showcase (no auth) which composes the real
 * TopChrome + LeftPanel + RightPanel + BottomToolbar. Covers PRD 06 §9.3 baseline
 * render + the §12.13 / §12.14 / §12.1 / §12.3 ratification guards that can be
 * asserted without a seeded canvas. Canvas-interaction specs live in
 * canvas-interactions.spec.ts (require a seeded auth + canvas env).
 */
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/dev/cluster-06')
  await expect(page.getByTestId('cluster-06-showcase')).toBeVisible()
})

test('load-and-render: all chrome surfaces mount', async ({ page }) => {
  await expect(page.getByTestId('topbar')).toBeVisible()
  await expect(page.getByTestId('left-panel')).toBeVisible()
  await expect(page.getByTestId('right-panel')).toBeVisible()
  await expect(page.getByTestId('bottom-toolbar')).toBeVisible()
})

test('topbar-no-comments: Comments icon is NOT rendered (RATIFIED §12.3)', async ({ page }) => {
  await expect(page.getByTestId('topbar-actions')).toBeVisible()
  await expect(page.getByTestId('topbar-comments')).toHaveCount(0)
  // The retained actions ARE present.
  await expect(page.getByTestId('topbar-present')).toBeVisible()
})

test('right-panel: EXACTLY two tabs (Design + AI), no Prototype (RATIFIED 2026-05-15)', async ({ page }) => {
  const tabs = page.getByTestId('right-panel-tabs').getByRole('tab')
  await expect(tabs).toHaveCount(2)
  await expect(page.locator('[data-tab="design"]')).toBeVisible()
  await expect(page.locator('[data-tab="ai"]')).toBeVisible()
  await expect(page.locator('[data-tab="prototype"]')).toHaveCount(0)
  await expect(page.getByTestId('right-panel-tabs')).not.toContainText('Prototype')
})

test('right-panel-default-ai: AI tab is default-active (RATIFIED §12.13)', async ({ page }) => {
  await expect(page.locator('[data-tab="ai"][data-state="active"]')).toBeVisible()
  await expect(page.locator('[data-tab="design"][data-state="active"]')).toHaveCount(0)
})

test('left-panel-shop-section: three stacked sections Pages/Layers/Shop (RATIFIED §12.1)', async ({ page }) => {
  await expect(page.getByTestId('left-panel-section-pages')).toBeVisible()
  await expect(page.getByTestId('left-panel-section-layers')).toBeVisible()
  await expect(page.getByTestId('left-panel-section-shop')).toBeVisible()
})

test('avatar-dropdown: trigger present and opens a menu (Q16)', async ({ page }) => {
  const avatar = page.getByTestId('topbar-avatar')
  await expect(avatar).toBeVisible()
  await avatar.click()
  // Reka DropdownMenu content (portalled) carries the Q16 items.
  await expect(page.getByText('Sign out', { exact: true })).toBeVisible()
  await expect(page.getByText('Account', { exact: true })).toBeVisible()
})
