import { describe, expect, it, beforeEach } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import MaskOutlinesOverlay from '@/components/canvas-overlays/MaskOutlinesOverlay.vue'

let store: EditorStore

describe('MaskOutlinesOverlay', () => {
  beforeEach(() => {
    store = createEditorStore()
    setActiveEditorStore(store)
    const page = store.state.currentPageId
    store.graph.createNode('RECTANGLE', page, { name: 'm1', isMask: true, x: 0, y: 0, width: 100, height: 100 })
    store.graph.createNode('ELLIPSE', page, { name: 'm2', isMask: true, x: 200, y: 0, width: 100, height: 100 })
    store.graph.createNode('RECTANGLE', page, { name: 'r1', isMask: false, x: 0, y: 200, width: 50, height: 50 })
  })

  it('renders only nodes with isMask=true', () => {
    expect(mount(MaskOutlinesOverlay).findAll('[data-test="mask-outline"]')).toHaveLength(2)
  })

  it('shows a corner glyph per mask', () => {
    expect(mount(MaskOutlinesOverlay).findAll('[data-test="mask-glyph"]')).toHaveLength(2)
  })
})
