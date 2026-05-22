import { describe, test, expect, beforeAll } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// W8a Cluster 01 — static migration shape contract.
//
// Mirrors the Cluster 11 audit_log/idempotency_keys pattern: static-string
// match against the migration file. Schema regressions caught at lint speed
// without a live-DB test. The corresponding integration tests (run against a
// local Supabase) live under tests/integration/.

const ROOT = join(import.meta.dir, '../../..')
const MIG_PATH = join(ROOT, 'supabase/migrations/20260522_01_users_account_lifecycle.sql')

let sql: string

beforeAll(() => {
  sql = readFileSync(MIG_PATH, 'utf-8')
})

describe('Cluster 01 — users.deleted_at + users.preferences (PRD 01 §4.1)', () => {
  test('adds deleted_at column on public.users', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS deleted_at timestamptz/i)
  })

  test('adds preferences JSONB column with empty-object default', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '\{\}'::jsonb/i)
  })

  test('partial index on deleted_at WHERE NOT NULL', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_users_pending_deletion[\s\S]+WHERE deleted_at IS NOT NULL/i)
  })

  test('C-LOW01.5: REVOKE deleted_at SELECT + UPDATE from authenticated', () => {
    expect(sql).toMatch(/REVOKE UPDATE \(deleted_at\) ON public\.users FROM authenticated/i)
    expect(sql).toMatch(/REVOKE SELECT \(deleted_at\) ON public\.users FROM authenticated/i)
  })
})

describe('Cluster 01 — gdpr_deletion_queue (PRD 01 §4.1)', () => {
  test('creates gdpr_deletion_queue table with IF NOT EXISTS', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.gdpr_deletion_queue/i)
  })

  test('step column constrained to 5 cascade steps', () => {
    expect(sql).toMatch(/step\s+text NOT NULL CHECK \(step IN \('stripe', 'shopify', 'anthropic', 'storage', 'db'\)\)/i)
  })

  test('status column constrained to 4 states', () => {
    expect(sql).toMatch(/status\s+text NOT NULL CHECK \(status IN \('pending', 'in_progress', 'succeeded', 'failed_terminal'\)\)/i)
  })

  test('user_id FK CASCADEs on users(id) delete', () => {
    expect(sql).toMatch(/user_id\s+uuid NOT NULL REFERENCES public\.users\(id\) ON DELETE CASCADE/i)
  })

  test('UNIQUE constraint per (user_id, step)', () => {
    expect(sql).toMatch(/UNIQUE \(user_id, step\)/i)
  })

  test('partial index on pending+in_progress rows', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_gdpr_queue_pending[\s\S]+WHERE status IN \('pending', 'in_progress'\)/i)
  })

  test('RLS enabled, no authenticated policy', () => {
    expect(sql).toMatch(/ALTER TABLE public\.gdpr_deletion_queue ENABLE ROW LEVEL SECURITY/i)
    // No CREATE POLICY for authenticated on this table (service_role bypasses RLS)
    const queueSection = sql.split('-- ---- 3.')[0]
    expect(queueSection).not.toMatch(/CREATE POLICY[\s\S]+gdpr_deletion_queue[\s\S]+TO authenticated/i)
  })
})

describe('Cluster 01 — anthropic_deletion_log (Plan Task 6c)', () => {
  test('creates anthropic_deletion_log with service-role-only RLS', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.anthropic_deletion_log/i)
    expect(sql).toMatch(/ALTER TABLE public\.anthropic_deletion_log ENABLE ROW LEVEL SECURITY/i)
    expect(sql).toMatch(/CREATE POLICY anthropic_log_service_only[\s\S]+FOR ALL TO service_role/i)
  })

  test('status column constrained to 3 stages', () => {
    expect(sql).toMatch(/status\s+text NOT NULL CHECK \(status IN \('queued_for_manual_request', 'submitted', 'confirmed_by_anthropic'\)\)/i)
  })
})

