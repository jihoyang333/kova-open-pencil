import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'

// KovaIcon registry resolves ~icons/lucide/* (unavailable under bun test) — mock first.
mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: { name: 'KovaIcon', inheritAttrs: true, template: '<span class="kova-icon-stub" />' }
}))

const { default: SearchResultRow } = await import('@/components/find/SearchResultRow.vue')

let store: EditorStore
let nodeId: string

describe('SearchResultRow', () => {
  beforeEach(() => {
    store = createEditorStore()
    setActiveEditorStore(store)
    nodeId = store.graph.createNode('FRAME', store.state.currentPageId, { name: 'Hero' }).id
  })

  it('renders node-type icon + name + parent breadcrumb', () => {
    const wrapper = mount(SearchResultRow, { props: { nodeId, isFocused: false } })
    expect(wrapper.find('[data-test="node-icon"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="node-name"]').text()).toBe('Hero')
    expect(wrapper.find('[data-test="breadcrumb"]').text().length).toBeGreaterThan(0)
  })

  it('applies the focused class when isFocused=true', () => {
    const wrapper = mount(SearchResultRow, { props: { nodeId, isFocused: true } })
    expect(wrapper.find('[data-test="row"]').classes()).toContain('bg-fill-2')
  })

  it('emits click', async () => {
    const wrapper = mount(SearchResultRow, { props: { nodeId, isFocused: false } })
    await wrapper.find('[data-test="row"]').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
