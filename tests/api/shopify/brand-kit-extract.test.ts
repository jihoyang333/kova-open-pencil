import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const OWNER_USER_ID = '11111111-1111-1111-1111-111111111111'
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222'
const BRAND_ID = '33333333-3333-3333-3333-333333333333'
const SHOP = 'foo.myshopify.com'
const ACCESS_TOKEN = 'shpat_test_token'
const THEME_ID = 12345

const authState = {
  mode: 'owner' as 'owner' | 'other' | 'unauthorized',
}

mock.module('../../../api/_shared/auth', () => ({
  authenticateRequest: async () => {
    if (authState.mode === 'owner') return { userId: OWNER_USER_ID }
    if (authState.mode === 'other') return { userId: OTHER_USER_ID }
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  },
}))

mock.module('../../../api/_shared/shopify-client', () => ({
  SHOPIFY_API_VERSION: '2024-10',
}))

interface ConnectionRow {
  brand_id: string
  shop_domain: string
}

interface RpcCall {
  fn: string
  args: Record<string, unknown>
}

const dbState = {
  brandOwners: new Map<string, string>(),
  connections: new Map<string, ConnectionRow>(),
  tokensByBrand: new Map<string, string | null>(),
  rpcCalls: [] as RpcCall[],
}

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'brands') {
        return {
          select: () => ({
            eq: (_k1: string, brandId: string) => ({
              eq: (_k2: string, userId: string) => ({
                maybeSingle: async () => {
                  const owner = dbState.brandOwners.get(brandId)
                  if (owner && owner === userId) {
                    return { data: { id: brandId }, error: null }
                  }
                  return { data: null, error: null }
                },
              }),
            }),
          }),
        }
      }
      if (table === 'shopify_connections') {
        return {
          select: () => ({
            eq: (_k: string, brandId: string) => ({
              maybeSingle: async () => {
                const row = dbState.connections.get(brandId)
                return { data: row ?? null, error: null }
              },
            }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      dbState.rpcCalls.push({ fn, args })
      if (fn === 'read_shopify_token') {
        const brandId = args.p_brand_id as string
        const tok = dbState.tokensByBrand.get(brandId) ?? null
        return { data: tok, error: null }
      }
      return { data: null, error: null }
    },
  }),
}))

interface FetchCall {
  url: string
  method: string
  headers: Record<string, string>
  body: string | null
}

const fetchState = {
  calls: [] as FetchCall[],
  themesStatus: 200,
  themesBody: JSON.stringify({ themes: [{ id: THEME_ID, role: 'main' }] }),
  assetStatus: 200,
  assetBody: JSON.stringify({
    asset: {
      value: JSON.stringify({
        current: {
          colors_accent_1: '#121212',
          colors_accent_2: '#FBF7EC',
          type_header_font: 'assistant_n4',
          type_body_font: 'assistant_n4',
          logo_url: 'https://cdn.shopify.com/s/files/1/logo.png',
        },
      }),
    },
  }),
}

const originalFetch = globalThis.fetch

