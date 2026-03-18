import { createClient } from '@supabase/supabase-js'

import type { SupabaseClient } from '@supabase/supabase-js'

export interface SupabaseConfig {
  url: string
  key: string
}

/**
 * Creates a Supabase client with explicit config or env vars.
 * Validates that required config values are present.
 */
export function createSupabaseClient(config?: SupabaseConfig): SupabaseClient {
  const url = config?.url ?? import.meta.env.VITE_SUPABASE_URL
  const key = config?.key ?? import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('Missing VITE_SUPABASE_URL. Add it to .env.local.')
  }
  if (!key) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY. Add it to .env.local.')
  }

  return createClient(url, key)
}
