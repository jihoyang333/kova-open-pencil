// PRD 04 §5.4.3 — subscription-upgraded transactional email.
// Founder-locked copy 2026-05-17.

import { renderEmailShell, type SendEmailInput } from '../../api/_shared/email'

export interface SubscriptionUpgradedInput {
  recipientEmail: string
  newPlanName: string
  effectiveOnIso: string
  accountUrl: string
  unsubscribeUrl: string
}

export function buildSubscriptionUpgradedEmail(input: SubscriptionUpgradedInput): SendEmailInput {
  const effectiveDisplay = new Date(input.effectiveOnIso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const title = `You're now on ${input.newPlanName}`
  const bodyHtml = `
    <p style="margin:0 0 16px">Your new plan is active.</p>
    <p style="margin:0 0 16px">Plan: <strong>${escapeHtml(input.newPlanName)}</strong><br>
    Effective: ${escapeHtml(effectiveDisplay)}</p>
    <p style="margin:0 0 16px"><a href="${escapeAttr(input.accountUrl)}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#0d0d0c;color:#ffffff;text-decoration:none;font-weight:500">View plan details</a></p>
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;')
}
