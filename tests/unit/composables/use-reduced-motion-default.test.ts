import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

const state: { row: { preferences: unknown } | null } = { row: { preferences: {} } }

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: state.row, error: null }) }) }),
    }),
    rpc: async () => ({ error: null }),
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}))

async function seedAuth(): Promise<void> {
  const { useAuthStore } = await import('@/stores/auth')
  const auth = useAuthStore()
  ;(auth as unknown as { user: { id: string } }).user = { id: 'u1' }
}

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (_q: string) => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  })
}

beforeEach(async () => {
  await new Promise((r) => setTimeout(r, 1100))
  setActivePinia(createPinia())
  state.row = { preferences: {} }
  await seedAuth()
})

describe('applyReducedMotionDefault', () => {
  test('no-op when explicit key already set', async () => {
    state.row = { preferences: { accessibility: { reduceMotion: false } } }
    setMatchMedia(true)
    const { usePreferencesStore } = await import('@/stores/preferences')
    const { applyReducedMotionDefault } = await import(
      '@/composables/use-reduced-motion-default'
    )
    const store = usePreferencesStore()
    await store.load()
    applyReducedMotionDefault()
    expect(store.prefs.accessibility.reduceMotion).toBe(false)
  })

  test('writes true when no explicit key and OS prefers reduce', async () => {
    state.row = { preferences: {} }
    setMatchMedia(true)
    const { usePreferencesStore } = await import('@/stores/preferences')
    const { applyReducedMotionDefault } = await import(
      '@/composables/use-reduced-motion-default'
    )
    const store = usePreferencesStore()
    await store.load()
    applyReducedMotionDefault()
    expect(store.prefs.accessibility.reduceMotion).toBe(true)
  })

  test('no-op when no explicit key and OS does not prefer reduce', async () => {
    state.row = { preferences: {} }
    setMatchMedia(false)
    const { usePreferencesStore } = await import('@/stores/preferences')
    const { applyReducedMotionDefault } = await import(
      '@/composables/use-reduced-motion-default'
    )
    const store = usePreferencesStore()
    await store.load()
    applyReducedMotionDefault()
    expect(store.prefs.accessibility.reduceMotion).toBe(false)
  })
})
