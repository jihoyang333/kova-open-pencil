/**
 * Cluster 05 Plan Task 4 — set_writing_rule RPC integration tests.
 * Skip-guarded (see tests/helpers/brand-kit-supabase.ts).
 */
import { describe, expect, test } from 'bun:test'
import { seedBrandForUser, SHOULD_RUN } from '../../helpers/brand-kit-supabase'

const suite = SHOULD_RUN ? describe : describe.skip

suite('set_writing_rule RPC', () => {
  test('toggles a known rule', async () => {
    const { client, brandId } = await seedBrandForUser()
    await client.rpc('set_writing_rule', {
      p_brand_id: brandId,
      p_rule_key: 'no_em_dash',
      p_enabled: true,
    })
    const { data } = await client
      .from('brands')
      .select('writing_rules')
      .eq('id', brandId)
      .single()
    const rules = data?.['writing_rules'] as { no_em_dash: boolean }
    expect(rules.no_em_dash).toBe(true)
  })

  test('rejects unknown rule key', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { error } = await client.rpc('set_writing_rule', {
      p_brand_id: brandId,
      p_rule_key: 'fake_rule',
      p_enabled: true,
    })
    expect(error?.code).toBe('22023')
    expect(error?.message).toContain('invalid_rule_key')
  })
})
