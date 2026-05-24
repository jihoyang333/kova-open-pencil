import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const USER_ID = '33333333-3333-3333-3333-333333333333'

const authState = { mode: 'owner' as 'owner' | 'unauthorized' }

mock.module('../../../api/_shared/auth', () => ({
  authenticateRequest: async () => {
    if (authState.mode === 'owner') return { userId: USER_ID }
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })
  },
}))

const stripeState = {
  client: {
    invoices: {
      list: mock(async () => ({
        data: [{
          id: 'in_1',
          created: 1_700_000_000,
          description: 'Solo plan',
          amount_paid: 1900,
          currency: 'usd',
          status: 'paid',
          hosted_invoice_url: 'https://i.stripe.com/i/1',
          invoice_pdf: 'https://i.stripe.com/i/1.pdf',
        }],
      })),
    },
  },
}

mock.module('../../../api/_shared/stripe-client', () => ({
  getStripeClient: () => stripeState.client,
}))

const dbState = { customer: 'cus_test' as string | null }

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { id: USER_ID, stripe_customer_id: dbState.customer }, error: null }),
        }),
      }),
    }),
  }),
}))

const { default: handler } = await import('../../../api/stripe/invoices')

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'https://t.local'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv'
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
})

beforeEach(() => {
  authState.mode = 'owner'
  dbState.customer = 'cus_test'
})

describe('GET /api/stripe/invoices', () => {
  it('returns 401 without auth', async () => {
    authState.mode = 'unauthorized'
    const res = await handler(new Request('http://l/api/stripe/invoices'))
    expect(res.status).toBe(401)
  })

  it('returns empty list when user has no Stripe customer', async () => {
    dbState.customer = null
    const res = await handler(new Request('http://l/api/stripe/invoices'))
    expect(res.status).toBe(200)
    const body = await res.json() as { invoices: unknown[] }
    expect(body.invoices).toEqual([])
  })

  it('returns mapped invoice list (200)', async () => {
    const res = await handler(new Request('http://l/api/stripe/invoices'))
    expect(res.status).toBe(200)
    const body = await res.json() as { invoices: Array<{ id: string; status: string; amount_paid_cents: number }> }
    expect(body.invoices).toHaveLength(1)
    expect(body.invoices[0].id).toBe('in_1')
    expect(body.invoices[0].amount_paid_cents).toBe(1900)
    expect(body.invoices[0].status).toBe('paid')
  })
})
