/**
 * RLS for shopify_connection_history — PRD 04 §4.1 §3.
 *
 * authenticated can SELECT rows for brands they own; authenticated cannot
 * INSERT (service_role only).
 *
 * Skipped when SUPABASE_LOCAL_URL is unset.
 */
import { describe, it, expect } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_LOCAL_URL
const SERVICE_KEY = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY
const ANON_KEY = process.env.SUPABASE_LOCAL_ANON_KEY
const skip = !URL || !SERVICE_KEY || !ANON_KEY

const d = skip ? describe.skip : describe

d('shopify_connection_history RLS', () => {
  it('user can SELECT history for own brand; cannot SELECT others', async () => {
    const service = createClient(URL!, SERVICE_KEY!, { auth: { persistSession: false } })
    const userA = crypto.randomUUID()
    const userB = crypto.randomUUID()
    const brandA = crypto.randomUUID()
    const brandB = crypto.randomUUID()
    const passwordA = 'rls-test-1234'
    const passwordB = 'rls-test-1234'
    await service.auth.admin.createUser({ id: userA, email: `${userA}@test.local`, email_confirm: true, password: passwordA })
    await service.auth.admin.createUser({ id: userB, email: `${userB}@test.local`, email_confirm: true, password: passwordB })
    await service.from('brands').insert([
      { id: brandA, user_id: userA, name: 'A' },
      { id: brandB, user_id: userB, name: 'B' },
    ])
    await service.from('shopify_connection_history').insert([
      { brand_id: brandA, event_type: 'connected', source: 'user', metadata: {} },
      { brand_id: brandB, event_type: 'connected', source: 'user', metadata: {} },
    ])
    try {
      const anon = createClient(URL!, ANON_KEY!, { auth: { persistSession: false } })
      const { data: signInData } = await anon.auth.signInWithPassword({ email: `${userA}@test.local`, password: passwordA })
      expect(signInData.session).toBeTruthy()

      const { data } = await anon.from('shopify_connection_history').select('id, brand_id')
      expect(data).toBeTruthy()
      expect(data!.every((r: { brand_id: string }) => r.brand_id === brandA)).toBe(true)
    } finally {
      await service.from('brands').delete().in('id', [brandA, brandB])
      await service.auth.admin.deleteUser(userA)
      await service.auth.admin.deleteUser(userB)
    }
  })

  it('authenticated cannot INSERT (service_role only)', async () => {
    const service = createClient(URL!, SERVICE_KEY!, { auth: { persistSession: false } })
    const userId = crypto.randomUUID()
    const brandId = crypto.randomUUID()
    const password = 'rls-test-1234'
    await service.auth.admin.createUser({ id: userId, email: `${userId}@test.local`, email_confirm: true, password })
    await service.from('brands').insert({ id: brandId, user_id: userId, name: 'Owned' })
    try {
      const anon = createClient(URL!, ANON_KEY!, { auth: { persistSession: false } })
      await anon.auth.signInWithPassword({ email: `${userId}@test.local`, password })
      const { error } = await anon.from('shopify_connection_history').insert({
        brand_id: brandId,
        event_type: 'connected',
        source: 'user',
      })
      expect(error).toBeTruthy()
    } finally {
      await service.from('brands').delete().eq('id', brandId)
      await service.auth.admin.deleteUser(userId)
    }
  })
})
