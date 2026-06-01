import { describe, expect, it, beforeAll } from 'bun:test'
import { createClient } from '@supabase/supabase-js'
import { seedTestUser, seedBrand, seedCanvas, signInAs } from '../helpers/seed'

const SHOULD_RUN =
  process.env['KOVA_RUN_INTEGRATION'] === '1' &&
  !!process.env['SUPABASE_URL'] &&
  !!process.env['SUPABASE_SERVICE_ROLE_KEY']
const d = SHOULD_RUN ? describe : describe.skip

d('create_snapshot RPC', () => {
  let userId: string, brandId: string, canvasId: string

  beforeAll(async () => {
    userId = await seedTestUser({ plan: 'free' })
    brandId = await seedBrand({ user_id: userId })
    canvasId = await seedCanvas({ brand_id: brandId })
  })

  it('inserts row + returns id when called with valid args', async () => {
    const supabase = await signInAs(userId)
    const { data, error } = await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId,
      p_kind: 'manual',
      p_label: 'Test',
      p_description: null,
      p_scene_blob_path: 'path/to/blob',
      p_scene_size_bytes: 1024,
      p_thumbnail_path: 'path/to/thumb',
      p_parent_snapshot_id: null,
    })
    expect(error).toBeNull()
    expect(data).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('raises quota_exceeded when brand sum + new size > 100 MB', async () => {
    // Dedicated brand/canvas: fill the 100 MB per-brand quota with two 50 MB
    // rows (single-blob CHECK caps each at 50 MB), then attempt one more byte.
    const u = await seedTestUser({ plan: 'free' })
    const b = await seedBrand({ user_id: u })
    const c = await seedCanvas({ brand_id: b })
    const admin = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!, {
      auth: { persistSession: false },
    })
    const fiftyMB = 52428800
    for (const tag of ['big-a', 'big-b']) {
      const { error: insErr } = await admin.from('canvas_snapshots').insert({
        canvas_id: c, brand_id: b, user_id: u,
        kind: 'manual', scene_blob_path: tag, scene_size_bytes: fiftyMB,
        retention_class: 'permanent',
      })
      expect(insErr).toBeNull()
    }
    const supabase = await signInAs(u)
    const { error } = await supabase.rpc('create_snapshot', {
      p_canvas_id: c, p_kind: 'manual', p_label: null, p_description: null,
      p_scene_blob_path: 'overflow', p_scene_size_bytes: 1024,
      p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    expect(error?.message).toContain('quota_exceeded')
  })

  it('raises when called against a trashed canvas', async () => {
    const trashedCanvasId = await seedCanvas({ brand_id: brandId, trashed_at: new Date().toISOString() })
    const supabase = await signInAs(userId)
    const { error } = await supabase.rpc('create_snapshot', {
      p_canvas_id: trashedCanvasId, p_kind: 'autosave', p_label: null, p_description: null,
      p_scene_blob_path: 'x', p_scene_size_bytes: 1024, p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    expect(error?.message).toContain('Canvas not found')
  })

  it('assigns retention_class = "free" for autosave + free plan', async () => {
    const u = await seedTestUser({ plan: 'free' })
    const b = await seedBrand({ user_id: u })
    const c = await seedCanvas({ brand_id: b })
    const supabase = await signInAs(u)
    const { data: id } = await supabase.rpc('create_snapshot', {
      p_canvas_id: c, p_kind: 'autosave', p_label: null, p_description: null,
      p_scene_blob_path: 'auto1', p_scene_size_bytes: 1024, p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    const { data: row } = await supabase.from('canvas_snapshots').select('retention_class').eq('id', id).single()
    expect(row?.retention_class).toBe('free')
  })

  it('assigns retention_class = "permanent" for non-autosave kinds', async () => {
    const u = await seedTestUser({ plan: 'free' })
    const b = await seedBrand({ user_id: u })
    const c = await seedCanvas({ brand_id: b })
    const supabase = await signInAs(u)
    for (const kind of ['manual', 'pre_restore', 'disconnect', 'tab_close']) {
      const { data: id } = await supabase.rpc('create_snapshot', {
        p_canvas_id: c, p_kind: kind, p_label: kind, p_description: null,
        p_scene_blob_path: `${kind}-blob`, p_scene_size_bytes: 1024, p_thumbnail_path: null, p_parent_snapshot_id: null,
      })
      const { data: row } = await supabase.from('canvas_snapshots').select('retention_class').eq('id', id).single()
      expect(row?.retention_class).toBe('permanent')
    }
  })

  it('assigns retention_class = "paid" for autosave + paid plan', async () => {
    const paidUserId = await seedTestUser({ plan: 'solo' })
    const paidBrand = await seedBrand({ user_id: paidUserId })
    const paidCanvas = await seedCanvas({ brand_id: paidBrand })
    const supabase = await signInAs(paidUserId)
    const { data: id } = await supabase.rpc('create_snapshot', {
      p_canvas_id: paidCanvas, p_kind: 'autosave', p_label: null, p_description: null,
      p_scene_blob_path: 'paidauto', p_scene_size_bytes: 1024, p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    const { data: row } = await supabase.from('canvas_snapshots').select('retention_class').eq('id', id).single()
    expect(row?.retention_class).toBe('paid')
  })
})
