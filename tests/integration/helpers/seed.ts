import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Integration-test seed helpers. Require a running local Supabase
// (SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY).
//
// Ownership model note: canvases have NO user_id column — ownership is
// canvas -> brand -> user. seedCanvas therefore does not set user_id.

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

const admin = (): SupabaseClient =>
  createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

export async function seedTestUser(opts: { plan?: 'free' | 'solo' | 'agency' } = {}): Promise<string> {
  const a = admin()
  const email = `test-${crypto.randomUUID()}@local.test`
  const { data, error } = await a.auth.admin.createUser({ email, email_confirm: true })
  if (error || !data.user) throw error ?? new Error('seedTestUser: createUser failed')
  if (opts.plan) {
    const { error: upErr } = await a.from('users').update({ plan: opts.plan }).eq('id', data.user.id)
    if (upErr) throw upErr
  }
  return data.user.id
}

export async function seedBrand(opts: { user_id: string }): Promise<string> {
  const { data, error } = await admin()
    .from('brands')
    .insert({ user_id: opts.user_id, name: 'TestBrand' })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('seedBrand: insert failed')
  return data.id
}

export async function seedCanvas(opts: {
  brand_id: string
  user_id?: string // accepted for call-site symmetry; canvases have no user_id column
  trashed_at?: string
}): Promise<string> {
  const { data, error } = await admin()
    .from('canvases')
    .insert({ brand_id: opts.brand_id, name: 'TestCanvas', trashed_at: opts.trashed_at ?? null })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('seedCanvas: insert failed')
  return data.id
}

// Returns an anon-key client authenticated AS the given user, so SECURITY DEFINER
// RPCs observe auth.uid() = userId. Sets a known password then signs in (the
// documented Supabase pattern; an inline magic-link token silently falls back to anon).
export async function signInAs(userId: string): Promise<SupabaseClient> {
  const a = admin()
  const password = `test-${crypto.randomUUID()}`
  const { error: upErr } = await a.auth.admin.updateUserById(userId, { password })
  if (upErr) throw upErr
  const { data: userRow, error: getErr } = await a.auth.admin.getUserById(userId)
  if (getErr || !userRow?.user?.email) throw getErr ?? new Error(`signInAs: user ${userId} not found`)

  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: signInErr } = await client.auth.signInWithPassword({
    email: userRow.user.email,
    password,
  })
  if (signInErr) throw signInErr
  return client
}
