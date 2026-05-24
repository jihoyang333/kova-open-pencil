import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
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

describe('<NotificationsPanel>', () => {
  test('renders both rows defaulting ON', async () => {
    const { usePreferencesStore } = await import('@/stores/preferences')
    const NotificationsPanel = (
      await import('@/components/settings/NotificationsPanel.vue')
    ).default
    const store = usePreferencesStore()
    await store.load()
    const wrapper = mount(NotificationsPanel)
    expect(wrapper.text()).toContain('Product updates')
    expect(wrapper.text()).toContain('Sync alerts')
    expect(wrapper.text()).toContain('Email · monthly')
    expect(wrapper.text()).toContain('Email · immediate')
    expect(store.prefs.notifications.productUpdates).toBe(true)
    expect(store.prefs.notifications.syncAlerts).toBe(true)
  })

  test('toggling syncAlerts updates the store', async () => {
    const { usePreferencesStore } = await import('@/stores/preferences')
    const NotificationsPanel = (
      await import('@/components/settings/NotificationsPanel.vue')
    ).default
    const store = usePreferencesStore()
    await store.load()
    const wrapper = mount(NotificationsPanel)
    const toggles = wrapper.findAll('button.toggle')
    expect(toggles.length).toBe(2)
    await toggles[1]!.trigger('click')
    await nextTick()
    expect(store.prefs.notifications.syncAlerts).toBe(false)
  })
})
