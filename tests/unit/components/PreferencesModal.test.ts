import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'

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

// KovaModal pulls in Reka UI's Dialog. We stub it to make tests deterministic.
mock.module('@/components/ui/KovaModal.vue', () => ({
  default: defineComponent({
    name: 'KovaModalStub',
    props: { open: Boolean, size: String, title: String, description: String },
    emits: ['close', 'update:open'],
    setup(props, { slots, emit }) {
      return () =>
        props.open
          ? h('div', { class: 'dlg', 'data-test': 'modal' }, [
              h('h3', {}, props.title),
              h('p', { class: 'sub' }, props.description),
              slots.default?.(),
              h('div', { class: 'dlg-foot' }, [
                h('div', { class: 'l' }, slots['foot-left']?.()),
                h('div', { class: 'r' }, slots.foot?.()),
              ]),
              h(
                'button',
                {
                  'data-test': 'close-x',
                  onClick: () => emit('close'),
                },
                'x',
              ),
            ])
          : null
    },
  }),
}))

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

describe('<PreferencesModal>', () => {
  test('hidden by default', async () => {
    const PreferencesModal = (await import('@/components/settings/PreferencesModal.vue'))
      .default
    const wrapper = mount(PreferencesModal)
    expect(wrapper.find('[data-test="modal"]').exists()).toBe(false)
  })

  test('open renders Accessibility panel with title + foot', async () => {
    const { usePreferencesModal } = await import('@/composables/use-preferences-modal')
    const PreferencesModal = (await import('@/components/settings/PreferencesModal.vue'))
      .default
    const { open } = usePreferencesModal()
    open('accessibility')
    await nextTick()
    const wrapper = mount(PreferencesModal)
    await nextTick()
    expect(wrapper.text()).toContain('Accessibility')
    expect(wrapper.text()).toContain('Visual and motion preferences')
    expect(wrapper.text()).toContain('Saved to your account')
  })

  test('Cancel + Save both close the modal', async () => {
    const { usePreferencesModal } = await import('@/composables/use-preferences-modal')
    const PreferencesModal = (await import('@/components/settings/PreferencesModal.vue'))
      .default
    const { open, isOpen } = usePreferencesModal()
    open('accessibility')
    await nextTick()
    const wrapper = mount(PreferencesModal)
    await nextTick()
    const buttons = wrapper.findAll('button')
    const cancelBtn = buttons.find((b) => b.text() === 'Cancel')
    expect(cancelBtn).toBeTruthy()
    await cancelBtn!.trigger('click')
    expect(isOpen.value).toBe(false)
    // Reopen and try Save
    open('accessibility')
    await nextTick()
    const wrapper2 = mount(PreferencesModal)
    await nextTick()
    const saveBtn = wrapper2.findAll('button').find((b) => b.text() === 'Save')
    await saveBtn!.trigger('click')
    expect(isOpen.value).toBe(false)
  })
})
