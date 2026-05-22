import { z } from 'zod'

import { writeAudit } from '../_shared/audit'
import { sendEmail } from '../_shared/email'
import { loadEnvOrSkip } from '../_shared/env'
import { verifyIdempotency, IdempotencyHttpError } from '../_shared/idempotency'
import { getAdminClient } from '../_shared/supabase-admin'
import { verifyAuthFull, UnauthenticatedError } from '../_shared/verify-auth-full'

// W8a Cluster 01 — POST /api/auth/email-change-request (Plan 01 Task 5).
// Supabase admin.updateUserById triggers the verify-link to the NEW email.
// We additionally notify the OLD address per OWASP recommendation (B5.1 sub-line).
// Zod permitted in Edge Functions per founder lock #4 (tool-layer-only ban).

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const ENDPOINT = 'auth.email-change-request'

const BodySchema = z.object({ new_email: z.string().email() })

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

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  } catch {
    return errorResponse('invalid_email', 400)
  }

  const { error } = await admin.auth.admin.updateUserById(auth.userId, { email: body.new_email })
  if (error) {
    if (error.message.toLowerCase().includes('exist')) {
      const out: ResponseBody = { error: 'email_in_use', request_id: crypto.randomUUID() }
      await idem.persist(409, out)
      return jsonResponse(out, 409)
    }
    console.error('[email-change] updateUserById failed:', error)
    return errorResponse('internal_error', 500)
  }

  const out: ResponseBody = { success: true }
  await idem.persist(200, out)

  void (async () => {
    await writeAudit(admin, {
      userId: auth.userId,
      eventType: 'email_change_requested',
      payload: { old_email: auth.email, new_email: body.new_email },
      clusterOwner: '01',
    })
    const appUrl = loadEnvOrSkip('PUBLIC_APP_URL')
    if (appUrl === null) return // No env → no outbound mail (stub mode)
    try {
      await sendEmail({
        to: auth.email,
        subject: 'Email change requested on your Kova account',
        html: `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;color:#1a1a1d"><h2>Email change requested</h2><p>We received a request to change the email on your Kova account from <b>${escapeHtml(auth.email)}</b> to <b>${escapeHtml(body.new_email)}</b>.</p><p>If this wasn't you, reply to this email immediately — the change is reversible until verified.</p></body></html>`,
        text: `We received a request to change your Kova email from ${auth.email} to ${body.new_email}. If this wasn't you, reply immediately.`,
        unsubscribeUrl: `${appUrl}/unsubscribe`,
      })
    } catch (e) {
      console.error('[email-change] old-address notify failed:', e)
    }
  })()

  return jsonResponse(out, 200)
}

function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
