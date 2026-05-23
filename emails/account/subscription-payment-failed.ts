// PRD 04 §5.4.3 — payment-failed dunning email.
// Founder-locked copy 2026-05-17: deadline = current_period_end + 7 days.

import { renderEmailShell, type SendEmailInput } from '../../api/_shared/email'
import { escapeAttr, escapeHtml } from '../../api/_shared/email-escape'

export interface SubscriptionPaymentFailedInput {
  recipientEmail: string
  planName: string
  /** Past-due grace deadline ISO date. */
  deadlineIso: string
  /** Stripe Customer Portal URL or Kova billing page URL. */
  updatePaymentUrl: string
  accountUrl: string
  unsubscribeUrl: string
}

export function buildSubscriptionPaymentFailedEmail(
  input: SubscriptionPaymentFailedInput
): SendEmailInput {
  const deadlineDisplay = new Date(input.deadlineIso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const title = "We couldn't process your payment"
  const bodyHtml = `
    <p style="margin:0 0 16px">Your ${escapeHtml(input.planName)} subscription payment failed.</p>
    <p style="margin:0 0 16px">Update your card before <strong>${escapeHtml(deadlineDisplay)}</strong> to keep your subscription. Otherwise your account will move to the Free plan.</p>
    <p style="margin:0 0 16px"><a href="${escapeAttr(input.updatePaymentUrl)}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#0d0d0c;color:#ffffff;text-decoration:none;font-weight:500">Update payment method</a></p>
  `
  return {
    to: input.recipientEmail,
    subject: title,
    html: renderEmailShell({
      title,
      bodyHtml,
      recipientEmail: input.recipientEmail,
      settingsUrl: input.accountUrl,
      unsubscribeUrl: input.unsubscribeUrl,
    }),
    unsubscribeUrl: input.unsubscribeUrl,
  }
}

