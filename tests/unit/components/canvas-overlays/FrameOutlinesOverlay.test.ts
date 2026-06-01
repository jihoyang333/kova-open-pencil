import { describe, expect, it, beforeEach } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import FrameOutlinesOverlay from '@/components/canvas-overlays/FrameOutlinesOverlay.vue'

// Adapted per R6: real editor graph (no mock.module of @open-pencil/core, which poisons
// the editor store across the run).
let store: EditorStore

describe('FrameOutlinesOverlay', () => {
  beforeEach(() => {
    store = createEditorStore()
    setActiveEditorStore(store)
    const page = store.state.currentPageId
    store.graph.createNode('FRAME', page, { name: 'f1', x: 0, y: 0, width: 200, height: 100 })
    store.graph.createNode('FRAME', page, { name: 'f2', x: 250, y: 0, width: 200, height: 100 })
    store.graph.createNode('RECTANGLE', page, { name: 'r1', x: 0, y: 0, width: 50, height: 50 })
  })

  it('renders one outline per FRAME node only', () => {
    const wrapper = mount(FrameOutlinesOverlay)
    expect(wrapper.findAll('[data-test="frame-outline"]')).toHaveLength(2)
  })
})
