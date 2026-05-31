/**
 * Cluster 05 Plan Task 3 — saved block CRUD RPC integration tests
 * (parallel to tone snippets, plus type validation + cap 100).
 * Skip-guarded (see tests/helpers/brand-kit-supabase.ts).
 */
import { describe, expect, test } from 'bun:test'
import { seedBrandForUser, SHOULD_RUN } from '../../helpers/brand-kit-supabase'

const suite = SHOULD_RUN ? describe : describe.skip

suite('saved block RPCs', () => {
  test('add_saved_block writes row with type', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { data, error } = await client.rpc('add_saved_block', {
      p_brand_id: brandId,
      p_label: 'CTA',
      p_category: 'CTA',
      p_content: 'Shop now',
      p_type: 'cta',
    })
    expect(error).toBeNull()
    expect(typeof data).toBe('string')
    const { data: brand } = await client
      .from('brands')
      .select('saved_blocks')
      .eq('id', brandId)
      .single()
    const blocks = brand?.['saved_blocks'] as { type: string }[]
    expect(blocks[0].type).toBe('cta')
  })

  test('add_saved_block rejects invalid type', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { error } = await client.rpc('add_saved_block', {
      p_brand_id: brandId,
      p_label: 'X',
      p_category: 'X',
      p_content: 'c',
      p_type: 'banner',
    })
    expect(error?.code).toBe('22023')
    expect(error?.message).toContain('invalid_type')
  })

  test('update_saved_block updates type field', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { data: id } = await client.rpc('add_saved_block', {
      p_brand_id: brandId,
      p_label: 'L',
      p_category: 'C',
      p_content: 'X',
      p_type: 'text',
    })
    await client.rpc('update_saved_block', {
      p_brand_id: brandId,
      p_block_id: id,
      p_label: 'L',
      p_category: 'C',
      p_content: 'X',
      p_type: 'footer',
    })
    const { data } = await client
      .from('brands')
      .select('saved_blocks')
      .eq('id', brandId)
      .single()
    const blocks = data?.['saved_blocks'] as { type: string }[]
    expect(blocks[0].type).toBe('footer')
  })

  test('add_saved_block hits cap_exceeded at 101st', async () => {
    const { client, brandId } = await seedBrandForUser()
    for (let i = 0; i < 100; i++) {
      await client.rpc('add_saved_block', {
        p_brand_id: brandId,
        p_label: `L${i}`,
        p_category: 'C',
        p_content: 'X',
        p_type: 'text',
      })
    }
    const { error } = await client.rpc('add_saved_block', {
      p_brand_id: brandId,
      p_label: 'L100',
      p_category: 'C',
      p_content: 'X',
      p_type: 'text',
    })
    expect(error?.code).toBe('P0001')
  })
})
