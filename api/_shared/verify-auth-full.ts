import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import { requireEnv } from './env'

// W8a Cluster 01 — extended auth verification for c01 Edge Functions.
//
// Wraps Cluster 11's authenticateRequest to also return:
// (a) a Supabase client scoped to the caller's JWT (RLS enforced — so user
//     RPCs like request_account_deletion() see auth.uid()),
// (b) the caller's email (needed for outbound Resend notifications).
//
// Edge Functions in this cluster all need the same shape, so a single helper
// avoids duplicating the verify → createClient(jwt) → getUser email lookup
// chain per handler.

export interface AuthContext {
  /** Supabase client scoped to the caller's JWT. RLS-enforced. */
  supabase: SupabaseClient
  userId: string
  email: string
}

export class UnauthenticatedError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'UnauthenticatedError'
  }
}

export async function verifyAuthFull(req: Request): Promise<AuthContext> {
  const url = requireEnv('VITE_SUPABASE_URL')
  const anonKey = requireEnv('VITE_SUPABASE_ANON_KEY')

  let token: string | null = null
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }
  if (!token) {
    throw new UnauthenticatedError('Missing Authorization Bearer token')
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    throw new UnauthenticatedError(error?.message ?? 'Invalid or expired token')
  }
  if (!data.user.email) {
    throw new UnauthenticatedError('Authenticated user has no email')
  }

  return {
    supabase,
    userId: data.user.id,
    email: data.user.email,
  }
}
