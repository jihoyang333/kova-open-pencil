import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const BRAND_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '22222222-2222-2222-2222-222222222222'
const VALID_STATE = 'a'.repeat(64)
const SHOP = 'foo.myshopify.com'
const CODE = 'test-auth-code'
const ACCESS_TOKEN = 'shpat_test_token'
const SHOP_GID = 'gid://shopify/Shop/4242'
const SHOP_ID = 4242
const VAULT_SECRET_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff'

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

interface OauthStateRow {
  state: string
  brand_id: string
  user_id: string
  shop: string
  expires_at: string
}

interface ConnectionUpsertCall {
  row: Record<string, unknown>
  conflict: string | undefined
}

interface RpcCall {
  fn: string
  args: Record<string, unknown>
}

const dbState = {
  oauthStates: new Map<string, OauthStateRow>(),
  deletedStates: [] as string[],
  connectionUpserts: [] as ConnectionUpsertCall[],
  rpcCalls: [] as RpcCall[],
  rpcError: null as { message: string } | null,
}

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'shopify_oauth_state') {
        return {
          select: () => ({
            eq: (_col: string, stateValue: string) => ({
              maybeSingle: async () => {
                const row = dbState.oauthStates.get(stateValue)
                return { data: row ?? null, error: null }
              },
            }),
          }),
          delete: () => ({
            eq: (_col: string, stateValue: string) => {
              dbState.deletedStates.push(stateValue)
              dbState.oauthStates.delete(stateValue)
              return Promise.resolve({ error: null })
            },
          }),
        }
      }
      if (table === 'shopify_connections') {
        return {
          upsert: async (
            row: Record<string, unknown>,
            opts?: { onConflict?: string }
          ) => {
            dbState.connectionUpserts.push({ row, conflict: opts?.onConflict })
            return { error: null }
          },
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      dbState.rpcCalls.push({ fn, args })
      if (dbState.rpcError) return { data: null, error: dbState.rpcError }
      if (fn === 'create_shopify_vault_secret') return { data: VAULT_SECRET_ID, error: null }
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
  tokenExchangeStatus: 200,
  graphqlStatus: 200,
  webhookStatus: 201,
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

    if (call.url.includes('/admin/oauth/access_token')) {
      if (fetchState.tokenExchangeStatus !== 200) {
        return new Response('unauthorized', { status: fetchState.tokenExchangeStatus })
      }
      return new Response(
        JSON.stringify({
          access_token: ACCESS_TOKEN,
          scope:
            'read_products,read_themes,read_online_store_pages,read_orders,read_inventory,read_discounts',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (call.url.includes('/admin/api/2024-10/graphql.json')) {
      if (fetchState.graphqlStatus !== 200) {
        return new Response('server error', { status: fetchState.graphqlStatus })
      }
      return new Response(
        JSON.stringify({
          data: {
            shop: {
              id: SHOP_GID,
              currencyCode: 'USD',
              ianaTimezone: 'America/Los_Angeles',
              primaryDomain: { host: SHOP },
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (call.url.includes('/admin/api/2024-10/webhooks.json')) {
      if (fetchState.webhookStatus !== 201) {
        return new Response('error', { status: fetchState.webhookStatus })
      }
      return new Response(JSON.stringify({ webhook: { id: 1 } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (call.url.includes('/api/shopify/sync/bulk-start')) {
      return new Response('{}', { status: 202 })
    }

    return new Response('{}', { status: 200 })
  }) as typeof fetch
}

const { default: handler } = await import('../../../api/shopify/oauth/callback')

function req(url: string, init: { method?: string } = {}): Request {
  return new Request(url, { method: init.method ?? 'GET' })
}

function seedValidState(overrides: Partial<OauthStateRow> = {}): void {
  const row: OauthStateRow = {
    state: VALID_STATE,
    brand_id: BRAND_ID,
    user_id: USER_ID,
    shop: SHOP,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    ...overrides,
  }
  dbState.oauthStates.set(row.state, row)
}

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
  process.env.KOVA_SHOPIFY_CLIENT_ID = 'test-client-id'
  process.env.KOVA_SHOPIFY_CLIENT_SECRET = 'test-client-secret'
  process.env.KOVA_INTERNAL_KEY = 'test-internal-key'
})

beforeEach(() => {
  dbState.oauthStates = new Map()
  dbState.deletedStates = []
  dbState.connectionUpserts = []
  dbState.rpcCalls = []
  dbState.rpcError = null
  fetchState.calls = []
  fetchState.tokenExchangeStatus = 200
  fetchState.graphqlStatus = 200
  fetchState.webhookStatus = 201
  installFetchMock()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('GET /api/shopify/oauth/callback', () => {
  it('rejects non-GET methods', async () => {
    const res = await handler(
      req(`http://local/api/shopify/oauth/callback?state=${VALID_STATE}&code=${CODE}&shop=${SHOP}`, {
        method: 'POST',
      })
    )
    expect(res.status).toBe(405)
  })

  it('returns 400 on missing state', async () => {
    const res = await handler(
      req(`http://local/api/shopify/oauth/callback?code=${CODE}&shop=${SHOP}`)
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 on missing code', async () => {
    const res = await handler(
      req(`http://local/api/shopify/oauth/callback?state=${VALID_STATE}&shop=${SHOP}`)
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 on invalid shop domain', async () => {
    const res = await handler(
      req(
        `http://local/api/shopify/oauth/callback?state=${VALID_STATE}&code=${CODE}&shop=<evil>`
      )
    )
    expect(res.status).toBe(400)
  })

  it('returns 401 on unknown state', async () => {
    const res = await handler(
      req(`http://local/api/shopify/oauth/callback?state=${VALID_STATE}&code=${CODE}&shop=${SHOP}`)
    )
    expect(res.status).toBe(401)
  })

  it('returns 401 on expired state', async () => {
    seedValidState({ expires_at: new Date(Date.now() - 60_000).toISOString() })
    const res = await handler(
      req(`http://local/api/shopify/oauth/callback?state=${VALID_STATE}&code=${CODE}&shop=${SHOP}`)
    )
    expect(res.status).toBe(401)
  })

  it('returns 401 when state shop does not match request shop', async () => {
    seedValidState({ shop: 'different.myshopify.com' })
    const res = await handler(
      req(`http://local/api/shopify/oauth/callback?state=${VALID_STATE}&code=${CODE}&shop=${SHOP}`)
    )
    expect(res.status).toBe(401)
  })

  it('returns 502 when Shopify token exchange fails', async () => {
    seedValidState()
    fetchState.tokenExchangeStatus = 400
    const res = await handler(
      req(`http://local/api/shopify/oauth/callback?state=${VALID_STATE}&code=${CODE}&shop=${SHOP}`)
    )
    expect(res.status).toBe(502)
  })

  it('returns 502 when vault RPC fails', async () => {
    seedValidState()
    dbState.rpcError = { message: 'vault error' }
    const res = await handler(
      req(`http://local/api/shopify/oauth/callback?state=${VALID_STATE}&code=${CODE}&shop=${SHOP}`)
    )
    expect(res.status).toBe(502)
  })

  it('returns 502 when compliance webhook registration fails', async () => {
    seedValidState()
    fetchState.webhookStatus = 400
    const res = await handler(
      req(`http://local/api/shopify/oauth/callback?state=${VALID_STATE}&code=${CODE}&shop=${SHOP}`)
    )
    expect(res.status).toBe(502)
  })

  it('happy path: exchanges token, upserts connection, stores vault token, registers webhooks, redirects', async () => {
    seedValidState()
    const res = await handler(
      req(`http://local/api/shopify/oauth/callback?state=${VALID_STATE}&code=${CODE}&shop=${SHOP}`)
    )

    expect(res.status).toBe(302)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('/brand-kit/review')
    expect(loc).toContain(`brand_id=${BRAND_ID}`)

    // State row consumed (single-use).
    expect(dbState.deletedStates).toContain(VALID_STATE)

    // Token exchange POST to Shopify with client credentials + code.
    const tokenCall = fetchState.calls.find((c) => c.url.includes('/admin/oauth/access_token'))
    expect(tokenCall).toBeDefined()
    expect(tokenCall?.method).toBe('POST')
    const tokenBody = tokenCall?.body ? JSON.parse(tokenCall.body) : {}
    expect(tokenBody.client_id).toBe('test-client-id')
    expect(tokenBody.client_secret).toBe('test-client-secret')
    expect(tokenBody.code).toBe(CODE)

    // Shop metadata fetched via GraphQL with access token.
    const graphqlCall = fetchState.calls.find((c) => c.url.includes('/graphql.json'))
    expect(graphqlCall).toBeDefined()
    expect(graphqlCall?.headers['x-shopify-access-token']).toBe(ACCESS_TOKEN)

    // Connection upsert on brand_id conflict.
    expect(dbState.connectionUpserts).toHaveLength(1)
    const upsert = dbState.connectionUpserts[0]
    expect(upsert.conflict).toBe('brand_id')
    expect(upsert.row.brand_id).toBe(BRAND_ID)
    expect(upsert.row.shop_domain).toBe(SHOP)
    expect(upsert.row.shop_id).toBe(SHOP_ID)
    expect(upsert.row.currency).toBe('USD')
    expect(upsert.row.timezone).toBe('America/Los_Angeles')
    expect(upsert.row.status).toBe('active')

    // Vault RPC stores the access token immediately after token exchange.
    const vaultCall = dbState.rpcCalls.find((c) => c.fn === 'create_shopify_vault_secret')
    expect(vaultCall).toBeDefined()
    expect(vaultCall?.args.p_token).toBe(ACCESS_TOKEN)
    expect(String(vaultCall?.args.p_name ?? '')).toContain(BRAND_ID)

    // Connection row uses the real vault UUID (no dangling placeholder).
    expect(upsert.row.access_token_secret_id).toBe(VAULT_SECRET_ID)

    // Webhooks registered.
    const webhookCalls = fetchState.calls.filter((c) => c.url.includes('/webhooks.json'))
    expect(webhookCalls.length).toBeGreaterThan(0)
    for (const wh of webhookCalls) {
      expect(wh.method).toBe('POST')
      expect(wh.headers['x-shopify-access-token']).toBe(ACCESS_TOKEN)
    }
  })
})
