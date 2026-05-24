// PRD 12 §5.4 — POST /api/send-sync-alert.
//
// Cluster 06's Yjs sync-retry hook calls this endpoint after the third
// failed sync attempt (~1s + 5s + 15s = ~21s after first failure). Sends
// a dunning-style email to the authenticated user iff
// `users.preferences.notifications.syncAlerts !== false`.
//
// Architecturally a Vercel Edge function (not a Supabase Edge function) to
// align with Cluster 01/04 — one deploy target, one Resend wrapper
// (api/_shared/email.ts), one auth helper (api/_shared/auth.ts). The
// previous Deno/Supabase-Edge implementation has been removed in this same
// commit; the stub `supabase/functions/_shared/resend-client.ts` it
// imported from is also deleted.
//
// Env-guard pattern (founder ratified 2026-05-17 — Resend account signup
// deferred to pre-launch per scope-plan §11): missing RESEND_API_KEY →
// sendEmail() returns { ok: true, skipped: true } and so does this handler,
// preventing retry-storms from upstream callers. The in-app toast
// (Cluster 11) remains the always-on safety net.
//
// Idempotency: sync-alert volume is rare (only fires after 3 consecutive
// Yjs sync failures, which itself is a degraded-network condition) so
// per-call Resend idempotency-key support is not wired here. Resend
// natively rejects exact-duplicate sends within a few minutes which covers
// the realistic dup window. If higher dedup is needed later, add a
// `sync_alerts_sent` table with PK on (user_id, canvas_id, last_sync_at).

import { createClient } from '@supabase/supabase-js'

import { writeAudit } from './_shared/audit'
import { authenticateRequest } from './_shared/auth'
import { renderEmailShell, sendEmail } from './_shared/email'

export const config = { runtime: 'edge' as const } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

interface Payload {
  canvasId: string
  lastSyncAt: string
}

interface SyncAlertResponse {
  ok: boolean
  sent?: boolean
  skipped?: 'no_api_key' | 'opted_out' | 'no_user_email' | 'server_misconfigured'
  error?: string
}

function jsonResponse(status: number, body: SyncAlertResponse): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function isPayload(value: unknown): value is Payload {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.canvasId === 'string' && v.canvasId !== ''
    && typeof v.lastSyncAt === 'string' && v.lastSyncAt !== ''
}

function appUrl(): string {
  const base = process.env.VITE_APP_URL
  if (base === undefined || base === '') {
    throw new Error('Missing required environment variable: VITE_APP_URL.')
  }
  return base.replace(/\/$/, '')
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'method_not_allowed' })
  }

  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) return authResult
  const { userId } = authResult

  let payload: Payload
  try {
    const raw: unknown = await req.json()
    if (!isPayload(raw)) {
      return jsonResponse(400, { ok: false, error: 'invalid_payload' })
    }
    payload = raw
  } catch {
    return jsonResponse(400, { ok: false, error: 'invalid_json' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl === undefined || supabaseUrl === '' || serviceRoleKey === undefined || serviceRoleKey === '') {
    return jsonResponse(500, { ok: false, skipped: 'server_misconfigured' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const auditPayload = { canvasId: payload.canvasId, lastSyncAt: payload.lastSyncAt }

  // users.email is mirrored from auth.users; preferences ships in
  // Cluster 01's 20260522_01_users_account_lifecycle migration.
  const { data: userRow, error: userErr } = await admin
    .from('users')
    .select('preferences')
    .eq('id', userId)
    .maybeSingle()
  if (userErr) {
    console.error(`[send-sync-alert] users select failed (${userErr.code}): ${userErr.message}`)
    void writeAudit(admin, {
      userId,
      eventType: 'sync_alert.failed_user_lookup',
      payload: { ...auditPayload, error: userErr.message, code: userErr.code },
      clusterOwner: '12',
    })
    return jsonResponse(500, { ok: false, error: 'user_lookup_failed' })
  }
  if (userRow === null) {
    void writeAudit(admin, {
      userId,
      eventType: 'sync_alert.failed_user_not_found',
      payload: auditPayload,
      clusterOwner: '12',
    })
    return jsonResponse(404, { ok: false, error: 'user_not_found' })
  }

  const prefs = (userRow.preferences as { notifications?: { syncAlerts?: boolean } } | null) ?? {}
  const optedIn = prefs.notifications?.syncAlerts !== false
  if (!optedIn) {
    void writeAudit(admin, {
      userId,
      eventType: 'sync_alert.skipped_opted_out',
      payload: auditPayload,
      clusterOwner: '12',
    })
    return jsonResponse(200, { ok: true, skipped: 'opted_out' })
  }

  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(userId)
  if (authErr || authUser?.user === null || authUser?.user === undefined) {
    void writeAudit(admin, {
      userId,
      eventType: 'sync_alert.failed_auth_lookup',
      payload: { ...auditPayload, error: authErr?.message ?? 'no_user' },
      clusterOwner: '12',
    })
    return jsonResponse(500, { ok: false, error: 'auth_lookup_failed' })
  }
  const email = authUser.user.email
  if (typeof email !== 'string' || email === '') {
    void writeAudit(admin, {
      userId,
      eventType: 'sync_alert.skipped_no_user_email',
      payload: auditPayload,
      clusterOwner: '12',
    })
    return jsonResponse(200, { ok: true, skipped: 'no_user_email' })
  }

  const accountSettings = `${appUrl()}/account/profile`
  const unsubscribe = `${appUrl()}/account/profile?email_unsubscribe=${userId}`
  const lastSyncDisplay = new Date(payload.lastSyncAt).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })

  const bodyHtml = `
    <p style="margin:0 0 16px">Kova tried three times to sync your latest changes and couldn't reach the server. Your work is safe on this device.</p>
    <p style="margin:0 0 16px">Reopen Kova to retry the sync.</p>
    <p style="margin:0 0 16px">Last successful sync: <strong>${lastSyncDisplay}</strong><br>Canvas: <code>${payload.canvasId}</code></p>
  `

  const result = await sendEmail({
    to: email,
    subject: "Your Kova changes haven't saved yet",
    html: renderEmailShell({
      title: "Your Kova changes haven't saved yet",
      bodyHtml,
      recipientEmail: email,
      settingsUrl: accountSettings,
      unsubscribeUrl: unsubscribe,
    }),
    unsubscribeUrl: unsubscribe,
  })

  if (result.skipped === true) {
    void writeAudit(admin, {
      userId,
      eventType: 'sync_alert.skipped_no_api_key',
      payload: auditPayload,
      clusterOwner: '12',
    })
    return jsonResponse(200, { ok: true, skipped: 'no_api_key' })
  }
  if (!result.ok) {
    console.error(`[send-sync-alert] Resend send failed: ${result.error ?? 'unknown'}`)
    void writeAudit(admin, {
      userId,
      eventType: 'sync_alert.failed_send',
      payload: { ...auditPayload, error: result.error ?? 'unknown' },
      clusterOwner: '12',
    })
    return jsonResponse(502, { ok: false, error: 'send_failed' })
  }
  void writeAudit(admin, {
    userId,
    eventType: 'sync_alert.sent',
    payload: auditPayload,
    clusterOwner: '12',
  })
  return jsonResponse(200, { ok: true, sent: true })
}
