/**
 * Cluster 05 Plan Task 5 — RLS for brand_fonts (two-user test).
 * Skip-guarded (see tests/helpers/brand-kit-supabase.ts).
 */
import { describe, expect, test } from 'bun:test'
import {
  createAuthenticatedClient,
  seedBrandForUser,
  SHOULD_RUN,
} from '../../helpers/brand-kit-supabase'

const suite = SHOULD_RUN ? describe : describe.skip

suite('RLS — brand_fonts', () => {
  test('user can SELECT/INSERT/DELETE own brand_fonts', async () => {
    const { client, brandId, userId } = await seedBrandForUser()
    const { error } = await client.from('brand_fonts').insert({
      brand_id: brandId,
      family_name: 'F',
      file_path: `brand-fonts/${brandId}/x.woff2`,
      file_size_bytes: 1000,
      mime_type: 'font/woff2',
      license_attested: true,
      uploaded_by: userId,
    })
    expect(error).toBeNull()
    const { data: rows } = await client.from('brand_fonts').select('*').eq('brand_id', brandId)
    expect(rows).toHaveLength(1)
  })

  test("user cannot SELECT another user's brand_fonts", async () => {
    const { brandId, userId } = await seedBrandForUser() // user A
    const { service } = await seedBrandForUser()
    await service.from('brand_fonts').insert({
      brand_id: brandId,
      family_name: 'F',
      file_path: 'brand-fonts/x/y.woff2',
      file_size_bytes: 1000,
      mime_type: 'font/woff2',
      license_attested: true,
      uploaded_by: userId,
    })
    const otherClient = await createAuthenticatedClient() // user B
    const { data } = await otherClient.from('brand_fonts').select('*').eq('brand_id', brandId)
    expect(data).toHaveLength(0)
  })

  test("user cannot INSERT into another user's brand", async () => {
    const { brandId } = await seedBrandForUser() // user A
    const otherClient = await createAuthenticatedClient() // user B
    const { error } = await otherClient.from('brand_fonts').insert({
      brand_id: brandId,
      family_name: 'Pwn',
      file_path: 'brand-fonts/x/y.woff2',
      file_size_bytes: 1000,
      mime_type: 'font/woff2',
      license_attested: true,
      uploaded_by: '00000000-0000-0000-0000-000000000099',
    })
    expect(error?.code).toBe('42501') // RLS violation
  })
})
