import { describe, expect, it, mock } from 'bun:test'
import { mount } from '@vue/test-utils'

mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: new Map(),
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))

const { default: SnapshotEmptyState } = await import(
  '@/components/version-history/SnapshotEmptyState.vue'
)
const { default: AutosaveGroupHead } = await import(
  '@/components/version-history/AutosaveGroupHead.vue'
)
const { default: CurrentVersionRow } = await import(
  '@/components/version-history/CurrentVersionRow.vue'
)
const { default: FilterDropdown } = await import('@/components/version-history/FilterDropdown.vue')

describe('SnapshotEmptyState', () => {
  it('renders the headline + ⌘+⌥+S hint copy', () => {
    const w = mount(SnapshotEmptyState)
    expect(w.text()).toContain('No version history yet')
    expect(w.text()).toContain('⌘+⌥+S')
  })
})

describe('AutosaveGroupHead', () => {
  it('pluralizes the count label', () => {
    expect(mount(AutosaveGroupHead, { props: { count: 1, collapsed: false } }).text()).toContain(
      '1 autosave version',
    )
    expect(mount(AutosaveGroupHead, { props: { count: 8, collapsed: false } }).text()).toContain(
      '8 autosave versions',
    )
  })

  it('emits toggle on click', async () => {
    const w = mount(AutosaveGroupHead, { props: { count: 2, collapsed: false } })
    await w.find('.vh-group-head').trigger('click')
    expect(w.emitted('toggle')).toBeTruthy()
  })

  it('shows chevron-right when collapsed, chevron-down when expanded', () => {
    const collapsed = mount(AutosaveGroupHead, { props: { count: 2, collapsed: true } })
    expect(collapsed.findComponent({ name: 'KovaIcon' }).props('name')).toBe('chevron-right')
    const open = mount(AutosaveGroupHead, { props: { count: 2, collapsed: false } })
    expect(open.findComponent({ name: 'KovaIcon' }).props('name')).toBe('chevron-down')
  })
})

describe('CurrentVersionRow', () => {
  it('renders the pinned current-version row', () => {
    const w = mount(CurrentVersionRow)
    expect(w.find('.vh-row.current').exists()).toBe(true)
    expect(w.text()).toContain('Current version')
  })
})

describe('FilterDropdown', () => {
  it('reflects the checked state from showAutosaves', () => {
    const on = mount(FilterDropdown, { props: { showAutosaves: true } })
    expect(on.find('.item.checkable').classes()).toContain('checked')
    const off = mount(FilterDropdown, { props: { showAutosaves: false } })
    expect(off.find('.item.checkable').classes()).not.toContain('checked')
  })

  it('emits update:showAutosaves with the toggled value', async () => {
    const w = mount(FilterDropdown, { props: { showAutosaves: true } })
    await w.find('.item.checkable').trigger('click')
    expect(w.emitted('update:showAutosaves')).toEqual([[false]])
  })
})
