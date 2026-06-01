import { describe, expect, it } from 'bun:test'
import { seedTestUser, seedBrand, seedCanvas, signInAs } from '../helpers/seed'

const SHOULD_RUN =
  process.env['KOVA_RUN_INTEGRATION'] === '1' &&
  !!process.env['SUPABASE_URL'] &&
  !!process.env['SUPABASE_SERVICE_ROLE_KEY']
const d = SHOULD_RUN ? describe : describe.skip

d('canvas_snapshots RLS · SELECT', () => {
  it('user A sees only their own brand snapshots', async () => {
    const userA = await seedTestUser({})
    const brandA = await seedBrand({ user_id: userA })
    const canvasA = await seedCanvas({ brand_id: brandA })
    const userB = await seedTestUser({})
    const brandB = await seedBrand({ user_id: userB })
    const canvasB = await seedCanvas({ brand_id: brandB })

    const sA = await signInAs(userA)
    await sA.rpc('create_snapshot', { p_canvas_id: canvasA, p_kind: 'manual', p_label: 'A',
      p_description: null, p_scene_blob_path: 'a', p_scene_size_bytes: 1, p_thumbnail_path: null,
      p_parent_snapshot_id: null })
    const sB = await signInAs(userB)
    await sB.rpc('create_snapshot', { p_canvas_id: canvasB, p_kind: 'manual', p_label: 'B',
      p_description: null, p_scene_blob_path: 'b', p_scene_size_bytes: 1, p_thumbnail_path: null,
      p_parent_snapshot_id: null })

    const { data: visibleToA } = await sA.from('canvas_snapshots').select('label')
    expect(visibleToA?.map((r) => r.label)).toEqual(['A'])
    const { data: visibleToB } = await sB.from('canvas_snapshots').select('label')
    expect(visibleToB?.map((r) => r.label)).toEqual(['B'])
  })
})
