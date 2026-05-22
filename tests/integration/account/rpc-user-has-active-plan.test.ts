/**
 * RPC user_has_active_plan — PRD 04 §4.1 (4a).
 *
 * SECURITY DEFINER + STABLE; returns true when:
 *   plan_status = 'active' AND (current_period_end IS NULL OR > now()).
 *
 * Skipped when SUPABASE_LOCAL_URL is unset.
 */
import { describe, it, expect } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_LOCAL_URL
const KEY = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY
const skip = !URL || !KEY
const supabase = skip ? null : createClient(URL!, KEY!, { auth: { persistSession: false } })

async function seedUser(plan_status: string, period_offset_ms: number | null): Promise<string> {
  const userId = crypto.randomUUID()
  await supabase!.auth.admin.createUser({
    id: userId,
    email: `${userId}@test.local`,
    email_confirm: true,
    password: 'test1234test',
  })
  await supabase!.from('users').update({
    plan: 'solo',
    plan_status,
    current_period_end: period_offset_ms === null ? null : new Date(Date.now() + period_offset_ms).toISOString(),
  }).eq('id', userId)
  return userId
}

const d = skip ? describe.skip : describe

d('user_has_active_plan RPC', () => {
  it('returns true for active plan with future period_end', async () => {
    const userId = await seedUser('active', 86_400_000)
    try {
      const { data, error } = await supabase!.rpc('user_has_active_plan', { p_user_id: userId })
      expect(error).toBeNull()
      expect(data).toBe(true)
    } finally {
      await supabase!.auth.admin.deleteUser(userId)
    }
  })

  it('returns true when current_period_end is NULL (open-ended)', async () => {
    const userId = await seedUser('active', null)
    try {
      const { data } = await supabase!.rpc('user_has_active_plan', { p_user_id: userId })
      expect(data).toBe(true)
    } finally {
      await supabase!.auth.admin.deleteUser(userId)
    }
  })

  it('returns false for past_due', async () => {
    const userId = await seedUser('past_due', 86_400_000)
    try {
      const { data } = await supabase!.rpc('user_has_active_plan', { p_user_id: userId })
      expect(data).toBe(false)
    } finally {
      await supabase!.auth.admin.deleteUser(userId)
    }
  })

  it('returns false for active but expired period_end', async () => {
    const userId = await seedUser('active', -86_400_000)
    try {
      const { data } = await supabase!.rpc('user_has_active_plan', { p_user_id: userId })
      expect(data).toBe(false)
    } finally {
      await supabase!.auth.admin.deleteUser(userId)
    }
  })

  it('returns false for trialing (founder-locked: trial does NOT pass gate)', async () => {
    const userId = await seedUser('trialing', 86_400_000)
    try {
      const { data } = await supabase!.rpc('user_has_active_plan', { p_user_id: userId })
      expect(data).toBe(false)
    } finally {
      await supabase!.auth.admin.deleteUser(userId)
    }
  })
})
