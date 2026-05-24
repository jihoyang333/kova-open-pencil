// PRD 04 §5.1.3 — customer.subscription.updated handler.
//
// Tracks plan changes (upgrade/downgrade), cancel_at_period_end flips, and
// trial→active transitions. Sends upgrade email when plan changes upward.

import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import { writeAudit } from '../../_shared/audit'
import { sendEmail } from '../../_shared/email'
import { PLAN_INFO } from '../../../src/constants/billing-plans'
import { buildSubscriptionUpgradedEmail } from '../../../emails/account/subscription-upgraded'

import { accountUrl, extractCurrentPeriodEnd, findUserByStripeCustomerId, mapStripeStatus, planFromSubscription, unsubscribeUrl } from './_helpers'
import type { HandlerResult } from './handle-checkout-completed'

const TIER_ORDER = { free: 0, solo: 1, agency: 2 } as const

export async function handleSubscriptionUpdated(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<HandlerResult> {
  const sub = event.data.object as Stripe.Subscription
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  if (customerId === undefined || customerId === '') return { outcome: 'error', error: 'missing_customer' }

  const user = await findUserByStripeCustomerId(supabase, customerId)
  if (user === null) return { outcome: 'error', error: 'user_not_found' }

  const oldPlan = user.plan
  const newPlan = planFromSubscription(sub) ?? oldPlan
  const mappedStatus = mapStripeStatus(sub.status)
  const periodEndIso = extractCurrentPeriodEnd(sub)

  await supabase.from('users').update({
    plan: newPlan,
    plan_status: mappedStatus.value,
    stripe_subscription_id: sub.id,
    current_period_end: periodEndIso,
    cancel_at_period_end: sub.cancel_at_period_end,
  }).eq('id', user.id)

  await writeAudit(supabase, {
    userId: user.id,
    eventType: 'stripe.subscription.updated',
    payload: {
      subscription_id: sub.id,
      old_plan: oldPlan,
      new_plan: newPlan,
      stripe_status: sub.status,
      mapped_status: mappedStatus.value,
      status_fallback: mappedStatus.fellBack,
      cancel_at_period_end: sub.cancel_at_period_end,
      period_end_present: periodEndIso !== null,
    },
    clusterOwner: '04',
  })

  const oldTier = TIER_ORDER[oldPlan] ?? 0
  const newTier = TIER_ORDER[newPlan] ?? 0
  const isUpgrade = newTier > oldTier
  if (isUpgrade && user.email !== null && user.email !== '') {
    await sendEmail(
      buildSubscriptionUpgradedEmail({
        recipientEmail: user.email,
        newPlanName: PLAN_INFO[newPlan].displayName,
        effectiveOnIso: new Date().toISOString(),
        accountUrl: accountUrl(),
        unsubscribeUrl: unsubscribeUrl(user.id),
      })
    )
  }

  return { outcome: 'processed', user_id: user.id }
}
