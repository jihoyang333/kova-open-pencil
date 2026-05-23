import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

interface MockRow { preferences: unknown }
const state: { row: MockRow | null; rpcCalls: Array<{ name: string; args: unknown }> } = {
  row: { preferences: {} },
  rpcCalls: [],
}

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: (_t: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: state.row, error: null }),
        }),
      }),
    }),
    rpc: async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args })
      return { error: null }
    },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}))

async function seedAuth(): Promise<void> {
  const { useAuthStore } = await import('@/stores/auth')
  const auth = useAuthStore()
  ;(auth as unknown as { user: { id: string } }).user = { id: 'user-42' }
}

beforeEach(async () => {
  // Drain any pending debounced writes from prior test before resetting state.
  await new Promise((r) => setTimeout(r, 1100))
  setActivePinia(createPinia())
  state.rpcCalls = []
  state.row = { preferences: {} }
  document.documentElement.removeAttribute('data-text-size')
  document.documentElement.removeAttribute('data-reduce-motion')
  document.documentElement.removeAttribute('data-high-contrast')
  await seedAuth()
})


describe('usePreferencesStore', () => {
  test('load with empty server blob falls back to DEFAULTS', async () => {
    const { usePreferencesStore } = await import('@/stores/preferences')
    const { DEFAULTS } = await import('@/types/preferences')
    state.row = { preferences: {} }
    const s = usePreferencesStore()
    await s.load()
    expect(s.prefs).toEqual(DEFAULTS)
    expect(s.loaded).toBe(true)
  })

  test('load applies DOM data attributes', async () => {
    state.row = {
      preferences: {
        accessibility: { textSize: 'large', reduceMotion: true, highContrast: false },
      },
    }
    const { usePreferencesStore } = await import('@/stores/preferences')
    const s = usePreferencesStore()
    await s.load()
    expect(document.documentElement.dataset['textSize']).toBe('large')
    expect(document.documentElement.dataset['reduceMotion']).toBe('true')
    expect(document.documentElement.dataset['highContrast']).toBe('false')
  })

  test('set produces immutable update', async () => {
    const { usePreferencesStore } = await import('@/stores/preferences')
    const s = usePreferencesStore()
    await s.load()
    const before = s.prefs
    s.set('accessibility', { textSize: 'large', reduceMotion: false, highContrast: false })
    expect(s.prefs).not.toBe(before)
    expect(s.prefs.accessibility.textSize).toBe('large')
  })

  test('set triggers exactly one RPC call within 1 s debounce window', async () => {
    const { usePreferencesStore } = await import('@/stores/preferences')
    const s = usePreferencesStore()
    await s.load()
    s.set('accessibility', { textSize: 'small', reduceMotion: false, highContrast: false })
    s.set('accessibility', { textSize: 'large', reduceMotion: false, highContrast: false })
    expect(state.rpcCalls.length).toBe(0)
    await new Promise((r) => setTimeout(r, 1100))
    expect(state.rpcCalls.length).toBe(1)
    expect(state.rpcCalls[0]).toEqual({
      name: 'update_user_pref',
      args: {
        p_path: ['accessibility'],
        p_value: { textSize: 'large', reduceMotion: false, highContrast: false },
      },
    })
  })

  test('setPath writes the specific slice only', async () => {
    const { usePreferencesStore } = await import('@/stores/preferences')
    const s = usePreferencesStore()
    await s.load()
    s.setPath(['view', 'showRuler'], true)
    await new Promise((r) => setTimeout(r, 1100))
    expect(state.rpcCalls[0]?.args).toEqual({
      p_path: ['view', 'showRuler'],
      p_value: true,
    })
    expect(s.prefs.view.showRuler).toBe(true)
    expect(s.prefs.view.showLayoutGuide).toBe(true)
  })

  test('round-trips string preference without double-encoding', async () => {
    const { usePreferencesStore } = await import('@/stores/preferences')
    const s = usePreferencesStore()
    await s.load()
    s.setPath(['accessibility', 'textSize'], 'large')
    await new Promise((r) => setTimeout(r, 1100))
    const arg = state.rpcCalls[0]?.args as { p_value: unknown } | undefined
    expect(arg?.p_value).toBe('large')
    expect(typeof arg?.p_value).toBe('string')
  })

  test('hasExplicitAccessibilityKey reports server-supplied keys', async () => {
    state.row = {
      preferences: {
        accessibility: { textSize: 'small' },
      },
    }
    const { usePreferencesStore } = await import('@/stores/preferences')
    const s = usePreferencesStore()
    await s.load()
    expect(s.hasExplicitAccessibilityKey('textSize')).toBe(true)
    expect(s.hasExplicitAccessibilityKey('reduceMotion')).toBe(false)
  })
})

