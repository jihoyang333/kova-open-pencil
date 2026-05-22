import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { mount, RouterLinkStub } from '@vue/test-utils'
import { ref } from 'vue'

// W8a Cluster 01 — AccountPendingDeletionView (Plan 01 Task 20 / amendment §7 Phase 9.5).

const scheduledPurgeAt = ref<string | null>('2026-06-21T00:00:00.000Z')
const restoreResult = ref(true)
const restoreAccount = mock(async () => restoreResult.value)
const signOut = mock(async () => undefined)
mock.module('@/composables/auth/use-account-deletion', () => ({
  useAccountDeletion: () => ({
    requestDeletion: mock(async () => undefined),
    restoreAccount,
    pending: { value: true },
    scheduledPurgeAt: { value: scheduledPurgeAt.value }
  })
}))
mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({
    signOut,
    get scheduledPurgeAt() {
      return scheduledPurgeAt.value
    }
  })
}))

const push = mock(async () => undefined)
mock.module('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push }),
  RouterLink: RouterLinkStub,
  createRouter: () => ({}),
  createWebHistory: () => ({}),
  createMemoryHistory: () => ({})
}))

const { default: AccountPendingDeletionView } =
  await import('../../../../src/views/auth/AccountPendingDeletionView.vue')

function mountView() {
  return mount(AccountPendingDeletionView, {
    global: { stubs: { RouterLink: RouterLinkStub } }
  })
}

describe('<AccountPendingDeletionView>', () => {
  beforeEach(() => {
    scheduledPurgeAt.value = '2026-06-21T00:00:00.000Z'
    restoreResult.value = true
    restoreAccount.mockClear()
    signOut.mockClear()
    push.mockClear()
  })

  test('renders headline + restore CTA + sign-out secondary', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Account scheduled for deletion')
    expect(wrapper.text()).toContain('Restore account')
    expect(wrapper.text()).toContain('Sign out')
  })

  test('shows scheduled-purge date', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('2026')
  })

  test('restore CTA calls restoreAccount + routes to /dashboard on success', async () => {
    restoreResult.value = true
    const wrapper = mountView()
    await wrapper.find('[data-test-id="restore-cta"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(restoreAccount).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/dashboard')
  })

  test('sign-out CTA calls signOut', async () => {
    const wrapper = mountView()
    await wrapper.find('[data-test-id="signout-cta"]').trigger('click')
    expect(signOut).toHaveBeenCalledTimes(1)
  })

  test('renders dark theme (no data-theme=light)', () => {
    const wrapper = mountView()
    expect(wrapper.find('[data-theme="light"]').exists()).toBe(false)
  })
})
