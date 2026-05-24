/**
 * useBillingStore — PRD 04 §6.2.1.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

const supabaseState = {
  userRow: null as null | {
    plan: string; plan_status: string; current_period_end: string | null;
    cancel_at_period_end: boolean; stripe_customer_id: string | null;
  },
  session: { access_token: 'jwt-test' } as null | { access_token: string },
  authUserId: 'user-bill-1' as string | null,
  fetchOk: true,
  fetchBody: { invoices: [{
    id: 'in_1', created_iso: '2026-01-01T00:00:00Z', description: 'Solo',
    amount_paid_cents: 1900, currency: 'usd', status: 'paid',
    hosted_invoice_url: null, invoice_pdf: null,
  }] } as Record<string, unknown>,
}

let useBillingStore: typeof import('../../../src/stores/billing')['useBillingStore']

beforeAll(async () => {
  mock.module('@/lib/supabase', () => ({
    supabase: {
      auth: {
        getUser: async () => ({ data: { user: supabaseState.authUserId === null ? null : { id: supabaseState.authUserId } } }),
        getSession: async () => ({ data: { session: supabaseState.session } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: supabaseState.userRow, error: null }),
          }),
        }),
      }),
    },
  }))
  globalThis.fetch = mock(async () => ({
    ok: supabaseState.fetchOk,
    json: async () => supabaseState.fetchBody,
  })) as unknown as typeof globalThis.fetch
  ;({ useBillingStore } = await import('../../../src/stores/billing'))
})

afterAll(() => mock.restore())

beforeEach(() => {
  setActivePinia(createPinia())
  supabaseState.userRow = null
  supabaseState.authUserId = 'user-bill-1'
  supabaseState.session = { access_token: 'jwt-test' }
  supabaseState.fetchOk = true
})

describe('useBillingStore', () => {
  it('loadFromUser hydrates state from users row', async () => {
    supabaseState.userRow = {
      plan: 'solo', plan_status: 'active', current_period_end: '2026-06-01T00:00:00Z',
      cancel_at_period_end: false, stripe_customer_id: 'cus_x',
    }
    const s = useBillingStore()
    await s.loadFromUser()
    expect(s.plan).toBe('solo')
    expect(s.planStatus).toBe('active')
    expect(s.stripeCustomerId).toBe('cus_x')
  })

  it('isPastDue + pastDueDeadline + isCancelled getters', async () => {
    supabaseState.userRow = {
      plan: 'solo', plan_status: 'past_due', current_period_end: '2026-01-01T00:00:00Z',
      cancel_at_period_end: false, stripe_customer_id: 'cus_x',
    }
    const s = useBillingStore()
    await s.loadFromUser()
    expect(s.isPastDue).toBe(true)
    expect(s.isCancelled).toBe(false)
    // deadline = period_end + 7 days
    expect(s.pastDueDeadline).toBe('2026-01-08T00:00:00.000Z')
  })

  it('isTrialing + daysUntilTrialEnds (future period_end)', async () => {
    const inFiveDaysIso = new Date(Date.now() + 5 * 86_400_000).toISOString()
    supabaseState.userRow = {
      plan: 'solo', plan_status: 'trialing', current_period_end: inFiveDaysIso,
      cancel_at_period_end: false, stripe_customer_id: 'cus_x',
    }
    const s = useBillingStore()
    await s.loadFromUser()
    expect(s.isTrialing).toBe(true)
    expect(s.daysUntilTrialEnds).toBeGreaterThanOrEqual(4)
    expect(s.daysUntilTrialEnds).toBeLessThanOrEqual(5)
  })

  it('fetchInvoices populates invoices from API', async () => {
    const s = useBillingStore()
    await s.fetchInvoices()
    expect(s.invoices).toHaveLength(1)
    expect(s.invoices[0].id).toBe('in_1')
  })

  it('openCheckout posts price + returns checkout URL', async () => {
    supabaseState.fetchBody = { url: 'https://checkout.stripe.com/c/x' }
    const s = useBillingStore()
    const url = await s.openCheckout('price_solo', 'https://kova.app/s', 'https://kova.app/c')
    expect(url).toBe('https://checkout.stripe.com/c/x')
  })

  it('openPortal returns portal URL or null on failure', async () => {
    supabaseState.fetchBody = { url: 'https://billing.stripe.com/p/portal_x' }
    const s = useBillingStore()
    const url = await s.openPortal('https://kova.app/account/billing')
    expect(url).toBe('https://billing.stripe.com/p/portal_x')
    supabaseState.fetchOk = false
    expect(await s.openPortal('https://kova.app/account/billing')).toBeNull()
  })
})
