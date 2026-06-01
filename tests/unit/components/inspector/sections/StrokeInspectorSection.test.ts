import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createEditorStore, setActiveEditorStore, type EditorStore } from '@/stores/editor'
import StrokeInspectorSection from '@/components/inspector/sections/StrokeInspectorSection.vue'

let store: EditorStore

function selectRectWithStroke(): string {
  const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, { name: 'r' })
  ;(node as unknown as Record<string, unknown>).strokes = [
    { color: { r: 0, g: 0, b: 0, a: 1 }, weight: 1, opacity: 1, visible: true, align: 'INSIDE' }
  ]
  store.select([node.id])
  return node.id
}

describe('StrokeInspectorSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('renders a stroke row + align control for a selected node', () => {
    selectRectWithStroke()
    const w = mount(StrokeInspectorSection)
    expect(w.find('[data-testid="stroke-inspector-section"]').exists()).toBe(true)
    expect(w.find('[data-test="stroke-row"]').exists()).toBe(true)
  })

  it('changing align applies to all strokes through the engine (wires StrokeAlignRow)', async () => {
    const id = selectRectWithStroke()
    const w = mount(StrokeInspectorSection)
    // StrokeAlignRow renders 3 buttons; click "Outside"
    const outside = w.findAll('button').find((b) => b.text() === 'Outside')
    expect(outside).toBeTruthy()
    await outside!.trigger('click')
    const strokes = (store.graph.getNode(id) as unknown as Record<string, unknown>).strokes as Array<{
      align: string
    }>
    expect(strokes[0].align).toBe('OUTSIDE')
  })
})
