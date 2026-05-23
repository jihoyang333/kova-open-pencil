import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { preferences: {} }, error: null }) }),
      }),
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

beforeEach(async () => {
  await new Promise((r) => setTimeout(r, 1100))
  setActivePinia(createPinia())
  await seedAuth()
})

describe('usePreference / usePreferencePath', () => {
  test('top-level: get reads store, set writes via store.set', async () => {
    const { usePreferencesStore } = await import('@/stores/preferences')
    const { usePreference } = await import('@/composables/use-preferences')
    const store = usePreferencesStore()
    await store.load()
    const accessibility = usePreference('accessibility')
    expect(accessibility.value.textSize).toBe('medium')
    accessibility.value = { textSize: 'large', reduceMotion: true, highContrast: false }
    await nextTick()
    expect(store.prefs.accessibility.textSize).toBe('large')
    expect(store.prefs.accessibility.reduceMotion).toBe(true)
  })

  test('path: round-trip on nested boolean', async () => {
    const { usePreferencesStore } = await import('@/stores/preferences')
    const { usePreferencePath } = await import('@/composables/use-preferences')
    const store = usePreferencesStore()
    await store.load()
    const showRuler = usePreferencePath<boolean>(['view', 'showRuler'])
    expect(showRuler.value).toBe(false)
    showRuler.value = true
    await nextTick()
    expect(store.prefs.view.showRuler).toBe(true)
  })

  test('path: round-trip on TextSize enum', async () => {
    const { usePreferencesStore } = await import('@/stores/preferences')
    const { usePreferencePath } = await import('@/composables/use-preferences')
    const store = usePreferencesStore()
    await store.load()
    const textSize = usePreferencePath<'small' | 'medium' | 'large'>([
      'accessibility',
      'textSize',
    ])
    textSize.value = 'small'
    await nextTick()
    expect(store.prefs.accessibility.textSize).toBe('small')
  })
})
