import { describe, test, expect, beforeEach, mock } from 'bun:test'

import { runStep } from '../../../../../api/cron/steps/stripe'

// Plan 01 Task 6a — cron step: stripe.

describe('cron step: stripe', () => {
  const ORIG = process.env['STRIPE_SECRET_KEY']
  beforeEach(() => {
    if (ORIG === undefined) delete process.env['STRIPE_SECRET_KEY']
    else process.env['STRIPE_SECRET_KEY'] = ORIG
  })

  test('returns ok when STRIPE_SECRET_KEY unset (graceful degrade)', async () => {
    delete process.env['STRIPE_SECRET_KEY']
    const supabase = {} as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })

  test('returns ok when user row missing (PGRST116 — db step already ran)', async () => {
    process.env['STRIPE_SECRET_KEY'] = 'sk_test'
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows' } }) }) }),
      }),
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })

  test('returns retriable failure on Supabase DB error', async () => {
    process.env['STRIPE_SECRET_KEY'] = 'sk_test'
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { code: '53300', message: 'connection refused' } }) }) }),
      }),
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.retriable).toBe(true)
  })

  test('cancels subscription + deletes customer when both present', async () => {
    process.env['STRIPE_SECRET_KEY'] = 'sk_test'
    const cancelMock = mock(async () => ({ id: 'sub1' }))
    const delMock = mock(async () => ({ id: 'cus1', deleted: true }))
    mock.module('stripe', () => ({
      default: class {
        subscriptions = { cancel: cancelMock }
        customers = { del: delMock }
      },
    }))
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { stripe_customer_id: 'cus1', stripe_subscription_id: 'sub1' }, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }),
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
    expect(cancelMock).toHaveBeenCalled()
    expect(delMock).toHaveBeenCalled()
  })

  test('treats Stripe "resource_missing" as idempotent success', async () => {
    process.env['STRIPE_SECRET_KEY'] = 'sk_test'
    const delMock = mock(async () => {
      const err: { type: string; code: string } = { type: 'StripeInvalidRequestError', code: 'resource_missing' }
      throw err
    })
    mock.module('stripe', () => ({
      default: class {
        subscriptions = { cancel: mock(async () => ({})) }
        customers = { del: delMock }
      },
    }))
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { stripe_customer_id: 'cus1', stripe_subscription_id: null }, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }),
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })
})
