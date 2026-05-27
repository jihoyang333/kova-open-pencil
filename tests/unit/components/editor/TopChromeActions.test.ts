/**
 * TopChromeActions — Cluster 06 Task 9 tests.
 *
 * Regression guard for PRD §12.3 RATIFIED 2026-05-17 (Comments HIDDEN).
 * `<TopChromeActions>` DOM must NOT contain [data-testid="topbar-comments"].
 */
import { describe, test, expect, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: new Map<string, unknown>(),
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))

mock.module('@/components/ui/KovaTooltip.vue', () => ({
  default: defineComponent({
    name: 'KovaTooltipStub',
    props: { content: String, side: String, align: String, sideOffset: Number, delayDuration: Number, disabled: Boolean },
    setup(_, { slots }) {
      return () => h('div', { 'data-stub': 'tooltip' }, slots.default?.())
    },
  }),
}))

mock.module('@/components/ui/KovaMenu.vue', () => ({
  default: defineComponent({
    name: 'KovaMenuStub',
    props: { items: Array, align: String, sideOffset: Number },
    setup(_, { slots }) {
      return () => h('div', { 'data-stub': 'menu' }, slots.trigger?.())
    },
  }),
  KovaMenuItem: Object,
}))

const TopChromeActions = (await import('@/components/editor/TopChromeActions.vue')).default

describe('<TopChromeActions> (Cluster 06 Task 9 — §12.3 Comments HIDDEN)', () => {
  test('does NOT render Comments icon in topbar', () => {
    const wrapper = mount(TopChromeActions, {
      props: {
        userName: 'Jiho',
        userInitials: 'J',
        avatarColor: 'var(--color-accent)',
        plan: 'Free',
      },
    })
    expect(wrapper.find('[data-testid="topbar-comments"]').exists()).toBe(false)
    expect(wrapper.text().toLowerCase()).not.toContain('comment')
  })

  test('renders Notifications + Present + Avatar slots', () => {
    const wrapper = mount(TopChromeActions, {
      props: {
        userName: 'Jiho',
        userInitials: 'J',
        avatarColor: 'var(--color-accent)',
        plan: 'Free',
      },
    })
    expect(wrapper.find('[data-testid="topbar-notifications"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="topbar-present"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="topbar-avatar"]').exists()).toBe(true)
  })

  test('Notifications + Present are Phase 2 disabled', () => {
    const wrapper = mount(TopChromeActions, {
      props: {
        userName: 'Jiho',
        userInitials: 'J',
        avatarColor: 'var(--color-accent)',
        plan: 'Free',
      },
    })
    expect(
      wrapper.find('[data-testid="topbar-notifications"]').attributes('disabled')
    ).toBeDefined()
    expect(
      wrapper.find('[data-testid="topbar-present"]').attributes('disabled')
    ).toBeDefined()
  })
})
