import { describe, test, expect } from 'bun:test'

// Import from supabase-factory directly to avoid mock.module conflicts
// (other test files mock '@/lib/supabase' which would shadow the real module)
import { createSupabaseClient } from '@/lib/supabase-factory'

describe('createSupabaseClient', () => {
  test('throws if VITE_SUPABASE_URL is missing', () => {
    expect(() => {
      createSupabaseClient({ url: '', key: 'test-key' })
    }).toThrow('Missing VITE_SUPABASE_URL')
  })

  test('throws if VITE_SUPABASE_ANON_KEY is missing', () => {
    expect(() => {
      createSupabaseClient({ url: 'https://test.supabase.co', key: '' })
    }).toThrow('Missing VITE_SUPABASE_ANON_KEY')
  })

  test('creates client with valid env vars', () => {
    const client = createSupabaseClient({
      url: 'https://test.supabase.co',
      key: 'test-anon-key',
    })
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
  })
})
