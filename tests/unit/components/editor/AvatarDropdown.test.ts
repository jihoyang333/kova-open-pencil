/**
 * AvatarDropdown — Cluster 06 Task 9 tests.
 *
 * Validates Q16 menu items: Account / Help / Keyboard shortcuts / Sign out.
 * NO Brand picker (Q17 reversed). NO What's new (Phase 2).
 */
import { describe, test, expect, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: new Map<string, unknown>(),
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))

// Spy-capture the items prop passed to KovaMenu so we can assert exact list.
let capturedItems: Array<{ id: string; label: string }> = []
mock.module('@/components/ui/KovaMenu.vue', () => ({
  default: defineComponent({
    name: 'KovaMenuStub',
    props: { items: Array, align: String, sideOffset: Number },
    setup(props, { slots }) {
      capturedItems = (props.items as typeof capturedItems) ?? []
      return () => h('div', { 'data-stub': 'menu' }, slots.trigger?.())
    },
  }),
  KovaMenuItem: Object,
}))

const AvatarDropdown = (await import('@/components/editor/AvatarDropdown.vue')).default

describe('<AvatarDropdown> (Cluster 06 Task 9 — Q16 + §12.3)', () => {
  test('renders exactly 4 actionable menu items per Q16', () => {
    capturedItems = []
    mount(AvatarDropdown, {
      props: {
        userName: 'Jiho',
        userInitials: 'J',
        avatarColor: 'var(--color-accent)',
        plan: 'Free',
      },
    })
    expect(capturedItems.map((i) => i.id)).toEqual([
      'account',
      'help',
      'shortcuts',
      'sign-out',
    ])
  })

  test('item labels match Q16 spec', () => {
    capturedItems = []
    mount(AvatarDropdown, {
      props: {
        userName: 'Jiho',
        userInitials: 'J',
        avatarColor: 'var(--color-accent)',
        plan: 'Pro',
      },
    })
    expect(capturedItems.map((i) => i.label)).toEqual([
      'Account',
      'Help',
      'Keyboard shortcuts',
      'Sign out',
    ])
  })

  test('does NOT include Brand picker (Q17 reversal)', () => {
    capturedItems = []
    mount(AvatarDropdown, {
      props: {
        userName: 'Jiho',
        userInitials: 'J',
        avatarColor: 'var(--color-accent)',
        plan: 'Free',
      },
    })
    expect(capturedItems.find((i) => /brand/i.test(i.label))).toBeUndefined()
  })

  test('does NOT include What\'s new (Phase 2)', () => {
    capturedItems = []
    mount(AvatarDropdown, {
      props: {
        userName: 'Jiho',
        userInitials: 'J',
        avatarColor: 'var(--color-accent)',
        plan: 'Free',
      },
    })
    expect(capturedItems.find((i) => /what.*new/i.test(i.label))).toBeUndefined()
  })

  test('avatar trigger shows user initials', () => {
    capturedItems = []
    const wrapper = mount(AvatarDropdown, {
      props: {
        userName: 'Alice Liddell',
        userInitials: 'AL',
        avatarColor: 'var(--color-accent)',
        plan: 'Trial',
      },
    })
    const trigger = wrapper.find('[data-testid="topbar-avatar"]')
    expect(trigger.text()).toBe('AL')
  })

  test('avatar trigger aria-label includes user + plan', () => {
    capturedItems = []
    const wrapper = mount(AvatarDropdown, {
      props: {
        userName: 'Alice',
        userInitials: 'A',
        avatarColor: 'var(--color-accent)',
        plan: 'Pro',
      },
    })
    expect(
      wrapper.find('[data-testid="topbar-avatar"]').attributes('aria-label')
    ).toBe('Account menu — Alice (Pro)')
  })
})
