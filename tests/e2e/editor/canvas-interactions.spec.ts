/**
 * Cluster 06 — canvas-route interaction specs (PRD 06 §9.3).
 *
 * These exercise the real /canvas/:canvasId editing surface: layer-tree sync,
 * right-panel stickiness, the AI tool-button focus, brand-label navigation,
 * brand-kit drag-drop, the Shop import flow, and the missing-fonts pill anchor.
 *
 * They require a SEEDED environment — an authenticated session, a brand the
 * user owns, a canvas with scene nodes, and (for drag specs) brand-kit drag
 * sources. That harness is provisioned in the founder smoke / CI lane (PRD §9.4,
 * project memory `external_accounts_deferred`), so they are marked `fixme` here
 * rather than asserting against an un-seeded dev server. The assertion intent is
 * captured inline so the smoke lane can lift each `fixme` to `test` once the
 * fixtures land. The chrome-render + ratification guards that DON'T need seeding
 * run live in chrome-render.spec.ts.
 */
import { test, expect } from '@playwright/test'

const SEED = 'requires seeded auth + canvas fixture (founder smoke / CI lane)'

test.describe('canvas route interactions', () => {
  test.fixme('right-panel-sticky-on-select: clicking a layer does NOT switch tab (§12.14)', async ({ page }) => {
    // AI tab active → click a layer row → AI tab STILL active (no auto-switch).
    await page.goto('/canvas/SEEDED_CANVAS_ID')
    await expect(page.locator('[data-tab="ai"][data-state="active"]')).toBeVisible()
    await page.locator('[role="treeitem"]').first().click()
    await expect(page.locator('[data-tab="ai"][data-state="active"]')).toBeVisible()
    expect(SEED).toBeTruthy()
  })

  test.fixme('right-panel-tab-switch: manual switch persists per-canvas', async ({ page }) => {
    // Click Design → reload → Design still active (localStorage[right-panel-tab:id]).
    await page.goto('/canvas/SEEDED_CANVAS_ID')
    await page.locator('[data-tab="design"]').click()
    await page.reload()
    await expect(page.locator('[data-tab="design"][data-state="active"]')).toBeVisible()
  })

  test.fixme('ai-tool-button: bottom-toolbar AI button focuses the chat composer', async ({ page }) => {
    await page.goto('/canvas/SEEDED_CANVAS_ID')
    await page.locator('button[data-tool-id="ai"]').click()
    await expect(page.locator('[data-tab="ai"][data-state="active"]')).toBeVisible()
    await expect(page.getByTestId('chat-composer-input')).toBeFocused()
  })

  test.fixme('layer-tree-interactions: hover highlights node; mask + slice glyphs render', async ({ page }) => {
    await page.goto('/canvas/SEEDED_CANVAS_ID')
    const row = page.locator('[role="treeitem"]').first()
    await row.hover()
    // editor.hoveredNodeId set → canvas highlight (asserted via store probe in smoke).
    await expect(row).toBeVisible()
  })

  test.fixme('brand-label-navigates: clicking the brand label routes to /brand/:id (Q17)', async ({ page }) => {
    await page.goto('/canvas/SEEDED_CANVAS_ID')
    await page.getByTestId('topbar-file-breadcrumb').getByRole('button').first().click()
    await expect(page).toHaveURL(/\/brand\//)
  })

  test.fixme('drag-color-to-frame: brand color drop replaces top fill', async ({ page }) => {
    // Drag a swatch (application/x-kova-brand-color) onto a frame → fill replaced.
    await page.goto('/canvas/SEEDED_CANVAS_ID')
    expect(SEED).toBeTruthy()
  })

  test.fixme('drag-saved-block-to-canvas: saved-block drop spawns a TEXT node', async ({ page }) => {
    // Drag a saved-block grip (application/x-kova-saved-block) → TEXT node spawns.
    await page.goto('/canvas/SEEDED_CANVAS_ID')
    expect(SEED).toBeTruthy()
  })

  test.fixme('shop-panel-import-flow: multi-select + Import N to chat seeds composer chips', async ({ page }) => {
    await page.goto('/canvas/SEEDED_CANVAS_ID')
    await page.getByTestId('left-panel-section-shop').click()
    await page.getByTestId('shop-product-card').nth(0).click()
    await page.getByTestId('shop-product-card').nth(1).click()
    await expect(page.getByTestId('shop-import-button')).toContainText('Import 2 to chat')
    await page.getByTestId('shop-import-button').click()
    await expect(page.getByTestId('chat-product-chip')).toHaveCount(2)
  })

  test.fixme('missing-fonts-pill anchors top-right of the canvas viewport, not the topbar', async ({ page }) => {
    // Load a canvas whose TEXT nodes reference unloaded fonts.
    await page.goto('/canvas/SEEDED_CANVAS_ID')
    const pill = page.getByTestId('missing-fonts-pill')
    const box = await pill.boundingBox()
    const viewport = await page.getByTestId('canvas-viewport').boundingBox()
    expect(box!.x + box!.width).toBeCloseTo(viewport!.x + viewport!.width - 12, 0)
    expect(box!.y).toBeCloseTo(viewport!.y + 12, 0)
  })
})
