/**
 * RightPanelTabs — Cluster 06 Task 15 tests.
 *
 * Covers founder ratifications:
 *   §12.13 — default-active = AI on first canvas open
 *   §12.14 — STICKY on layer-click (no auto-switch)
 *   §6 — Prototype tab NOT rendered
 */
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: new Map<string, unknown>(),
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))

const RightPanelTabs = (await import('@/components/editor/RightPanelTabs.vue')).default
const { useRightPanelStore } = await import('@/stores/right-panel')
const { createEditorStore, setActiveEditorStore, useEditorStore } = await import(
  '@/stores/editor'
)

describe('<RightPanelTabs> (Cluster 06 Task 15)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setActiveEditorStore(createEditorStore())
    localStorage.clear()
  })

  test('renders EXACTLY 2 tabs: Design + AI (Prototype NOT in DOM per founder 2026-05-15)', () => {
    const wrapper = mount(RightPanelTabs)
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(2)
    expect(wrapper.text()).toContain('Design')
    expect(wrapper.text()).toContain('AI')
    expect(wrapper.text().toLowerCase()).not.toContain('prototype')
    expect(wrapper.find('[data-tab="prototype"]').exists()).toBe(false)
  })

  test('default-active = AI on first canvas open (RATIFIED §12.13 2026-05-17)', () => {
    useRightPanelStore().initFor('canvas-fresh')
    const wrapper = mount(RightPanelTabs)
    expect(wrapper.find('[data-tab="ai"][data-state="active"]').exists()).toBe(true)
    expect(wrapper.find('[data-tab="design"][data-state="active"]').exists()).toBe(false)
  })

  test('respects per-canvas localStorage on subsequent opens', () => {
    localStorage.setItem('right-panel-tab:canvas-2', 'design')
    useRightPanelStore().initFor('canvas-2')
    const wrapper = mount(RightPanelTabs)
    expect(wrapper.find('[data-tab="design"][data-state="active"]').exists()).toBe(true)
  })

  test('REGRESSION GUARD: layer click does NOT switch active tab (sticky per §12.14)', async () => {
    const rp = useRightPanelStore()
    const editor = useEditorStore()
    rp.initFor('canvas-1')
    expect(rp.activeTab).toBe('ai')

    mount(RightPanelTabs)
    const page = editor.state.currentPageId
    const node = editor.graph.createNode('RECTANGLE', page, { name: 'R' })
    editor.select([node.id])
    await flushPromises()

    expect(rp.activeTab).toBe('ai')
  })

  test('click on Design tab switches active tab + emits aria-selected', async () => {
    useRightPanelStore().initFor('canvas-1')
    const wrapper = mount(RightPanelTabs)
    await wrapper.find('[data-tab="design"]').trigger('click')
    expect(useRightPanelStore().activeTab).toBe('design')
    expect(
      wrapper.find('[data-tab="design"]').attributes('aria-selected')
    ).toBe('true')
  })
})
