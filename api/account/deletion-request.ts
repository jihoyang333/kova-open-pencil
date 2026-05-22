import type { SupabaseClient } from '@supabase/supabase-js'

import { writeAudit } from '../_shared/audit'
import { sendEmail } from '../_shared/email'
import { loadEnvOrSkip } from '../_shared/env'
import { verifyIdempotency, IdempotencyHttpError } from '../_shared/idempotency'
import { getAdminClient } from '../_shared/supabase-admin'
import { verifyAuthFull, UnauthenticatedError } from '../_shared/verify-auth-full'

// W8a Cluster 01 — POST /api/account/deletion-request (Plan 01 Task 3).
//
// Orchestrates the GDPR Art. 17 soft-delete entry point:
//   1. Verify caller JWT.
//   2. Rate-limit (5 req/min/user — persisted via bump_rate_limit RPC).
//   3. Idempotency replay (Cluster 11 verifyIdempotency).
//   4. Call request_account_deletion RPC → sets users.deleted_at + enqueues 5 cascade steps.
//   5. Audit-log + Resend "deletion-scheduled" + sign-out (fire-and-forget; never block response).
//
// Response shapes: 200 success, 401 unauthenticated, 409 already_pending,
// 429 rate_limited, 500 internal_error.

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5
const ENDPOINT = 'account.deletion-request'

interface ResponseBody {
  success?: boolean
  scheduled_purge_at?: string
  error?: string
  retry_after_seconds?: number
  request_id?: string
}

async function bumpRateLimit(admin: SupabaseClient, userId: string): Promise<number> {
  const now = Date.now()
  const windowStart = new Date(now - (now % RATE_LIMIT_WINDOW_MS)).toISOString()
  const { data, error } = await admin.rpc('bump_rate_limit', {
    p_user_id: userId,
    p_endpoint: ENDPOINT,
    p_window_start: windowStart,
  })
  if (error) {
    // Fail-open: DB outage shouldn't 500 the user; cap re-applies on next request.
    console.error('[deletion-request] bump_rate_limit failed (fail-open):', error)
    return 0
  }
  return data as number
}

function jsonResponse(body: ResponseBody, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function errorResponse(error: string, status: number, extra: Partial<ResponseBody> = {}): Response {
  return jsonResponse({ error, request_id: crypto.randomUUID(), ...extra }, status)
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', 405)
  }

  let auth
  try {
    auth = await verifyAuthFull(req)
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return errorResponse('unauthenticated', 401)
    }
    throw err
  }

  const admin = getAdminClient()

  const count = await bumpRateLimit(admin, auth.userId)
  if (count > RATE_LIMIT_MAX) {
    return errorResponse('rate_limited', 429, { retry_after_seconds: 60 })
  }

  let idem
  try {
    idem = await verifyIdempotency(admin, req, auth.userId, ENDPOINT)
  } catch (err) {
    if (err instanceof IdempotencyHttpError) {
      return jsonResponse({ ...err.payload, request_id: crypto.randomUUID() }, err.status)
    }
    throw err
  }

  if (idem.cached) {
    return new Response(JSON.stringify(idem.body), { status: idem.status, headers: JSON_HEADERS })
  }

  const { data: scheduledAt, error } = await auth.supabase.rpc('request_account_deletion')

  if (error) {
    if (error.message?.includes('Already pending') || error.code === 'P0001') {
      const body: ResponseBody = { error: 'already_pending', request_id: crypto.randomUUID() }
      await idem.persist(409, body)
      return jsonResponse(body, 409)
    }
    console.error('[deletion-request] RPC failed:', error)
    return errorResponse('internal_error', 500)
  }

  const body: ResponseBody = { success: true, scheduled_purge_at: scheduledAt as string }
  await idem.persist(200, body)

  // Fire-and-forget: audit-log + email never block the user response.
  void (async () => {
    await writeAudit(admin, {
      userId: auth.userId,
      eventType: 'deletion_requested',
      payload: { scheduled_purge_at: scheduledAt as string },
      clusterOwner: '01',
    })
    const appUrl = loadEnvOrSkip('PUBLIC_APP_URL')
    if (appUrl === null) return // No env → no outbound mail (stub mode)
    try {
      await sendEmail({
        to: auth.email,
        subject: 'Your Kova account is scheduled for deletion',
        html: deletionScheduledHtml(scheduledAt as string, `${appUrl}/account-pending-deletion`),
        text: deletionScheduledText(scheduledAt as string, `${appUrl}/account-pending-deletion`),
        unsubscribeUrl: `${appUrl}/unsubscribe`,
      })
    } catch (e) {
      console.error('[deletion-request] Resend send failed (best-effort):', e)
    }
  })()

  return jsonResponse(body, 200)
}

function deletionScheduledHtml(scheduledAt: string, restoreUrl: string): string {
  return `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;color:#1a1a1d">
<h2>Your Kova account is scheduled for deletion</h2>
<p>We've received your request. Your data will be permanently removed on <b>${escapeHtml(scheduledAt)}</b>.</p>
<p>Changed your mind? <a href="${escapeAttr(restoreUrl)}">Restore your account</a> any time within the next 30 days by signing in.</p>
<p style="color:#6e6e73;font-size:12px">If you didn't request this, reply to this email immediately.</p>
</body></html>`
}

function deletionScheduledText(scheduledAt: string, restoreUrl: string): string {
  return `Your Kova account is scheduled for deletion on ${scheduledAt}.\n\nRestore within 30 days: ${restoreUrl}\n\nIf you didn't request this, reply immediately.`
}

function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replaceAll('"', '&quot;')
}
