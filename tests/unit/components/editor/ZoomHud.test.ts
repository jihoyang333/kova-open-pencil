/**
 * ZoomHud — Cluster 06 Task 16 tests.
 *
 * Floating bottom-right zoom HUD (hi-fi `.kc .zoom`, Kova Canvas - Final.html
 * lines 311-325). Reads `editor.state.zoom` and renders rounded percent + caret.
 * Distinct from the right-panel tab-strip `zoom-r` (rendered by RightPanel).
 */
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent, h } from 'vue'

// KovaIcon resolves via registry which pulls real lucide imports; stub it so
// the unit test stays light and deterministic.
mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: defineComponent({
    name: 'KovaIconStub',
    props: { name: String, size: String },
    setup(props) {
      return () => h('span', { 'data-icon': props.name })
    },
  }),
}))

const ZoomHud = (await import('@/components/editor/ZoomHud.vue')).default
const { createEditorStore, setActiveEditorStore } = await import('@/stores/editor')

describe('ZoomHud', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setActiveEditorStore(createEditorStore())
  })

  test('renders 100% at zoom 1', () => {
    const wrap = mount(ZoomHud)
    expect(wrap.get('[data-testid="zoom-hud"]').text()).toContain('100%')
  })

  test('rounds fractional zoom to whole percent', () => {
    const store = createEditorStore()
    store.state.zoom = 2.923
    setActiveEditorStore(store)
    const wrap = mount(ZoomHud)
    expect(wrap.text()).toContain('292%')
  })

  test('renders a chevron-down caret', () => {
    const wrap = mount(ZoomHud)
    expect(wrap.find('[data-icon="chevron-down"]').exists()).toBe(true)
  })

  test('exposes an accessible zoom-controls trigger', () => {
    const wrap = mount(ZoomHud)
    const btn = wrap.get('[data-testid="zoom-hud"]')
    expect(btn.attributes('aria-label')).toBe('Zoom controls')
  })
})
