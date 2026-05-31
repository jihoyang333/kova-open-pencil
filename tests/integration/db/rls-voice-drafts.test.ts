/**
 * Cluster 05 Plan Task 5 — RLS for voice_drafts: service_role insert,
 * authenticated select own, authenticated cannot insert.
 * Skip-guarded (see tests/helpers/brand-kit-supabase.ts).
 */
import { describe, expect, test } from 'bun:test'
import { seedBrandForUser, SHOULD_RUN } from '../../helpers/brand-kit-supabase'

const suite = SHOULD_RUN ? describe : describe.skip

suite('RLS — voice_drafts', () => {
  test('service_role can INSERT; authenticated can SELECT own', async () => {
    const { client, service, brandId, userId } = await seedBrandForUser()
    await service.from('voice_drafts').insert({
      brand_id: brandId,
      user_id: userId,
      source: 'shopify_extract',
      draft_payload: { voice: { content: 'x' }, tone_snippets: [] },
    })
    const { data } = await client.from('voice_drafts').select('*').eq('brand_id', brandId)
    expect(data).toHaveLength(1)
  })

  test('authenticated cannot INSERT voice_drafts', async () => {
    const { client, brandId, userId } = await seedBrandForUser()
    const { error } = await client.from('voice_drafts').insert({
      brand_id: brandId,
      user_id: userId,
      source: 'shopify_extract',
      draft_payload: { voice: { content: 'fake' }, tone_snippets: [] },
    })
    expect(error?.code).toBe('42501')
  })
})
