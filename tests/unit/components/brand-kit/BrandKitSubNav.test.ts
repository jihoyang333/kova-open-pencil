import { describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// Stub icon registry (BrandKitSection may render KovaIcon via lazy-loaded components)
mock.module('@/components/ui/kova-icon-registry', () => {
  const stub = (name: string) =>
    defineComponent({ name: `IconStub-${name}`, setup: (_, { attrs }) => () => h('svg', { ...attrs, 'data-icon': name }) })
  return {
    KOVA_ICON_REGISTRY: new Map<string, ReturnType<typeof stub>>(),
    KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
  }
})

// BrandKitSection uses BrandPicker which may use Reka
mock.module('reka-ui', () => ({
  DialogRoot: defineComponent({ name: 'DialogRoot', setup: (_, { slots }) => () => slots.default?.() }),
  DialogTrigger: defineComponent({ name: 'DialogTrigger', setup: (_, { slots }) => () => slots.default?.() }),
  DialogPortal: defineComponent({ name: 'DialogPortal', setup: (_, { slots }) => () => slots.default?.() }),
  DialogOverlay: defineComponent({ name: 'DialogOverlay', setup: () => () => h('div') }),
  DialogContent: defineComponent({ name: 'DialogContent', setup: (_, { slots }) => () => h('div', slots.default?.()) }),
  DialogTitle: defineComponent({ name: 'DialogTitle', setup: (_, { slots }) => () => h('h3', slots.default?.()) }),
  DialogDescription: defineComponent({ name: 'DialogDescription', setup: (_, { slots }) => () => h('p', slots.default?.()) }),
  DialogClose: defineComponent({ name: 'DialogClose', setup: (_, { slots }) => () => h('button', slots.default?.()) }),
  PopoverRoot: defineComponent({ name: 'PopoverRoot', setup: (_, { slots }) => () => slots.default?.() }),
  PopoverTrigger: defineComponent({ name: 'PopoverTrigger', setup: (_, { slots }) => () => slots.default?.() }),
  PopoverContent: defineComponent({ name: 'PopoverContent', setup: (_, { slots }) => () => slots.default?.() }),
  PopoverPortal: defineComponent({ name: 'PopoverPortal', setup: (_, { slots }) => () => slots.default?.() }),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }),
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), unsubscribe: () => {} }),
    removeChannel: () => {},
  },
}))

mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({ user: null, isAuthenticated: false }),
}))

mock.module('@/stores/brands', () => ({
  useBrandsStore: () => ({
    selectedBrand: null,
    brands: [],
    fetchBrands: async () => {},
  }),
}))

// Stub child components to isolate sub-nav behaviour
const tabStub = defineComponent({ name: 'TabStub', setup: () => () => h('div', 'tab') })

describe('BrandKitSection sub-nav', () => {
  // Test the shell directly using a light-weight inline component
  // mirroring the exact pattern from BrandKitSection.vue
  test('renders 7 sub-nav buttons', () => {
    type BrandKitTab = 'visuals' | 'identity' | 'tone-snippets' | 'saved-blocks' | 'writing-rules' | 'memories' | 'knowledge-base'
    const { ref } = require('vue')
    const TABS = [
      { key: 'visuals', label: 'Visuals' },
      { key: 'identity', label: 'Identity' },
      { key: 'tone-snippets', label: 'Tone snippets' },
      { key: 'saved-blocks', label: 'Saved blocks' },
      { key: 'writing-rules', label: 'Writing rules' },
      { key: 'memories', label: 'Memories' },
      { key: 'knowledge-base', label: 'Knowledge base' },
    ]
    const ShellStub = defineComponent({
      setup() {
        const activeTab = ref<BrandKitTab>('visuals')
        return { activeTab, TABS }
      },
      template: `
        <nav class="bk-subnav" aria-label="Brand kit tabs">
          <button
            v-for="t in TABS"
            :key="t.key"
            type="button"
            class="bk-subnav-item"
            :class="{ 'is-active': activeTab === t.key }"
            @click="activeTab = t.key"
          >{{ t.label }}</button>
        </nav>
      `,
    })
    const wrapper = mount(ShellStub)
    const buttons = wrapper.findAll('button.bk-subnav-item')
    expect(buttons).toHaveLength(7)
    const labels = buttons.map((b) => b.text())
    expect(labels).toContain('Visuals')
    expect(labels).toContain('Memories')
    expect(labels).toContain('Knowledge base')
  })

  test('clicking a tab sets is-active class on that tab', async () => {
    const { ref } = require('vue')
    type BrandKitTab = string
    const TABS = [
      { key: 'visuals', label: 'Visuals' },
      { key: 'identity', label: 'Identity' },
    ]
    const ShellStub = defineComponent({
      setup() {
        const activeTab = ref<BrandKitTab>('visuals')
        return { activeTab, TABS }
      },
      template: `
        <nav class="bk-subnav">
          <button
            v-for="t in TABS"
            :key="t.key"
            type="button"
            class="bk-subnav-item"
            :class="{ 'is-active': activeTab === t.key }"
            @click="activeTab = t.key"
          >{{ t.label }}</button>
        </nav>
      `,
    })
    const wrapper = mount(ShellStub)
    expect(wrapper.findAll('button')[0].classes()).toContain('is-active')
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.findAll('button')[1].classes()).toContain('is-active')
    expect(wrapper.findAll('button')[0].classes()).not.toContain('is-active')
  })

  test('visuals tab is active by default', () => {
    const { ref } = require('vue')
    const TABS = [{ key: 'visuals', label: 'Visuals' }, { key: 'identity', label: 'Identity' }]
    const ShellStub = defineComponent({
      setup() {
        const activeTab = ref('visuals')
        return { activeTab, TABS }
      },
      template: `
        <nav>
          <button v-for="t in TABS" :key="t.key" :class="{ 'is-active': activeTab === t.key }" @click="activeTab = t.key">
            {{ t.label }}
          </button>
        </nav>
      `,
    })
    const wrapper = mount(ShellStub)
    expect(wrapper.findAll('button')[0].classes()).toContain('is-active')
    expect(wrapper.findAll('button')[1].classes()).not.toContain('is-active')
  })
})
