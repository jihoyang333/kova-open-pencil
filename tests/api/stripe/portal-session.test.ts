/**
 * POST /api/stripe/portal-session — PRD 04 §5.1.2.
 *
 * Returns a Stripe Customer Portal session URL. Founder-locked: opened in
 * a new tab (Stripe blocks iframe per docs.stripe.com).
 */
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const OWNER_USER_ID = '22222222-2222-2222-2222-222222222222'

const authState = { mode: 'owner' as 'owner' | 'unauthorized' }

mock.module('../../../api/_shared/auth', () => ({
  authenticateRequest: async () => {
    if (authState.mode === 'owner') return { userId: OWNER_USER_ID }
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })
  },
}))

const stripeState = {
  client: {
    billingPortal: {
      sessions: { create: mock(async () => ({ url: 'https://billing.stripe.com/p/portal_abc' })) },
    },
  },
}

mock.module('../../../api/_shared/stripe-client', () => ({
  getStripeClient: () => stripeState.client,
}))

const dbState = {
  user: null as null | { id: string; stripe_customer_id: string | null },
}

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: dbState.user, error: null }) }) }),
    }),
  }),
}))

const { default: handler } = await import('../../../api/stripe/portal-session')

function req(body: Record<string, unknown> = {}): Request {
  return new Request('http://local/api/stripe/portal-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
})

beforeEach(() => {
  authState.mode = 'owner'
  dbState.user = { id: OWNER_USER_ID, stripe_customer_id: 'cus_existing' }
  stripeState.client.billingPortal.sessions.create = mock(async () =>
    ({ url: 'https://billing.stripe.com/p/portal_abc' })
  )
})

describe('POST /api/stripe/portal-session', () => {
  it('returns 401 without auth', async () => {
    authState.mode = 'unauthorized'
    const res = await handler(req({ return_url: 'https://kova.app/account/billing' }))
    expect(res.status).toBe(401)
  })

  it('returns 405 on non-POST', async () => {
    const res = await handler(new Request('http://local/api/stripe/portal-session', { method: 'GET' }))
    expect(res.status).toBe(405)
  })

  it('returns 400 when return_url missing', async () => {
    const res = await handler(req({}))
    expect(res.status).toBe(400)
  })

  it('returns 409 when user has no Stripe customer', async () => {
    dbState.user = { id: OWNER_USER_ID, stripe_customer_id: null }
    const res = await handler(req({ return_url: 'https://kova.app/account/billing' }))
    expect(res.status).toBe(409)
  })

  it('returns 200 + url for active customer', async () => {
    const res = await handler(req({ return_url: 'https://kova.app/account/billing' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { url: string }
    expect(body.url).toBe('https://billing.stripe.com/p/portal_abc')
  })
})
