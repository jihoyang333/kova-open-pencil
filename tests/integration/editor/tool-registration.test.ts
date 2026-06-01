/**
 * Tool registration end-to-end — Cluster 06 Task 18.
 *
 * Exercises the full path: main.ts registers the 8 default tools, Cluster 07a
 * registers Slice (frame dropdown) + Measurement (primary slot), and the
 * BottomToolbar reflects them in canonical slot order.
 */
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent, h } from 'vue'

mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: new Map<string, unknown>(),
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))
mock.module('@/components/ui/KovaTooltip.vue', () => ({
  default: defineComponent({
    name: 'KovaTooltipStub',
    setup(_, { slots }) {
      return () => h('div', {}, slots.default?.())
    },
  }),
}))
mock.module('@/components/ui/KovaMenu.vue', () => ({
  default: defineComponent({
    name: 'KovaMenuStub',
    props: { items: Array },
    setup(_, { slots }) {
      return () => h('div', { 'data-stub': 'menu' }, slots.trigger?.())
    },
  }),
}))

const BottomToolbar = (await import('@/components/editor/BottomToolbar.vue')).default
const { useToolRegistry } = await import('@/stores/tool-registry')
const { createEditorStore, setActiveEditorStore } = await import('@/stores/editor')

const NOOP = () => {}

function registerDefaults() {
  const r = useToolRegistry()
  r.register({ id: 'move', slot: 'move', icon: 'mouse-pointer-2', label: 'Move', key: 'V', onActivate: NOOP })
  r.register({ id: 'frame', slot: 'frame', icon: 'frame', label: 'Frame', key: 'F', onActivate: NOOP })
  r.register({ id: 'rectangle', slot: 'rectangle', icon: 'square', label: 'Rectangle', key: 'R', onActivate: NOOP })
  r.register({ id: 'ellipse', slot: 'ellipse', icon: 'circle', label: 'Ellipse', key: 'O', onActivate: NOOP })
  r.register({ id: 'pen', slot: 'pen', icon: 'pen-tool', label: 'Pen', key: 'P', onActivate: NOOP })
  r.register({ id: 'text', slot: 'text', icon: 'type', label: 'Text', key: 'T', onActivate: NOOP })
  r.register({ id: 'ai', slot: 'ai', icon: 'sparkles', label: 'AI', onActivate: NOOP })
  r.register({ id: 'components', slot: 'components', icon: 'component', label: 'Components', disabled: true, onActivate: NOOP })
  return r
}

describe('tool registration end-to-end', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setActiveEditorStore(createEditorStore())
  })

  test('Cluster 07a register-call surfaces Measurement in the primary toolbar', () => {
    const r = registerDefaults()
    // Cluster 07a registration into Cluster 06's registry.
    r.register({ id: 'measurement', slot: 'measurement', icon: 'ruler', label: 'Measurement', keySequence: ['Shift', 'M'], onActivate: NOOP })

    const wrap = mount(BottomToolbar)
    expect(wrap.find('button[data-tool-id="measurement"]').exists()).toBe(true)
  })

  test('Slice registers as a Frame dropdown sub-tool (chevron appears)', () => {
    const r = registerDefaults()
    r.register({ id: 'slice', slot: 'frame', parent: 'frame', icon: 'crop', label: 'Slice', key: 'S', onActivate: NOOP })

    expect(r.dropdownTools('frame').some((t) => t.id === 'slice')).toBe(true)

    const wrap = mount(BottomToolbar)
    expect(wrap.find('button[data-tool-id="frame"]').exists()).toBe(true)
  })

  test('primary tools render in canonical slot order including measurement', () => {
    const r = registerDefaults()
    r.register({ id: 'measurement', slot: 'measurement', icon: 'ruler', label: 'Measurement', keySequence: ['Shift', 'M'], onActivate: NOOP })

    const wrap = mount(BottomToolbar)
    const ids = wrap.findAll('button[data-tool-id]').map((b) => b.attributes('data-tool-id'))
    expect(ids).toEqual([
      'move',
      'frame',
      'rectangle',
      'ellipse',
      'pen',
      'text',
      'measurement',
      'ai',
      'components',
    ])
  })
})
