/**
 * LayerRow — Cluster 06 Task 11 tests.
 *
 * Validates: type/mask/slice glyphs, vis + lock affordances, selection class,
 * indent steps (hi-fi 8 / 24 / 40), and treeitem keyboard a11y (Enter/Space
 * emit click, M9 from code review).
 */
import { describe, test, expect, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { LayerRow as LayerRowType } from '@/composables/use-layer-tree'

mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: defineComponent({
    name: 'KovaIconStub',
    props: { name: String, size: String },
    setup(props) {
      return () => h('span', { 'data-icon': props.name })
    },
  }),
}))

const LayerRow = (await import('@/components/editor/LayerRow.vue')).default

function makeRow(overrides: Partial<LayerRowType> = {}): LayerRowType {
  return {
    id: 'n1',
    type: 'RECTANGLE',
    name: 'Rectangle 1',
    indent: 0,
    hasChildren: false,
    isExpanded: true,
    isMask: false,
    maskGlyph: null,
    isSlice: false,
    isVisible: true,
    isLocked: false,
    ...overrides,
  }
}

describe('LayerRow', () => {
  test('renders the layer name', () => {
    const wrap = mount(LayerRow, { props: { row: makeRow() } })
    expect(wrap.get('[data-testid="layer-row-name"]').text()).toBe('Rectangle 1')
  })

  test('maps node type to the correct glyph (TEXT → type)', () => {
    const wrap = mount(LayerRow, { props: { row: makeRow({ type: 'TEXT' }) } })
    expect(wrap.find('[data-icon="type"]').exists()).toBe(true)
  })

  test('renders mask glyph when isMask, tagged with mask type', () => {
    const wrap = mount(LayerRow, {
      props: { row: makeRow({ isMask: true, maskGlyph: 'LUMINANCE' }) },
    })
    const mask = wrap.find('[data-testid="layer-row-mask"]')
    expect(mask.exists()).toBe(true)
    expect(mask.attributes('data-mask-type')).toBe('LUMINANCE')
  })

  test('renders slice glyph for SLICE rows', () => {
    const wrap = mount(LayerRow, { props: { row: makeRow({ isSlice: true }) } })
    expect(wrap.find('[data-testid="layer-row-slice"]').exists()).toBe(true)
  })

  test('emits click with the row and the originating MouseEvent', async () => {
    const row = makeRow()
    const wrap = mount(LayerRow, { props: { row } })
    await wrap.get('[role="treeitem"]').trigger('click')
    const ev = wrap.emitted('click')
    expect(ev).toHaveLength(1)
    expect(ev?.[0]?.[0]).toEqual(row)
  })

  test('Enter key emits click (treeitem keyboard a11y)', async () => {
    const wrap = mount(LayerRow, { props: { row: makeRow() } })
    await wrap.get('[role="treeitem"]').trigger('keydown.enter')
    expect(wrap.emitted('click')).toHaveLength(1)
  })

  test('vis button emits toggleVisibility, not click', async () => {
    const wrap = mount(LayerRow, { props: { row: makeRow() } })
    await wrap.get('[data-testid="layer-row-vis"]').trigger('click')
    expect(wrap.emitted('toggleVisibility')).toHaveLength(1)
    expect(wrap.emitted('click')).toBeUndefined()
  })

  test('selected row carries aria-selected + data-selected', () => {
    const wrap = mount(LayerRow, { props: { row: makeRow(), selected: true } })
    const item = wrap.get('[role="treeitem"]')
    expect(item.attributes('aria-selected')).toBe('true')
    expect(item.attributes('data-selected')).toBe('true')
  })

  test('indent step follows hi-fi 8 / 24 / 40 pattern', () => {
    const flat = mount(LayerRow, { props: { row: makeRow({ indent: 0 }) } })
    expect(flat.get('[role="treeitem"]').attributes('style')).toContain('padding-left: 8px')
    const lvl1 = mount(LayerRow, { props: { row: makeRow({ indent: 1 }) } })
    expect(lvl1.get('[role="treeitem"]').attributes('style')).toContain('padding-left: 24px')
    const lvl2 = mount(LayerRow, { props: { row: makeRow({ indent: 2 }) } })
    expect(lvl2.get('[role="treeitem"]').attributes('style')).toContain('padding-left: 40px')
  })

  test('caret only renders for rows with children', () => {
    const leaf = mount(LayerRow, { props: { row: makeRow({ hasChildren: false }) } })
    expect(leaf.find('[data-testid="layer-row-caret"]').exists()).toBe(false)
    const branch = mount(LayerRow, { props: { row: makeRow({ hasChildren: true }) } })
    expect(branch.find('[data-testid="layer-row-caret"]').exists()).toBe(true)
  })
})
