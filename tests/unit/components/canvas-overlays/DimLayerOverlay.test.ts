import { describe, expect, it, beforeEach } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import DimLayerOverlay from '@/components/canvas-overlays/DimLayerOverlay.vue'

let store: EditorStore
let ids: string[]

describe('DimLayerOverlay', () => {
  beforeEach(() => {
    store = createEditorStore()
    setActiveEditorStore(store)
    const page = store.state.currentPageId
    ids = [
      store.graph.createNode('RECTANGLE', page, { name: 'a', x: 0, y: 0, width: 10, height: 10 }).id,
      store.graph.createNode('RECTANGLE', page, { name: 'b', x: 20, y: 0, width: 10, height: 10 }).id
    ]
  })

  it('renders nothing for an empty dimmedNodeIds array', () => {
    expect(
      mount(DimLayerOverlay, { props: { dimmedNodeIds: [] } }).findAll('[data-test="dim-rect"]')
    ).toHaveLength(0)
  })

  it('renders one dim rect per dimmed node', () => {
    expect(
      mount(DimLayerOverlay, { props: { dimmedNodeIds: ids } }).findAll('[data-test="dim-rect"]')
    ).toHaveLength(2)
  })

  it('emits dim-click only when interactive', async () => {
    const wrapper = mount(DimLayerOverlay, { props: { dimmedNodeIds: ids, interactive: true } })
    await wrapper.findAll('[data-test="dim-rect"]')[0].trigger('click')
    expect(wrapper.emitted('dim-click')![0]).toEqual([ids[0]])
  })
})
