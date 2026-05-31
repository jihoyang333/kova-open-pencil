/**
 * Cluster 05 Plan Task 4 — update_brand_identity RPC integration tests.
 * Skip-guarded (see tests/helpers/brand-kit-supabase.ts).
 */
import { describe, expect, test } from 'bun:test'
import { seedBrandForUser, SHOULD_RUN } from '../../helpers/brand-kit-supabase'

const suite = SHOULD_RUN ? describe : describe.skip

suite('update_brand_identity RPC', () => {
  test('writes about card with word_count', async () => {
    const { client, brandId } = await seedBrandForUser()
    await client.rpc('update_brand_identity', {
      p_brand_id: brandId,
      p_card_key: 'about',
      p_content: 'Five words here for now',
    })
    const { data } = await client
      .from('brands')
      .select('identity')
      .eq('id', brandId)
      .single()
    const identity = data?.['identity'] as {
      about: { content: string; word_count: number; last_edited_at: string }
    }
    expect(identity.about.content).toBe('Five words here for now')
    expect(identity.about.word_count).toBe(5)
    expect(identity.about.last_edited_at).toBeTruthy()
  })

  test('rejects invalid card key', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { error } = await client.rpc('update_brand_identity', {
      p_brand_id: brandId,
      p_card_key: 'mission',
      p_content: 'x',
    })
    expect(error?.code).toBe('22023')
  })
})
