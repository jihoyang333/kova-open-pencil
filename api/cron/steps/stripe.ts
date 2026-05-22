import type { SupabaseClient } from '@supabase/supabase-js'

// W8a Cluster 01 — cron step: stripe (Plan 01 Task 6a).
// Cancels subscription + deletes Stripe Customer for a hard-deletion candidate.
// Idempotent (Stripe SDK accepts idempotencyKey; resource_missing treated as success).
// Graceful-degrade when STRIPE_SECRET_KEY unset (Cluster 04 sequencing).

export interface StepArgs {
  supabase: SupabaseClient
  userId: string
  idempotencyKey: string
}

export type StepResult = { ok: true } | { ok: false; retriable: boolean; error: string }

interface UserStripeRow {
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

interface StripeApiError {
  code?: string
  type?: string
  statusCode?: number
  message?: string
}

export async function runStep({ supabase, userId, idempotencyKey }: StepArgs): Promise<StepResult> {
  if (!process.env['STRIPE_SECRET_KEY']) {
    console.warn('[cron/stripe] STRIPE_SECRET_KEY unset — graceful degrade (Cluster 04 sequencing)')
    return { ok: true }
  }

  const { data, error } = await supabase
    .from('users')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', userId)
    .single<UserStripeRow>()

  if (error) {
    if (error.code === 'PGRST116') return { ok: true } // No row — db step ran first
    return { ok: false, retriable: true, error: error.message }
  }
  if (!data) return { ok: true }

  const { default: Stripe } = await import('stripe')
  const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'])

  try {
    if (data.stripe_subscription_id) {
      await stripe.subscriptions.cancel(data.stripe_subscription_id, undefined, {
        idempotencyKey: `${idempotencyKey}:sub-cancel`,
      })
    }
    if (data.stripe_customer_id) {
      // stripe-node signature: del(id, params, options). idempotencyKey lives in
      // the THIRD arg (RequestOptions).
      await stripe.customers.del(data.stripe_customer_id, undefined, {
        idempotencyKey: `${idempotencyKey}:cus-del`,
      })
    }
  } catch (err: unknown) {
    const stripeErr = err as StripeApiError
    if (stripeErr?.code === 'resource_missing') {
      // Already gone — idempotent success
    } else if (stripeErr?.type === 'StripeConnectionError' || (stripeErr?.statusCode ?? 0) >= 500) {
      return { ok: false, retriable: true, error: stripeErr.message ?? String(err) }
    } else {
      return { ok: false, retriable: false, error: stripeErr.message ?? String(err) }
    }
  }

  // Defensive nullify (db step deletes the row anyway)
  await supabase.from('users').update({
    stripe_customer_id: null,
    stripe_subscription_id: null,
    plan: 'free',
    plan_status: 'cancelled',
  }).eq('id', userId)

  return { ok: true }
}
