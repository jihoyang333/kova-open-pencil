import { describe, expect, it, beforeEach } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import SliceRegionOverlay from '@/components/canvas-overlays/SliceRegionOverlay.vue'

let store: EditorStore

describe('SliceRegionOverlay', () => {
  beforeEach(() => {
    store = createEditorStore()
    setActiveEditorStore(store)
    const page = store.state.currentPageId
    store.graph.createNode('SLICE', page, { name: 'header', x: 0, y: 0, width: 200, height: 80 })
    store.graph.createNode('RECTANGLE', page, { name: 'r1', x: 0, y: 100, width: 50, height: 50 })
  })

  it('renders only SLICE nodes', () => {
    expect(mount(SliceRegionOverlay).findAll('[data-test="slice-region"]')).toHaveLength(1)
  })

  it('renders the label tag with the slice name', () => {
    expect(mount(SliceRegionOverlay).find('[data-test="slice-label"]').text()).toBe('header')
  })
})
