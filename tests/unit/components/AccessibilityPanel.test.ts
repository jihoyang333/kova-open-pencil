import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'

// Stub the icon registry (KovaSegmented may emit KovaIcon for option icons,
// and unplugin-icons virtual imports aren't resolved under bun test).
mock.module('@/components/ui/kova-icon-registry', () => {
  const stub = (name: string) =>
    defineComponent({
      name: `IconStub-${name}`,
      setup(_, { attrs }) {
        return () => h('svg', { ...attrs, 'data-icon': name })
      },
    })
  return {
    KOVA_ICON_REGISTRY: new Map<string, ReturnType<typeof stub>>(),
    KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
  }
})

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { preferences: {} }, error: null }) }),
      }),
    }),
    rpc: async () => ({ error: null }),
  },
}))
mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'u1' } }),
}))

beforeEach(async () => {
  await new Promise((r) => setTimeout(r, 1100))
  setActivePinia(createPinia())
})

describe('<AccessibilityPanel>', () => {
  test('renders three rows with default labels', async () => {
    const { usePreferencesStore } = await import('@/stores/preferences')
    const AccessibilityPanel = (
      await import('@/components/settings/AccessibilityPanel.vue')
    ).default
    const store = usePreferencesStore()
    await store.load()
    const wrapper = mount(AccessibilityPanel)
    expect(wrapper.text()).toContain('Text size')
    expect(wrapper.text()).toContain('Reduce motion')
    expect(wrapper.text()).toContain('High contrast')
  })

  test('toggling reduce motion updates the store', async () => {
    const { usePreferencesStore } = await import('@/stores/preferences')
    const AccessibilityPanel = (
      await import('@/components/settings/AccessibilityPanel.vue')
    ).default
    const store = usePreferencesStore()
    await store.load()
    const wrapper = mount(AccessibilityPanel)
    const toggles = wrapper.findAll('button.toggle')
    expect(toggles.length).toBe(2)
    await toggles[0]!.trigger('click')
    await nextTick()
    expect(store.prefs.accessibility.reduceMotion).toBe(true)
  })
})
