/**
 * useEditorStore overlay flags — Cluster 07b Task 1.5.
 *
 * Adds the `overlays` reactive map (frame outlines, mask outlines, pixel grid,
 * layout guides, hover contour, measurements) and widens the `Tool` union with
 * SLICE / MEASUREMENT / EYEDROPPER. Follows the c06 editor-extension test pattern
 * (createEditorStore + store.state.X) — this store is a singleton composable, not Pinia.
 */
import { describe, test, expect, beforeEach } from 'bun:test'
import { createEditorStore, setActiveEditorStore, useEditorStore } from '@/stores/editor'

describe('useEditorStore overlays (Cluster 07b Task 1.5)', () => {
  beforeEach(() => {
    setActiveEditorStore(createEditorStore())
  })

  test('overlays.frameOutlines defaults true', () => {
    const store = useEditorStore()
    expect(store.state.overlays.frameOutlines).toBe(true)
  })

  test('overlays.layoutGuides defaults true (Q24)', () => {
    const store = useEditorStore()
    expect(store.state.overlays.layoutGuides).toBe(true)
  })

  test('overlays.pixelGrid defaults true', () => {
    const store = useEditorStore()
    expect(store.state.overlays.pixelGrid).toBe(true)
  })

  test('overlays.maskOutlines / hoverContour / measurements default true', () => {
    const store = useEditorStore()
    expect(store.state.overlays.maskOutlines).toBe(true)
    expect(store.state.overlays.hoverContour).toBe(true)
    expect(store.state.overlays.measurements).toBe(true)
  })

  test('overlay flags are independently togglable', () => {
    const store = useEditorStore()
    store.state.overlays.pixelGrid = false
    expect(store.state.overlays.pixelGrid).toBe(false)
    expect(store.state.overlays.frameOutlines).toBe(true)
  })
})
