/**
 * Cluster 02 T38 — brand-logos storage bucket RLS.
 * Skipped automatically when SUPABASE_LOCAL_URL is unset.
 */
import { describe, it, expect } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_LOCAL_URL
const KEY = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY
const skip = !URL || !KEY
const d = skip ? describe.skip : describe

d('brand-logos storage RLS', () => {
  it('service role can upload to user prefix', async () => {
    const admin = createClient(URL!, KEY!, { auth: { persistSession: false } })
    const userId = crypto.randomUUID()
    const blob = new Blob(['x'], { type: 'image/png' })
    const { error } = await admin.storage
      .from('brand-logos')
      .upload(`${userId}/test.png`, blob, { upsert: true })
    expect(error).toBeNull()
  })
})
