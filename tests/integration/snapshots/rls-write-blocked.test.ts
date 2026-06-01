import { describe, expect, it } from 'bun:test'
import { seedTestUser, seedBrand, seedCanvas, signInAs } from '../helpers/seed'

const SHOULD_RUN =
  process.env['KOVA_RUN_INTEGRATION'] === '1' &&
  !!process.env['SUPABASE_URL'] &&
  !!process.env['SUPABASE_SERVICE_ROLE_KEY']
const d = SHOULD_RUN ? describe : describe.skip

d('canvas_snapshots RLS · direct writes blocked', () => {
  it('authenticated INSERT directly fails (RPC-only writes)', async () => {
    const userId = await seedTestUser({})
    const brandId = await seedBrand({ user_id: userId })
    const canvasId = await seedCanvas({ brand_id: brandId })
    const supabase = await signInAs(userId)
    const { error } = await supabase.from('canvas_snapshots').insert({
      canvas_id: canvasId, brand_id: brandId, user_id: userId,
      kind: 'manual', scene_blob_path: 'x', scene_size_bytes: 1, retention_class: 'permanent',
    })
    expect(error).not.toBeNull() // WITH CHECK (false) rejects
  })

  it('authenticated UPDATE directly updates 0 rows', async () => {
    const userId = await seedTestUser({})
    const brandId = await seedBrand({ user_id: userId })
    const canvasId = await seedCanvas({ brand_id: brandId })
    const supabase = await signInAs(userId)
    const { data: snapId } = await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: 'A',
      p_description: null, p_scene_blob_path: 'a', p_scene_size_bytes: 1,
      p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    const { data } = await supabase.from('canvas_snapshots').update({ label: 'Hacked' }).eq('id', snapId).select()
    expect(data ?? []).toHaveLength(0)
  })

  it('authenticated DELETE directly deletes 0 rows', async () => {
    const userId = await seedTestUser({})
    const brandId = await seedBrand({ user_id: userId })
    const canvasId = await seedCanvas({ brand_id: brandId })
    const supabase = await signInAs(userId)
    const { data: snapId } = await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: 'A',
      p_description: null, p_scene_blob_path: 'a', p_scene_size_bytes: 1,
      p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    const { data } = await supabase.from('canvas_snapshots').delete().eq('id', snapId).select()
    expect(data ?? []).toHaveLength(0)
  })
})
