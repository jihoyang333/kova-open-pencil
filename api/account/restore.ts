import { writeAudit } from '../_shared/audit'
import { sendEmail } from '../_shared/email'
import { loadEnvOrSkip } from '../_shared/env'
import { verifyIdempotency, IdempotencyHttpError } from '../_shared/idempotency'
import { getAdminClient } from '../_shared/supabase-admin'
import { verifyAuthFull, UnauthenticatedError } from '../_shared/verify-auth-full'

// W8a Cluster 01 — POST /api/account/restore (Plan 01 Task 4).
// Re-activates a pending-deletion account within the 30-day window.

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const ENDPOINT = 'account.restore'

interface ResponseBody {
  success?: boolean
  error?: string
  request_id?: string
}

function jsonResponse(body: ResponseBody, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error, request_id: crypto.randomUUID() }, status)
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return errorResponse('method_not_allowed', 405)

  let auth
  try {
    auth = await verifyAuthFull(req)
  } catch (err) {
    if (err instanceof UnauthenticatedError) return errorResponse('unauthenticated', 401)
    throw err
  }

  const admin = getAdminClient()

  let idem
  try {
    idem = await verifyIdempotency(admin, req, auth.userId, ENDPOINT)
  } catch (err) {
    if (err instanceof IdempotencyHttpError) return jsonResponse({ ...err.payload, request_id: crypto.randomUUID() }, err.status)
    throw err
  }

  if (idem.cached) {
    return new Response(JSON.stringify(idem.body), { status: idem.status, headers: JSON_HEADERS })
  }

  const { data: restored, error } = await auth.supabase.rpc('restore_account')
  if (error) {
    console.error('[restore] RPC failed:', error)
    return errorResponse('internal_error', 500)
  }

  if (restored !== true) {
    const body: ResponseBody = { error: 'no_pending_deletion', request_id: crypto.randomUUID() }
    await idem.persist(409, body)
    return jsonResponse(body, 409)
  }

  const body: ResponseBody = { success: true }
  await idem.persist(200, body)

  void (async () => {
    await writeAudit(admin, {
      userId: auth.userId,
      eventType: 'account_restored',
      payload: {},
      clusterOwner: '01',
    })
    const appUrl = loadEnvOrSkip('PUBLIC_APP_URL')
    if (appUrl === null) return // No env → no outbound mail (stub mode)
    try {
      await sendEmail({
        to: auth.email,
        subject: 'Your Kova account has been restored',
        html: `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;color:#1a1a1d"><h2>Welcome back</h2><p>Your Kova account has been restored. Your data is intact and your subscription resumes where you left off.</p></body></html>`,
        text: 'Your Kova account has been restored. Welcome back.',
        unsubscribeUrl: `${appUrl}/unsubscribe`,
      })
    } catch (e) {
      console.error('[restore] Resend send failed (best-effort):', e)
    }
  })()

  return jsonResponse(body, 200)
}
