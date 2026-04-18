import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const OWNER_USER_ID = '11111111-1111-1111-1111-111111111111'
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222'
const BRAND_ID = 'b1'

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
  normalizeShopDomain: (input: string): string | null => {
    const trimmed = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(trimmed) ? trimmed : null
  },
  probeShopExists: async () => true,
  SHOPIFY_API_VERSION: '2024-10',
  SHOPIFY_SCOPES:
    'read_products,read_themes,read_online_store_pages,read_orders,read_inventory,read_discounts',
}))

interface InsertCall {
  table: string
  row: Record<string, unknown>
}

const dbState = {
  brandOwners: new Map<string, string>(),
  stateInserts: [] as InsertCall[],
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
                  if (owner && owner === userId) return { data: { id: brandId }, error: null }
                  return { data: null, error: null }
                },
              }),
            }),
          }),
        }
      }
      if (table === 'shopify_oauth_state') {
        return {
          insert: async (row: Record<string, unknown>) => {
            dbState.stateInserts.push({ table, row })
            return { error: null }
          },
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

const { default: handler } = await import('../../../api/shopify/oauth/start')

function req(url: string, init: { method?: string; headers?: Record<string, string> } = {}): Request {
  return new Request(url, { method: init.method ?? 'GET', headers: init.headers })
}

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
  process.env.KOVA_SHOPIFY_CLIENT_ID = 'test-client-id'
})

beforeEach(() => {
  authState.mode = 'owner'
  dbState.brandOwners = new Map([[BRAND_ID, OWNER_USER_ID]])
  dbState.stateInserts = []
})

afterEach(() => {
  dbState.stateInserts = []
})

describe('GET /api/shopify/oauth/start', () => {
  it('rejects invalid shop domain', async () => {
    const res = await handler(
      req('http://local/api/shopify/oauth/start?shop=<evil>&brand_id=b1')
    )
    expect(res.status).toBe(400)
  })

  it('rejects empty brand_id', async () => {
    const res = await handler(
      req('http://local/api/shopify/oauth/start?shop=foo.myshopify.com&brand_id=')
    )
    expect(res.status).toBe(400)
  })

  it('rejects non-GET methods', async () => {
    const res = await handler(
      req('http://local/api/shopify/oauth/start?shop=foo.myshopify.com&brand_id=b1', {
        method: 'POST',
      })
    )
    expect(res.status).toBe(405)
  })

  it('returns 401 when not authenticated', async () => {
    authState.mode = 'unauthorized'
    const res = await handler(
      req('http://local/api/shopify/oauth/start?shop=foo.myshopify.com&brand_id=b1')
    )
    expect(res.status).toBe(401)
  })

  it('rejects when user does not own brand_id', async () => {
    authState.mode = 'other'
    const res = await handler(
      req('http://local/api/shopify/oauth/start?shop=foo.myshopify.com&brand_id=b1', {
        headers: { Authorization: 'Bearer fake-other-user' },
      })
    )
    expect(res.status).toBe(403)
    expect(dbState.stateInserts).toHaveLength(0)
  })

  it('302s to Shopify authorize URL with state param stored', async () => {
    const res = await handler(
      req('http://local/api/shopify/oauth/start?shop=foo.myshopify.com&brand_id=b1', {
        headers: { Authorization: 'Bearer test-owner-of-b1' },
      })
    )
    expect(res.status).toBe(302)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toMatch(/^https:\/\/foo\.myshopify\.com\/admin\/oauth\/authorize/)
    expect(loc).toContain('client_id=test-client-id')
    expect(loc).toContain('scope=read_products')
    expect(loc).toMatch(/state=[a-f0-9]{64}/)
    expect(loc).toContain(
      'redirect_uri=http%3A%2F%2Flocal%2Fapi%2Fshopify%2Foauth%2Fcallback'
    )

    expect(dbState.stateInserts).toHaveLength(1)
    const inserted = dbState.stateInserts[0]
    expect(inserted.table).toBe('shopify_oauth_state')
    expect(inserted.row.user_id).toBe(OWNER_USER_ID)
    expect(inserted.row.brand_id).toBe(BRAND_ID)
    expect(inserted.row.shop).toBe('foo.myshopify.com')
    expect(inserted.row.state).toMatch(/^[a-f0-9]{64}$/)
    // State in redirect URL matches state persisted in DB.
    const match = loc.match(/state=([a-f0-9]{64})/)
    expect(match?.[1]).toBe(inserted.row.state)
  })
})
