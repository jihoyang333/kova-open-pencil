import { describe, expect, it, beforeEach } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import PixelGridOverlay from '@/components/canvas-overlays/PixelGridOverlay.vue'

let store: EditorStore

describe('PixelGridOverlay', () => {
  beforeEach(() => {
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('is hidden at or below the 800% zoom threshold', () => {
    store.state.zoom = 8
    expect(mount(PixelGridOverlay).find('[data-test="pixel-grid"]').exists()).toBe(false)
  })

  it('is visible above the 800% zoom threshold', () => {
    store.state.zoom = 9
    expect(mount(PixelGridOverlay).find('[data-test="pixel-grid"]').exists()).toBe(true)
  })

  // Audit H3: the Shift+' manual toggle must work at normal zoom (no double-gate).
  it('is visible at normal zoom when manually toggled on', () => {
    store.state.zoom = 1
    store.state.overlays.pixelGrid = true
    expect(mount(PixelGridOverlay).find('[data-test="pixel-grid"]').exists()).toBe(true)
  })
})
