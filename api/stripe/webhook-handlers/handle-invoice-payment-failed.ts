// PRD 04 §5.1.3 — invoice.payment_failed handler.
//
// Mark user past_due. Send dunning email. Deadline = current_period_end + 7d
// per founder lock 2026-05-17 D-5.

import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import { writeAudit } from '../../_shared/audit'
import { sendEmail } from '../../_shared/email'
import { PLAN_INFO } from '../../../src/constants/billing-plans'
import { buildSubscriptionPaymentFailedEmail } from '../../../emails/account/subscription-payment-failed'

import { accountUrl, findUserByStripeCustomerId, unsubscribeUrl } from './_helpers'
import type { HandlerResult } from './handle-checkout-completed'

const PAST_DUE_GRACE_DAYS = 7

export async function handleInvoicePaymentFailed(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<HandlerResult> {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (customerId === undefined || customerId === '') return { outcome: 'error', error: 'missing_customer' }

  const user = await findUserByStripeCustomerId(supabase, customerId)
  if (user === null) return { outcome: 'error', error: 'user_not_found' }

  await supabase.from('users').update({ plan_status: 'past_due' }).eq('id', user.id)

  await writeAudit(supabase, {
    userId: user.id,
    eventType: 'stripe.invoice.payment_failed',
    payload: {
      invoice_id: invoice.id,
      amount_due: invoice.amount_due,
      attempt_count: invoice.attempt_count,
    },
    clusterOwner: '04',
  })

  const periodEndIso = user.current_period_end ?? new Date().toISOString()
  const deadlineIso = new Date(
    new Date(periodEndIso).getTime() + PAST_DUE_GRACE_DAYS * 86_400_000
  ).toISOString()

  if (user.email !== null && user.email !== '') {
    await sendEmail(
      buildSubscriptionPaymentFailedEmail({
        recipientEmail: user.email,
        planName: PLAN_INFO[user.plan].displayName,
        deadlineIso,
        updatePaymentUrl: accountUrl() + '/billing',
        accountUrl: accountUrl(),
        unsubscribeUrl: unsubscribeUrl(user.id),
      })
    )
  }

  return { outcome: 'processed', user_id: user.id }
}
