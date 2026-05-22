import type { SupabaseClient } from '@supabase/supabase-js'

// W8a Cluster 01 — cron step: anthropic (Plan 01 Task 6c).
// In-DB delete of chat conversations + messages.
// Logs manual-deletion-request row for operator weekly batch
// (Anthropic has no programmatic delete API per PRD §5.1.4.3).

export interface StepArgs {
  supabase: SupabaseClient
  userId: string
  idempotencyKey: string
}

export type StepResult = { ok: true } | { ok: false; retriable: boolean; error: string }

export async function runStep({ supabase, userId }: StepArgs): Promise<StepResult> {
  const { data: convs, error: selErr } = await supabase
    .from('chat_conversations')
    .select('id')
    .eq('user_id', userId)

  // 42P01 (undefined_table) → table not shipped in this env (pre-Cluster-10)
  // Soft-fail so the cascade doesn't terminal-fail on dev environments.
  if (selErr) {
    if ((selErr as { code?: string }).code === '42P01') {
      // continue to the deletion-log insert
    } else {
      return { ok: false, retriable: true, error: selErr.message }
    }
  }

  if (convs && convs.length > 0) {
    const ids = (convs as { id: string }[]).map((c) => c.id)
    const { error: msgErr } = await supabase.from('chat_messages').delete().in('conversation_id', ids)
    if (msgErr && (msgErr as { code?: string }).code !== '42P01') {
      return { ok: false, retriable: true, error: msgErr.message }
    }

    const { error: convErr } = await supabase.from('chat_conversations').delete().eq('user_id', userId)
    if (convErr && (convErr as { code?: string }).code !== '42P01') {
      return { ok: false, retriable: true, error: convErr.message }
    }
  }

  const { error: logErr } = await supabase
    .from('anthropic_deletion_log')
    .insert({
      user_id: userId,
      requested_at: new Date().toISOString(),
      status: 'queued_for_manual_request',
    })

  if (logErr && (logErr as { code?: string }).code !== '42P01') {
    return { ok: false, retriable: true, error: logErr.message }
  }

  return { ok: true }
}
