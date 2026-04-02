import type { User } from '@supabase/supabase-js'

/** Creates a minimal Supabase User for test assertions. */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@test.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as User
}
