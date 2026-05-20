// audit_log RLS contract test (Plan 11 Task 1.2 + W0-1 / founder lock #11).
//
// audit_log is append-only via service_role. Authenticated users may never
// SELECT, INSERT, UPDATE, or DELETE. Cascade on users delete must remove the
// user's audit rows so a deletion request leaves no PII residue.

import { describe, it, expect, beforeAll } from 'bun:test'
import {
  applyMigrations,
  signInTestUser,
  signOutTestUser,
  supabaseAdmin,
  supabaseAsAuthenticated,
} from '../helpers/supabase-local'

describe('audit_log RLS (W0-1 / founder lock #11)', () => {
  beforeAll(async () => {
    await applyMigrations()
  }, 120_000)

  it('authenticated cannot SELECT (grant or RLS denies)', async () => {
    await signInTestUser('rls-audit-a@kova-test.local')
    const { data, error } = await supabaseAsAuthenticated.from('audit_log').select('*')
    if (error) {
      expect(error.code).toBe('42501')
    } else {
      expect(data).toEqual([])
    }
    await signOutTestUser()
  })

  it('authenticated cannot INSERT', async () => {
    await signInTestUser('rls-audit-b@kova-test.local')
    const { error } = await supabaseAsAuthenticated.from('audit_log').insert({
      event_type: 'test.attempt',
      payload: {},
      cluster_owner: '11',
    })
    expect(error?.code).toBe('42501')
    await signOutTestUser()
  })

  it('authenticated cannot UPDATE or DELETE', async () => {
    await signInTestUser('rls-audit-c@kova-test.local')
    const upd = await supabaseAsAuthenticated
      .from('audit_log')
      .update({ payload: { tampered: true } })
      .gte('created_at', '2000-01-01')
    expect(upd.error?.code === '42501' || upd.count === 0 || upd.data === null).toBe(true)

    const del = await supabaseAsAuthenticated
      .from('audit_log')
      .delete()
      .gte('created_at', '2000-01-01')
    expect(del.error?.code === '42501' || del.count === 0 || del.data === null).toBe(true)
    await signOutTestUser()
  })

  it('service_role can INSERT (writeAudit append-only)', async () => {
    const { data: u } = await supabaseAdmin.auth.admin.createUser({
      email: 'rls-audit-svc@kova-test.local',
      password: 'audit-svc-fixture-pw',
      email_confirm: true,
    })
    const userId = u.user!.id

    const { data, error } = await supabaseAdmin
      .from('audit_log')
      .insert({
        user_id: userId,
        event_type: 'test.appended',
        payload: { ok: true },
        cluster_owner: '11',
      })
      .select()
      .single()
    expect(error).toBeNull()
    expect(data?.event_type).toBe('test.appended')
    expect(data?.payload).toEqual({ ok: true })
  })

  it('cascade: deleting users row removes its audit_log rows', async () => {
    const { data: u } = await supabaseAdmin.auth.admin.createUser({
      email: 'rls-audit-cascade@kova-test.local',
      password: 'cascade-fixture-pw',
      email_confirm: true,
    })
    const userId = u.user!.id

    await supabaseAdmin.from('audit_log').insert({
      user_id: userId,
      event_type: 'cascade.probe',
      cluster_owner: '11',
    })

    // public.users.id REFERENCES auth.users(id) ON DELETE CASCADE.
    // audit_log.user_id REFERENCES public.users(id) ON DELETE CASCADE.
    // Deleting the root auth.users row triggers the cascade chain.
    const del = await supabaseAdmin.auth.admin.deleteUser(userId)
    expect(del.error).toBeNull()

    const { data: leftover } = await supabaseAdmin
      .from('audit_log')
      .select('id')
      .eq('user_id', userId)
    expect(leftover).toEqual([])
  })
})
