import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createEditorStore, setActiveEditorStore, type EditorStore } from '@/stores/editor'
import FillInspectorSection from '@/components/inspector/sections/FillInspectorSection.vue'

let store: EditorStore

function selectRectWithFill(): string {
  const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, { name: 'r' })
  ;(node as unknown as Record<string, unknown>).fills = [
    { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }
  ]
  store.select([node.id])
  return node.id
}

describe('FillInspectorSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('renders the fill list + paint editor for a selected node', () => {
    selectRectWithFill()
    const w = mount(FillInspectorSection)
    expect(w.find('[data-testid="fill-inspector-section"]').exists()).toBe(true)
    expect(w.find('[data-test="fill-row"]').exists()).toBe(true)
    expect(w.find('[data-test="mode-tab"]').exists()).toBe(true)
  })

  it('switching the paint mode to gradient sets Fill.type through the engine (audit H1 fix)', async () => {
    const id = selectRectWithFill()
    const w = mount(FillInspectorSection)
    // click the Linear gradient mode tab
    await w.find('[data-test="mode-tab"][data-mode="linear"]').trigger('click')
    const fill = (store.graph.getNode(id) as unknown as Record<string, unknown>).fills as Array<{
      type: string
      gradientStops?: unknown[]
    }>
    expect(fill[0].type).toBe('GRADIENT_LINEAR')
    expect(Array.isArray(fill[0].gradientStops)).toBe(true)
  })

  it('add appends a fill through the engine', async () => {
    const id = selectRectWithFill()
    const w = mount(FillInspectorSection)
    await w.find('[data-test="add-fill"]').trigger('click')
    const fills = (store.graph.getNode(id) as unknown as Record<string, unknown>).fills as unknown[]
    expect(fills).toHaveLength(2)
  })
})