describe('Cluster 01 — request_account_deletion / restore_account RPCs (PRD 01 §5.2)', () => {
  test('request_account_deletion declared SECURITY DEFINER with safe search_path', () => {
    expect(sql).toMatch(/FUNCTION public\.request_account_deletion\(\)[\s\S]+SECURITY DEFINER[\s\S]+SET search_path = public, pg_temp/i)
  })

  test('restore_account declared SECURITY DEFINER with safe search_path', () => {
    expect(sql).toMatch(/FUNCTION public\.restore_account\(\)[\s\S]+SECURITY DEFINER[\s\S]+SET search_path = public, pg_temp/i)
  })

  test('request_account_deletion raises 28000 on auth.uid() = NULL', () => {
    expect(sql).toMatch(/IF v_user_id IS NULL THEN[\s\S]+RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'/i)
  })

  test('request_account_deletion enqueues 5 cascade steps', () => {
    expect(sql).toMatch(/INSERT INTO public\.gdpr_deletion_queue \(user_id, step\) VALUES[\s\S]+'stripe'[\s\S]+'shopify'[\s\S]+'anthropic'[\s\S]+'storage'[\s\S]+'db'/i)
  })

  test('restore_account enforces 30-day window via deleted_at > now() - 30d', () => {
    expect(sql).toMatch(/AND deleted_at > now\(\) - INTERVAL '30 days'/i)
  })

  test('restore_account deletes only pending queue rows (succeeded ones preserved)', () => {
    expect(sql).toMatch(/DELETE FROM public\.gdpr_deletion_queue[\s\S]+WHERE user_id = v_user_id[\s\S]+AND status = 'pending'/i)
  })

  test('GRANTed to authenticated', () => {
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.request_account_deletion\(\) TO authenticated/i)
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.restore_account\(\) TO authenticated/i)
  })
})

describe('Cluster 01 — rate_limits + bump_rate_limit (B-CRIT8)', () => {
  test('rate_limits table exists with composite PK', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.rate_limits[\s\S]+PRIMARY KEY \(user_id, endpoint, window_start\)/i)
  })

  test('RLS enabled, service-role-only access (no authenticated policy)', () => {
    expect(sql).toMatch(/ALTER TABLE public\.rate_limits ENABLE ROW LEVEL SECURITY/i)
  })

  test('bump_rate_limit is SECURITY DEFINER with safe search_path', () => {
    expect(sql).toMatch(/FUNCTION public\.bump_rate_limit\([\s\S]+SECURITY DEFINER[\s\S]+SET search_path = public, pg_temp/i)
  })

  test('bump_rate_limit uses UPSERT to collapse concurrent writes', () => {
    expect(sql).toMatch(/INSERT INTO public\.rate_limits[\s\S]+ON CONFLICT \(user_id, endpoint, window_start\)[\s\S]+DO UPDATE SET count = public\.rate_limits\.count \+ 1/i)
  })

  test('bump_rate_limit GRANTed only to service_role', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.bump_rate_limit[\s\S]+FROM PUBLIC, anon, authenticated/i)
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.bump_rate_limit[\s\S]+TO service_role/i)
  })
})

describe('Cluster 01 — claim_deletion_queue_row + claim_pending_deletion_users (C-MED1)', () => {
  test('claim_deletion_queue_row uses FOR UPDATE SKIP LOCKED', () => {
    expect(sql).toMatch(/FUNCTION public\.claim_deletion_queue_row\([\s\S]+FOR UPDATE SKIP LOCKED/i)
  })

  test('claim_deletion_queue_row caps at attempts < p_max_attempts', () => {
    expect(sql).toMatch(/AND q\.attempts < p_max_attempts/i)
  })

  test('claim_pending_deletion_users uses FOR UPDATE SKIP LOCKED', () => {
    expect(sql).toMatch(/FUNCTION public\.claim_pending_deletion_users\([\s\S]+FOR UPDATE OF u SKIP LOCKED/i)
  })

  test('both claim RPCs are service-role only', () => {
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.claim_deletion_queue_row[\s\S]+FROM PUBLIC/i)
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.claim_deletion_queue_row[\s\S]+TO service_role/i)
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.claim_pending_deletion_users[\s\S]+FROM PUBLIC/i)
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.claim_pending_deletion_users[\s\S]+TO service_role/i)
  })
})
