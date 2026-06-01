/**
 * Cluster 05 Plan Task 1 Step 1 — migration schema integration test.
 *
 * Skip-guarded (see tests/helpers/brand-kit-supabase.ts). Runs only when
 * KOVA_RUN_INTEGRATION=1 and SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 * with the Cluster 05 migration applied to a local Supabase.
 */
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  createServerClient,
  seedBrandForUser,
  SHOULD_RUN,
  type TestSupabaseClient,
} from '../../helpers/brand-kit-supabase'

const suite = SHOULD_RUN ? describe : describe.skip

suite('migration 20260615_05_brand_kit', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createServerClient()
  })

  test('brands JSONB columns are NOT NULL and default to empty values', async () => {
    // Behavioral check (PostgREST can't introspect information_schema): a freshly
    // seeded brand inserts only user_id + name, so the four JSONB columns must
    // come back populated by their NOT NULL DEFAULTs ([] for lists, {} for maps).
    const { brandId } = await seedBrandForUser()
    const { data, error } = await supabase
      .from('brands')
      .select('tone_snippets, saved_blocks, writing_rules, identity')
      .eq('id', brandId)
      .single()
    expect(error).toBeNull()
    expect(data?.['tone_snippets']).toEqual([])
    expect(data?.['saved_blocks']).toEqual([])
    expect(data?.['writing_rules']).toEqual({})
    expect(data?.['identity']).toEqual({})
  })

  test('brand_fonts table exists with CHECK on license_attested', async () => {
    const { error: insertNoAttest } = await supabase.from('brand_fonts').insert({
      brand_id: '00000000-0000-0000-0000-000000000001',
      family_name: 'Test',
      file_path: 'brand-fonts/test/test.woff2',
      file_size_bytes: 1024,
      mime_type: 'font/woff2',
      license_attested: false,
      uploaded_by: '00000000-0000-0000-0000-000000000002',
    })
    expect(insertNoAttest?.code).toBe('23514') // CHECK violation
  })

  test('brand_fonts CHECK on file_size_bytes max 5 MB (founder ratification 2026-05-17)', async () => {
    const { error } = await supabase.from('brand_fonts').insert({
      brand_id: '00000000-0000-0000-0000-000000000001',
      family_name: 'BigFont',
      file_path: 'brand-fonts/test/big.woff2',
      file_size_bytes: 5242881, // 5 MB + 1 byte
      mime_type: 'font/woff2',
      license_attested: true,
      uploaded_by: '00000000-0000-0000-0000-000000000002',
    })
    expect(error?.code).toBe('23514')
  })

  test('voice_drafts partial unique index allows one open draft per brand', async () => {
    const { service, brandId, userId } = await seedBrandForUser()
    const draft1 = await service.from('voice_drafts').insert({
      brand_id: brandId,
      user_id: userId,
      source: 'shopify_extract',
      draft_payload: { voice: { content: 'V1' }, tone_snippets: [] },
    })
    expect(draft1.error).toBeNull()
    // A second OPEN draft (confirmed_at/discarded_at both NULL) for the same
    // brand must violate the partial unique index.
    const draft2 = await service.from('voice_drafts').insert({
      brand_id: brandId,
      user_id: userId,
      source: 'shopify_extract',
      draft_payload: { voice: { content: 'V2' }, tone_snippets: [] },
    })
    expect(draft2.error?.code).toBe('23505')
  })
})
