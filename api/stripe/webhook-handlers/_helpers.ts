// Shared helpers for Cluster 04 Stripe webhook handlers.

import type { SupabaseClient } from '@supabase/supabase-js'

import { priceIdToPlan, type PlanName } from '../../_shared/price-map'

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
  if (error || data === null) return null
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

export function accountUrl(): string {
  const base = process.env.VITE_APP_URL ?? 'https://kova.app'
  return `${base.replace(/\/$/, '')}/account`
}

export function unsubscribeUrl(userId: string): string {
  const base = process.env.VITE_APP_URL ?? 'https://kova.app'
  return `${base.replace(/\/$/, '')}/account?email_unsubscribe=${userId}`
}
