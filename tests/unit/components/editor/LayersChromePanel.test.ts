/**
 * LayersChromePanel — Cluster 06 Task 11 tests.
 *
 * Validates: empty state vs populated tree, click → editor.select (additive on
 * modifier), hover → editor.hoveredNodeId, and vis/lock toggles mutating the
 * graph directly WITHOUT clobbering the current selection (L3 from review).
 */
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent, h } from 'vue'

mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: defineComponent({
    name: 'KovaIconStub',
    props: { name: String, size: String },
    setup(props) {
      return () => h('span', { 'data-icon': props.name })
    },
  }),
}))

const LayersChromePanel = (await import('@/components/editor/LayersChromePanel.vue')).default
const { createEditorStore, setActiveEditorStore } = await import('@/stores/editor')
const { __resetLayerTreeExpansion } = await import('@/composables/use-layer-tree')

type Store = ReturnType<typeof createEditorStore>
let store: Store

beforeEach(() => {
  setActivePinia(createPinia())
  __resetLayerTreeExpansion()
  store = createEditorStore()
  setActiveEditorStore(store)
})

describe('LayersChromePanel', () => {
  test('shows empty state when the page has no layers', () => {
    const wrap = mount(LayersChromePanel)
    expect(wrap.find('[data-testid="layers-empty-state"]').exists()).toBe(true)
  })

  test('renders one row per top-level node', () => {
    store.createShape('RECTANGLE', 0, 0, 100, 100)
    store.createShape('TEXT', 0, 120, 100, 40)
    const wrap = mount(LayersChromePanel)
    expect(wrap.findAll('[role="treeitem"]')).toHaveLength(2)
    expect(wrap.find('[data-testid="layers-empty-state"]').exists()).toBe(false)
  })

  test('clicking a row selects that node', async () => {
    const id = store.createShape('RECTANGLE', 0, 0, 100, 100)
    const wrap = mount(LayersChromePanel)
    await wrap.get('[role="treeitem"]').trigger('click')
    expect(store.state.selectedIds.has(id)).toBe(true)
    expect(store.state.selectedIds.size).toBe(1)
  })

  test('shift-click adds to the selection (additive)', async () => {
    const a = store.createShape('RECTANGLE', 0, 0, 100, 100)
    const b = store.createShape('RECTANGLE', 0, 120, 100, 100)
    const wrap = mount(LayersChromePanel)
    const rows = wrap.findAll('[role="treeitem"]')
    await rows[0].trigger('click')
    await rows[1].trigger('click', { shiftKey: true })
    expect(store.state.selectedIds.has(a)).toBe(true)
    expect(store.state.selectedIds.has(b)).toBe(true)
  })

  test('hovering a row sets editor.hoveredNodeId; leaving clears it', async () => {
    const id = store.createShape('RECTANGLE', 0, 0, 100, 100)
    const wrap = mount(LayersChromePanel)
    const row = wrap.get('[role="treeitem"]')
    await row.trigger('pointerenter')
    expect(store.state.hoveredNodeId).toBe(id)
    await row.trigger('pointerleave')
    expect(store.state.hoveredNodeId).toBe(null)
  })

  test('visibility toggle flips node.visible without changing selection', async () => {
    const a = store.createShape('RECTANGLE', 0, 0, 100, 100)
    const b = store.createShape('RECTANGLE', 0, 120, 100, 100)
    store.select([a, b])
    const wrap = mount(LayersChromePanel)
    // toggle vis on the first row
    await wrap.findAll('[data-testid="layer-row-vis"]')[0].trigger('click')
    expect(store.graph.getNode(a)?.visible).toBe(false)
    // selection preserved (L3)
    expect(store.state.selectedIds.has(a)).toBe(true)
    expect(store.state.selectedIds.has(b)).toBe(true)
  })
})
