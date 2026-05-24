// Shared helpers for Cluster 04 Stripe webhook handlers.

import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import { priceIdToPlan, type PlanName } from '../../_shared/price-map'
import { type PlanStatus } from '../../../src/constants/billing-plans'

export interface UserRow {
  id: string
  email: string | null
  plan: PlanName
  plan_status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

export async function findUserByStripeCustomerId(
  supabase: SupabaseClient,
  customerId: string
): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, plan, plan_status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (error) {
    console.warn(`[c04/_helpers] findUserByStripeCustomerId DB error (${error.code}): ${error.message}`, { customerId })
    return null
  }
  if (data === null) return null
  const email = await fetchAuthEmail(supabase, data.id as string)
  return { ...(data as Omit<UserRow, 'email'>), email }
}

export async function fetchAuthEmail(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId)
  if (error || data?.user === null || data?.user === undefined) return null
  return data.user.email ?? null
}

export function planFromSubscription(sub: { items?: { data: Array<{ price?: { id?: string } | null }> } }): PlanName | null {
  const priceId = sub.items?.data?.[0]?.price?.id
  if (typeof priceId !== 'string') return null
  return priceIdToPlan(priceId)
}

// Stripe → Kova plan_status mapping.
// Stripe enumerates 8 subscription statuses; the users.plan_status CHECK
// allows 5. Map explicitly so unknown/new statuses default to 'cancelled'
// (deny access) rather than 'active' (grant access). When the fallback fires
// the caller writes an audit row so silent drift is observable.
//
// Source of truth: https://docs.stripe.com/api/subscriptions/object#subscription_object-status
const STRIPE_STATUS_MAP: Readonly<Record<string, PlanStatus>> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  incomplete: 'incomplete',
  // Stripe spells 'canceled' (US); Kova enum 'cancelled' (UK).
  canceled: 'cancelled',
  cancelled: 'cancelled',
  incomplete_expired: 'cancelled',
  unpaid: 'cancelled',
  paused: 'cancelled',
} as const

export interface MappedStripeStatus {
  value: PlanStatus
  fellBack: boolean
}

export function mapStripeStatus(status: string): MappedStripeStatus {
  const mapped = STRIPE_STATUS_MAP[status]
  if (mapped !== undefined) return { value: mapped, fellBack: false }
  return { value: 'cancelled', fellBack: true }
}

// Stripe SDK 2024-04-10 moved current_period_end from the subscription root
// onto each subscription item (sub.items.data[i].current_period_end). Older
// SDK versions and mocked tests still set it on the root. Read items first,
// fall back to root, return null if neither present (handler audits null so
// missing period is observable).
export function extractCurrentPeriodEnd(sub: Stripe.Subscription): string | null {
  const items = (sub as unknown as { items?: { data?: Array<{ current_period_end?: number }> } }).items
  const fromItem = items?.data?.[0]?.current_period_end
  if (typeof fromItem === 'number' && Number.isFinite(fromItem)) {
    return new Date(fromItem * 1000).toISOString()
  }
  const fromRoot = (sub as unknown as { current_period_end?: number }).current_period_end
  if (typeof fromRoot === 'number' && Number.isFinite(fromRoot)) {
    return new Date(fromRoot * 1000).toISOString()
  }
  return null
}

// Fail-loud env reader for the public app URL. Stripe handlers MUST send
// emails with correct links; falling back to a hardcoded default silently
// ships broken links to customers. Throw → 500 → Stripe retries with backoff
// (D-14 idempotency-safe).
function requireAppUrl(): string {
  const base = process.env.VITE_APP_URL
  if (base === undefined || base === '') {
    throw new Error('Missing required environment variable: VITE_APP_URL. See docs/operations/stripe-setup-runbook.md.')
  }
  return base.replace(/\/$/, '')
}

export function accountUrl(): string {
  return `${requireAppUrl()}/account`
}

export function unsubscribeUrl(userId: string): string {
  return `${requireAppUrl()}/account?email_unsubscribe=${userId}`
}
