import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { mount, RouterLinkStub } from '@vue/test-utils'
import { ref } from 'vue'

// W8a Cluster 01 — MagicLinkErrorView (Plan 01 Task 18 / amendment §7 Phase 9.1).
// Hi-fi: B4.1 (?status=expired) + B4.2 (?status=invalid).

const status = ref<string | undefined>(undefined)
const push = mock(async () => undefined)
mock.module('vue-router', () => ({
  useRoute: () => ({
    query: {
      get status() {
        return status.value
      }
    }
  }),
  useRouter: () => ({ push }),
  RouterLink: RouterLinkStub
}))

const { default: MagicLinkErrorView } =
  await import('../../../../src/views/auth/MagicLinkErrorView.vue')

function mountWith(s: string | undefined) {
  status.value = s
  return mount(MagicLinkErrorView, {
    global: { stubs: { RouterLink: RouterLinkStub } }
  })
}

describe('<MagicLinkErrorView>', () => {
  beforeEach(() => {
    push.mockClear()
  })

  test('expired status shows "This link expired" headline + 30-min copy', () => {
    const wrapper = mountWith('expired')
    expect(wrapper.text()).toContain('This link expired')
    expect(wrapper.text()).toContain('30 minutes')
    expect(wrapper.text()).toContain('Send a new link')
  })

  test('invalid status shows "Link doesn\'t work" headline + Sign in CTA', () => {
    const wrapper = mountWith('invalid')
    expect(wrapper.text()).toContain("Link doesn't work")
    expect(wrapper.text()).toContain('invalid or has already been used')
    expect(wrapper.text()).toContain('Sign in')
  })

  test('unknown status falls back to invalid copy', () => {
    const wrapper = mountWith(undefined)
    expect(wrapper.text()).toContain("Link doesn't work")
  })

  test('clicking primary CTA routes to /login', async () => {
    const wrapper = mountWith('expired')
    await wrapper.find('[data-test-id="magic-link-error-primary"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/login')
  })

  test('renders in light theme', () => {
    const wrapper = mountWith('expired')
    expect(wrapper.find('[data-theme="light"]').exists()).toBe(true)
  })
})
