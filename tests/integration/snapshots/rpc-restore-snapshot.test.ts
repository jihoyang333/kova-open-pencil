import { describe, expect, it, beforeAll } from 'bun:test'
import { seedTestUser, seedBrand, seedCanvas, signInAs } from '../helpers/seed'

const SHOULD_RUN =
  process.env['KOVA_RUN_INTEGRATION'] === '1' &&
  !!process.env['SUPABASE_URL'] &&
  !!process.env['SUPABASE_SERVICE_ROLE_KEY']
const d = SHOULD_RUN ? describe : describe.skip

d('restore_snapshot RPC', () => {
  let userId: string, canvasId: string, targetSnapId: string

  beforeAll(async () => {
    userId = await seedTestUser({ plan: 'solo' })
    const brandId = await seedBrand({ user_id: userId })
    canvasId = await seedCanvas({ brand_id: brandId })
    const supabase = await signInAs(userId)
    const { data: id } = await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: 'Target',
      p_description: null, p_scene_blob_path: 'target/blob',
      p_scene_size_bytes: 1024, p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    targetSnapId = id as string
  })

  it('returns target blob path AND inserts a pre-restore row first', async () => {
    const supabase = await signInAs(userId)
    const { data: targetPath, error } = await supabase.rpc('restore_snapshot', {
      p_target_snapshot_id: targetSnapId,
      p_current_scene_blob_path: 'current/blob',
      p_current_scene_size_bytes: 2048,
      p_current_thumbnail_path: 'current/thumb',
    })
    expect(error).toBeNull()
    expect(targetPath).toBe('target/blob')

    const { data: pre } = await supabase.from('canvas_snapshots')
      .select('kind, label, retention_class, parent_snapshot_id')
      .eq('canvas_id', canvasId)
      .eq('kind', 'pre_restore')
      .single()
    expect(pre?.kind).toBe('pre_restore')
    expect(pre?.label).toBe('Auto-saved before restore')
    expect(pre?.retention_class).toBe('permanent')
    expect(pre?.parent_snapshot_id).toBe(targetSnapId)
  })

  it("raises when called against another user's snapshot", async () => {
    const otherUserId = await seedTestUser({})
    const otherSupabase = await signInAs(otherUserId)
    const { error } = await otherSupabase.rpc('restore_snapshot', {
      p_target_snapshot_id: targetSnapId,
      p_current_scene_blob_path: 'x', p_current_scene_size_bytes: 1, p_current_thumbnail_path: null,
    })
    expect(error?.message).toContain('Snapshot not found')
  })
})
