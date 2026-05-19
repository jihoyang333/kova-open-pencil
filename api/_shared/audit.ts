import type { SupabaseClient } from '@supabase/supabase-js'

// W1 Cluster 11 / W0-1 / founder lock #11.
// Cross-cut audit-log writer. Edge Functions in Clusters 01/03/04/05 use this
// helper rather than raw INSERT so audit_log writes never break the
// user-facing request path. The helper SWALLOWS DB errors after warning so
// audit-log loss is preferred to losing the parent mutation.
//
// 42P01 (table missing) is the canonical "Plan 11 not yet applied in this env"
// signal — also swallowed.
//
// Sentry breadcrumb is gated on founder lock #19 (Sentry deferred to
// pre-launch). When Sentry is wired, replace the console.warn breadcrumb
// with Sentry.captureException — see docs/operator-runbook.md §11.

export interface AuditEvent {
  userId: string | null
  eventType: string
  payload?: Record<string, unknown>
  clusterOwner: string
}

export async function writeAudit(
  supabaseAdmin: SupabaseClient,
  event: AuditEvent
): Promise<void> {
  const row = {
    user_id: event.userId,
    event_type: event.eventType,
    payload: event.payload ?? {},
    cluster_owner: event.clusterOwner,
  }
  const { error } = await supabaseAdmin.from('audit_log').insert(row)
  if (error) {
    console.warn(
      `[audit_log] write failed (${error.code}): ${error.message}`,
      { eventType: event.eventType, clusterOwner: event.clusterOwner }
    )
    // TODO(pre-launch §11): Sentry.captureException(error, { tags: { helper: 'writeAudit', eventType, clusterOwner } })
  }
}
