// Shared types for api/_shared helpers.

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text: string
}

export interface EmailSendResult {
  id: string
  /**
   * `true` when the helper short-circuited because RESEND_API_KEY was absent
   * (stub mode). Callsites that surface "email sent" UX MUST branch on this
   * flag so production divergence is visible (no silent "stub" success).
   */
  skipped: boolean
}
