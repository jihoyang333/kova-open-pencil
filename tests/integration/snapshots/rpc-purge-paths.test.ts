import { describe, expect, it } from 'bun:test'
import { seedTestUser, seedBrand, seedCanvas, signInAs } from '../helpers/seed'

const SHOULD_RUN =
  process.env['KOVA_RUN_INTEGRATION'] === '1' &&
  !!process.env['SUPABASE_URL'] &&
  !!process.env['SUPABASE_SERVICE_ROLE_KEY']
const d = SHOULD_RUN ? describe : describe.skip

d('purge_canvas_snapshot_paths RPC', () => {
  it('returns blob + thumbnail paths for the canvas', async () => {
    const userId = await seedTestUser({})
    const brandId = await seedBrand({ user_id: userId })
    const canvasId = await seedCanvas({ brand_id: brandId })
    const supabase = await signInAs(userId)
    await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: 'A', p_description: null,
      p_scene_blob_path: 'blob/A', p_scene_size_bytes: 100,
      p_thumbnail_path: 'thumb/A', p_parent_snapshot_id: null,
    })
    await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: 'B', p_description: null,
      p_scene_blob_path: 'blob/B', p_scene_size_bytes: 100,
      p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    const { data: paths, error } = await supabase.rpc('purge_canvas_snapshot_paths', { p_canvas_id: canvasId })
    expect(error).toBeNull()
    const sorted = (paths as string[]).sort()
    expect(sorted).toEqual(['blob/A', 'blob/B', 'thumb/A']) // null thumbnail filtered
  })

  it("raises when called against another user's canvas", async () => {
    const userA = await seedTestUser({})
    const brandA = await seedBrand({ user_id: userA })
    const canvasA = await seedCanvas({ brand_id: brandA })
    const userB = await seedTestUser({})
    const supabaseB = await signInAs(userB)
    const { error } = await supabaseB.rpc('purge_canvas_snapshot_paths', { p_canvas_id: canvasA })
    expect(error?.message).toContain('Canvas not found')
  })
})
