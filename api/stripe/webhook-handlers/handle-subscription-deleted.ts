// PRD 04 §5.1.3 — customer.subscription.deleted handler.
//
// Subscription has ended. Move user back to Free plan + cancelled status.
// Send the "final" cancellation email.

import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import { writeAudit } from '../../_shared/audit'
import { sendEmail } from '../../_shared/email'
import { PLAN_INFO } from '../../../src/constants/billing-plans'
import { buildSubscriptionCancelledEmail } from '../../../emails/account/subscription-cancelled'

import { accountUrl, findUserByStripeCustomerId, unsubscribeUrl } from './_helpers'
import type { HandlerResult } from './handle-checkout-completed'

export async function handleSubscriptionDeleted(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<HandlerResult> {
  const sub = event.data.object as Stripe.Subscription
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  if (customerId === undefined || customerId === '') return { outcome: 'error', error: 'missing_customer' }

  const user = await findUserByStripeCustomerId(supabase, customerId)
  if (user === null) return { outcome: 'error', error: 'user_not_found' }

  const oldPlanName = PLAN_INFO[user.plan].displayName

  await supabase.from('users').update({
    plan: 'free',
    plan_status: 'cancelled',
    stripe_subscription_id: null,
    cancel_at_period_end: false,
  }).eq('id', user.id)

  await writeAudit(supabase, {
    userId: user.id,
    eventType: 'stripe.subscription.deleted',
    payload: { subscription_id: sub.id, ended_at: sub.ended_at },
    clusterOwner: '04',
  })

  if (user.email !== null && user.email !== '') {
    await sendEmail(
      buildSubscriptionCancelledEmail({
        recipientEmail: user.email,
        planName: oldPlanName,
        variant: 'final',
        effectiveOnIso: new Date((sub.ended_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        accountUrl: accountUrl(),
        unsubscribeUrl: unsubscribeUrl(user.id),
      })
    )
  }

  return { outcome: 'processed', user_id: user.id }
}
