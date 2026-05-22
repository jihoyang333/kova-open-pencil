/**
 * Migration integration tests — PRD 04 §4.1.
 *
 * Verifies the 20260605_04 migration's surface: users Stripe columns,
 * stripe_webhook_events + shopify_connection_history tables, plan_status
 * CHECK constraint (5 values including 'trialing' per founder decision
 * 2026-05-17 — CT-008).
 *
 * Runs against a live local Supabase. Skipped automatically when
 * SUPABASE_LOCAL_URL is unset (deferred to staging Phase 16).
 */
import { describe, it, expect } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_LOCAL_URL
const KEY = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY
const skip = !URL || !KEY
const supabase = skip ? null : createClient(URL!, KEY!, { auth: { persistSession: false } })

const d = skip ? describe.skip : describe

d('20260605_04 migration', () => {
  it('users table has all Stripe + avatar columns', async () => {
    const { data, error } = await supabase!.rpc('pg_typeof', { v: 1 }).maybeSingle()
    // Use information_schema directly via raw query through a SELECT
    const { data: rows } = await supabase!
      .from('users')
      .select('id, plan, plan_status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, avatar_storage_path')
      .limit(0)
    expect(rows).toEqual([])
  })

  it('stripe_webhook_events table accessible (service_role)', async () => {
    const { error } = await supabase!.from('stripe_webhook_events').select('event_id').limit(0)
    expect(error).toBeNull()
  })

  it('shopify_connection_history table accessible (service_role)', async () => {
    const { error } = await supabase!.from('shopify_connection_history').select('id').limit(0)
    expect(error).toBeNull()
  })

  it('plan_status CHECK accepts all 5 founder-locked values (CT-008 + decision 2026-05-17)', async () => {
    const userId = crypto.randomUUID()
    // Seed an auth.users row via direct SQL (handle_new_user trigger seeds public.users)
    await supabase!.auth.admin.createUser({
      id: userId,
      email: `${userId}@test.local`,
      email_confirm: true,
      password: 'test1234test',
    })
    try {
      for (const status of ['active', 'past_due', 'cancelled', 'incomplete', 'trialing'] as const) {
        const { error } = await supabase!.from('users').update({ plan_status: status }).eq('id', userId)
        expect(error).toBeNull()
      }
    } finally {
      await supabase!.auth.admin.deleteUser(userId)
    }
  })

  it('plan_status CHECK rejects unknown value', async () => {
    const userId = crypto.randomUUID()
    await supabase!.auth.admin.createUser({
      id: userId,
      email: `${userId}@test.local`,
      email_confirm: true,
      password: 'test1234test',
    })
    try {
      const { error } = await supabase!.from('users').update({ plan_status: 'bogus' }).eq('id', userId)
      expect(error?.code).toBe('23514')
    } finally {
      await supabase!.auth.admin.deleteUser(userId)
    }
  })

  it('plan CHECK accepts free/solo/agency', async () => {
    const userId = crypto.randomUUID()
    await supabase!.auth.admin.createUser({
      id: userId,
      email: `${userId}@test.local`,
      email_confirm: true,
      password: 'test1234test',
    })
    try {
      for (const plan of ['free', 'solo', 'agency'] as const) {
        const { error } = await supabase!.from('users').update({ plan }).eq('id', userId)
        expect(error).toBeNull()
      }
      const { error } = await supabase!.from('users').update({ plan: 'pro' }).eq('id', userId)
      expect(error?.code).toBe('23514')
    } finally {
      await supabase!.auth.admin.deleteUser(userId)
    }
  })
})
