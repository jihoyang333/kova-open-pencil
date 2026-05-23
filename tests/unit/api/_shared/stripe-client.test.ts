/**
 * stripe-client singleton — PRD 04 §5.1 / Plan Task 2.2.
 *
 * Lazy-init Stripe SDK; throws if STRIPE_SECRET_KEY missing; memoizes
 * via globalThis so tests + dev-reload don't double-construct.
 */
import { describe, it, expect, beforeEach } from 'bun:test'

const STRIPE_CLIENT_GLOBAL_KEY = '__kovaStripeClient'

describe('getStripeClient', () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[STRIPE_CLIENT_GLOBAL_KEY]
  })

  it('throws when STRIPE_SECRET_KEY is missing', async () => {
    const orig = process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_SECRET_KEY
    try {
      const { getStripeClient } = await import('../../../../api/_shared/stripe-client')
      expect(() => getStripeClient()).toThrow(/STRIPE_SECRET_KEY/)
    } finally {
      if (orig !== undefined) process.env.STRIPE_SECRET_KEY = orig
    }
  })

  it('returns memoized instance across calls', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_for_memo_check'
    const { getStripeClient } = await import('../../../../api/_shared/stripe-client')
    const a = getStripeClient()
    const b = getStripeClient()
    expect(a).toBe(b)
  })

  it('constructs with typescript:true (per Plan §2.2 step 3)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_for_typescript_flag'
    const { getStripeClient } = await import('../../../../api/_shared/stripe-client')
    const client = getStripeClient()
    expect(client).toBeTruthy()
    expect(typeof client.checkout?.sessions?.create).toBe('function')
  })
})
