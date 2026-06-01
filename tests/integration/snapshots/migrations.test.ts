import { describe, expect, it } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

/**
 * Cluster 09 Task 1 — canvas_snapshots migration integration test.
 * Skip-guarded: runs only with KOVA_RUN_INTEGRATION=1 + a live local Supabase
 * (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) with 20260615000001_09_canvas_snapshots applied.
 */
const SHOULD_RUN =
  process.env['KOVA_RUN_INTEGRATION'] === '1' &&
  !!process.env['SUPABASE_URL'] &&
  !!process.env['SUPABASE_SERVICE_ROLE_KEY']

const d = SHOULD_RUN ? describe : describe.skip

const supabase = SHOULD_RUN
  ? createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : (null as never)

d('20260615000001_09_canvas_snapshots migration', () => {
  it('creates canvas_snapshots with all base + claimed_at columns', async () => {
    const { data, error } = await supabase.rpc('pg_get_columns', { p_table: 'canvas_snapshots' })
    expect(error).toBeNull()
    const names = (data as Array<{ name: string }>).map((c) => c.name).sort()
    // 14 base columns + claimed_at (added by Task 19b for cron-safe prune claiming).
    expect(names).toEqual([
      'brand_id', 'canvas_id', 'claimed_at', 'description', 'format_version', 'id', 'kind',
      'label', 'parent_snapshot_id', 'retention_class', 'scene_blob_path',
      'scene_size_bytes', 'taken_at', 'thumbnail_path', 'user_id',
    ])
  })

  it('rejects scene_size_bytes > 50 MB via CHECK', async () => {
    const { error } = await supabase.from('canvas_snapshots').insert({
      canvas_id: '00000000-0000-0000-0000-000000000000',
      brand_id: '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000000',
      kind: 'manual',
      scene_blob_path: 'x',
      scene_size_bytes: 52428801, // 50 MB + 1 byte
      retention_class: 'permanent',
    })
    expect(error?.message).toMatch(/scene_size_bytes|violates check/i)
  })

  it('creates canvas-snapshots Storage bucket as private with 50 MB limit', async () => {
    const { data, error } = await supabase.storage.getBucket('canvas-snapshots')
    expect(error).toBeNull()
    expect(data?.public).toBe(false)
    expect(data?.file_size_limit).toBe(52428800)
  })

  it('creates the 5 expected indexes', async () => {
    const { data } = await supabase.rpc('pg_get_indexes', { p_table: 'canvas_snapshots' })
    const names = (data as Array<{ indexname: string }>).map((i) => i.indexname)
    // Base indexes from the canvas_snapshots migration (Task 19b adds a 6th prune-candidates index).
    for (const expected of [
      'canvas_snapshots_pkey',
      'idx_canvas_snapshots_brand',
      'idx_canvas_snapshots_canvas_taken',
      'idx_canvas_snapshots_prune',
      'idx_canvas_snapshots_user_for_account_cascade',
    ]) {
      expect(names).toContain(expected)
    }
  })

  it('adds initial_state_blob_path column to canvases (W4 C-HIGH7)', async () => {
    const { data, error } = await supabase.rpc('pg_get_columns', { p_table: 'canvases' })
    expect(error).toBeNull()
    const names = (data as Array<{ name: string }>).map((c) => c.name)
    expect(names).toContain('initial_state_blob_path')
  })
})
