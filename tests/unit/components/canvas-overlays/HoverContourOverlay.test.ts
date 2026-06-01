import { describe, expect, it, beforeEach } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import HoverContourOverlay from '@/components/canvas-overlays/HoverContourOverlay.vue'

let store: EditorStore

describe('HoverContourOverlay', () => {
  beforeEach(() => {
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('is hidden when nothing is hovered', () => {
    expect(mount(HoverContourOverlay).find('[data-test="hover-contour"]').exists()).toBe(false)
  })

  it('renders a contour around the hovered node', () => {
    const page = store.state.currentPageId
    const rect = store.graph.createNode('RECTANGLE', page, { name: 'r', x: 10, y: 10, width: 50, height: 40 })
    store.setHoveredNode(rect.id)
    expect(mount(HoverContourOverlay).find('[data-test="hover-contour"]').exists()).toBe(true)
  })
})
