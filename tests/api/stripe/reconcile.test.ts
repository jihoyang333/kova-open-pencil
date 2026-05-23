import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const stripeState = {
  client: {
    subscriptions: { retrieve: mock(async () => ({ status: 'active' as 'active' | 'past_due' })) },
  },
}

mock.module('../../../api/_shared/stripe-client', () => ({
  getStripeClient: () => stripeState.client,
}))

mock.module('../../../api/_shared/audit', () => ({
  writeAudit: mock(async () => undefined),
}))

interface PastDueRow { id: string; stripe_subscription_id: string | null; plan_status: string; current_period_end: string | null }

const dbState = {
  pastDue: [] as PastDueRow[],
  updates: [] as Array<{ id: string; row: Record<string, unknown> }>,
}

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          not: () => ({
            limit: async () => ({ data: dbState.pastDue, error: null }),
          }),
        }),
      }),
      update: (row: Record<string, unknown>) => ({
        eq: async (_: string, id: string) => {
          dbState.updates.push({ id, row })
          return { error: null }
        },
      }),
    }),
  }),
}))

const { default: handler } = await import('../../../api/stripe/reconcile')

function req(headers: Record<string, string> = {}): Request {
  return new Request('http://l/api/stripe/reconcile', { method: 'POST', headers })
}

beforeAll(() => {
  process.env.CRON_SECRET = 'cron-test-secret'
  process.env.VITE_SUPABASE_URL = 'https://t.local'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv'
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
})

beforeEach(() => {
  dbState.pastDue = []
  dbState.updates = []
  stripeState.client.subscriptions.retrieve = mock(async () => ({ status: 'active' as 'active' | 'past_due' }))
})

describe('POST /api/stripe/reconcile', () => {
  it('returns 401 without bearer secret', async () => {
    const res = await handler(req())
    expect(res.status).toBe(401)
  })

  it('returns 503 stub when CRON_SECRET missing', async () => {
    const orig = process.env.CRON_SECRET
    delete process.env.CRON_SECRET
    try {
      const res = await handler(req())
      expect(res.status).toBe(503)
    } finally {
      process.env.CRON_SECRET = orig
    }
  })

  it('heals past_due users whose Stripe sub is now active', async () => {
    dbState.pastDue = [
      { id: 'user-1', stripe_subscription_id: 'sub_active', plan_status: 'past_due', current_period_end: null },
      { id: 'user-2', stripe_subscription_id: 'sub_still_past_due', plan_status: 'past_due', current_period_end: null },
    ]
    let call = 0
    stripeState.client.subscriptions.retrieve = mock(async () => {
      call += 1
      return { status: call === 1 ? 'active' as const : 'past_due' as const }
    })
    const res = await handler(req({ authorization: 'Bearer cron-test-secret' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { checked: number; healed: number }
    expect(body.checked).toBe(2)
    expect(body.healed).toBe(1)
    expect(dbState.updates).toHaveLength(1)
    expect(dbState.updates[0].id).toBe('user-1')
  })
})
