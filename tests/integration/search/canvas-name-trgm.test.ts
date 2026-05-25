/**
 * Cluster 02 T38 — canvas-name trigram search.
 * Skipped automatically when SUPABASE_LOCAL_URL is unset.
 */
import { describe, it, expect } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_LOCAL_URL
const KEY = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY
const skip = !URL || !KEY
const d = skip ? describe.skip : describe

d('canvas-name trigram search', () => {
  it('ILIKE %spring% returns rows whose name contains spring', async () => {
    const admin = createClient(URL!, KEY!, { auth: { persistSession: false } })
    const { data, error } = await admin
      .from('canvases')
      .select('id, name')
      .is('trashed_at', null)
      .ilike('name', '%spring%')
      .limit(5)
    expect(error).toBeNull()
    if (data && data.length > 0) {
      expect(data.every((c) => c.name.toLowerCase().includes('spring'))).toBe(true)
    }
  })
})
