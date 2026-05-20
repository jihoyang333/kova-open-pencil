// Resend `sendEmail()` wrapper (Cluster 11 Plan Task 1.6 — STUB until pre-launch).
//
// At MVP, Resend is not wired (founder lock #19 / project_external_accounts_deferred).
// Returns a sentinel id + `skipped: true` when RESEND_API_KEY is unset so
// production divergence is observable (a) via the loadEnvOrSkip breadcrumb,
// (b) at Sentry once pre-launch §11 wiring lands, (c) in callsites that surface
// 'email sent' UX (these MUST branch on `skipped`).

import { loadEnvOrSkip } from './env'
import type { EmailPayload, EmailSendResult } from './types'

export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  void payload
  const apiKey = loadEnvOrSkip('RESEND_API_KEY')
  if (!apiKey) {
    return { id: `stub_${crypto.randomUUID()}`, skipped: true }
  }
  // TODO(pre-launch §11): import { Resend } from 'resend' + resend.emails.send(payload)
  throw new Error('Resend live mode not yet wired — stub fallback only')
}
