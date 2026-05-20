// Shared service-role client for Vercel Functions / Edge runtime.
// One module, one singleton: every helper (verifyIdempotency, writeAudit,
// sendEmail, etc.) imports `supabaseAdmin` from here so the JWT, fetch, and
// realtime channel pools are shared across handlers.
//
// Browser code must NEVER import this file — it embeds SUPABASE_SERVICE_ROLE_KEY.
// Vite will fail the build if @/api/_shared/* is imported from src/.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL_ENV = 'VITE_SUPABASE_URL'
const KEY_ENV = 'SUPABASE_SERVICE_ROLE_KEY'

function readEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.length === 0) {
    throw new Error(`Missing required env: ${name}`)
  }
  return value
}

let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!cached) {
    cached = createClient(readEnv(URL_ENV), readEnv(KEY_ENV), {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return cached
}

// Lazy proxy so consumers can `import { supabaseAdmin }` and the env reads
// happen at first use rather than at module-load time. This keeps test files
// that mock the env importable without the production env being present.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin() as unknown as Record<string | symbol, unknown>
    const value = client[prop as string | symbol]
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client)
    }
    return Reflect.get(client, prop, receiver)
  },
})
