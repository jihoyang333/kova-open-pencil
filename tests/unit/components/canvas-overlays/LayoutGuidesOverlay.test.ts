import { describe, expect, it, beforeEach } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import LayoutGuidesOverlay from '@/components/canvas-overlays/LayoutGuidesOverlay.vue'

let store: EditorStore

describe('LayoutGuidesOverlay', () => {
  beforeEach(() => {
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('renders one guide band per layout grid on a frame', () => {
    const page = store.state.currentPageId
    const frame = store.graph.createNode('FRAME', page, { name: 'f', x: 0, y: 0, width: 200, height: 100 })
    ;(frame as unknown as Record<string, unknown>).layoutGrids = [
      { pattern: 'COLUMNS', count: 12 }
    ]
    expect(mount(LayoutGuidesOverlay).findAll('[data-test="layout-guide"]')).toHaveLength(1)
  })

  it('renders nothing for frames without layout grids', () => {
    const page = store.state.currentPageId
    store.graph.createNode('FRAME', page, { name: 'f', x: 0, y: 0, width: 200, height: 100 })
    expect(mount(LayoutGuidesOverlay).findAll('[data-test="layout-guide"]')).toHaveLength(0)
  })
})
