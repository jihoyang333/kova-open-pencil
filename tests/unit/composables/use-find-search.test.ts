import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import { useFindStore } from '@/stores/find'
import { useFindSearch } from '@/composables/use-find-search'

// Adapted per handoff: the plan's `figma.currentPage.findAll` is fictional. Real find
// traverses the active page subtree via the editor store's scene graph. We seed real
// FRAME nodes (createNode) and assert against their generated ids — same real-store
// pattern as use-copy-paste-props / use-export-pipeline (no mock.module).
let store: EditorStore

function seed(names: string[]): string[] {
  const pageId = store.state.currentPageId
  return names.map((name) => store.graph.createNode('FRAME', pageId, { name }).id)
}

const flushDebounce = () => new Promise((r) => setTimeout(r, 100)) // > 80ms QUERY_DEBOUNCE_MS

describe('useFindSearch', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('runQuery("frame") matches case-insensitively on node.name (document order)', async () => {
    const ids = seed(['Frame 1', 'Frame 4', 'Frame 5', 'Header', 'Footer'])
    const findStore = useFindStore()
    const { runQuery } = useFindSearch()
    runQuery('frame')
    await flushDebounce()
    expect(findStore.matchedNodeIds).toEqual([ids[0], ids[1], ids[2]])
  })

  it('runQuery("FRAME") === runQuery("frame") (case-insensitive)', async () => {
    seed(['Frame 1', 'Frame 4', 'Frame 5', 'Header', 'Footer'])
    const findStore = useFindStore()
    const { runQuery } = useFindSearch()
    runQuery('FRAME')
    await flushDebounce()
    expect(findStore.matchedNodeIds).toHaveLength(3)
  })

  it('runQuery narrows to 1 match → auto-focuses that node', async () => {
    const ids = seed(['Frame 1', 'Frame 4', 'Frame 5', 'Header', 'Footer'])
    const findStore = useFindStore()
    const { runQuery } = useFindSearch()
    runQuery('frame 4')
    await flushDebounce()
    expect(findStore.matchedNodeIds).toEqual([ids[1]])
    expect(findStore.focusedNodeId).toBe(ids[1])
  })

  it('runQuery debounces (rapid calls collapse to the final query)', async () => {
    seed(['Frame 1', 'Frame 4', 'Frame 5', 'Header', 'Footer'])
    const findStore = useFindStore()
    const { runQuery } = useFindSearch()
    runQuery('f')
    runQuery('fr')
    runQuery('fra')
    runQuery('fram')
    runQuery('frame')
    await flushDebounce()
    expect(findStore.matchedNodeIds).toHaveLength(3)
  })

  it('runQuery caps results at FIND_CONFIG.RESULTS_MAX (200)', async () => {
    seed(Array.from({ length: 500 }, (_, i) => `Frame ${i}`))
    const findStore = useFindStore()
    const { runQuery } = useFindSearch()
    runQuery('frame')
    await flushDebounce()
    expect(findStore.matchedNodeIds).toHaveLength(200)
  })

  it('empty query clears matches and focus', async () => {
    seed(['Frame 1'])
    const findStore = useFindStore()
    const { runQuery } = useFindSearch()
    runQuery('frame')
    await flushDebounce()
    expect(findStore.matchedNodeIds).toHaveLength(1)
    runQuery('   ')
    await flushDebounce()
    expect(findStore.matchedNodeIds).toHaveLength(0)
    expect(findStore.focusedNodeId).toBeNull()
  })
})
