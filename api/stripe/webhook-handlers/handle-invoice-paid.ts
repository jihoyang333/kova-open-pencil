// PRD 04 §5.1.3 — invoice.paid handler.
//
// Heal from past_due if needed. Audit the invoice.

import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import { writeAudit } from '../../_shared/audit'

import { findUserByStripeCustomerId } from './_helpers'
import type { HandlerResult } from './handle-checkout-completed'

export async function handleInvoicePaid(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<HandlerResult> {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (customerId === undefined || customerId === '') return { outcome: 'error', error: 'missing_customer' }

  const user = await findUserByStripeCustomerId(supabase, customerId)
  if (user === null) return { outcome: 'error', error: 'user_not_found' }

  if (user.plan_status === 'past_due') {
    await supabase.from('users').update({ plan_status: 'active' }).eq('id', user.id)
  }

  await writeAudit(supabase, {
    userId: user.id,
    eventType: 'stripe.invoice.paid',
    payload: {
      invoice_id: invoice.id,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
    },
    clusterOwner: '04',
  })

  return { outcome: 'processed', user_id: user.id }
}
