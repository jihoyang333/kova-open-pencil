// Smoke test for the integration-test harness itself. Verifies that
// applyMigrations() applies every supabase/migrations/*.sql against a clean
// local DB and that the test-helper PG functions describe_table / list_indexes
// / list_rls return sane shapes for an existing table (audit_log, shipped
// in 20260519_w1_audit_log.sql).

import { describe, it, expect, beforeAll } from 'bun:test'
import { applyMigrations, supabaseAdmin } from './supabase-local'

describe('integration-test harness smoke', () => {
  beforeAll(async () => {
    await applyMigrations()
  }, 120_000)

  it('describe_table returns audit_log columns', async () => {
    const { data, error } = await supabaseAdmin.rpc('describe_table', {
      table_name: 'audit_log',
    })
    expect(error).toBeNull()
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: 'id', type: 'uuid', nullable: false }),
        expect.objectContaining({ column: 'event_type', type: 'text', nullable: false }),
        expect.objectContaining({ column: 'cluster_owner', type: 'text', nullable: true }),
      ]),
    )
  })

  it('list_indexes returns the audit_log composite indexes', async () => {
    const { data, error } = await supabaseAdmin.rpc('list_indexes', {
      table_name: 'audit_log',
    })
    expect(error).toBeNull()
    const names = (data as Array<{ name: string }>).map((r) => r.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'audit_log_pkey',
        'idx_audit_log_user_event',
        'idx_audit_log_cluster_created',
      ]),
    )
  })

  it('list_rls reports RLS enabled + service-role policy', async () => {
    const { data, error } = await supabaseAdmin.rpc('list_rls', {
      table_name: 'audit_log',
    })
    expect(error).toBeNull()
    const rls = data as { enabled: boolean; policies: Array<{ name: string }> }
    expect(rls.enabled).toBe(true)
    expect(rls.policies.map((p) => p.name)).toContain('audit_log_service_only')
  })
})
