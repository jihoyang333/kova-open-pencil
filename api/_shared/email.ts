// Resend `sendEmail()` wrapper (Cluster 11 Plan Task 1.6 — STUB until pre-launch).
//
// At MVP, Resend is not wired (founder lock #19 / project_external_accounts_deferred).
// Returns a sentinel id + `skipped: true` when RESEND_API_KEY is unset so
// production divergence is observable (a) via the loadEnvOrSkip breadcrumb,
// (b) at Sentry once pre-launch §11 wiring lands, (c) in callsites that surface
// 'email sent' UX (these MUST branch on `skipped`).

import { loadEnvOrSkip } from './env'
import type { EmailPayload, EmailSendResult } from './types'

// Until pre-launch §11 lands real Resend wiring, the function always returns
// stub-mode regardless of RESEND_API_KEY. Setting the key by itself does not
// flip live-mode on — both the key AND the live branch must be present. This
// avoids a partial-config trap where a dev sets the key in `.env.local` and
// every email send 500s. When pre-launch §11 wires Resend, replace this
// stub-only path with the gated live branch below.
export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  void payload
  const apiKey = loadEnvOrSkip('RESEND_API_KEY')
  if (!apiKey) {
    return { id: `stub_${crypto.randomUUID()}`, skipped: true }
  }
  // TODO(pre-launch §11): replace this `console.warn` + stub return with:
  //   const { Resend } = await import('resend')
  //   const client = new Resend(apiKey)
  //   const { data, error } = await client.emails.send(payload)
  //   if (error) throw new Error(error.message)
  //   return { id: data.id, skipped: false }
  console.warn(
    '[sendEmail] RESEND_API_KEY is set but live mode is not yet wired — falling back to stub. Pre-launch §11 must wire Resend before production use.',
  )
  return { id: `stub_${crypto.randomUUID()}`, skipped: true }
}
