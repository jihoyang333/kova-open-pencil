import type { SupabaseClient } from '@supabase/supabase-js'

import { writeAudit } from '../../_shared/audit'
import { sendEmail } from '../../_shared/email'

// W8a Cluster 01 — cron step: db (Plan 01 Task 6e).
// Final cascade step: mark queue 'succeeded' BEFORE cascading delete, write
// audit log row, delete users row (FK ON DELETE CASCADE clears everything
// downstream), send final confirmation email.

export interface StepArgs {
  supabase: SupabaseClient
  userId: string
  idempotencyKey: string
}

export type StepResult = { ok: true } | { ok: false; retriable: boolean; error: string }

interface AuthAdminFacet {
  auth: { admin: { getUserById: (id: string) => Promise<{ data: { user: { email?: string } | null } | null; error: unknown }> } }
}

export async function runStep({ supabase, userId }: StepArgs): Promise<StepResult> {
  // Capture email BEFORE delete — auth.users is in the auth schema; service-role
  // client can query via auth.admin.getUserById.
  const adminFacet = supabase as unknown as AuthAdminFacet
  let email: string | undefined
  try {
    const { data: authData } = await adminFacet.auth.admin.getUserById(userId)
    email = authData?.user?.email
  } catch (e) {
    console.warn('[cron/db] getUserById failed (continuing):', e)
  }

  // Mark queue row 'succeeded' BEFORE the cascading delete (FK ON DELETE CASCADE
  // on user_id would wipe the queue row otherwise).
  const { error: qErr } = await supabase
    .from('gdpr_deletion_queue')
    .update({ status: 'succeeded', succeeded_at: new Date().toISOString() })
    .match({ user_id: userId, step: 'db' })
  if (qErr) return { ok: false, retriable: true, error: qErr.message }

  // Audit BEFORE delete so user_id FK still resolves.
  await writeAudit(supabase, {
    userId,
    eventType: 'account_hard_deleted',
    payload: { email_at_deletion: email ?? null },
    clusterOwner: '01',
  })

  const { error: delErr } = await supabase.from('users').delete().eq('id', userId)
  if (delErr) return { ok: false, retriable: true, error: delErr.message }

  if (email) {
    try {
      await sendEmail({
        to: email,
        subject: 'Your Kova account has been permanently deleted',
        html: `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;color:#1a1a1d"><h2>Account deleted</h2><p>Your Kova account and all associated data have been permanently removed per your request.</p><p style="color:#6e6e73;font-size:12px">If this is unexpected, please contact support@kova.io.</p></body></html>`,
        text: 'Your Kova account and all associated data have been permanently removed per your request. If unexpected, contact support@kova.io.',
        unsubscribeUrl: `${process.env['PUBLIC_APP_URL'] ?? 'https://app.kova.io'}/unsubscribe`,
      })
    } catch (e) {
      console.error('[cron/db] Final confirmation email failed (best-effort):', e)
    }
  }

  return { ok: true }
}
