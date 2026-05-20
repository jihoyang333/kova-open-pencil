// Pins the schema shape of Cluster 11's migration:
//   - idempotency_keys table (new, shipped by 20260520_11_shared_ui_infrastructure.sql)
//   - audit_log table (already shipped by 20260519_w1_audit_log.sql per W1
//     dispatch / founder lock #11; re-verified here so Cluster 11 owns the contract)
//
// Per Plan 11 §6 Task 1.1 + length-CHECK closure (B-MED18 / A-MED3, 2026-05-19).

import { describe, it, expect, beforeAll } from 'bun:test'
import { applyMigrations, supabaseAdmin } from '../helpers/supabase-local'

describe('migration 20260520_11_shared_ui_infrastructure', () => {
  beforeAll(async () => {
    await applyMigrations()
  }, 120_000)

  it('creates idempotency_keys table with required columns', async () => {
    const { data, error } = await supabaseAdmin.rpc('describe_table', {
      table_name: 'idempotency_keys',
    })
    expect(error).toBeNull()
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: 'key', type: 'text', nullable: false }),
        expect.objectContaining({ column: 'user_id', type: 'uuid', nullable: false }),
        expect.objectContaining({ column: 'endpoint', type: 'text', nullable: false }),
        expect.objectContaining({ column: 'request_hash', type: 'text', nullable: false }),
        expect.objectContaining({ column: 'response_status', type: 'integer', nullable: false }),
        expect.objectContaining({ column: 'response_body', type: 'jsonb', nullable: false }),
        expect.objectContaining({
          column: 'created_at',
          type: 'timestamp with time zone',
          nullable: false,
        }),
      ]),
    )
  })

  it('creates idempotency_keys indexes + RLS', async () => {
    const { data: indexes, error: idxErr } = await supabaseAdmin.rpc('list_indexes', {
      table_name: 'idempotency_keys',
    })
    expect(idxErr).toBeNull()
    const names = (indexes as Array<{ name: string }>).map((r) => r.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'idempotency_keys_pkey',
        'idx_idempotency_keys_created_at',
        'idx_idempotency_keys_user_endpoint',
      ]),
    )

    const { data: rls, error: rlsErr } = await supabaseAdmin.rpc('list_rls', {
      table_name: 'idempotency_keys',
    })
    expect(rlsErr).toBeNull()
    const r = rls as { enabled: boolean; policies: Array<{ name: string }> }
    expect(r.enabled).toBe(true)
    expect(r.policies.map((p) => p.name)).toContain('idempotency_service_only')
  })

  it('audit_log table contract (W0-1 / founder lock #11) — shipped via W1 migration', async () => {
    const { data: cols, error } = await supabaseAdmin.rpc('describe_table', {
      table_name: 'audit_log',
    })
    expect(error).toBeNull()
    expect(cols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: 'id', type: 'uuid', nullable: false }),
        expect.objectContaining({ column: 'user_id', type: 'uuid', nullable: true }),
        expect.objectContaining({ column: 'event_type', type: 'text', nullable: false }),
        expect.objectContaining({ column: 'payload', type: 'jsonb', nullable: false }),
        expect.objectContaining({ column: 'cluster_owner', type: 'text', nullable: true }),
        expect.objectContaining({
          column: 'created_at',
          type: 'timestamp with time zone',
          nullable: false,
        }),
      ]),
    )

    const { data: indexes } = await supabaseAdmin.rpc('list_indexes', {
      table_name: 'audit_log',
    })
    expect((indexes as Array<{ name: string }>).map((r) => r.name)).toEqual(
      expect.arrayContaining([
        'audit_log_pkey',
        'idx_audit_log_user_event',
        'idx_audit_log_cluster_created',
      ]),
    )

    const { data: rls } = await supabaseAdmin.rpc('list_rls', { table_name: 'audit_log' })
    const r = rls as { enabled: boolean; policies: Array<{ name: string }> }
    expect(r.enabled).toBe(true)
    expect(r.policies.map((p) => p.name)).toContain('audit_log_service_only')
  })
})

describe('idempotency_keys length CHECK (B-MED18 closure)', () => {
  beforeAll(async () => {
    await applyMigrations()
  }, 120_000)

  it('rejects key with length < 16', async () => {
    const { data: u } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1)
      .maybeSingle()
    const userId = u?.id ?? '00000000-0000-0000-0000-000000000000'

    const { error } = await supabaseAdmin.from('idempotency_keys').insert({
      key: 'tooshort', // 8 chars
      user_id: userId,
      endpoint: 'POST /api/test',
      request_hash: 'h'.repeat(64),
      response_status: 200,
      response_body: { ok: true },
    })
    expect(error?.code).toBe('23514') // check_violation
  })

  it('rejects key with length > 64', async () => {
    const { data: u } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1)
      .maybeSingle()
    const userId = u?.id ?? '00000000-0000-0000-0000-000000000000'

    const { error } = await supabaseAdmin.from('idempotency_keys').insert({
      key: 'a'.repeat(65),
      user_id: userId,
      endpoint: 'POST /api/test',
      request_hash: 'h'.repeat(64),
      response_status: 200,
      response_body: { ok: true },
    })
    expect(error?.code).toBe('23514')
  })
})
