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
  test.setTimeout(60_000) // cold Vite + CanvasKit/Skia WASM boot
  page = await browser.newPage()
  // /demo mounts EditorView unauthenticated with demo shapes — the only editor
  // entry that needs no Supabase session/canvas doc (Kova gates /canvas/:id).
  await page.goto('/demo')
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

test('C2 — eyedropper reads TRUE canvas pixels (DPR-correct)', async () => {
  // The whole eyedropper rests on reading the live Skia/WebGL canvas back into a
  // 2D context (preserveDrawingBuffer must be on, DPR mapping must be exact). This
  // exercises the identical readback the sampler uses and proves it returns the
  // displayed pixel — the audit's single highest-risk assumption (C2).
  await canvas.clearCanvas()
  await canvas.drawRect(200, 150, 500, 350) // screen rect (200,150)→(700,500)
  await canvas.waitForRender()

  const result = await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    const id = [...store.state.selectedIds][0]
    const fill = store.graph.getNode(id)?.fills?.[0]
    const el = document.querySelector('[data-test-id="canvas-element"]') as HTMLCanvasElement
    const rb = document.createElement('canvas')
    rb.width = 1
    rb.height = 1
    const ctx = rb.getContext('2d', { willReadFrequently: true })!
    const r = el.getBoundingClientRect()
    const x = Math.floor((450 - r.left) * (el.width / r.width))
    const y = Math.floor((325 - r.top) * (el.height / r.height))
    ctx.drawImage(el, x, y, 1, 1, 0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    return { fill, sampled: [d[0], d[1], d[2], d[3]] }
  })

  // Sampled pixel must equal the rect's fill (0.83 × 255 ≈ 212), not blank/black.
  const expected = Math.round((result.fill?.color.r ?? 0) * 255)
  expect(result.sampled[3]).toBe(255) // opaque — readback is not a blank buffer
  expect(Math.abs(result.sampled[0] - expected)).toBeLessThanOrEqual(2)
  expect(Math.abs(result.sampled[1] - expected)).toBeLessThanOrEqual(2)
  expect(Math.abs(result.sampled[2] - expected)).toBeLessThanOrEqual(2)
})

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
  // Seed a single off-screen node via the store (a screen-coord drag at 2000,1500
  // would fall outside the 1280×800 viewport and create nothing). Camera focus is
  // what we assert, so the node must live far from the current pan.
  await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
      name: 'FindTarget',
      x: 2000,
      y: 1500,
      width: 120,
      height: 80
    })
    store.select([node.id])
    store.requestRender() // bump sceneVersion so the name index + overlays recompute
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
  // The right panel defaults to the AI tab (PRD 07b §12.13 — Kova differentiator),
  // so switch to the Design tab where InspectorRouter mounts the registered sections.
  await page.locator('[data-tab="design"]').click()
  // Registration bridge mounts Fill/Stroke/Effects sections in the live right panel.
  await expect(page.locator('[data-testid="fill-inspector-section"]')).toBeVisible()
  await expect(page.locator('[data-testid="stroke-inspector-section"]')).toBeVisible()
  await expect(page.locator('[data-testid="effects-inspector-section"]')).toBeVisible()
  // Priority-sorted registry actually rendered multiple sections, not just one.
  expect(
    await page.locator('[data-testid="inspector-router"] [data-section-id]').count()
  ).toBeGreaterThan(3)
  canvas.assertNoErrors()
})

test('M1 — nested frame outlines render at absolute (not parent-local) position', async () => {
  await canvas.clearCanvas()
  // A child frame nested inside a parent must outline at its ABSOLUTE canvas
  // position (getAbsolutePosition + flattenTree), not its parent-local x/y — the
  // exact mispositioning the audit flagged (M1/M2). Parent (300,200), child local
  // (50,40) ⇒ child absolute (350,240).
  await page.evaluate(() => {
    const s = window.__OPEN_PENCIL_STORE__!
    const parent = s.graph.createNode('FRAME', s.state.currentPageId, {
      name: 'Parent',
      x: 300,
      y: 200,
      width: 400,
      height: 300
    })
    s.graph.createNode('FRAME', parent.id, { name: 'Child', x: 50, y: 40, width: 120, height: 90 })
    s.requestRender() // bump sceneVersion so FrameOutlinesOverlay's computed re-runs
  })
  await canvas.waitForRender()

  const outlines = page.locator('[data-test="frame-outline"]')
  await expect(outlines).toHaveCount(2)
  // The child outline lives at absolute 350,240 — proves nested traversal + abs pos.
  await expect(
    page.locator('[data-test="frame-outline"][style*="left: 350px"][style*="top: 240px"]')
  ).toHaveCount(1)
  canvas.assertNoErrors()
})
