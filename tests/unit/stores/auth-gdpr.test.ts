import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

// W8a Cluster 01 — useAuthStore GDPR additions (Plan 01 Task 9).
// Sibling to auth.test.ts (which covers M5-era password methods kept as
// deprecated). This file exercises the new pendingDeletion / scheduledPurgeAt
// computed + requestAccountDeletion + restoreAccount methods.

const realRouter = await import('@/router')
mock.module('@/router', () => ({
  ...realRouter,
  getRouter: () => ({ push: mock(() => Promise.resolve()), currentRoute: { value: { name: 'login' } } }),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: mock(async () => ({ error: null })),
      getSession: mock(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}))

const { useAuthStore } = await import('@/stores/auth')

describe('useAuthStore — GDPR additions (Plan 01 Task 9)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('exposes pendingDeletion + scheduledPurgeAt computed (default false/null)', () => {
    const store = useAuthStore()
    expect(store.pendingDeletion).toBe(false)
    expect(store.scheduledPurgeAt).toBeNull()
  })

  test('requestAccountDeletion: 200 → sets scheduledPurgeAt + sign-out', async () => {
    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify({ success: true, scheduled_purge_at: '2026-06-21T00:00:00Z' }), { status: 200 })
    ) as never
    const store = useAuthStore()
    await store.requestAccountDeletion()
    expect(store.scheduledPurgeAt).toBe('2026-06-21T00:00:00Z')
    expect(store.pendingDeletion).toBe(true)
  })

  test('requestAccountDeletion: 500 → throws', async () => {
    globalThis.fetch = mock(async () => new Response('boom', { status: 500 })) as never
    const store = useAuthStore()
    let threw = false
    try {
      await store.requestAccountDeletion()
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
  })

  test('restoreAccount: 200 → returns true + clears pending state', async () => {
    globalThis.fetch = mock(async () => new Response(JSON.stringify({ success: true }), { status: 200 })) as never
    const store = useAuthStore()
    const r = await store.restoreAccount()
    expect(r).toBe(true)
    expect(store.scheduledPurgeAt).toBeNull()
  })

  test('restoreAccount: 409 → returns false (no pending deletion)', async () => {
    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify({ error: 'no_pending_deletion' }), { status: 409 })
    ) as never
    const store = useAuthStore()
    const r = await store.restoreAccount()
    expect(r).toBe(false)
  })

  test('restoreAccount: 500 → throws', async () => {
    globalThis.fetch = mock(async () => new Response('boom', { status: 500 })) as never
    const store = useAuthStore()
    let threw = false
    try {
      await store.restoreAccount()
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
  })
})
