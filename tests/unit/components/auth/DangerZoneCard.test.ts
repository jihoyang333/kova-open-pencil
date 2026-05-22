import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { mount } from '@vue/test-utils'

// W8a Cluster 01 — DangerZoneCard (Plan 01 Task 16 / amendment §7 Phase 9.7).
// Typed-confirm pattern: user clicks "Delete account" → modal opens → must
// type "DELETE" in caps to enable the destructive confirm button.

const requestDeletion = mock(async () => undefined)
mock.module('@/composables/auth/use-account-deletion', () => ({
  useAccountDeletion: () => ({
    requestDeletion,
    restoreAccount: mock(async () => true),
    pending: { value: false },
    scheduledPurgeAt: { value: null }
  })
}))

// Stub KovaModal — it depends on unplugin-icons virtual modules that bun:test
// cannot resolve. The stub renders body + foot slots inline when open=true so
// we can drive the typed-confirm flow.
mock.module('@/components/ui/KovaModal.vue', () => ({
  default: {
    name: 'KovaModalStub',
    props: ['open', 'size', 'title', 'description', 'closeOnBackdrop'],
    emits: ['update:open', 'close'],
    template: `
      <div v-if="open" data-test-id="kova-modal-stub">
        <slot />
        <slot name="foot" />
      </div>
    `
  }
}))

const { default: DangerZoneCard } =
  await import('../../../../src/components/auth/DangerZoneCard.vue')

describe('<DangerZoneCard>', () => {
  beforeEach(() => {
    requestDeletion.mockClear()
  })

  test('renders "Delete account" trigger + warning copy', () => {
    const wrapper = mount(DangerZoneCard, { attachTo: document.body })
    expect(wrapper.text()).toContain('Delete account')
    expect(wrapper.text()).toContain('cannot be undone')
    wrapper.unmount()
  })

  test('opens confirm dialog on trigger click', async () => {
    const wrapper = mount(DangerZoneCard, { attachTo: document.body })
    expect(wrapper.find('[data-test-id="danger-confirm-input"]').exists()).toBe(false)
    await wrapper.find('[data-test-id="danger-trigger"]').trigger('click')
    // Reka teleports to portal; check the document instead of wrapper
    expect(document.body.querySelector('[data-test-id="danger-confirm-input"]')).not.toBeNull()
    wrapper.unmount()
  })

  test('confirm button is disabled until "DELETE" is typed', async () => {
    const wrapper = mount(DangerZoneCard, { attachTo: document.body })
    await wrapper.find('[data-test-id="danger-trigger"]').trigger('click')
    const confirm = document.body.querySelector(
      '[data-test-id="danger-confirm-btn"]'
    ) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)

    const input = document.body.querySelector(
      '[data-test-id="danger-confirm-input"]'
    ) as HTMLInputElement
    input.value = 'DELETE'
    input.dispatchEvent(new Event('input'))
    await new Promise((r) => setTimeout(r, 0))
    expect(confirm.disabled).toBe(false)
    wrapper.unmount()
  })

  test('confirming calls requestDeletion + emits "requested"', async () => {
    const wrapper = mount(DangerZoneCard, { attachTo: document.body })
    await wrapper.find('[data-test-id="danger-trigger"]').trigger('click')
    const input = document.body.querySelector(
      '[data-test-id="danger-confirm-input"]'
    ) as HTMLInputElement
    input.value = 'DELETE'
    input.dispatchEvent(new Event('input'))
    await new Promise((r) => setTimeout(r, 0))
    const confirm = document.body.querySelector(
      '[data-test-id="danger-confirm-btn"]'
    ) as HTMLButtonElement
    confirm.click()
    await new Promise((r) => setTimeout(r, 10))
    expect(requestDeletion).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('requested')).toBeTruthy()
    wrapper.unmount()
  })
})
