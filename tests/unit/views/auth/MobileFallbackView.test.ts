import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { mount, RouterLinkStub } from '@vue/test-utils'
import { ref } from 'vue'

// W8a Cluster 01 — MobileFallbackView (Plan 01 Task 19 / amendment §7 Phase 9.4).
// Hi-fi: B6.1 (mobile, <640px) + B6.2 (tablet, 640–1023px).

const isMobile = ref(true)
const isTablet = ref(false)
const isDesktop = ref(false)
mock.module('@/composables/auth/use-viewport-guard', () => ({
  useViewportGuard: () => ({
    get isMobile() {
      return { value: isMobile.value }
    },
    get isTablet() {
      return { value: isTablet.value }
    },
    get isDesktop() {
      return { value: isDesktop.value }
    }
  })
}))

mock.module('vue-router', () => ({
  RouterLink: RouterLinkStub
}))

const { default: MobileFallbackView } =
  await import('../../../../src/views/auth/MobileFallbackView.vue')

function mountView() {
  return mount(MobileFallbackView, {
    global: { stubs: { RouterLink: RouterLinkStub } }
  })
}

describe('<MobileFallbackView>', () => {
  beforeEach(() => {
    isMobile.value = true
    isTablet.value = false
    isDesktop.value = false
  })

  test('mobile viewport renders B6.1 copy', () => {
    isMobile.value = true
    isTablet.value = false
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Kova is desktop-only')
    expect(wrapper.text()).toContain('phones can offer')
  })

  test('tablet viewport renders B6.2 copy', () => {
    isMobile.value = false
    isTablet.value = true
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Bigger screen needed')
    expect(wrapper.text()).toContain('rotate your tablet')
  })

  test('mailto CTA prefills subject + body', () => {
    const wrapper = mountView()
    const cta = wrapper.find('[data-test-id="mailto-cta"]')
    const href = cta.attributes('href') ?? ''
    expect(href.startsWith('mailto:')).toBe(true)
    expect(href).toContain('subject=')
    expect(href).toContain('app.kova.io')
  })

  test('renders in light theme', () => {
    const wrapper = mountView()
    expect(wrapper.find('[data-theme="light"]').exists()).toBe(true)
  })
})
