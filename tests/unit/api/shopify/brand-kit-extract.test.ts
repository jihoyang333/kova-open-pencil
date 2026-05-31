import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

// Cluster 05 PRD §5.1.5 — voice-draft EXTENSION of the existing M9 extract endpoint.
//
// The pre-existing visual-kit behavior is covered by tests/api/shopify/brand-kit-extract.test.ts.
// This suite focuses on the ADDED voice-draft branch:
//   - mocks @ai-sdk/anthropic + ai's generateText + fetch + the admin client
//   - asserts a voice_drafts INSERT happens and NO write to brands.*
//   - asserts the visual `kit` / `extracted` payload is still returned

const OWNER_USER_ID = '11111111-1111-1111-1111-111111111111'
const BRAND_ID = '33333333-3333-3333-3333-333333333333'
const SHOP = 'foo.myshopify.com'
const THEME_ID = 12345

mock.module('../../../../api/_shared/auth', () => ({
  authenticateRequest: async () => ({ userId: OWNER_USER_ID }),
}))

mock.module('../../../../api/_shared/shopify-client', () => ({ SHOPIFY_API_VERSION: '2024-10' }))

const aiState = {
  text: JSON.stringify({
    voice: { content: 'Bold and warm. We speak plainly to busy shoppers.' },
    tone_snippets: [
      { label: 'Greeting', category: 'GREETING', content: 'Hey there!' },
      { label: 'CTA', category: 'CTA', content: 'Shop the drop.' },
    ],
  }),
  calls: 0,
}

mock.module('@ai-sdk/anthropic', () => ({
  createAnthropic: () => (model: string) => ({ model }),
}))

mock.module('ai', () => ({
  generateText: async () => {
    aiState.calls += 1
    return { text: aiState.text }
  },
}))

interface DbWrite {
  table: string
  op: 'insert' | 'update' | 'upsert'
}

const dbWrites: DbWrite[] = []
const dbState = {
  products: [{ title: 'Tee', description_html: '<p>A soft tee.</p>' }] as Array<{ title: string; description_html: string | null }>,
  voiceInsertError: null as { message: string } | null,
}

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'brands') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: BRAND_ID }, error: null }) }) }),
          }),
          // If the handler ever tried to write brands.* the test would record it.
          insert: async () => { dbWrites.push({ table: 'brands', op: 'insert' }); return { error: null } },
          update: () => { dbWrites.push({ table: 'brands', op: 'update' }); return { eq: async () => ({ error: null }) } },
        }
      }
      if (table === 'shopify_connections') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { brand_id: BRAND_ID, shop_domain: SHOP }, error: null }) }) }),
        }
      }
      if (table === 'shopify_products') {
        return {
          select: () => ({
            eq: () => ({ order: () => ({ limit: async () => ({ data: dbState.products, error: null }) }) }),
          }),
        }
      }
      if (table === 'voice_drafts') {
        return {
          update: () => {
            dbWrites.push({ table: 'voice_drafts', op: 'update' })
            return { eq: () => ({ is: () => ({ is: async () => ({ error: null }) }) }) }
          },
          insert: async () => {
            dbWrites.push({ table: 'voice_drafts', op: 'insert' })
            return { error: dbState.voiceInsertError }
          },
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
    rpc: async (fn: string) => {
      if (fn === 'read_shopify_token') return { data: 'shpat_test', error: null }
      return { data: null, error: null }
    },
  }),
}))

const originalFetch = globalThis.fetch

function installFetchMock(): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (url.includes('/admin/api/2024-10/themes.json')) {
      return new Response(JSON.stringify({ themes: [{ id: THEME_ID, role: 'main' }] }), { status: 200 })
    }
    if (/\/admin\/api\/2024-10\/themes\/\d+\/assets\.json/.test(url)) {
      return new Response(JSON.stringify({
        asset: { value: JSON.stringify({ current: { colors_accent_1: '#121212', type_header_font: 'assistant_n4' } }) },
      }), { status: 200 })
    }
    if (url.includes('/pages/about')) {
      return new Response('<html><body><h1>Our Story</h1><p>We make things.</p></body></html>', { status: 200 })
    }
    return new Response('{}', { status: 200 })
  }) as typeof fetch
}

const handler = (await import('../../../../api/shopify/brand-kit-extract')).default

function req(body: unknown): Request {
  return new Request('http://local/api/shopify/brand-kit-extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
})

beforeEach(() => {
  dbWrites.length = 0
  aiState.calls = 0
  dbState.products = [{ title: 'Tee', description_html: '<p>A soft tee.</p>' }]
  dbState.voiceInsertError = null
  process.env.ANTHROPIC_API_KEY = 'sk-test'
  installFetchMock()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  delete process.env.ANTHROPIC_API_KEY
})

describe('POST /api/shopify/brand-kit-extract — voice-draft branch', () => {
  it('200 returns visual kit + extracted + draft_id + draft_payload', async () => {
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    // Existing M9 fields preserved.
    expect(body.brand_id).toBe(BRAND_ID)
    expect(body.kit.primaryColor).toBe('#121212')
    // Cluster 05 additions.
    expect(body.extracted).toEqual(body.kit)
    expect(body.draft_id).toBeTruthy()
    expect(body.draft_payload.voice.content).toContain('Bold and warm')
    expect(body.draft_payload.tone_snippets).toHaveLength(2)
  })

  it('inserts a voice_drafts row and NEVER writes brands.*', async () => {
    await handler(req({ brand_id: BRAND_ID }))
    expect(aiState.calls).toBe(1)
    expect(dbWrites.some((w) => w.table === 'voice_drafts' && w.op === 'insert')).toBe(true)
    expect(dbWrites.some((w) => w.table === 'brands')).toBe(false)
  })

  it('discards prior unresolved draft before inserting (single-open-draft)', async () => {
    await handler(req({ brand_id: BRAND_ID }))
    const updateIdx = dbWrites.findIndex((w) => w.table === 'voice_drafts' && w.op === 'update')
    const insertIdx = dbWrites.findIndex((w) => w.table === 'voice_drafts' && w.op === 'insert')
    expect(updateIdx).toBeGreaterThanOrEqual(0)
    expect(updateIdx).toBeLessThan(insertIdx)
  })

  it('returns draft_id null when ANTHROPIC_API_KEY is unset (graceful)', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.draft_id).toBeNull()
    expect(body.draft_payload).toBeNull()
    expect(body.kit.primaryColor).toBe('#121212')
    expect(aiState.calls).toBe(0)
  })

  it('returns draft_id null when no storefront content is available', async () => {
    dbState.products = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/admin/api/2024-10/themes.json')) {
        return new Response(JSON.stringify({ themes: [{ id: THEME_ID, role: 'main' }] }), { status: 200 })
      }
      if (/\/assets\.json/.test(url)) {
        return new Response(JSON.stringify({ asset: { value: JSON.stringify({ current: {} }) } }), { status: 200 })
      }
      if (url.includes('/pages/about')) return new Response('not found', { status: 404 })
      return new Response('{}', { status: 200 })
    }) as typeof fetch
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(200)
    expect((await res.json()).draft_id).toBeNull()
    expect(aiState.calls).toBe(0)
  })

  it('returns draft_id null when model output is not parseable JSON', async () => {
    aiState.text = 'sorry, I cannot do that'
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(200)
    expect((await res.json()).draft_id).toBeNull()
    // Reset for other tests.
    aiState.text = JSON.stringify({ voice: { content: 'x y' }, tone_snippets: [] })
  })
})
