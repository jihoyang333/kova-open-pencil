import type { SupabaseClient } from '@supabase/supabase-js'
import { captureException } from './sentry'

// W1 Cluster 11 / W0-1 / founder lock #11.
// Cross-cut audit-log writer. Edge Functions in Clusters 01/03/04/05 use this
// helper rather than raw INSERT so audit_log writes never break the
// user-facing request path. The helper SWALLOWS DB errors after sentry-capture
// so audit-log loss is preferred to losing the parent mutation.
//
// 42P01 (table missing) is the canonical "Plan 11 not yet applied in this env"
// signal — also swallowed.

export interface AuditEvent {
  userId: string | null
  eventType: string
  payload?: Record<string, unknown>
  clusterOwner: string
}

export async function writeAudit(
  supabaseAdmin: SupabaseClient,
  event: AuditEvent,
): Promise<void> {
  const row = {
    user_id: event.userId,
    event_type: event.eventType,
    payload: event.payload ?? {},
    cluster_owner: event.clusterOwner,
  }
  const { error } = await supabaseAdmin.from('audit_log').insert(row)
  if (error) {
    captureException(
      new Error(`writeAudit failed (${error.code}): ${error.message}`),
      {
        tags: {
          helper: 'writeAudit',
          eventType: event.eventType,
          clusterOwner: event.clusterOwner,
        },
      },
    )
  }
}
