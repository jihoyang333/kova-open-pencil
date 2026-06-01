/**
 * LeftPanel — Cluster 06 Task 11 tests.
 *
 * Per PRD 06 §12.1 RATIFIED 2026-05-17: three stacked collapsible sections
 * (Pages, Layers, Shop). Shop auto-expands when the active brand has a Shopify
 * connection (L10) and collapses on disconnect (L7 from review).
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

const LeftPanel = (await import('@/components/editor/LeftPanel.vue')).default
const { createEditorStore, setActiveEditorStore } = await import('@/stores/editor')
const { useLeftPanelStore } = await import('@/stores/left-panel')
const { __resetLayerTreeExpansion } = await import('@/composables/use-layer-tree')

const baseProps = { fileName: 'My Email', fileMeta: 'auto-saved · just now' }

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  __resetLayerTreeExpansion()
  setActiveEditorStore(createEditorStore())
})

describe('LeftPanel', () => {
  test('renders all three stacked sections (Pages, Layers, Shop)', () => {
    const wrap = mount(LeftPanel, { props: baseProps })
    expect(wrap.find('[data-testid="left-panel-section-pages"]').exists()).toBe(true)
    expect(wrap.find('[data-testid="left-panel-section-layers"]').exists()).toBe(true)
    expect(wrap.find('[data-testid="left-panel-section-shop"]').exists()).toBe(true)
  })

  test('renders the file row with name + meta', () => {
    const wrap = mount(LeftPanel, { props: baseProps })
    const fileRow = wrap.get('[data-testid="file-row"]')
    expect(fileRow.text()).toContain('My Email')
    expect(fileRow.text()).toContain('auto-saved')
  })

  test('shop section shows Connect-Shopify empty state when disconnected', async () => {
    // Empty-state lives inside the Shop CollapsibleContent, which Reka only
    // renders when the section is open. Expand it explicitly (disconnected
    // brands default-collapse the section).
    const lp = useLeftPanelStore()
    lp.setExpanded('shop', true)
    const wrap = mount(LeftPanel, { props: { ...baseProps, shopifyConnected: false } })
    await wrap.vm.$nextTick()
    expect(wrap.find('[data-testid="shop-empty-state"]').exists()).toBe(true)
  })

  test('page count badge reflects the scene graph', () => {
    const wrap = mount(LeftPanel, { props: baseProps })
    // A fresh editor store starts with exactly one page.
    expect(wrap.get('[data-testid="pages-count"]').text()).toBe('1')
  })

  test('product count badge reflects the prop', () => {
    const wrap = mount(LeftPanel, { props: { ...baseProps, productCount: 7 } })
    expect(wrap.get('[data-testid="shop-count"]').text()).toBe('7')
  })

  test('shop section auto-expands when Shopify connection flips on (L10)', async () => {
    const wrap = mount(LeftPanel, { props: { ...baseProps, shopifyConnected: false } })
    const lp = useLeftPanelStore()
    expect(lp.expanded.shop).toBe(false)
    await wrap.setProps({ shopifyConnected: true })
    expect(lp.expanded.shop).toBe(true)
  })

  test('shop section collapses when Shopify disconnects (L7)', async () => {
    const wrap = mount(LeftPanel, { props: { ...baseProps, shopifyConnected: true } })
    const lp = useLeftPanelStore()
    expect(lp.expanded.shop).toBe(true)
    await wrap.setProps({ shopifyConnected: false })
    expect(lp.expanded.shop).toBe(false)
  })
})
