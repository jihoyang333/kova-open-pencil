import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { createEditorStore, setActiveEditorStore, type EditorStore } from '@/stores/editor'
import { useFindStore } from '@/stores/find'
import { useFindSearch } from '@/composables/use-find-search'
import { useCameraPan } from '@/composables/use-camera-pan'

// Integration (audit Phase 8 + C1): EditorView instantiates useFindSearch() + useCameraPan()
// so a query typed into the find store flows all the way to matched ids and a camera pan.
// This composes the real stores + composables the way the live editor does.
let store: EditorStore

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('find → camera focus flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('typing a query matches a node by name and pans the camera to it (C1)', async () => {
    // Seed two nodes; only one matches.
    store.graph.createNode('RECTANGLE', store.state.currentPageId, {
      name: 'FindTarget',
      x: 2000,
      y: 1500,
      width: 120,
      height: 80
    })
    store.graph.createNode('RECTANGLE', store.state.currentPageId, { name: 'Other', x: 0, y: 0 })

    const find = useFindStore()
    // Bring the watchers alive exactly as EditorView does.
    useFindSearch()
    useCameraPan()

    const panBefore = store.state.panX
    find.open()
    find.setQuery('FindTarget')

    await wait(140) // query debounce (80ms) + a tick
    expect(find.matchedNodeIds.length).toBe(1)
    expect(find.focusedNodeId).not.toBeNull()

    await wait(320) // camera pan duration (250ms) + margin
    expect(store.state.panX).not.toBe(panBefore)
  })

  it('clearing the query empties matches and a multi-match does not auto-focus', async () => {
    store.graph.createNode('RECTANGLE', store.state.currentPageId, { name: 'Box A' })
    store.graph.createNode('RECTANGLE', store.state.currentPageId, { name: 'Box B' })

    const find = useFindStore()
    useFindSearch()

    find.open()
    find.setQuery('Box')
    await wait(140)
    expect(find.matchedNodeIds.length).toBe(2)
    expect(find.focusedNodeId).toBeNull() // 2 matches → no single-focus

    find.setQuery('')
    await wait(140)
    expect(find.matchedNodeIds.length).toBe(0)
  })
})
