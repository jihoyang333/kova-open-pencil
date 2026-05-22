/**
 * RPC log_shopify_connection_event — PRD 04 §4.1 (4b).
 *
 * SECURITY DEFINER, service_role only. INSERTs a connection-history row;
 * EXECUTE revoked from PUBLIC.
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

d('log_shopify_connection_event RPC', () => {
  it('service_role can insert and returns row id', async () => {
    const service = createClient(URL!, SERVICE_KEY!, { auth: { persistSession: false } })
    const userId = crypto.randomUUID()
    const brandId = crypto.randomUUID()
    await service.auth.admin.createUser({
      id: userId,
      email: `${userId}@test.local`,
      email_confirm: true,
      password: 'test1234test',
    })
    await service.from('brands').insert({ id: brandId, user_id: userId, name: 'Test brand' })
    try {
      const { data, error } = await service.rpc('log_shopify_connection_event', {
        p_brand_id: brandId,
        p_event_type: 'connected',
        p_source: 'user',
        p_metadata: { shop_domain: 'test.myshopify.com' },
      })
      expect(error).toBeNull()
      expect(typeof data).toBe('string')
    } finally {
      await service.from('brands').delete().eq('id', brandId)
      await service.auth.admin.deleteUser(userId)
    }
  })

  it('CHECK rejects unknown event_type', async () => {
    const service = createClient(URL!, SERVICE_KEY!, { auth: { persistSession: false } })
    const userId = crypto.randomUUID()
    const brandId = crypto.randomUUID()
    await service.auth.admin.createUser({
      id: userId,
      email: `${userId}@test.local`,
      email_confirm: true,
      password: 'test1234test',
    })
    await service.from('brands').insert({ id: brandId, user_id: userId, name: 'Test brand' })
    try {
      const { error } = await service.rpc('log_shopify_connection_event', {
        p_brand_id: brandId,
        p_event_type: 'something_invalid',
        p_source: 'user',
        p_metadata: {},
      })
      expect(error).toBeTruthy()
    } finally {
      await service.from('brands').delete().eq('id', brandId)
      await service.auth.admin.deleteUser(userId)
    }
  })

  it('anon role cannot execute (EXECUTE revoked from PUBLIC)', async () => {
    const anon = createClient(URL!, ANON_KEY!, { auth: { persistSession: false } })
    const { error } = await anon.rpc('log_shopify_connection_event', {
      p_brand_id: '00000000-0000-0000-0000-000000000000',
      p_event_type: 'connected',
      p_source: 'user',
      p_metadata: {},
    })
    expect(error).toBeTruthy()
  })
})
