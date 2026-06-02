import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: new Map(),
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))

const { default: SnapshotRow } = await import('@/components/version-history/SnapshotRow.vue')
const { useSnapshotsStore: _ } = await import('@/stores/snapshots') // ensure Snapshot type module loads

type AnySnap = Record<string, unknown>
const named: AnySnap = { id: 's1', kind: 'manual', label: 'v2 hero update', description: 'changed hero', taken_at: '2026-04-28T17:12:00Z' }
const autosave: AnySnap = { id: 's2', kind: 'autosave', label: null, description: null, taken_at: '2026-04-28T17:12:00Z' }

function mountRow(snapshot: AnySnap, extra: Record<string, unknown> = {}) {
  return mount(SnapshotRow, {
    props: { snapshot, isActive: false, isCurrent: false, ...extra },
  })
}

describe('SnapshotRow', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('right-click opens a 5-item dropdown in Figma-exact order', async () => {
    const w = mountRow(named)
    await w.find('.vh-row').trigger('contextmenu')
    const items = w.findAll('[data-testid="menu-item"]')
    expect(items).toHaveLength(5)
    expect(items.map((i) => i.text())).toEqual([
      'Name this version',
      'Restore this version',
      'Duplicate',
      'Delete version info',
      'Copy link',
    ])
  })

  it('Delete version info is disabled for an unnamed autosave', async () => {
    const w = mountRow(autosave)
    await w.find('.vh-row').trigger('contextmenu')
    expect(w.findAll('[data-testid="menu-item"]')[3].classes()).toContain('disabled')
  })

  it('Delete version info is enabled when label set OR kind is manual', async () => {
    const renamed = mountRow({ ...autosave, label: 'Pre-Klaviyo' })
    await renamed.find('.vh-row').trigger('contextmenu')
    expect(renamed.findAll('[data-testid="menu-item"]')[3].classes()).not.toContain('disabled')

    const manual = mountRow(named)
    await manual.find('.vh-row').trigger('contextmenu')
    expect(manual.findAll('[data-testid="menu-item"]')[3].classes()).not.toContain('disabled')
  })

  it('Name this version activates the inline rename input', async () => {
    const w = mountRow(named)
    await w.find('.vh-row').trigger('contextmenu')
    await w.findAll('[data-testid="menu-item"]')[0].trigger('click')
    expect(w.find('[data-testid="rename-input"]').exists()).toBe(true)
  })

  it('Enter commits the rename via rename-clicked; Esc cancels', async () => {
    const w = mountRow(named)
    await w.find('.vh-row').trigger('contextmenu')
    await w.findAll('[data-testid="menu-item"]')[0].trigger('click')
    const input = w.find('[data-testid="rename-input"]')
    await input.setValue('Final color pass')
    await input.trigger('keydown', { key: 'Enter' })
    expect(w.emitted('rename-clicked')).toEqual([['s1', 'Final color pass']])

    // re-open + Esc → no second emit, input gone
    await w.find('.vh-row').trigger('contextmenu')
    await w.findAll('[data-testid="menu-item"]')[0].trigger('click')
    await w.find('[data-testid="rename-input"]').trigger('keydown', { key: 'Escape' })
    expect(w.find('[data-testid="rename-input"]').exists()).toBe(false)
    expect(w.emitted('rename-clicked')).toHaveLength(1)
  })

  it('menu items emit restore/duplicate/copy-link/delete-info with the id', async () => {
    const w = mountRow(named)
    await w.find('.vh-row').trigger('contextmenu')
    const items = w.findAll('[data-testid="menu-item"]')
    await items[1].trigger('click')
    expect(w.emitted('restore-clicked')).toEqual([['s1']])
    await w.find('.vh-row').trigger('contextmenu')
    await w.findAll('[data-testid="menu-item"]')[2].trigger('click')
    expect(w.emitted('duplicate-clicked')).toEqual([['s1']])
    await w.find('.vh-row').trigger('contextmenu')
    await w.findAll('[data-testid="menu-item"]')[3].trigger('click')
    expect(w.emitted('delete-info-clicked')).toEqual([['s1']])
    await w.find('.vh-row').trigger('contextmenu')
    await w.findAll('[data-testid="menu-item"]')[4].trigger('click')
    expect(w.emitted('copy-link-clicked')).toEqual([['s1']])
  })

  it('disabled Delete version info does not emit', async () => {
    const w = mountRow(autosave)
    await w.find('.vh-row').trigger('contextmenu')
    await w.findAll('[data-testid="menu-item"]')[3].trigger('click')
    expect(w.emitted('delete-info-clicked')).toBeUndefined()
  })

  it('named snapshot renders label + description; autosave renders formatted date', () => {
    const namedRow = mountRow(named)
    expect(namedRow.find('.vh-row').classes()).toContain('named')
    expect(namedRow.find('.ttl').text()).toBe('v2 hero update')
    expect(namedRow.find('.desc').text()).toBe('changed hero')

    const autoRow = mountRow(autosave)
    expect(autoRow.find('.vh-row').classes()).not.toContain('named')
    expect(autoRow.find('.desc').exists()).toBe(false)
    expect(autoRow.find('.ttl').text().length).toBeGreaterThan(0)
  })

  it('a manual snapshot with its label cleared shows the timestamp, not an empty title (H1)', () => {
    const delabeled = mountRow({ ...named, label: null })
    expect(delabeled.find('.vh-row').classes()).not.toContain('named')
    expect(delabeled.find('.ttl').text().length).toBeGreaterThan(0)
    expect(delabeled.find('.desc').exists()).toBe(false)
  })

  it('clicking the row emits preview', async () => {
    const w = mountRow(autosave)
    await w.find('.vh-row').trigger('click')
    expect(w.emitted('preview')).toEqual([['s2']])
  })

  it('applies current/active state classes', () => {
    expect(mountRow(autosave, { isCurrent: true }).find('.vh-row').classes()).toContain('current')
    expect(mountRow(autosave, { isActive: true }).find('.vh-row').classes()).toContain('active')
  })
})
