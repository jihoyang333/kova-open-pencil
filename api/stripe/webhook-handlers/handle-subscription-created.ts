// PRD 04 §5.1.3 — customer.subscription.created handler.
//
// Canonical write site for new subscription state: plan, plan_status,
// current_period_end, cancel_at_period_end, stripe_subscription_id.

import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import { writeAudit } from '../../_shared/audit'

import { extractCurrentPeriodEnd, findUserByStripeCustomerId, mapStripeStatus, planFromSubscription, type UserRow } from './_helpers'
import type { HandlerResult } from './handle-checkout-completed'

export async function handleSubscriptionCreated(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<HandlerResult> {
  const sub = event.data.object as Stripe.Subscription
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  if (customerId === undefined || customerId === '') return { outcome: 'error', error: 'missing_customer' }

  const user = await findUserByStripeCustomerId(supabase, customerId)
  if (user === null) return { outcome: 'error', error: 'user_not_found' }

  const plan = planFromSubscription(sub) ?? user.plan
  const mappedStatus = mapStripeStatus(sub.status)
  const periodEndIso = extractCurrentPeriodEnd(sub)
  const updates: Partial<UserRow> = {
    plan,
    plan_status: mappedStatus.value,
    stripe_subscription_id: sub.id,
    current_period_end: periodEndIso,
    cancel_at_period_end: sub.cancel_at_period_end,
  }
  await supabase.from('users').update(updates).eq('id', user.id)

  await writeAudit(supabase, {
    userId: user.id,
    eventType: 'stripe.subscription.created',
    payload: {
      subscription_id: sub.id,
      plan,
      stripe_status: sub.status,
      mapped_status: mappedStatus.value,
      status_fallback: mappedStatus.fellBack,
      period_end_present: periodEndIso !== null,
    },
    clusterOwner: '04',
  })

  return { outcome: 'processed', user_id: user.id }
}
