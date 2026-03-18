import { createSupabaseClient } from '@/lib/supabase-factory'

import type { SupabaseClient } from '@supabase/supabase-js'

export { createSupabaseClient, type SupabaseConfig } from '@/lib/supabase-factory'

let _instance: SupabaseClient | undefined

export function getSupabase(): SupabaseClient {
  if (!_instance) {
    _instance = createSupabaseClient()
  }
  return _instance
}

/**
 * Lazy proxy that defers client creation until first property access.
 * Safe to import at module level in both app code and test environments.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabase(), prop, receiver)
  }
})
