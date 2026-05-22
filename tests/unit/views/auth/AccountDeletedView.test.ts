import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { mount, RouterLinkStub } from '@vue/test-utils'

// W8a Cluster 01 — AccountDeletedView (Plan 01 Task 20 / amendment §7 Phase 9.6).

const push = mock(async () => undefined)
mock.module('vue-router', () => ({
  useRouter: () => ({ push }),
  RouterLink: RouterLinkStub
}))

const { default: AccountDeletedView } =
  await import('../../../../src/views/auth/AccountDeletedView.vue')

function mountView() {
  return mount(AccountDeletedView, {
    global: { stubs: { RouterLink: RouterLinkStub } }
  })
}

describe('<AccountDeletedView>', () => {
  beforeEach(() => {
    push.mockClear()
  })

  test('renders terminal headline + permanence copy', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Your account is deleted')
    expect(wrapper.text()).toContain('permanently')
  })

  test('CTA routes to /signup', async () => {
    const wrapper = mountView()
    await wrapper.find('[data-test-id="start-fresh-cta"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/signup')
  })

  test('renders in light theme', () => {
    const wrapper = mountView()
    expect(wrapper.find('[data-theme="light"]').exists()).toBe(true)
  })
})