function recordCall(input: RequestInfo | URL, init?: RequestInit): FetchCall {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const method = init?.method ?? (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET')
  const rawHeaders = init?.headers ?? (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined)
  const headers: Record<string, string> = {}
  if (rawHeaders) {
    if (rawHeaders instanceof Headers) {
      rawHeaders.forEach((value, key) => {
        headers[key.toLowerCase()] = value
      })
    } else if (Array.isArray(rawHeaders)) {
      for (const [key, value] of rawHeaders) headers[key.toLowerCase()] = value
    } else {
      for (const [key, value] of Object.entries(rawHeaders)) headers[key.toLowerCase()] = String(value)
    }
  }
  const body =
    typeof init?.body === 'string' ? init.body : init?.body ? JSON.stringify(init.body) : null
  return { url, method, headers, body }
}

function installFetchMock(): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = recordCall(input, init)
    fetchState.calls.push(call)

    if (call.url.includes('/admin/api/2024-10/themes.json')) {
      return new Response(fetchState.themesBody, {
        status: fetchState.themesStatus,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (/\/admin\/api\/2024-10\/themes\/\d+\/assets\.json/.test(call.url)) {
      return new Response(fetchState.assetBody, {
        status: fetchState.assetStatus,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('{}', { status: 200 })
  }) as typeof fetch
}

const { default: handler } = await import('../../../api/shopify/brand-kit-extract')

function req(body: unknown, init: { method?: string; headers?: Record<string, string> } = {}): Request {
  return new Request('http://local/api/shopify/brand-kit-extract', {
    method: init.method ?? 'POST',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
})

beforeEach(() => {
  authState.mode = 'owner'
  dbState.brandOwners = new Map([[BRAND_ID, OWNER_USER_ID]])
  dbState.connections = new Map([[BRAND_ID, { brand_id: BRAND_ID, shop_domain: SHOP }]])
  dbState.tokensByBrand = new Map([[BRAND_ID, ACCESS_TOKEN]])
  dbState.rpcCalls = []
  fetchState.calls = []
  fetchState.themesStatus = 200
  fetchState.themesBody = JSON.stringify({ themes: [{ id: THEME_ID, role: 'main' }] })
  fetchState.assetStatus = 200
  fetchState.assetBody = JSON.stringify({
    asset: {
      value: JSON.stringify({
        current: {
          colors_accent_1: '#121212',
          colors_accent_2: '#FBF7EC',
          type_header_font: 'assistant_n4',
          type_body_font: 'assistant_n4',
          logo_url: 'https://cdn.shopify.com/s/files/1/logo.png',
        },
      }),
    },
  })
  installFetchMock()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('POST /api/shopify/brand-kit-extract', () => {
  it('rejects non-POST methods', async () => {
    const res = await handler(req({ brand_id: BRAND_ID }, { method: 'GET' }))
    expect(res.status).toBe(405)
  })

  it('returns 400 on malformed JSON body', async () => {
    const res = await handler(req('not-json'))
    expect(res.status).toBe(400)
  })

  it('returns 400 on missing brand_id', async () => {
    const res = await handler(req({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 on non-uuid brand_id', async () => {
    const res = await handler(req({ brand_id: '<evil>' }))
    expect(res.status).toBe(400)
  })

  it('returns 401 when unauthenticated', async () => {
    authState.mode = 'unauthorized'
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when user does not own brand', async () => {
    authState.mode = 'other'
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(403)
  })

  it('returns 404 when no shopify connection exists', async () => {
    dbState.connections = new Map()
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(404)
  })

  it('returns 500 when vault token missing', async () => {
    dbState.tokensByBrand = new Map([[BRAND_ID, null]])
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(500)
  })

  it('returns 502 when themes.json fetch fails', async () => {
    fetchState.themesStatus = 500
    fetchState.themesBody = 'error'
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(502)
  })

  it('returns 404 when no active theme is found', async () => {
    fetchState.themesBody = JSON.stringify({ themes: [] })
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(404)
  })

  it('returns 502 when settings_data.json fetch fails', async () => {
    fetchState.assetStatus = 404
    fetchState.assetBody = 'not found'
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(502)
  })

  it('returns 502 when settings_data.json is not valid JSON', async () => {
    fetchState.assetBody = JSON.stringify({ asset: { value: 'not-json-at-all{' } })
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(502)
  })

  it('happy path: returns 200 with extracted kit', async () => {
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { brand_id: string; kit: Record<string, string> }
    expect(body.brand_id).toBe(BRAND_ID)
    expect(body.kit.primaryColor).toBe('#121212')
    expect(body.kit.secondaryColor).toBe('#FBF7EC')
    expect(body.kit.headingFont).toBe('assistant')
    expect(body.kit.bodyFont).toBe('assistant')
    expect(body.kit.logoUrl).toBe('https://cdn.shopify.com/s/files/1/logo.png')

    const themesCall = fetchState.calls.find((c) => c.url.includes('/themes.json'))
    expect(themesCall).toBeDefined()
    expect(themesCall?.url).toContain('role=main')
    expect(themesCall?.headers['x-shopify-access-token']).toBe(ACCESS_TOKEN)

    const assetCall = fetchState.calls.find((c) => c.url.includes('/assets.json'))
    expect(assetCall).toBeDefined()
    expect(assetCall?.url).toContain(`themes/${THEME_ID}/assets.json`)
    expect(assetCall?.url).toContain('asset%5Bkey%5D=config%2Fsettings_data.json')
    expect(assetCall?.headers['x-shopify-access-token']).toBe(ACCESS_TOKEN)
  })

  it('selects the theme with role=main when multiple are returned', async () => {
    fetchState.themesBody = JSON.stringify({
      themes: [
        { id: 111, role: 'unpublished' },
        { id: THEME_ID, role: 'main' },
        { id: 222, role: 'demo' },
      ],
    })
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(200)
    const assetCall = fetchState.calls.find((c) => c.url.includes('/assets.json'))
    expect(assetCall?.url).toContain(`themes/${THEME_ID}/assets.json`)
  })
})
