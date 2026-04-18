import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const OWNER_USER_ID = '11111111-1111-1111-1111-111111111111'
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222'
const BRAND_ID = '33333333-3333-3333-3333-333333333333'
const SHOP = 'foo.myshopify.com'
const ACCESS_TOKEN = 'shpat_test_token'

const PURGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

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
  SHOPIFY_SCOPES:
    'read_products,read_themes,read_online_store_pages,read_orders,read_inventory,read_discounts',
}))

interface ConnectionRow {
  brand_id: string
  shop_domain: string
  access_token_secret_id: string
  status: string
}

interface RpcCall {
  fn: string
  args: Record<string, unknown>
}

interface PurgeInsertCall {
  brand_id: string
  scheduled_at: Date | string
}

const dbState = {
  brandOwners: new Map<string, string>(),
  connections: new Map<string, ConnectionRow>(),
  connectionUpdates: [] as Array<{ brand_id: string; patch: Record<string, unknown> }>,
  purgeInserts: [] as PurgeInsertCall[],
  rpcCalls: [] as RpcCall[],
  vaultToken: ACCESS_TOKEN as string | null,
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
      if (table === 'shopify_connections') {
        return {
          select: () => ({
            eq: (_col: string, brandId: string) => ({
              maybeSingle: async () => {
                const row = dbState.connections.get(brandId)
                return { data: row ?? null, error: null }
              },
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async (_col: string, brandId: string) => {
              dbState.connectionUpdates.push({ brand_id: brandId, patch })
              const existing = dbState.connections.get(brandId)
              if (existing) {
                dbState.connections.set(brandId, { ...existing, ...(patch as Partial<ConnectionRow>) })
              }
              return { error: null }
            },
          }),
        }
      }
      if (table === 'shopify_purge_queue') {
        return {
          insert: async (row: PurgeInsertCall) => {
            dbState.purgeInserts.push(row)
            return { error: null }
          },
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      dbState.rpcCalls.push({ fn, args })
      if (fn === 'read_shopify_token') {
        return { data: dbState.vaultToken, error: null }
      }
      if (fn === 'delete_shopify_token') {
        dbState.vaultToken = null
        const brandId = args.p_brand_id as string
        const existing = dbState.connections.get(brandId)
        if (existing) {
          dbState.connections.set(brandId, { ...existing, access_token_secret_id: '' })
        }
        return { data: null, error: null }
      }
      return { data: null, error: null }
    },
  }),
}))

interface FetchCall {
  url: string
  method: string
  headers: Record<string, string>
}

const fetchState = {
  calls: [] as FetchCall[],
}

const originalFetch = globalThis.fetch

function installFetchMock(): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = init?.method ?? (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET')
    const rawHeaders =
      init?.headers ?? (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined)
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
    fetchState.calls.push({ url, method, headers })
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
}

const { default: handler } = await import('../../../api/shopify/oauth/disconnect')

function req(body: Record<string, unknown> | null, init: { method?: string; authed?: boolean } = {}): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (init.authed) headers.Authorization = 'Bearer test-owner-of-b1'
  return new Request('http://local/api/shopify/oauth/disconnect', {
    method: init.method ?? 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

function seedConnection(overrides: Partial<ConnectionRow> = {}): void {
  dbState.connections.set(BRAND_ID, {
    brand_id: BRAND_ID,
    shop_domain: SHOP,
    access_token_secret_id: '99999999-9999-9999-9999-999999999999',
    status: 'active',
    ...overrides,
  })
}

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
})

beforeEach(() => {
  authState.mode = 'owner'
  dbState.brandOwners = new Map([[BRAND_ID, OWNER_USER_ID]])
  dbState.connections = new Map()
  dbState.connectionUpdates = []
  dbState.purgeInserts = []
  dbState.rpcCalls = []
  dbState.vaultToken = ACCESS_TOKEN
  fetchState.calls = []
  installFetchMock()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('POST /api/shopify/oauth/disconnect', () => {
  it('returns 401 without auth', async () => {
    authState.mode = 'unauthorized'
    const res = await handler(req({ brand_id: BRAND_ID }))
    expect(res.status).toBe(401)
    expect(dbState.connectionUpdates).toHaveLength(0)
    expect(dbState.purgeInserts).toHaveLength(0)
  })

  it('returns 404 when no connection exists for brand', async () => {
    // Brand is owned by user, but no shopify_connections row exists.
    const res = await handler(req({ brand_id: BRAND_ID }, { authed: true }))
    expect(res.status).toBe(404)
    expect(dbState.connectionUpdates).toHaveLength(0)
    expect(dbState.purgeInserts).toHaveLength(0)
    expect(dbState.rpcCalls.find((c) => c.fn === 'delete_shopify_token')).toBeUndefined()
  })

  it('returns 200, flips status, deletes vault secret, and schedules 30-day purge', async () => {
    seedConnection()

    const before = Date.now()
    const res = await handler(req({ brand_id: BRAND_ID }, { authed: true }))
    const after = Date.now()

    expect(res.status).toBe(200)

    // Status flipped to 'disconnected'.
    expect(dbState.connectionUpdates).toHaveLength(1)
    const update = dbState.connectionUpdates[0]
    expect(update.brand_id).toBe(BRAND_ID)
    expect(update.patch.status).toBe('disconnected')

    // Vault secret deleted via RPC.
    const deleteCall = dbState.rpcCalls.find((c) => c.fn === 'delete_shopify_token')
    expect(deleteCall).toBeDefined()
    expect(deleteCall?.args.p_brand_id).toBe(BRAND_ID)
    expect(dbState.vaultToken).toBeNull()

    // Purge row scheduled ~30 days out.
    expect(dbState.purgeInserts).toHaveLength(1)
    const purge = dbState.purgeInserts[0]
    expect(purge.brand_id).toBe(BRAND_ID)
    const scheduledAt =
      purge.scheduled_at instanceof Date
        ? purge.scheduled_at.getTime()
        : new Date(purge.scheduled_at).getTime()
    expect(scheduledAt).toBeGreaterThanOrEqual(before + PURGE_WINDOW_MS - 1_000)
    expect(scheduledAt).toBeLessThanOrEqual(after + PURGE_WINDOW_MS + 1_000)
  })
})
