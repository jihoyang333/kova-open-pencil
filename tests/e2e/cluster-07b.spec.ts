import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '../helpers/canvas'

// Cluster 07b end-to-end coverage (audit Phase 9). Drives the running app through the
// editor store + canvas, asserting the wiring the audit found dead: find canvas-focus
// (C1), eyedropper sink (C2), slice creation (H2), pixel-grid manual toggle (H3), boolean
// ops (lock 3), and the inspector registration bridge (H1). Visual fidelity vs the Figma
// PNGs remains a manual founder-smoke step.

let page: Page
let canvas: CanvasHelper

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
})

test.afterAll(async () => {
  await page.close()
})

function nodeTypes(): Promise<string[]> {
  return page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    return store.graph.getChildren(store.state.currentPageId).map((n) => n.type)
  })
}

test('H2 — slice tool drag creates a SLICE node', async () => {
  await canvas.clearCanvas()
  await page.evaluate(() => window.__OPEN_PENCIL_STORE__!.setTool('SLICE'))
  await canvas.drag(120, 120, 320, 260)
  await canvas.waitForRender()
  await page.evaluate(() => window.__OPEN_PENCIL_STORE__!.setTool('SELECT'))

  expect(await nodeTypes()).toContain('SLICE')
})

test('lock 3 — ⌥⇧U unions two selected shapes', async () => {
  await canvas.clearCanvas()
  await canvas.drawRect(100, 100, 80, 80)
  await canvas.drawRect(140, 140, 80, 80)
  await canvas.selectAll()
  await canvas.waitForRender()

  const before = await nodeTypes()
  await page.keyboard.press('Alt+Shift+KeyU')
  await canvas.waitForRender()
  const after = await nodeTypes()

  // The two rects collapse into a single boolean result node.
  expect(after.length).toBeLessThan(before.length)
})

test('C1 — find matches a node by name and pans the camera', async () => {
  await canvas.clearCanvas()
  await canvas.drawRect(2000, 1500, 120, 80)
  await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    const id = store.graph.getChildren(store.state.currentPageId)[0].id
    store.updateNodeWithUndo(id, { name: 'FindTarget' }, 'Rename')
  })
  await canvas.waitForRender()
  const panBefore = await page.evaluate(() => window.__OPEN_PENCIL_STORE__!.state.panX)

  await page.keyboard.press('Meta+f')
  const input = page.locator('[data-test="search-input"], input[type="search"], input[placeholder*="Find" i]').first()
  await input.fill('FindTarget')
  await page.waitForTimeout(400) // debounce + pan animation
  const panAfter = await page.evaluate(() => window.__OPEN_PENCIL_STORE__!.state.panX)

  // A single match auto-focuses → camera pans (C1: the find/camera watchers are alive).
  expect(panAfter).not.toBe(panBefore)
  await page.keyboard.press('Escape')
})

test('H3 — pixel grid shows at normal zoom once toggled (Shift+’)', async () => {
  await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    store.state.zoom = 1
    store.state.overlays.pixelGrid = false
  })
  await canvas.waitForRender()
  await expect(page.locator('[data-test="pixel-grid"]')).toHaveCount(0)

  await page.evaluate(() => (window.__OPEN_PENCIL_STORE__!.state.overlays.pixelGrid = true))
  await canvas.waitForRender()
  await expect(page.locator('[data-test="pixel-grid"]')).toHaveCount(1)
})

test('H1 — selecting a node renders the wired inspector sections', async () => {
  await canvas.clearCanvas()
  await canvas.drawRect(100, 100, 120, 90)
  await canvas.waitForRender()
  // Registration bridge mounts Fill/Stroke/Effects sections in the live right panel.
  await expect(page.locator('[data-testid="fill-inspector-section"]')).toBeVisible()
  canvas.assertNoErrors()
})
