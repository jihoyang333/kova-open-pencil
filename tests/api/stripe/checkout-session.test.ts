/**
 * POST /api/stripe/checkout-session — PRD 04 §5.1.1.
 *
 * Auto-creates Stripe Customer on first call; whitelists price_id against
 * STRIPE_PRICE_ID_<plan> env vars (C-LOW04.7); returns Checkout URL.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const OWNER_USER_ID = '11111111-1111-1111-1111-111111111111'

const authState = { mode: 'owner' as 'owner' | 'unauthorized' }

mock.module('../../../api/_shared/auth', () => ({
  authenticateRequest: async () => {
    if (authState.mode === 'owner') return { userId: OWNER_USER_ID }
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  },
}))

interface FakeStripe {
  customers: { create: ReturnType<typeof mock> }
  checkout: { sessions: { create: ReturnType<typeof mock> } }
}

const stripeState: { client: FakeStripe } = {
  client: {
    customers: { create: mock(async () => ({ id: 'cus_new_123' })) },
    checkout: {
      sessions: {
        create: mock(async () => ({ id: 'cs_test_abc', url: 'https://checkout.stripe.com/c/cs_test_abc' })),
      },
    },
  },
}

mock.module('../../../api/_shared/stripe-client', () => ({
  getStripeClient: () => stripeState.client,
}))

const dbState = {
  user: null as null | { id: string; stripe_customer_id: string | null },
  updates: [] as Array<Record<string, unknown>>,
}

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table !== 'users') throw new Error(`unexpected table: ${table}`)
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: dbState.user, error: null }),
          }),
        }),
        update: (row: Record<string, unknown>) => ({
          eq: async () => {
            dbState.updates.push(row)
            return { error: null }
          },
        }),
      }
    },
  }),
}))

const { default: handler } = await import('../../../api/stripe/checkout-session')

function req(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request('http://local/api/stripe/checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_PRICE_ID_SOLO = 'price_solo'
  process.env.STRIPE_PRICE_ID_AGENCY = 'price_agency'
})

beforeEach(() => {
  authState.mode = 'owner'
  dbState.user = { id: OWNER_USER_ID, stripe_customer_id: null }
  dbState.updates = []
  stripeState.client.customers.create = mock(async () => ({ id: 'cus_new_123' }))
  stripeState.client.checkout.sessions.create = mock(async () =>
    ({ id: 'cs_test_abc', url: 'https://checkout.stripe.com/c/cs_test_abc' })
  )
})

afterEach(() => {
  dbState.updates = []
})

describe('POST /api/stripe/checkout-session', () => {
  it('returns 401 without auth', async () => {
    authState.mode = 'unauthorized'
    const res = await handler(req({
      price_id: 'price_solo',
      success_url: 'https://kova.app/account/billing/success',
      cancel_url: 'https://kova.app/account/billing/cancel',
    }))
    expect(res.status).toBe(401)
  })

  it('returns 405 on non-POST', async () => {
    const r = new Request('http://local/api/stripe/checkout-session', { method: 'GET' })
    const res = await handler(r)
    expect(res.status).toBe(405)
  })

  it('returns 422 for unknown price_id', async () => {
    const res = await handler(req({
      price_id: 'price_bogus',
      success_url: 'https://kova.app/s',
      cancel_url: 'https://kova.app/c',
    }))
    expect(res.status).toBe(422)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('invalid_price')
  })

  it('returns 400 for missing success/cancel URLs', async () => {
    const res = await handler(req({ price_id: 'price_solo' }))
    expect(res.status).toBe(400)
  })

  it('creates customer + checkout session and returns url (200)', async () => {
    const res = await handler(req({
      price_id: 'price_solo',
      success_url: 'https://kova.app/account/billing/success',
      cancel_url: 'https://kova.app/account/billing/cancel',
    }))
    expect(res.status).toBe(200)
    const body = await res.json() as { url: string }
    expect(body.url).toBe('https://checkout.stripe.com/c/cs_test_abc')
    expect(stripeState.client.customers.create).toHaveBeenCalled()
    expect(stripeState.client.checkout.sessions.create).toHaveBeenCalled()
    expect(dbState.updates.some(u => u.stripe_customer_id === 'cus_new_123')).toBe(true)
  })

  it('reuses existing stripe_customer_id', async () => {
    dbState.user = { id: OWNER_USER_ID, stripe_customer_id: 'cus_existing' }
    const res = await handler(req({
      price_id: 'price_solo',
      success_url: 'https://kova.app/s',
      cancel_url: 'https://kova.app/c',
    }))
    expect(res.status).toBe(200)
    expect(stripeState.client.customers.create).not.toHaveBeenCalled()
    const sessArg = (stripeState.client.checkout.sessions.create as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0][0]
    expect(sessArg.customer).toBe('cus_existing')
  })
})
