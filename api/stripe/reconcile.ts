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
  batches?: number
  stub?: boolean
  truncated?: boolean
  error?: string
}

function jsonResponse(body: ReconcileResponse, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

// Hard cap on batches per invocation so a flood of past_due rows can't blow
// the cron's wall-clock budget. With BATCH_LIMIT=100 and MAX_BATCHES=10
// we can heal up to 1000 users per invocation; any tail is picked up next
// week (or by the next cron tick if the founder shortens the schedule).
const MAX_BATCHES = 10

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

  const stripe = getStripeClient()
  let totalChecked = 0
  let totalHealed = 0
  let batches = 0
  let cursorIso: string | null = null
  let truncated = false

  // Cursor pagination by (current_period_end, id) keyset; safer than offset
  // since we mutate the matching set as we heal (rows drop out of the filter).
  // The ORDER BY current_period_end ASC matches idx_users_past_due.
  for (let i = 0; i < MAX_BATCHES; i++) {
    let query = admin
      .from('users')
      .select('id, stripe_subscription_id, plan_status, current_period_end')
      .eq('plan_status', 'past_due')
      .not('stripe_subscription_id', 'is', null)
      .order('current_period_end', { ascending: true, nullsFirst: true })
      .limit(BATCH_LIMIT)
    if (cursorIso !== null) {
      query = query.gt('current_period_end', cursorIso)
    }
    const { data: pastDue, error } = await query
    if (error) {
      return jsonResponse({ ok: false, error: error.message, batches, checked: totalChecked, healed: totalHealed }, 500)
    }
    const rows = pastDue ?? []
    if (rows.length === 0) break
    batches += 1
    totalChecked += rows.length

    for (const u of rows) {
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
        totalHealed += 1
      }
    }

    // Advance cursor to the last row's current_period_end. NULL stays at
    // the head of the next page if more nulls exist (rare; defensive).
    const last = rows[rows.length - 1]
    const lastEnd = (last as { current_period_end: string | null }).current_period_end
    if (lastEnd !== null && lastEnd !== '') {
      cursorIso = lastEnd
    } else if (rows.length < BATCH_LIMIT) {
      break
    }
    if (rows.length < BATCH_LIMIT) break
  }

  if (batches === MAX_BATCHES) {
    truncated = true
    console.warn(`[stripe/reconcile] hit MAX_BATCHES=${MAX_BATCHES} cap — ${totalChecked} checked / ${totalHealed} healed; tail rolls to next invocation`)
  }

  return jsonResponse({ ok: true, checked: totalChecked, healed: totalHealed, batches, truncated }, 200)
}
