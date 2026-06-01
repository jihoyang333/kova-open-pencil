import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'

// Guard against any KovaIcon in the section's subtree (registry → ~icons unavailable
// under bun test). icon-lucide-* auto-import tags simply warn + render empty.
mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: { name: 'KovaIcon', template: '<span class="kova-icon-stub" />' }
}))

const { default: TypographySection } = await import('@/components/properties/TypographySection.vue')

let store: EditorStore

describe('TypographySection — 07b vertical align (additive)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = createEditorStore()
    setActiveEditorStore(store)
    const id = store.graph.createNode('TEXT', store.state.currentPageId, { name: 't', text: 'hi' }).id
    store.select([id])
  })

  it('renders the vertical-align row for a selected text node', () => {
    const wrapper = mount(TypographySection)
    expect(wrapper.find('[data-test="vertical-text-align-row"]').exists()).toBe(true)
  })

  it('updates textAlignVertical when a vertical-align button is clicked', async () => {
    const wrapper = mount(TypographySection)
    const buttons = wrapper.find('[data-test="vertical-text-align-row"]').findAll('button')
    await buttons[2].trigger('click') // BOTTOM
    expect(store.selectedNode.value?.textAlignVertical).toBe('BOTTOM')
  })
})
