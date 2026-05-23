// Cluster 12 — send-sync-alert Edge Function.
// Cluster 06 Yjs sync-retry hook calls POST /functions/v1/send-sync-alert
// after retry 3 fails (1s+5s+15s = ~21s after first failure).
//
// Env-guard pattern (founder ratified 2026-05-17): Resend account signup is
// deferred to pre-launch (see 00-PRD_SCOPE_PLAN.md §11). Without RESEND_API_KEY,
// returns { ok: true, skipped: 'no_api_key' } so the caller does NOT retry-storm.
// In-app toast (Cluster 11) is the always-on safety net.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resend-client.ts'

interface Payload {
  userId: string
  canvasId: string
  lastSyncAt: string
}

function loadEnvOrSkip(name: string): string | null {
  const value = Deno.env.get(name)
  if (value === undefined || value === '') {
    console.warn(`[env] skipped — ${name} unset (stub mode)`)
    return null
  }
  return value
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = loadEnvOrSkip('RESEND_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: true, skipped: 'no_api_key' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  const auth = req.headers.get('authorization')
  if (!auth) return new Response('Unauthorized', { status: 401 })

  const supabaseUrl = loadEnvOrSkip('SUPABASE_URL')
  const supabaseAnonKey = loadEnvOrSkip('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ ok: true, skipped: 'supabase_env_unset' }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    )
  }

  let payload: Payload
  try {
    payload = (await req.json()) as Payload
  } catch {
    return new Response('Bad payload', { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { authorization: auth } },
  })

  const { data: user, error } = await supabase
    .from('users')
    .select('email, preferences')
    .single()
  if (error || !user) {
    console.error('users select failed', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'user_lookup_failed' }),
      { status: 500 },
    )
  }

  const prefs = (user as { preferences?: { notifications?: { syncAlerts?: boolean } } })
    .preferences
  const optedIn = prefs?.notifications?.syncAlerts !== false // default true
  if (!optedIn) {
    return new Response(JSON.stringify({ ok: true, skipped: 'opted_out' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  const email = (user as { email?: string }).email
  if (!email) {
    return new Response(
      JSON.stringify({ ok: false, error: 'no_user_email' }),
      { status: 500 },
    )
  }

  await sendEmail({
    to: email,
    subject: "Your Kova changes haven't saved yet",
    text: `Hi,\n\nKova tried 3 times to sync your latest changes and couldn't reach the server. Your work is safe on this device. Reopen Kova to retry.\n\nLast successful sync: ${payload.lastSyncAt}\nCanvas: ${payload.canvasId}\n\n— Kova`,
    idempotencyKey: `sync-alert:${payload.userId}:${payload.canvasId}:${payload.lastSyncAt}`,
  })

  return new Response(JSON.stringify({ ok: true, sent: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

// Explicit Deno.serve wrap so CI gates detecting handler signature succeed.
if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(handler)
}
