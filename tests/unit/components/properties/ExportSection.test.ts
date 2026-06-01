import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import AppSelect from '@/components/AppSelect.vue'
import JpgQualityDropdown from '@/components/inspector/JpgQualityDropdown.vue'
import ExportSection from '@/components/properties/ExportSection.vue'

let store: EditorStore

describe('ExportSection — 07b extensions (additive)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = createEditorStore()
    setActiveEditorStore(store)
    store.graph.createNode('SLICE', store.state.currentPageId, { name: 'header', width: 100, height: 40 })
  })

  it('renders the "Export N slices" button when the page has slices', () => {
    const wrapper = mount(ExportSection)
    const btn = wrapper.find('[data-test="export-all-slices"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('1 slice')
  })

  it('shows JpgQualityDropdown only when a row format is JPG', async () => {
    const wrapper = mount(ExportSection)
    expect(wrapper.findComponent(JpgQualityDropdown).exists()).toBe(false)
    // [scale, format] selects for the default PNG row; flip format → JPG
    const selects = wrapper.findAllComponents(AppSelect)
    await selects[1].vm.$emit('update:model-value', 'JPG')
    expect(wrapper.findComponent(JpgQualityDropdown).exists()).toBe(true)
  })
})
