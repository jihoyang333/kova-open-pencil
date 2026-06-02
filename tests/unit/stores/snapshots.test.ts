import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useSnapshotsStore, type Snapshot } from '@/stores/snapshots'

beforeEach(() => setActivePinia(createPinia()))

function snap(over: Partial<Snapshot>): Snapshot {
  return {
    id: crypto.randomUUID(), canvas_id: 'c1', brand_id: 'b1', user_id: 'u1',
    taken_at: new Date().toISOString(), kind: 'manual', label: null, description: null,
    scene_blob_path: 'p', scene_size_bytes: 1, thumbnail_path: null, parent_snapshot_id: null,
    format_version: 1, retention_class: 'permanent', ...over,
  }
}

describe('useSnapshotsStore', () => {
  it('panel + dialog toggles', () => {
    const s = useSnapshotsStore()
    expect(s.panelOpen).toBe(false)
    s.openPanel(); expect(s.panelOpen).toBe(true)
    s.closePanel(); expect(s.panelOpen).toBe(false)
    s.openAddDialog(); expect(s.addDialogOpen).toBe(true)
    s.closeAddDialog(); expect(s.addDialogOpen).toBe(false)
  })

  it('closePanel exits preview', () => {
    const s = useSnapshotsStore()
    s.previewSnapshot('x'); expect(s.previewingId).toBe('x')
    s.closePanel(); expect(s.previewingId).toBeNull()
  })

  it('visibleFor hides autosaves (without label) when showAutosaves is false', () => {
    const s = useSnapshotsStore()
    s.byCanvasId['c1'] = [
      snap({ kind: 'manual', label: 'Named' }),
      snap({ kind: 'autosave', label: null }),
      snap({ kind: 'autosave', label: 'Kept named autosave' }),
    ]
    expect(s.visibleFor('c1')).toHaveLength(3)
    s.showAutosaves = false
    const visible = s.visibleFor('c1')
    expect(visible).toHaveLength(2) // manual + named autosave; bare autosave hidden
    expect(visible.every((x) => x.kind !== 'autosave' || !!x.label)).toBe(true)
  })

  it('versionLink builds /canvas/{cid}?version={sid}', () => {
    const s = useSnapshotsStore()
    expect(s.versionLink('s1', 'c1')).toMatch(/\/canvas\/c1\?version=s1$/)
  })
})
