import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import { useFindStore } from '@/stores/find'
import FindOverlay from '@/components/canvas-overlays/FindOverlay.vue'

let store: EditorStore
let ids: string[]

describe('FindOverlay', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = createEditorStore()
    setActiveEditorStore(store)
    const page = store.state.currentPageId
    ids = [
      store.graph.createNode('RECTANGLE', page, { name: 'a', x: 0, y: 0, width: 10, height: 10 }).id,
      store.graph.createNode('RECTANGLE', page, { name: 'b', x: 20, y: 0, width: 10, height: 10 }).id,
      store.graph.createNode('RECTANGLE', page, { name: 'c', x: 40, y: 0, width: 10, height: 10 }).id
    ]
  })

  it('dims every non-matched node', () => {
    const find = useFindStore()
    find.open()
    find.matchedNodeIds = [ids[0]]
    const wrapper = mount(FindOverlay)
    expect(wrapper.findAll('[data-test="dim-rect"]')).toHaveLength(2)
  })

  it('clicking a dimmed node exits find and selects it', async () => {
    const find = useFindStore()
    find.open()
    find.matchedNodeIds = [ids[0]]
    const wrapper = mount(FindOverlay)
    await wrapper.findAll('[data-test="dim-rect"]')[0].trigger('click')
    expect(find.active).toBe(false)
    expect([...store.state.selectedIds]).toContain(ids[1])
  })
})
