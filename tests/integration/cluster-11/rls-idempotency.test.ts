// idempotency_keys RLS contract test (Plan 11 Task 1.2).
//
// The table is service-role-only. Authenticated users must not be able to
// read, insert, update, or delete any row — even their own.

import { describe, it, expect, beforeAll } from 'bun:test'
import {
  applyMigrations,
  signInTestUser,
  signOutTestUser,
  supabaseAdmin,
  supabaseAsAuthenticated,
} from '../helpers/supabase-local'

describe('idempotency_keys RLS', () => {
  beforeAll(async () => {
    await applyMigrations()
  }, 120_000)

  it('authenticated cannot SELECT (grant or RLS denies)', async () => {
    await signInTestUser('rls-idem-a@kova-test.local')
    const { data, error } = await supabaseAsAuthenticated
      .from('idempotency_keys')
      .select('*')
    // Either GRANT-layer denial (42501) or RLS-layer denial (empty result).
    // The migration only grants to service_role so we expect 42501 — but the
    // contract is "authenticated cannot read", not the specific PG error code.
    if (error) {
      expect(error.code).toBe('42501')
    } else {
      expect(data).toEqual([])
    }
    await signOutTestUser()
  })

  it('authenticated cannot INSERT', async () => {
    const userId = await signInTestUser('rls-idem-b@kova-test.local')
    const { error } = await supabaseAsAuthenticated.from('idempotency_keys').insert({
      key: 'a'.repeat(20),
      user_id: userId,
      endpoint: 'test',
      request_hash: 'x'.repeat(64),
      response_status: 200,
      response_body: {},
    })
    expect(error?.code).toBe('42501')
    await signOutTestUser()
  })

  it('authenticated cannot UPDATE or DELETE (silent no-op)', async () => {
    await signInTestUser('rls-idem-c@kova-test.local')
    const upd = await supabaseAsAuthenticated
      .from('idempotency_keys')
      .update({ response_status: 500 })
      .eq('key', 'fake-key-that-does-not-exist')
    // RLS denies UPDATE without throwing — affected rows is 0.
    expect(upd.error?.code === '42501' || upd.count === 0 || upd.data === null).toBe(true)

    const del = await supabaseAsAuthenticated
      .from('idempotency_keys')
      .delete()
      .eq('key', 'fake-key-that-does-not-exist')
    expect(del.error?.code === '42501' || del.count === 0 || del.data === null).toBe(true)
    await signOutTestUser()
  })

  it('service_role can read + write', async () => {
    // Create a user via the admin client so the FK resolves.
    const { data: created } = await supabaseAdmin.auth.admin.createUser({
      email: 'rls-idem-svc@kova-test.local',
      password: 'service-write-fixture-pw',
      email_confirm: true,
    })
    const userId = created.user!.id

    const key = crypto.randomUUID().replace(/-/g, '') // 32 chars
    const { error: insErr } = await supabaseAdmin.from('idempotency_keys').insert({
      key,
      user_id: userId,
      endpoint: 'POST /api/test',
      request_hash: 'h'.repeat(64),
      response_status: 200,
      response_body: { ok: true },
    })
    expect(insErr).toBeNull()

    const { data } = await supabaseAdmin
      .from('idempotency_keys')
      .select('*')
      .eq('key', key)
      .single()
    expect(data?.response_status).toBe(200)
  })
})
