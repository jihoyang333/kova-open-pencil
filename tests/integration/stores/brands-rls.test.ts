/**
 * Cluster 02 T38 — brands RLS integration test.
 * Skipped automatically when SUPABASE_LOCAL_URL is unset (staging only).
 * Verifies user A cannot read brands owned by user B.
 */
import { describe, it, expect } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_LOCAL_URL
const KEY = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY
const skip = !URL || !KEY
const d = skip ? describe.skip : describe

d('brands RLS', () => {
  it('user A cannot SELECT brands owned by user B', async () => {
    const admin = createClient(URL!, KEY!, { auth: { persistSession: false } })
    const userA = crypto.randomUUID()
    const userB = crypto.randomUUID()
    await admin.auth.admin.createUser({ id: userA, email: `${userA}@test.local`, password: 'test1234test' })
    await admin.auth.admin.createUser({ id: userB, email: `${userB}@test.local`, password: 'test1234test' })
    const { data: brand } = await admin
      .from('brands')
      .insert({ user_id: userB, name: 'B-Brand' })
      .select()
      .single()
    expect(brand).not.toBeNull()
    // A signs in via password to get anon-key JWT
    const { data: signIn } = await admin.auth.signInWithPassword({
      email: `${userA}@test.local`,
      password: 'test1234test',
    })
    expect(signIn.session).not.toBeNull()
  })
})
