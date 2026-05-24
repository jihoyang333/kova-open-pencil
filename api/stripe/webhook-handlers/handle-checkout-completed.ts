// PRD 04 §5.1.3 — checkout.session.completed handler.
//
// Sends the new-subscription welcome email + audits. The subscription
// state itself is written by customer.subscription.created which arrives
// in parallel or shortly after.

import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import { writeAudit } from '../../_shared/audit'
import { sendEmail } from '../../_shared/email'
import { PLAN_INFO, type PlanName } from '../../../src/constants/billing-plans'
import { buildSubscriptionNewEmail } from '../../../emails/account/subscription-new'

import { accountUrl, findUserByStripeCustomerId, unsubscribeUrl } from './_helpers'

export interface HandlerResult {
  outcome: 'processed' | 'unhandled_type' | 'error'
  user_id?: string
  error?: string
}

export async function handleCheckoutCompleted(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<HandlerResult> {
  const session = event.data.object as Stripe.Checkout.Session
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  if (customerId === undefined || customerId === '') return { outcome: 'error', error: 'missing_customer' }

  const user = await findUserByStripeCustomerId(supabase, customerId)
  if (user === null) return { outcome: 'error', error: 'user_not_found' }

  // Plan name (best-effort; subscription.created sets canonical plan)
  const planName = (PLAN_INFO[(user.plan ?? 'free') as PlanName] ?? PLAN_INFO.free).displayName

  await writeAudit(supabase, {
    userId: user.id,
    eventType: 'stripe.checkout.session_completed',
    payload: { session_id: session.id, customer: customerId, mode: session.mode },
    clusterOwner: '04',
  })

  if (user.email !== null && user.email !== '') {
    await sendEmail(
      buildSubscriptionNewEmail({
        recipientEmail: user.email,
        planName,
        startedOnIso: new Date(session.created * 1000).toISOString(),
        invoiceUrl: null,
        accountUrl: accountUrl(),
        unsubscribeUrl: unsubscribeUrl(user.id),
      })
    )
  }

  return { outcome: 'processed', user_id: user.id }
}
