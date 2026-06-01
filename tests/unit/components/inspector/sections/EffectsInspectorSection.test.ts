import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createEditorStore, setActiveEditorStore, type EditorStore } from '@/stores/editor'
import EffectsInspectorSection from '@/components/inspector/sections/EffectsInspectorSection.vue'

let store: EditorStore

function selectRect(): string {
  const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, { name: 'r' })
  store.select([node.id])
  return node.id
}

describe('EffectsInspectorSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('add seeds a drop shadow through the engine and shows the editor', async () => {
    const id = selectRect()
    const w = mount(EffectsInspectorSection)
    await w.find('[data-test="add-effect"]').trigger('click')
    const effects = (store.graph.getNode(id) as unknown as Record<string, unknown>).effects as Array<{
      type: string
    }>
    expect(effects).toHaveLength(1)
    expect(effects[0].type).toBe('DROP_SHADOW')
  })
})
