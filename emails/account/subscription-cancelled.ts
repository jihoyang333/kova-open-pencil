// PRD 04 §5.4.3 — subscription-cancelled transactional email.
// Two variants: scheduled (cancel_at_period_end true) and final (subscription deleted).
// Founder-locked copy 2026-05-17.

import { renderEmailShell, type SendEmailInput } from '../../api/_shared/email'
import { escapeAttr, escapeHtml } from '../../api/_shared/email-escape'

export interface SubscriptionCancelledInput {
  recipientEmail: string
  planName: string
  variant: 'scheduled' | 'final'
  /** When 'scheduled': the date the cancellation takes effect.
   *  When 'final': the date the subscription ended. */
  effectiveOnIso: string
  accountUrl: string
  unsubscribeUrl: string
}

export function buildSubscriptionCancelledEmail(input: SubscriptionCancelledInput): SendEmailInput {
  const display = new Date(input.effectiveOnIso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const title = input.variant === 'scheduled'
    ? `Your ${input.planName} subscription will cancel`
    : `Your ${input.planName} subscription ended`
  const lead = input.variant === 'scheduled'
    ? `Your subscription is set to cancel on <strong>${escapeHtml(display)}</strong>. You'll keep ${escapeHtml(input.planName)} access until then.`
    : `Your subscription ended on <strong>${escapeHtml(display)}</strong>. Your account is now on the Free plan.`
  const cta = input.variant === 'scheduled'
    ? 'Manage subscription'
    : 'Restart subscription'
  const bodyHtml = `
    <p style="margin:0 0 16px">${lead}</p>
    <p style="margin:0 0 16px"><a href="${escapeAttr(input.accountUrl)}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#0d0d0c;color:#ffffff;text-decoration:none;font-weight:500">${cta}</a></p>
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

