import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import { requireEnv } from './env'

// W8a Cluster 01 — service-role Supabase client singleton.
// Plan 01 Task 7 dep. Edge Functions + cron handlers use this to bypass RLS
// for service-role-only tables (gdpr_deletion_queue, rate_limits,
// anthropic_deletion_log, audit_log). NEVER ship the returned client to the
// browser — service-role key trumps every RLS policy.

let cached: SupabaseClient | null = null

export function getAdminClient(): SupabaseClient {
  if (cached) return cached
  const url = requireEnv('VITE_SUPABASE_URL')
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  cached = createClient(url, key, { auth: { persistSession: false } })
  return cached
}

/** Test-only: reset the cached client between test cases. */
export function resetAdminClientForTesting(): void {
  cached = null
}
