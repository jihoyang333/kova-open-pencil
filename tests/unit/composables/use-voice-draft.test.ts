import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'

const maybeSingleResult = { data: null as unknown, error: null as unknown }

// Chainable supabase.from(...).select().eq().is().is().order().limit().maybeSingle()
function makeChain(): Record<string, unknown> {
  const chain: Record<string, unknown> = {}
  const ret = () => chain
  chain['select'] = ret
  chain['eq'] = ret
  chain['is'] = ret
  chain['order'] = ret
  chain['limit'] = ret
  chain['maybeSingle'] = () => Promise.resolve(maybeSingleResult)
  return chain
}

const fetchMock = mock(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, voice_word_count: 5, tone_snippet_count: 2 }),
  } as unknown as Response),
)

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => makeChain(),
    auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'tok' } } }) },
  },
}))

const { useVoiceDraft } = await import('@/composables/use-voice-draft')
const realFetch = globalThis.fetch
globalThis.fetch = fetchMock as unknown as typeof fetch

const sampleDraft = {
  id: 'd1',
  brand_id: 'b1',
  user_id: 'u1',
  source: 'shopify_extract' as const,
  draft_payload: { voice: { content: 'Direct, kinetic.' }, tone_snippets: [] },
  created_at: '2026-01-01',
  confirmed_at: null,
  discarded_at: null,
}

describe('useVoiceDraft', () => {
  afterAll(() => {
    globalThis.fetch = realFetch
  })

  beforeEach(() => {
    fetchMock.mockClear()
    maybeSingleResult.data = null
    useVoiceDraft().clear()
  })

  test('loadDraftAfterShopifyConnect sets active draft when one exists', async () => {
    maybeSingleResult.data = sampleDraft
    const vd = useVoiceDraft()
    const loaded = await vd.loadDraftAfterShopifyConnect('b1')
    expect(loaded?.id).toBe('d1')
    expect(vd.hasDraft.value).toBe(true)
  })

  test('loadDraftAfterShopifyConnect leaves null when none', async () => {
    const vd = useVoiceDraft()
    const loaded = await vd.loadDraftAfterShopifyConnect('b1')
    expect(loaded).toBeNull()
    expect(vd.hasDraft.value).toBe(false)
  })

  test('confirmDraft posts to confirm endpoint with idempotency key and clears draft', async () => {
    maybeSingleResult.data = sampleDraft
    const vd = useVoiceDraft()
    await vd.loadDraftAfterShopifyConnect('b1')
    const result = await vd.confirmDraft()
    expect(result).toEqual({ voice_word_count: 5, tone_snippet_count: 2 })
    expect(vd.hasDraft.value).toBe(false)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/brands/b1/voice-draft/confirm')
    expect((init.headers as Record<string, string>)['X-Idempotency-Key']).toBeTruthy()
  })

  test('confirmDraft sends edited_payload when provided', async () => {
    maybeSingleResult.data = sampleDraft
    const vd = useVoiceDraft()
    await vd.loadDraftAfterShopifyConnect('b1')
    await vd.confirmDraft({ voice: { content: 'edited' }, tone_snippets: [] })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string).edited_payload.voice.content).toBe('edited')
  })

  test('discardDraft posts to discard endpoint and clears draft', async () => {
    maybeSingleResult.data = sampleDraft
    const vd = useVoiceDraft()
    await vd.loadDraftAfterShopifyConnect('b1')
    await vd.discardDraft()
    expect(vd.hasDraft.value).toBe(false)
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('/api/brands/b1/voice-draft/discard')
  })

  test('confirmDraft throws when no active draft', async () => {
    const vd = useVoiceDraft()
    await expect(vd.confirmDraft()).rejects.toThrow('no_active_draft')
  })
})
