import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import { useFindStore } from '@/stores/find'

// KovaIcon registry resolves ~icons/lucide/* (unavailable under bun test) — mock first.
mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: { name: 'KovaIcon', template: '<span class="kova-icon-stub" />' }
}))

const { default: SearchPanel } = await import('@/components/find/SearchPanel.vue')

describe('SearchPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setActiveEditorStore(createEditorStore()) // SearchResultRow children read the graph
  })

  it('renders nothing when find is inactive', () => {
    expect(mount(SearchPanel).find('[data-test="search-panel"]').exists()).toBe(false)
  })

  it('renders the panel, input, and close button when find is active', () => {
    useFindStore().open()
    const wrapper = mount(SearchPanel)
    expect(wrapper.find('[data-test="search-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="search-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="close-button"]').exists()).toBe(true)
  })

  it('binds the input to findStore.query', async () => {
    const store = useFindStore()
    store.open()
    const wrapper = mount(SearchPanel)
    await wrapper.find('[data-test="search-input"]').setValue('frame')
    expect(store.query).toBe('frame')
  })

  it('Esc on the input closes find', async () => {
    const store = useFindStore()
    store.open()
    const wrapper = mount(SearchPanel)
    await wrapper.find('[data-test="search-input"]').trigger('keydown.esc')
    expect(store.active).toBe(false)
  })

  it('× closes find', async () => {
    const store = useFindStore()
    store.open()
    const wrapper = mount(SearchPanel)
    await wrapper.find('[data-test="close-button"]').trigger('click')
    expect(store.active).toBe(false)
  })

  it('shows "N results · This page"', () => {
    const store = useFindStore()
    store.open()
    store.matchedNodeIds = ['a', 'b', 'c']
    const wrapper = mount(SearchPanel)
    expect(wrapper.find('[data-test="result-count"]').text()).toBe('3 results · This page')
  })
})
