import { describe, expect, it, beforeAll } from 'bun:test'
import { seedTestUser, seedBrand, seedCanvas, signInAs } from '../helpers/seed'

const SHOULD_RUN =
  process.env['KOVA_RUN_INTEGRATION'] === '1' &&
  !!process.env['SUPABASE_URL'] &&
  !!process.env['SUPABASE_SERVICE_ROLE_KEY']
const d = SHOULD_RUN ? describe : describe.skip

d('rename_snapshot RPC', () => {
  let userId: string, snapId: string

  beforeAll(async () => {
    userId = await seedTestUser({})
    const brandId = await seedBrand({ user_id: userId })
    const canvasId = await seedCanvas({ brand_id: brandId })
    const supabase = await signInAs(userId)
    const { data: id } = await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: 'Original',
      p_description: 'Original desc', p_scene_blob_path: 'b', p_scene_size_bytes: 1024,
      p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    snapId = id as string
  })

  it('Name path: sets label + description', async () => {
    const supabase = await signInAs(userId)
    const { error } = await supabase.rpc('rename_snapshot', {
      p_snapshot_id: snapId, p_label: 'Renamed', p_description: 'New desc',
    })
    expect(error).toBeNull()
    const { data } = await supabase.from('canvas_snapshots').select('label, description').eq('id', snapId).single()
    expect(data?.label).toBe('Renamed')
    expect(data?.description).toBe('New desc')
  })

  it('Delete-version-info path: NULL both clears them', async () => {
    const supabase = await signInAs(userId)
    const { error } = await supabase.rpc('rename_snapshot', {
      p_snapshot_id: snapId, p_label: null, p_description: null,
    })
    expect(error).toBeNull()
    const { data } = await supabase.from('canvas_snapshots').select('label, description').eq('id', snapId).single()
    expect(data?.label).toBeNull()
    expect(data?.description).toBeNull()
  })

  it("raises when called against another user's snapshot", async () => {
    const otherUserId = await seedTestUser({})
    const other = await signInAs(otherUserId)
    const { error } = await other.rpc('rename_snapshot', {
      p_snapshot_id: snapId, p_label: 'Hacker', p_description: null,
    })
    expect(error?.message).toContain('Snapshot not found')
  })
})
