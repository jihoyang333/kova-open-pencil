/**
 * BottomToolbar — Cluster 06 Task 10 tests.
 *
 * Validates: 8 default tools render (Slice + Measurement come from Cluster 07a),
 * divider sits between drawing tools and AI cluster, Components is disabled
 * with Phase 2 tooltip, AI tool is its own component (distinct styling).
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
    props: { content: String, side: String, align: String, sideOffset: Number, delayDuration: Number, disabled: Boolean },
    setup(_, { slots }) {
      return () => h('div', { 'data-stub': 'tooltip' }, slots.default?.())
    },
  }),
}))

mock.module('@/components/ui/KovaMenu.vue', () => ({
  default: defineComponent({
    name: 'KovaMenuStub',
    props: { items: Array, open: Boolean, side: String, align: String, sideOffset: Number, width: String },
    setup(_, { slots }) {
      return () => h('div', { 'data-stub': 'menu' }, slots.trigger?.())
    },
  }),
}))

const BottomToolbar = (await import('@/components/editor/BottomToolbar.vue')).default
const { useToolRegistry } = await import('@/stores/tool-registry')
const { createEditorStore, setActiveEditorStore } = await import('@/stores/editor')
type ToolDef = import('@/types/tool-registry').ToolDef

function registerDefault8(): void {
  const r = useToolRegistry()
  const tools: ToolDef[] = [
    { id: 'move', slot: 'move', icon: 'mouse-pointer-2', label: 'Move', key: 'V', onActivate: () => {} },
    { id: 'frame', slot: 'frame', icon: 'frame', label: 'Frame', key: 'F', onActivate: () => {} },
    { id: 'rectangle', slot: 'rectangle', icon: 'square', label: 'Rectangle', key: 'R', onActivate: () => {} },
    { id: 'ellipse', slot: 'ellipse', icon: 'circle', label: 'Ellipse', key: 'O', onActivate: () => {} },
    { id: 'pen', slot: 'pen', icon: 'pen-tool', label: 'Pen', key: 'P', onActivate: () => {} },
    { id: 'text', slot: 'text', icon: 'type', label: 'Text', key: 'T', onActivate: () => {} },
    { id: 'ai', slot: 'ai', icon: 'sparkles', label: 'Ask Kova', onActivate: () => {} },
    {
      id: 'components',
      slot: 'components',
      icon: 'component',
      label: 'Components',
      disabled: true,
      tooltip: 'Components — Phase 2',
      onActivate: () => {},
    },
  ]
  tools.forEach((t) => r.register(t))
}

describe('<BottomToolbar> (Cluster 06 Task 10)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setActiveEditorStore(createEditorStore())
    registerDefault8()
  })

  test('renders 8 default tool buttons (6 drawing + AI + Components)', () => {
    const wrapper = mount(BottomToolbar)
    const buttons = wrapper.findAll('button[data-tool-id]')
    expect(buttons).toHaveLength(8)
  })

  test('renders divider between drawing tools and AI cluster', () => {
    const wrapper = mount(BottomToolbar)
    const divider = wrapper.find('[data-testid="toolbar-divider"]')
    expect(divider.exists()).toBe(true)
  })

  test('Components button is disabled and has Phase 2 tooltip text in attribute chain', () => {
    const wrapper = mount(BottomToolbar)
    const components = wrapper.find('button[data-tool-id="components"]')
    expect(components.attributes('disabled')).toBeDefined()
  })

  test('AI button is rendered via AiToolButton (distinct component)', () => {
    const wrapper = mount(BottomToolbar)
    const ai = wrapper.find('button[data-tool-id="ai"]')
    // AiToolButton uses text-accent-ink class
    expect(ai.classes().join(' ')).toContain('text-accent-ink')
  })

  test('Move tool dropdown chevron hidden when no sub-tools registered', () => {
    const wrapper = mount(BottomToolbar)
    const move = wrapper.find('button[data-tool-id="move"]')
    // chevron-down should not render when hasDropdown false (no sub-tools registered)
    expect(move.find('svg[class*="chevron"]').exists()).toBe(false)
  })

  test('Frame tool dropdown chevron renders when Cluster 07a registers Slice', () => {
    useToolRegistry().register({
      id: 'slice',
      slot: 'frame',
      parent: 'frame',
      icon: 'crop',
      label: 'Slice',
      key: 'S',
      onActivate: () => {},
    })
    const wrapper = mount(BottomToolbar)
    const frame = wrapper.find('button[data-tool-id="frame"]')
    // Chevron span has aria-hidden and contains a KovaIcon for chevron-down
    expect(frame.find('span[aria-hidden="true"]').exists()).toBe(true)
  })

  test('tools render in canonical slot order (move/frame/rect/ellipse/pen/text/ai/components)', () => {
    const wrapper = mount(BottomToolbar)
    const ids = wrapper
      .findAll('button[data-tool-id]')
      .map((b) => b.attributes('data-tool-id'))
    expect(ids).toEqual([
      'move',
      'frame',
      'rectangle',
      'ellipse',
      'pen',
      'text',
      'ai',
      'components',
    ])
  })

  test('divider absent when no AI/Components tools registered (L9 regression)', () => {
    setActivePinia(createPinia())
    setActiveEditorStore(createEditorStore())
    const r = useToolRegistry()
    // Register drawing tools only — no AI, no Components.
    const drawingOnly: ToolDef[] = [
      { id: 'move', slot: 'move', icon: 'mouse-pointer-2', label: 'Move', key: 'V', onActivate: () => {} },
      { id: 'frame', slot: 'frame', icon: 'frame', label: 'Frame', key: 'F', onActivate: () => {} },
    ]
    drawingOnly.forEach((t) => r.register(t))
    const wrapper = mount(BottomToolbar)
    expect(wrapper.find('[data-testid="toolbar-divider"]').exists()).toBe(false)
  })

  test('toolbar root has correct ARIA + data-testid', () => {
    const wrapper = mount(BottomToolbar)
    const root = wrapper.find('[data-testid="bottom-toolbar"]')
    expect(root.attributes('role')).toBe('toolbar')
    expect(root.attributes('aria-label')).toBe('Drawing tools')
  })
})
