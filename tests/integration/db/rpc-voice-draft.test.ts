/**
 * Cluster 05 Plan Task 4 — voice_draft confirm / discard RPC integration tests.
 * Skip-guarded (see tests/helpers/brand-kit-supabase.ts).
 */
import { describe, expect, test } from 'bun:test'
import { seedBrandForUser, SHOULD_RUN } from '../../helpers/brand-kit-supabase'

const suite = SHOULD_RUN ? describe : describe.skip

suite('voice_draft RPCs', () => {
  test('confirm_voice_draft writes identity.voice + appends tone_snippets atomically', async () => {
    const { service, client, brandId, userId } = await seedBrandForUser()
    // Insert draft via service-role (RLS permits)
    const draftId = crypto.randomUUID()
    await service.from('voice_drafts').insert({
      id: draftId,
      brand_id: brandId,
      user_id: userId,
      source: 'shopify_extract',
      draft_payload: {
        voice: { content: 'Direct, kinetic, second-person.' },
        tone_snippets: [
          { label: 'Welcome', category: 'WELCOME', content: 'Hi athletes.' },
          { label: 'Restock', category: 'RESTOCK', content: 'Back in your size.' },
        ],
      },
    })
    await client.rpc('confirm_voice_draft', { p_draft_id: draftId })
    const { data } = await client
      .from('brands')
      .select('identity, tone_snippets')
      .eq('id', brandId)
      .single()
    const identity = data?.['identity'] as { voice: { content: string; word_count: number } }
    expect(identity.voice.content).toContain('Direct')
    expect(identity.voice.word_count).toBeGreaterThan(0)
    expect(data?.['tone_snippets'] as unknown[]).toHaveLength(2)

    const { data: draft } = await client
      .from('voice_drafts')
      .select('confirmed_at')
      .eq('id', draftId)
      .single()
    expect(draft?.['confirmed_at']).toBeTruthy()
  })

  test('confirm_voice_draft is idempotent — second call returns draft_not_found_or_already_resolved', async () => {
    const { service, client, brandId, userId } = await seedBrandForUser()
    const draftId = crypto.randomUUID()
    await service.from('voice_drafts').insert({
      id: draftId,
      brand_id: brandId,
      user_id: userId,
      source: 'shopify_extract',
      draft_payload: { voice: { content: 'x' }, tone_snippets: [] },
    })
    await client.rpc('confirm_voice_draft', { p_draft_id: draftId })
    const { error } = await client.rpc('confirm_voice_draft', { p_draft_id: draftId })
    expect(error?.code).toBe('P0002')
  })

  test('discard_voice_draft marks discarded without writing brands.*', async () => {
    const { service, client, brandId, userId } = await seedBrandForUser()
    const draftId = crypto.randomUUID()
    await service.from('voice_drafts').insert({
      id: draftId,
      brand_id: brandId,
      user_id: userId,
      source: 'shopify_extract',
      draft_payload: {
        voice: { content: 'should not write' },
        tone_snippets: [{ label: 'X', category: 'X', content: 'X' }],
      },
    })
    await client.rpc('discard_voice_draft', { p_draft_id: draftId })
    const { data: brand } = await client
      .from('brands')
      .select('identity, tone_snippets')
      .eq('id', brandId)
      .single()
    const identity = brand?.['identity'] as { voice?: unknown }
    expect(identity?.voice).toBeUndefined()
    expect(brand?.['tone_snippets'] as unknown[]).toHaveLength(0)

    const { data: draft } = await client
      .from('voice_drafts')
      .select('discarded_at')
      .eq('id', draftId)
      .single()
    expect(draft?.['discarded_at']).toBeTruthy()
  })
})
