import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import * as vueuse from '@vueuse/core'

// PRD 02 §3.1 + Plan T13 — A1.01.c first-brand step contract.

mock.module('@vueuse/core', () => ({
  ...vueuse,
  useDebounceFn: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))
mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'user-test' } }),
}))
mock.module('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://x.test/logo.png' } }),
      }),
    },
  },
}))
mock.module('vue-router', () => ({
  useRouter: () => ({ push: async () => {} }),
}))
// KovaIcon registry resolves via unplugin-icons (~icons/lucide/*) which is not
// available under bun:test — stub the component import.
mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: { name: 'KovaIcon', template: '<span class="kova-icon-stub" />' },
}))

const { default: BrandIdentityStep } = await import('@/components/onboarding/BrandIdentityStep.vue')
const { _resetForTesting } = await import('@/composables/use-onboarding')

function mountStep() {
  return mount(BrandIdentityStep, {
    global: {
      stubs: { KovaIcon: { template: '<span class="kova-icon-stub" />' } },
    },
  })
}

describe('BrandIdentityStep (A1.01.c)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    _resetForTesting()
  })

  test('renders the three identity inputs', () => {
    const w = mountStep()
    expect(w.find('input[name="brandName"]').exists()).toBe(true)
    expect(w.find('input[name="brandUrl"]').exists()).toBe(true)
    expect(w.find('input[name="brandDescription"]').exists()).toBe(true)
  })

  test('logo slot renders with dashed border (not .fetched) when no logo', () => {
    const w = mountStep()
    const slot = w.find('[data-test-id="brand-identity-logo-slot"]')
    expect(slot.classes()).not.toContain('fetched')
  })

  test('continue button disabled until brandName + brandUrl populated', async () => {
    const w = mountStep()
    const btn = w.find('[data-test-id="brand-identity-continue"]')
    expect(btn.attributes('disabled')).toBeDefined()

    await w.find('input[name="brandName"]').setValue('Acme')
    expect(btn.attributes('disabled')).toBeDefined()

    await w.find('input[name="brandUrl"]').setValue('acme.com')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  test('continue button emits next when clicked while enabled', async () => {
    const w = mountStep()
    await w.find('input[name="brandName"]').setValue('Acme')
    await w.find('input[name="brandUrl"]').setValue('acme.com')
    await w.find('[data-test-id="brand-identity-continue"]').trigger('click')
    expect(w.emitted('next')).toHaveLength(1)
  })

  test('monogram shows ? when brand name is empty', () => {
    const w = mountStep()
    const slot = w.find('[data-test-id="brand-identity-logo-slot"]')
    expect(slot.text()).toContain('?')
  })

  test('monogram capitalises first letter of brand name', async () => {
    const w = mountStep()
    await w.find('input[name="brandName"]').setValue('acme')
    const slot = w.find('[data-test-id="brand-identity-logo-slot"]')
    expect(slot.text()).toContain('A')
  })
})
