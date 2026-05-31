/**
 * Cluster 05 Plan Task 2 — tone snippet CRUD RPC integration tests.
 * Skip-guarded (see tests/helpers/brand-kit-supabase.ts).
 */
import { describe, expect, test } from 'bun:test'
import {
  createAuthenticatedClient,
  seedBrandForUser,
  SHOULD_RUN,
} from '../../helpers/brand-kit-supabase'

const suite = SHOULD_RUN ? describe : describe.skip

suite('tone snippet RPCs', () => {
  test('add_tone_snippet creates row and returns uuid', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { data, error } = await client.rpc('add_tone_snippet', {
      p_brand_id: brandId,
      p_label: 'Welcome',
      p_category: 'PROMO',
      p_content: 'Hello',
    })
    expect(error).toBeNull()
    expect(typeof data).toBe('string')

    const { data: brand } = await client
      .from('brands')
      .select('tone_snippets')
      .eq('id', brandId)
      .single()
    const snippets = brand?.['tone_snippets'] as { label: string }[]
    expect(snippets).toHaveLength(1)
    expect(snippets[0].label).toBe('Welcome')
  })

  test('update_tone_snippet updates in place preserving order', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { data: id } = await client.rpc('add_tone_snippet', {
      p_brand_id: brandId,
      p_label: 'A',
      p_category: 'X',
      p_content: 'old',
    })
    await client.rpc('update_tone_snippet', {
      p_brand_id: brandId,
      p_snippet_id: id,
      p_label: 'A',
      p_category: 'X',
      p_content: 'new',
    })
    const { data } = await client
      .from('brands')
      .select('tone_snippets')
      .eq('id', brandId)
      .single()
    const snippets = data?.['tone_snippets'] as { content: string }[]
    expect(snippets[0].content).toBe('new')
  })

  test('delete_tone_snippet removes the row', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { data: id } = await client.rpc('add_tone_snippet', {
      p_brand_id: brandId,
      p_label: 'A',
      p_category: 'X',
      p_content: 'c',
    })
    await client.rpc('delete_tone_snippet', { p_brand_id: brandId, p_snippet_id: id })
    const { data } = await client
      .from('brands')
      .select('tone_snippets')
      .eq('id', brandId)
      .single()
    expect(data?.['tone_snippets'] as unknown[]).toHaveLength(0)
  })

  test('reorder_tone_snippets rebuilds order', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { data: id1 } = await client.rpc('add_tone_snippet', {
      p_brand_id: brandId,
      p_label: 'A',
      p_category: 'X',
      p_content: 'a',
    })
    const { data: id2 } = await client.rpc('add_tone_snippet', {
      p_brand_id: brandId,
      p_label: 'B',
      p_category: 'X',
      p_content: 'b',
    })
    await client.rpc('reorder_tone_snippets', {
      p_brand_id: brandId,
      p_ordered_ids: [id2, id1],
    })
    const { data } = await client
      .from('brands')
      .select('tone_snippets')
      .eq('id', brandId)
      .single()
    const snippets = data?.['tone_snippets'] as { id: string; order: number }[]
    expect(snippets[0].id).toBe(id2 as string)
    expect(snippets[0].order).toBe(0)
    expect(snippets[1].order).toBe(1)
  })

  test('add_tone_snippet raises cap_exceeded at 51st', async () => {
    const { client, brandId } = await seedBrandForUser()
    for (let i = 0; i < 50; i++) {
      await client.rpc('add_tone_snippet', {
        p_brand_id: brandId,
        p_label: `L${i}`,
        p_category: 'X',
        p_content: 'c',
      })
    }
    const { error } = await client.rpc('add_tone_snippet', {
      p_brand_id: brandId,
      p_label: 'L50',
      p_category: 'X',
      p_content: 'c',
    })
    expect(error?.code).toBe('P0001')
    expect(error?.message).toContain('cap_exceeded')
  })

  test('add_tone_snippet by non-owner raises forbidden', async () => {
    const { brandId } = await seedBrandForUser() // user A's brand
    const otherClient = await createAuthenticatedClient() // user B
    const { error } = await otherClient.rpc('add_tone_snippet', {
      p_brand_id: brandId,
      p_label: 'X',
      p_category: 'X',
      p_content: 'c',
    })
    expect(error?.code).toBe('42501')
  })
})
