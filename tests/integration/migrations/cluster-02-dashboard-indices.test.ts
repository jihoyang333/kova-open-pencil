/**
 * Cluster 02 dashboard indexes — live-DB integration test.
 *
 * Verifies the 20260520_02_dashboard_indices migration's surface against a
 * live local Supabase. Skipped automatically when SUPABASE_LOCAL_URL is unset
 * (deferred to staging Phase). Static shape verified by
 * tests/unit/migrations/cluster-02-dashboard-indices.test.ts.
 */
import { describe, it, expect } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_LOCAL_URL
const KEY = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY
const skip = !URL || !KEY
const supabase = skip ? null : createClient(URL!, KEY!, { auth: { persistSession: false } })

const d = skip ? describe.skip : describe

d('20260520_02 dashboard indices', () => {
  it('canvases table accepts the recency query (idx_canvases_brand_recent path)', async () => {
    const { error } = await supabase!
      .from('canvases')
      .select('id, brand_id, name, updated_at')
      .is('trashed_at', null)
      .order('updated_at', { ascending: false })
      .limit(1)
    expect(error).toBeNull()
  })

  it('canvases table accepts the trigram search (idx_canvases_name_trgm path)', async () => {
    const { error } = await supabase!
      .from('canvases')
      .select('id, name')
      .is('trashed_at', null)
      .ilike('name', '%untitled%')
      .limit(1)
    expect(error).toBeNull()
  })

  it('brands table accepts the recency query (idx_brands_user_recent path)', async () => {
    const { error } = await supabase!
      .from('brands')
      .select('id, user_id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
    expect(error).toBeNull()
  })
})
