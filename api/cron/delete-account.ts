import { captureServerException } from '../_shared/sentry'
import { getAdminClient } from '../_shared/supabase-admin'
import { verifyCronSecret } from '../_shared/verify-cron-secret'

import { runStep as runAnthropic } from './steps/anthropic'
import { runStep as runDb } from './steps/db'
import { runStep as runShopify } from './steps/shopify'
import { runStep as runStorage } from './steps/storage'
import { runStep as runStripe } from './steps/stripe'

// W8a Cluster 01 — POST /api/cron/delete-account (Plan 01 Task 7).
//
// Daily cron (03:00 UTC). Walks pending+in_progress queue rows step-by-step
// in fixed order: stripe → shopify → anthropic → storage → db. Per-row claim
// uses FOR UPDATE SKIP LOCKED so concurrent isolates don't race. Terminal
// failures cap at 5 attempts + page Sentry.

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

const STEP_RUNNERS = {
  stripe: runStripe,
  shopify: runShopify,
  anthropic: runAnthropic,
  storage: runStorage,
  db: runDb,
} as const

const STEP_ORDER = ['stripe', 'shopify', 'anthropic', 'storage', 'db'] as const

const MAX_ATTEMPTS = 5
const BATCH_USERS = 100

interface ClaimRow {
  id: string
  attempts: number
}

interface PendingUser {
  user_id: string
}

interface ResponseBody {
  processed: number
  succeeded: number
  failed: number
  terminal: number
}

export default async function handler(req: Request): Promise<Response> {
  if (!verifyCronSecret(req)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: JSON_HEADERS })
  }

  const supabase = getAdminClient()
  const counts: ResponseBody = { processed: 0, succeeded: 0, failed: 0, terminal: 0 }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: pendingUsers, error: claimErr } = await supabase.rpc('claim_pending_deletion_users', {
    p_cutoff: cutoff,
    p_limit: BATCH_USERS,
  })

  if (claimErr) {
    console.error('[cron/delete-account] claim_pending_deletion_users failed:', claimErr)
    return new Response(JSON.stringify({ error: 'rpc_unavailable' }), { status: 500, headers: JSON_HEADERS })
  }

  const users = (pendingUsers as PendingUser[] | null) ?? []

  for (const { user_id: userId } of users) {
    counts.processed++
    let userFailed = false

    for (const step of STEP_ORDER) {
      const idempotencyKey = `del:${userId}:${step}`

      // RPC RETURNS TABLE — supabase-js may surface as array or null.
      const { data: claimRaw, error: rpcErr } = await supabase.rpc('claim_deletion_queue_row', {
        p_user_id: userId,
        p_step: step,
        p_max_attempts: MAX_ATTEMPTS,
      })
      if (rpcErr) {
        console.error(`[cron] claim_deletion_queue_row failed for ${userId}/${step}:`, rpcErr)
        userFailed = true
        break
      }
      const row: ClaimRow | undefined = Array.isArray(claimRaw) ? (claimRaw[0] as ClaimRow | undefined) : (claimRaw as ClaimRow | null) ?? undefined
      if (!row) continue // Already succeeded OR exceeded attempts

      const result = await STEP_RUNNERS[step]({ supabase, userId, idempotencyKey })

      if (result.ok) {
        await supabase
          .from('gdpr_deletion_queue')
          .update({ status: 'succeeded', succeeded_at: new Date().toISOString() })
          .match({ user_id: userId, step })
      } else {
        const isTerminal = !result.retriable || row.attempts >= MAX_ATTEMPTS
        const newStatus = isTerminal ? 'failed_terminal' : 'pending'
        await supabase
          .from('gdpr_deletion_queue')
          .update({ status: newStatus, error: result.error })
          .match({ user_id: userId, step })

        if (isTerminal) {
          counts.terminal++
          captureServerException(
            new Error(`GDPR cron terminal failure: ${userId}/${step}: ${result.error}`),
            { cluster: '01', step, user_id: userId }
          )
        } else {
          counts.failed++
        }
        userFailed = true
        break
      }
    }
    if (!userFailed) counts.succeeded++
  }

  return new Response(JSON.stringify(counts), { status: 200, headers: JSON_HEADERS })
}
