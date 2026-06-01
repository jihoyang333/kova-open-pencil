import { describe, expect, it } from 'bun:test'
import { seedTestUser, signInAs } from '../helpers/seed'

const SHOULD_RUN =
  process.env['KOVA_RUN_INTEGRATION'] === '1' &&
  !!process.env['SUPABASE_URL'] &&
  !!process.env['SUPABASE_SERVICE_ROLE_KEY']
const d = SHOULD_RUN ? describe : describe.skip

d('canvas-snapshots Storage path-prefix policy', () => {
  it("user A cannot upload under user B's prefix", async () => {
    const userA = await seedTestUser({})
    const userB = await seedTestUser({})
    const sA = await signInAs(userA)
    const { error } = await sA.storage
      .from('canvas-snapshots')
      .upload(`${userB}/test.bin`, new Uint8Array([1, 2, 3]), { contentType: 'application/octet-stream' })
    expect(error?.message).toMatch(/policy|forbidden|unauthorized|new row violates|denied/i)
  })

  it('user A can upload under their own prefix', async () => {
    const userA = await seedTestUser({})
    const sA = await signInAs(userA)
    const { error } = await sA.storage
      .from('canvas-snapshots')
      .upload(`${userA}/test.bin`, new Uint8Array([1, 2, 3]), { contentType: 'application/octet-stream' })
    expect(error).toBeNull()
  })
})
