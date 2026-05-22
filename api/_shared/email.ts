import { Resend } from 'resend'

import { loadEnvOrSkip } from './env'

// W6 Cluster 11 Phase 5c — Resend sendEmail() wrapper (Plan 11 Task 1.6).
//
// Env-guarded stub. Missing RESEND_API_KEY → no-op + warn breadcrumb + returns
// `{ ok: true, skipped: true }`. Real account wired pre-launch per scope-plan
// §11 + memory `project_external_accounts_deferred`.
//
// List-Unsubscribe header injected per CAN-SPAM. CLAUDE.md "Email" mandate.
// `from` defaults to `Kova <noreply@kova.app>` — override per call site.
//
// Render helper: `renderEmailShell()` mirrors the EmailShell.vue token set
// (hex flattened — many clients strip CSS vars) without depending on Vue SSR
// at runtime. Pre-launch can swap to vue-email if richer composition needed.

export interface SendEmailInput {
  to: string | string[]
  subject: string
  /** Pre-rendered HTML body. Prefer renderEmailShell() to keep brand chrome consistent. */
  html: string
  /** Plain-text fallback. If omitted Resend auto-derives one. */
  text?: string
  /** `from` override. Defaults to noreply@kova.app. */
  from?: string
  /** Optional `Reply-To`. Defaults absent. */
  replyTo?: string
  /** List-Unsubscribe target (mailto: or https://). Required by Gmail Postmaster. */
  unsubscribeUrl: string
}

export interface SendEmailResult {
  ok: boolean
  skipped?: boolean
  id?: string
  error?: string
}

let cachedClient: Resend | null = null

function getClient(): Resend | null {
  if (cachedClient) return cachedClient
  const key = loadEnvOrSkip('RESEND_API_KEY')
  if (key === null) return null
  cachedClient = new Resend(key)
  return cachedClient
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getClient()
  if (client === null) {
    console.warn(
      `[email] skipped (no RESEND_API_KEY): to=${Array.isArray(input.to) ? input.to.join(',') : input.to} subject=${JSON.stringify(input.subject)}`
    )
    return { ok: true, skipped: true }
  }

  try {
    const { data, error } = await client.emails.send({
      from: input.from ?? 'Kova <noreply@kova.app>',
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      headers: {
        'List-Unsubscribe': `<${input.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })
    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: true, id: data?.id }
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown_send_error',
    }
  }
}

// =============================================================================
// renderEmailShell — template-string mirror of src/components/email/EmailShell.vue
// =============================================================================
// Why a template string: server-rendering a full Vue SFC at Edge-Function call
// time pulls the entire vue runtime into the function bundle. A frozen string
// template keeps the Edge cold-start fast. When EmailShell.vue changes, this
// helper must be updated in lockstep — covered by visual-diff Playwright spec
// in a future cluster wave.

export interface RenderEmailShellInput {
  title: string
  bodyHtml: string
  recipientEmail: string
  /** URL to email preferences page (footer link). */
  settingsUrl: string
  /** URL the List-Unsubscribe header points at. */
  unsubscribeUrl: string
  /** Override wordmark. Defaults to /public/email/wordmark@2x.png. */
  wordmarkUrl?: string
}

// Hex values flattened from --page / --ink / --ink-2 / --ink-3 / --line /
// --accent in canonical kova-hifi.css. Many email clients strip CSS vars.
const PAGE = '#ffffff'
const INK = '#0d0d0c'
const INK_2 = '#4f5060'
const INK_3 = '#82828a'
const LINE = '#e9e9eb'

export function renderEmailShell(input: RenderEmailShellInput): string {
  const wordmark = input.wordmarkUrl ?? '/email/wordmark@2x.png'
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${escape(input.title)}</title></head>
<body style="margin:0;padding:0;background:${PAGE};color:${INK};font-family:Inter,system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.5">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;border:1px solid ${LINE};border-radius:8px;background:${PAGE}">
        <tr><td style="padding:24px 32px;border-bottom:1px solid ${LINE}">
          <img src="${escape(wordmark)}" width="92" height="24" alt="Kova" style="display:block">
        </td></tr>
        <tr><td style="padding:24px 32px;color:${INK}">
          <h1 style="margin:0 0 16px;font-size:20px;color:${INK};font-weight:600">${escape(input.title)}</h1>
          ${input.bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid ${LINE};color:${INK_3};font-size:12px;line-height:1.4">
          Sent to ${escape(input.recipientEmail)}.
          <a href="${escape(input.settingsUrl)}" style="color:${INK_2};text-decoration:underline">Email preferences</a> ·
          <a href="${escape(input.unsubscribeUrl)}" style="color:${INK_2};text-decoration:underline">Unsubscribe</a><br>
          &copy; ${year} Kova
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
