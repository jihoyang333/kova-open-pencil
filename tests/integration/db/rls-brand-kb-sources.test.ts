/**
 * Cluster 05 Plan Task 5 — RLS for brand_kb_sources (two-user test,
 * parallel to brand_fonts but without the license_attested check).
 * Skip-guarded (see tests/helpers/brand-kit-supabase.ts).
 */
import { describe, expect, test } from 'bun:test'
import {
  createAuthenticatedClient,
  seedBrandForUser,
  SHOULD_RUN,
} from '../../helpers/brand-kit-supabase'

const suite = SHOULD_RUN ? describe : describe.skip

suite('RLS — brand_kb_sources', () => {
  test('user can SELECT/INSERT own brand_kb_sources', async () => {
    const { client, brandId, userId } = await seedBrandForUser()
    const { error } = await client.from('brand_kb_sources').insert({
      brand_id: brandId,
      file_name: 'guide.pdf',
      file_path: `brand-kb-sources/${brandId}/x.pdf`,
      file_size_bytes: 2000,
      mime_type: 'application/pdf',
      uploaded_by: userId,
    })
    expect(error).toBeNull()
    const { data: rows } = await client
      .from('brand_kb_sources')
      .select('*')
      .eq('brand_id', brandId)
    expect(rows).toHaveLength(1)
  })

  test("user cannot SELECT another user's brand_kb_sources", async () => {
    const { brandId, userId } = await seedBrandForUser() // user A
    const { service } = await seedBrandForUser()
    await service.from('brand_kb_sources').insert({
      brand_id: brandId,
      file_name: 'guide.pdf',
      file_path: 'brand-kb-sources/x/y.pdf',
      file_size_bytes: 2000,
      mime_type: 'application/pdf',
      uploaded_by: userId,
    })
    const otherClient = await createAuthenticatedClient() // user B
    const { data } = await otherClient
      .from('brand_kb_sources')
      .select('*')
      .eq('brand_id', brandId)
    expect(data).toHaveLength(0)
  })

  test("user cannot INSERT into another user's brand", async () => {
    const { brandId } = await seedBrandForUser() // user A
    const otherClient = await createAuthenticatedClient() // user B
    const { error } = await otherClient.from('brand_kb_sources').insert({
      brand_id: brandId,
      file_name: 'pwn.pdf',
      file_path: 'brand-kb-sources/x/y.pdf',
      file_size_bytes: 2000,
      mime_type: 'application/pdf',
      uploaded_by: '00000000-0000-0000-0000-000000000099',
    })
    expect(error?.code).toBe('42501') // RLS violation
  })
})
