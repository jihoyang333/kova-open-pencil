/**
 * Cluster 05 Plan Task 6 — Storage path-prefix RLS (brand-fonts bucket).
 * Skip-guarded (see tests/helpers/brand-kit-supabase.ts).
 */
import { describe, expect, test } from 'bun:test'
import {
  createAuthenticatedClient,
  seedBrandForUser,
  SHOULD_RUN,
} from '../../helpers/brand-kit-supabase'

const suite = SHOULD_RUN ? describe : describe.skip

suite('Storage path-prefix RLS (brand-fonts bucket)', () => {
  test('user can upload to own brand path', async () => {
    const { client, brandId } = await seedBrandForUser()
    const blob = new Blob([new Uint8Array(1024)], { type: 'font/woff2' })
    const { error } = await client.storage
      .from('brand-fonts')
      .upload(`${brandId}/font1.woff2`, blob, { upsert: false })
    expect(error).toBeNull()
  })

  test("user CANNOT upload to another user's brand path", async () => {
    const { brandId } = await seedBrandForUser() // user A's brand
    const otherClient = await createAuthenticatedClient() // user B
    const blob = new Blob([new Uint8Array(1024)], { type: 'font/woff2' })
    const { error } = await otherClient.storage
      .from('brand-fonts')
      .upload(`${brandId}/font1.woff2`, blob)
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/permission|policy|not authorized/i)
  })
})
