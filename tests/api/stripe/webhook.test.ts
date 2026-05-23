/**
 * POST /api/stripe/webhook — PRD 04 §5.1.3.
 *
 * Signature-verified (HMAC-SHA256 via stripe.webhooks.constructEvent), raw
 * body reader, idempotency via stripe_webhook_events PK, dispatch to 6
 * handler files.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

interface FakeStripeWebhooks {
  constructEvent: ReturnType<typeof mock>
}

const stripeState: { client: { webhooks: FakeStripeWebhooks } } = {
  client: { webhooks: { constructEvent: mock(() => ({ id: 'evt_x', type: 'invoice.paid', data: { object: {} } })) } },
}

mock.module('../../../api/_shared/stripe-client', () => ({
  getStripeClient: () => stripeState.client,
}))

interface WebhookEventRow {
  event_id: string
  type: string
  outcome: string
  error_message?: string | null
}

const dbState = {
  events: [] as WebhookEventRow[],
  duplicateOnInsert: false,
}

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'stripe_webhook_events') {
        return {
          insert: async (row: WebhookEventRow) => {
            if (dbState.duplicateOnInsert || dbState.events.some(e => e.event_id === row.event_id)) {
              return { error: { code: '23505' } }
            }
            dbState.events.push(row)
            return { error: null }
          },
          update: (patch: Partial<WebhookEventRow>) => ({
            eq: async (_: string, eventId: string) => {
              const row = dbState.events.find(e => e.event_id === eventId)
              if (row !== undefined) Object.assign(row, patch)
              return { error: null }
            },
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

const handlerCalls: { type: string; eventId: string }[] = []

function setupHandlerMock(name: string, eventType: string) {
  mock.module(`../../../api/stripe/webhook-handlers/${name}`, () => ({
    [eventTypeToHandlerKey(eventType)]: async (event: { id: string; type: string }) => {
      handlerCalls.push({ type: event.type, eventId: event.id })
      return { outcome: 'processed', user_id: 'user-1' }
    },
  }))
}

function eventTypeToHandlerKey(eventType: string): string {
  switch (eventType) {
    case 'checkout.session.completed': return 'handleCheckoutCompleted'
    case 'customer.subscription.created': return 'handleSubscriptionCreated'
    case 'customer.subscription.updated': return 'handleSubscriptionUpdated'
    case 'customer.subscription.deleted': return 'handleSubscriptionDeleted'
    case 'invoice.paid': return 'handleInvoicePaid'
    case 'invoice.payment_failed': return 'handleInvoicePaymentFailed'
    default: throw new Error(`unknown: ${eventType}`)
  }
}

setupHandlerMock('handle-checkout-completed', 'checkout.session.completed')
setupHandlerMock('handle-subscription-created', 'customer.subscription.created')
setupHandlerMock('handle-subscription-updated', 'customer.subscription.updated')
setupHandlerMock('handle-subscription-deleted', 'customer.subscription.deleted')
setupHandlerMock('handle-invoice-paid', 'invoice.paid')
setupHandlerMock('handle-invoice-payment-failed', 'invoice.payment_failed')

const { default: handler } = await import('../../../api/stripe/webhook')

function req(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://local/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 't=1,v1=abc', ...headers },
    body,
  })
}

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy'
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
})

beforeEach(() => {
  dbState.events = []
  dbState.duplicateOnInsert = false
  handlerCalls.length = 0
  stripeState.client.webhooks.constructEvent = mock(() =>
    ({ id: 'evt_default', type: 'invoice.paid', data: { object: {} } })
  )
})

afterEach(() => {
  dbState.events = []
  handlerCalls.length = 0
})

describe('POST /api/stripe/webhook', () => {
  it('returns 405 on non-POST', async () => {
    const res = await handler(new Request('http://local/api/stripe/webhook', { method: 'GET' }))
    expect(res.status).toBe(405)
  })

  it('returns 400 on missing stripe-signature header', async () => {
    const r = new Request('http://local/api/stripe/webhook', { method: 'POST', body: '{}' })
    const res = await handler(r)
    expect(res.status).toBe(400)
  })

  it('returns 400 when constructEvent throws (bad signature)', async () => {
    stripeState.client.webhooks.constructEvent = mock(() => {
      throw new Error('No signatures found matching the expected signature for payload.')
    })
    const res = await handler(req('{"id":"evt_x"}'))
    expect(res.status).toBe(400)
  })

  it('returns 200 + dispatches handler for known event type', async () => {
    stripeState.client.webhooks.constructEvent = mock(() =>
      ({ id: 'evt_paid_1', type: 'invoice.paid', data: { object: { customer: 'cus_x' } } })
    )
    const res = await handler(req('{}'))
    expect(res.status).toBe(200)
    expect(handlerCalls).toEqual([{ type: 'invoice.paid', eventId: 'evt_paid_1' }])
    expect(dbState.events).toHaveLength(1)
    expect(dbState.events[0].outcome).toBe('processed')
  })

  it('returns 200 + marks duplicate (idempotency PK conflict)', async () => {
    stripeState.client.webhooks.constructEvent = mock(() =>
      ({ id: 'evt_dup', type: 'invoice.paid', data: { object: { customer: 'cus_x' } } })
    )
    dbState.duplicateOnInsert = true
    const res = await handler(req('{}'))
    expect(res.status).toBe(200)
    expect(handlerCalls).toHaveLength(0)
    const body = await res.json() as { duplicate: boolean }
    expect(body.duplicate).toBe(true)
  })

  it('returns 200 + marks unhandled_type for events not in dispatch table', async () => {
    stripeState.client.webhooks.constructEvent = mock(() =>
      ({ id: 'evt_misc', type: 'customer.created', data: { object: {} } })
    )
    const res = await handler(req('{}'))
    expect(res.status).toBe(200)
    expect(dbState.events[0].outcome).toBe('unhandled_type')
    expect(handlerCalls).toHaveLength(0)
  })
})
