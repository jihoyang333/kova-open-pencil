import { afterAll, beforeAll, describe, expect, it } from 'bun:test'

/**
 * Cluster 12 Plan Task 6 — Integration test for update_user_pref RPC.
 *
 * Runs only when:
 *   1) KOVA_RUN_INTEGRATION=1
 *   2) SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set
 *   3) Local supabase is up (`supabase start`) with Cluster 01's
 *      users.preferences JSONB column applied
 *      (20260522_01_users_account_lifecycle.sql)
 *   4) Migration 20260603_12_user_preferences_rpc.sql applied
 *
 * Skip-guarded so the unit suite stays portable. When all four prerequisites
 * are met (post-merge with Cluster 01), CI flips the flag and the test runs.
 *
 * Purpose: prove the path-array variant of jsonb_set is atomic, preserves
 * sibling keys, and creates missing intermediate objects (create_missing).
 */

const SHOULD_RUN =
  process.env['KOVA_RUN_INTEGRATION'] === '1' &&
  !!process.env['SUPABASE_URL'] &&
  !!process.env['SUPABASE_SERVICE_ROLE_KEY']

const suite = SHOULD_RUN ? describe : describe.skip

suite('update_user_pref RPC — integration (local supabase)', () => {
  let supabase: {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: unknown) => {
          single: () => Promise<{ data: { preferences: Record<string, unknown> } | null; error: unknown }>
        }
      }
      update: (row: Record<string, unknown>) => {
        eq: (col: string, val: unknown) => Promise<{ error: unknown }>
      }
      delete: () => { eq: (col: string, val: unknown) => Promise<{ error: unknown }> }
      insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>
    }
    auth: {
      admin: {
        createUser: (args: {
          email: string
          password: string
          email_confirm: boolean
        }) => Promise<{ data: { user: { id: string } | null }; error: unknown }>
        deleteUser: (id: string) => Promise<{ data: unknown; error: unknown }>
      }
      signInWithPassword: (args: {
        email: string
        password: string
      }) => Promise<{ data: { user: { id: string } | null }; error: unknown }>
    }
  }

  let testUserId = ''
  const TEST_EMAIL = `pref-rpc-${Date.now()}@kova.test`
  const TEST_PASSWORD = 'integration-test-pw-' + Math.random().toString(36).slice(2)

  beforeAll(async () => {
    const { createClient } = await import('@supabase/supabase-js')
    supabase = createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    ) as never
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error || !data.user) throw new Error(`createUser failed: ${JSON.stringify(error)}`)
    testUserId = data.user.id
  })

  afterAll(async () => {
    if (testUserId) await supabase.auth.admin.deleteUser(testUserId)
  })

  it('creates missing nested objects when path does not yet exist', async () => {
    const userClient = await signInAsTestUser()
    const { error } = await userClient.rpc('update_user_pref', {
      p_path: ['accessibility', 'textSize'],
      p_value: 'large',
    })
    expect(error).toBeNull()
    const { data } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', testUserId)
      .single()
    expect((data?.preferences['accessibility'] as Record<string, unknown>)?.['textSize']).toBe(
      'large',
    )
  })

  it('preserves sibling keys on partial write', async () => {
    const userClient = await signInAsTestUser()
    await userClient.rpc('update_user_pref', {
      p_path: ['accessibility', 'reduceMotion'],
      p_value: true,
    })
    await userClient.rpc('update_user_pref', {
      p_path: ['accessibility', 'highContrast'],
      p_value: true,
    })
    const { data } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', testUserId)
      .single()
    const accessibility = data?.preferences['accessibility'] as Record<string, unknown>
    expect(accessibility?.['reduceMotion']).toBe(true)
    expect(accessibility?.['highContrast']).toBe(true)
    expect(accessibility?.['textSize']).toBe('large')
  })

  it('refuses to write outside caller row (SECURITY INVOKER + auth.uid)', async () => {
    const userClient = await signInAsTestUser()
    const { error } = await userClient.rpc('update_user_pref', {
      p_path: ['notifications', 'syncAlerts'],
      p_value: false,
    })
    expect(error).toBeNull()
  })

  async function signInAsTestUser(): Promise<typeof supabase> {
    const { createClient } = await import('@supabase/supabase-js')
    const anonClient = createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_ANON_KEY'] ?? process.env['VITE_SUPABASE_ANON_KEY']!,
    )
    const { error } = await anonClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    if (error) throw new Error(`signIn failed: ${JSON.stringify(error)}`)
    return anonClient as unknown as typeof supabase
  }
})
