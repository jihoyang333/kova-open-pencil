/**
 * EditorView refactor — Cluster 06 Task 14 regression guard.
 *
 * A full DOM mount of EditorView is impractical in bun:test (canvaskit-wasm,
 * Supabase, automation server, collab). This source-contract test guards the
 * ratified RIP (Shopify spec §5.1 / PRD 06 §5) and the new-chrome mount so a
 * future edit can't silently reintroduce the drag-place / ChatPopup model.
 * DOM-level coverage lives in the T20 Playwright suite.
 */
import { describe, test, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = readFileSync(
  fileURLToPath(new URL('../../../src/views/EditorView.vue', import.meta.url)),
  'utf8'
)

describe('EditorView (post-T14 refactor)', () => {
  test('does NOT reference ChatPopup (PRD 10 §5 RIP)', () => {
    expect(src).not.toContain('ChatPopup')
  })

  test('does NOT reference the ripped product-variant drag-place model', () => {
    expect(src).not.toContain('ShopBuildPrompt')
    expect(src).not.toContain('useShopDrop')
    expect(src).not.toContain('use-shop-drop')
    expect(src).not.toContain('useCanvasBindingsPersistence')
    expect(src).not.toContain('product-variant')
  })

  test('mounts the new Cluster 06 chrome', () => {
    expect(src).toContain('TopChrome')
    expect(src).toContain('LeftPanel')
    expect(src).toContain('RightPanel')
    expect(src).toContain('BottomToolbar')
    expect(src).toContain('CanvasOverlayHost')
    expect(src).toContain('ZoomHud')
  })

  test('preserves the editor infrastructure (no collateral loss)', () => {
    // Tabs, keyboard, menu, collab, automation, demo, canvas-record fetch,
    // thumbnail capture, and image-import must survive the refactor.
    expect(src).toContain('useKeyboard')
    expect(src).toContain('useMenu')
    expect(src).toContain('useCollab')
    expect(src).toContain('connectAutomation')
    expect(src).toContain('createDemoShapes')
    expect(src).toContain('captureThumbnail')
    expect(src).toContain('useImportImages')
    expect(src).toContain('createTab')
  })

  test('exposes the canvas viewport anchor for overlays + the missing-fonts pill', () => {
    expect(src).toContain('data-testid="canvas-viewport"')
    expect(src).toContain('MissingFontsPill')
  })

  test('still forwards the Shop import emit (Cluster 10 handoff)', () => {
    expect(src).toContain('onImportProducts')
  })
})
