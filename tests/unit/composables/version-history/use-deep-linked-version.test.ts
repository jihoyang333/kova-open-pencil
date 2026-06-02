import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { resolveDeepLink } from '@/composables/version-history/use-deep-linked-version'
import { useSnapshotsStore, type Snapshot } from '@/stores/snapshots'

function snap(id: string): Snapshot {
  return {
    id, canvas_id: 'c1', brand_id: 'b1', user_id: 'u1', taken_at: new Date().toISOString(),
    kind: 'manual', label: null, description: null, scene_blob_path: 'p', scene_size_bytes: 1,
    thumbnail_path: null, parent_snapshot_id: null, format_version: 1, retention_class: 'permanent',
  }
}

beforeEach(() => setActivePinia(createPinia()))

describe('resolveDeepLink', () => {
  it('opens panel + previews the version when ?version exists', async () => {
    const store = useSnapshotsStore()
    ;(store as unknown as { list: unknown }).list = async (cid: string) => {
      store.byCanvasId[cid] = [snap('v1')]
    }
    await resolveDeepLink({ query: { version: 'v1' }, params: { canvasId: 'c1' } } as never, store)
    expect(store.panelOpen).toBe(true)
    expect(store.previewingId).toBe('v1')
  })

  it('no-ops when there is no ?version', async () => {
    const store = useSnapshotsStore()
    await resolveDeepLink({ query: {}, params: { canvasId: 'c1' } } as never, store)
    expect(store.panelOpen).toBe(false)
  })

  it('does not open the panel when the version is not found', async () => {
    const store = useSnapshotsStore()
    ;(store as unknown as { list: unknown }).list = async (cid: string) => {
      store.byCanvasId[cid] = []
    }
    await resolveDeepLink({ query: { version: 'missing' }, params: { canvasId: 'c1' } } as never, store)
    expect(store.panelOpen).toBe(false)
  })
})
