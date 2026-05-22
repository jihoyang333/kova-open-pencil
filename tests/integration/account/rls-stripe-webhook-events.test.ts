/**
 * RLS for stripe_webhook_events — PRD 04 §4.1 §3.
 *
 * service_role only (FOR ALL ... USING (true)). authenticated cannot SELECT.
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

d('stripe_webhook_events RLS', () => {
  it('authenticated role SELECT returns empty (RLS blocks)', async () => {
    const service = createClient(URL!, SERVICE_KEY!, { auth: { persistSession: false } })
    const eventId = `evt_test_${crypto.randomUUID()}`
    await service.from('stripe_webhook_events').insert({
      event_id: eventId,
      type: 'checkout.session.completed',
      outcome: 'processed',
    })
    try {
      const anon = createClient(URL!, ANON_KEY!, { auth: { persistSession: false } })
      const { data, error } = await anon.from('stripe_webhook_events').select('event_id').limit(10)
      expect(error).toBeNull()
      expect(data?.length ?? 0).toBe(0)
    } finally {
      await service.from('stripe_webhook_events').delete().eq('event_id', eventId)
    }
  })

  it('service_role can SELECT + INSERT', async () => {
    const service = createClient(URL!, SERVICE_KEY!, { auth: { persistSession: false } })
    const eventId = `evt_test_${crypto.randomUUID()}`
    try {
      const { error: insertError } = await service.from('stripe_webhook_events').insert({
        event_id: eventId,
        type: 'invoice.paid',
        outcome: 'processed',
      })
      expect(insertError).toBeNull()
      const { data, error } = await service.from('stripe_webhook_events').select('event_id').eq('event_id', eventId)
      expect(error).toBeNull()
      expect(data?.[0]?.event_id).toBe(eventId)
    } finally {
      await service.from('stripe_webhook_events').delete().eq('event_id', eventId)
    }
  })

  it('PRIMARY KEY blocks duplicate event_id INSERT', async () => {
    const service = createClient(URL!, SERVICE_KEY!, { auth: { persistSession: false } })
    const eventId = `evt_test_${crypto.randomUUID()}`
    try {
      await service.from('stripe_webhook_events').insert({ event_id: eventId, type: 'invoice.paid' })
      const { error } = await service.from('stripe_webhook_events').insert({ event_id: eventId, type: 'invoice.paid' })
      expect(error?.code).toBe('23505')
    } finally {
      await service.from('stripe_webhook_events').delete().eq('event_id', eventId)
    }
  })
})
