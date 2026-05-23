// PRD 04 §5.4.3 — new-subscription transactional email.
// Founder-locked copy 2026-05-17. Composes EmailShell via renderEmailShell.

import { renderEmailShell, type SendEmailInput } from '../../api/_shared/email'

export interface SubscriptionNewInput {
  recipientEmail: string
  planName: string
  startedOnIso: string
  invoiceUrl: string | null
  accountUrl: string
  unsubscribeUrl: string
}

export function buildSubscriptionNewEmail(input: SubscriptionNewInput): SendEmailInput {
  const startedDisplay = new Date(input.startedOnIso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const title = `Welcome to ${input.planName}`
  const invoiceLink = input.invoiceUrl
    ? `<p style="margin:0 0 16px"><a href="${escapeAttr(input.invoiceUrl)}" style="color:#4f5060;text-decoration:underline">View your first invoice</a>.</p>`
    : ''
  const bodyHtml = `
    <p style="margin:0 0 16px">Your Kova subscription is active.</p>
    <p style="margin:0 0 16px">Plan: <strong>${escapeHtml(input.planName)}</strong><br>
    Started: ${escapeHtml(startedDisplay)}</p>
    ${invoiceLink}
    <p style="margin:0 0 16px"><a href="${escapeAttr(input.accountUrl)}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#0d0d0c;color:#ffffff;text-decoration:none;font-weight:500">Open account</a></p>
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
