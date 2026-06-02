import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: new Map(),
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))
mock.module('@/sentry', () => ({ captureBrowserException: () => {} }))
mock.module('@/composables/version-history/use-canvas-edit-lock', () => ({
  useCanvasEditLock: () => ({ lock() {}, unlock() {}, isLocked: { value: false } }),
}))

// Stub KovaModal (Reka Dialog) so child modals mount cleanly in happy-dom.
mock.module('@/components/ui/KovaModal.vue', () => {
  const { defineComponent, h } = require('vue')
  return {
    default: defineComponent({
      name: 'KovaModalStub',
      props: { open: Boolean, size: String, title: String, description: String },
      emits: ['close', 'update:open'],
      setup(_: unknown, { slots }: { slots: Record<string, () => unknown> }) {
        return () =>
          h('div', { class: 'dlg' }, [
            slots.default?.(),
            slots['foot-left']?.(),
            slots.foot?.(),
          ])
      },
    }),
  }
})

const routerPush = mock(() => Promise.resolve())
const realRouter = await import('vue-router')
mock.module('vue-router', () => ({
  ...realRouter,
  useRouter: () => ({ push: routerPush }),
  useRoute: () => ({ params: { canvasId: 'c1' }, query: {} }),
}))

const { default: SnapshotTimelinePanel } = await import(
  '@/components/version-history/SnapshotTimelinePanel.vue'
)
const { default: SnapshotRow } = await import('@/components/version-history/SnapshotRow.vue')
const { default: RestoreConfirmModal } = await import(
  '@/components/version-history/RestoreConfirmModal.vue'
)
const { useSnapshotsStore } = await import('@/stores/snapshots')

type AnySnap = Record<string, unknown>
const auto = (id: string): AnySnap => ({ id, canvas_id: 'c1', kind: 'autosave', label: null, taken_at: '2026-04-28T17:12:00Z' })
const manual = (id: string, label: string): AnySnap => ({ id, canvas_id: 'c1', kind: 'manual', label, taken_at: '2026-04-28T17:12:00Z' })

function setup(rows: AnySnap[]) {
  setActivePinia(createPinia())
  const store = useSnapshotsStore()
  store.list = mock(() => Promise.resolve())
  store.byCanvasId['c1'] = rows as never
  const w = mount(SnapshotTimelinePanel, { props: { canvasId: 'c1' } })
  return { w, store }
}

describe('SnapshotTimelinePanel', () => {
  beforeEach(() => routerPush.mockClear())

  it('renders Current Version row + autosave group head + N rows', () => {
    const { w } = setup([auto('s1'), auto('s2')])
    expect(w.find('.vh-row.current').exists()).toBe(true)
    expect(w.find('.vh-group-head').text()).toContain('2 autosave versions')
    expect(w.findAllComponents(SnapshotRow)).toHaveLength(2)
  })

  it('renders the empty state when zero rows', () => {
    const { w } = setup([])
    expect(w.find('.empty-pane').exists()).toBe(true)
  })

  it('toggling showAutosaves hides autosave rows', async () => {
    const { w, store } = setup([manual('m1', 'v1'), auto('s2')])
    expect(w.findAllComponents(SnapshotRow)).toHaveLength(2)
    store.showAutosaves = false
    await w.vm.$nextTick()
    expect(w.findAllComponents(SnapshotRow)).toHaveLength(1)
  })

  it('row preview sets store.previewingId', async () => {
    const { w, store } = setup([auto('s1')])
    await w.findComponent(SnapshotRow).vm.$emit('preview', 's1')
    expect(store.previewingId).toBe('s1')
  })

  it('row restore-clicked opens the RestoreConfirmModal', async () => {
    const { w } = setup([auto('s1')])
    expect(w.findComponent(RestoreConfirmModal).exists()).toBe(false)
    await w.findComponent(SnapshotRow).vm.$emit('restore-clicked', 's1')
    expect(w.findComponent(RestoreConfirmModal).exists()).toBe(true)
  })

  it('confirming restore calls store.restore(id, canvasId)', async () => {
    const { w, store } = setup([auto('s1')])
    store.restore = mock(() => Promise.resolve({ ok: true }))
    await w.findComponent(SnapshotRow).vm.$emit('restore-clicked', 's1')
    await w.findComponent(RestoreConfirmModal).vm.$emit('confirmed')
    await flushPromises()
    expect(store.restore).toHaveBeenCalledWith('s1', 'c1')
  })

  it('duplicate-clicked calls store.duplicateToCanvas + routes to the new canvas', async () => {
    const { w, store } = setup([auto('s1')])
    store.duplicateToCanvas = mock(() => Promise.resolve({ canvas_id: 'c2' }))
    await w.findComponent(SnapshotRow).vm.$emit('duplicate-clicked', 's1')
    await flushPromises()
    expect(store.duplicateToCanvas).toHaveBeenCalledWith('s1')
    expect(routerPush).toHaveBeenCalledWith('/canvas/c2')
  })
})
