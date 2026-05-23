// PRD 04 §5.1.5 — POST /api/stripe/reconcile.
//
// Weekly cron handler. Drift-heals users stuck in past_due whose Stripe
// subscription is now active (covers webhook miss). Wired in vercel.json.
//
// Stub-guard: missing CRON_SECRET → 503 { stub: true }.

import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import { loadEnvOrSkip, requireEnv } from '../_shared/env'
import { writeAudit } from '../_shared/audit'
import { getStripeClient } from '../_shared/stripe-client'

export const config = { runtime: 'edge' as const } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const BATCH_LIMIT = 100

interface ReconcileResponse {
  ok: boolean
  checked?: number
  healed?: number
  stub?: boolean
  error?: string
}

function jsonResponse(body: ReconcileResponse, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405)
  }

  const cronSecret = loadEnvOrSkip('CRON_SECRET')
  if (cronSecret === null) {
    return jsonResponse({ ok: false, stub: true, error: 'CRON_SECRET not configured' }, 503)
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = requireEnv('VITE_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: pastDue, error } = await admin
    .from('users')
    .select('id, stripe_subscription_id, plan_status, current_period_end')
    .eq('plan_status', 'past_due')
    .not('stripe_subscription_id', 'is', null)
    .limit(BATCH_LIMIT)
  if (error) {
    return jsonResponse({ ok: false, error: error.message }, 500)
  }

  const stripe = getStripeClient()
  let healed = 0
  for (const u of pastDue ?? []) {
    const subId = u.stripe_subscription_id as string | null
    if (subId === null || subId === '') continue
    let sub: Stripe.Subscription
    try {
      sub = await stripe.subscriptions.retrieve(subId)
    } catch {
      continue
    }
    if (sub.status === 'active') {
      await admin.from('users').update({ plan_status: 'active' }).eq('id', u.id)
      await writeAudit(admin, {
        userId: u.id as string,
        eventType: 'stripe.reconcile.heal',
        payload: { subscription_id: subId, prior_status: 'past_due' },
        clusterOwner: '04',
      })
      healed += 1
    }
  }

  return jsonResponse({ ok: true, checked: pastDue?.length ?? 0, healed }, 200)
}
