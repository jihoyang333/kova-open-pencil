/**
 * Cluster 09 — Version-history + Trash E2E (Task 24 smoke pack).
 *
 * Drives the /dev/cluster-09 showcase (the surface available in this branch).
 * The full canvas golden path (autosave → panel lists it → restore → export)
 * is GATED on the Cluster 06 canvas-view mount (Task 21) which is not yet in
 * feat/m9-shopify — tracked in W12a-cluster-09-DONE.md. These cases verify the
 * panel composition + every row/menu/modal interaction end-to-end in a browser.
 */

import { expect, test } from '@playwright/test'

test.describe('Cluster 09 — version history showcase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/cluster-09')
    await expect(page.locator('[data-testid="rail-populated"] .vh-panel')).toBeVisible()
  })

  test('populated panel lists the timeline (current + named + autosave group)', async ({ page }) => {
    const rail = page.locator('[data-testid="rail-populated"]')
    await expect(rail.locator('.vh-row.current')).toHaveCount(1)
    await expect(rail.getByText('v2 hero update')).toBeVisible()
    await expect(rail.getByText('8 autosave versions')).toBeVisible()
  })

  test('right-click a row opens the 5-item menu; Name → inline rename', async ({ page }) => {
    const rail = page.locator('[data-testid="rail-populated"]')
    const row = rail.locator('.vh-row').nth(1) // first non-current row
    await row.click({ button: 'right' })
    const items = rail.locator('[data-testid="menu-item"]')
    await expect(items).toHaveCount(5)
    await items.first().click() // Name this version
    await expect(rail.locator('[data-testid="rename-input"]')).toBeVisible()
  })

  test('filter dropdown toggles autosave visibility', async ({ page }) => {
    const rail = page.locator('[data-testid="rail-populated"]')
    const before = await rail.locator('.vh-row').count()
    await rail.getByRole('button', { name: 'Filter versions' }).click()
    await page.getByText('Show autosave versions').click()
    await expect(rail.locator('.vh-row').nth(before - 1)).toHaveCount(0)
    // named row + current remain; autosaves hidden
    await expect(rail.getByText('v2 hero update')).toBeVisible()
  })

  test('restore confirm opens with a non-destructive primary CTA', async ({ page }) => {
    await page.getByText('Open Restore confirm').click()
    const dlg = page.locator('.dlg.sm')
    await expect(dlg).toBeVisible()
    await expect(dlg.getByText('Restore this version?')).toBeVisible()
    await expect(dlg.locator('.btn.primary')).toBeVisible()
    await expect(dlg.locator('.btn.danger')).toHaveCount(0)
    await dlg.getByRole('button', { name: 'Cancel' }).click()
    await expect(dlg).toBeHidden()
  })

  test('trash confirm opens with a destructive red CTA', async ({ page }) => {
    await page.getByText('Open Trash confirm').click()
    const dlg = page.locator('.dlg.sm')
    await expect(dlg).toBeVisible()
    await expect(dlg.getByText('Move "Spring Drop · 04" to trash?')).toBeVisible()
    await expect(dlg.locator('.btn.danger')).toBeVisible()
    await dlg.getByRole('button', { name: 'Move to trash' }).click()
    await expect(dlg).toBeHidden()
  })
})
