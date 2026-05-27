/**
 * MissingFontsPill — Cluster 06 Task 9 / sub-spec 14.x (C-LOW06.4).
 */
import { describe, test, expect, mock } from 'bun:test'
import { mount } from '@vue/test-utils'

mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: new Map<string, unknown>(),
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))

const MissingFontsPill = (await import('@/components/editor/MissingFontsPill.vue')).default

describe('<MissingFontsPill> (Cluster 06 — C-LOW06.4)', () => {
  test('renders count text when missingCount > 0', () => {
    const wrapper = mount(MissingFontsPill, { props: { missingCount: 2 } })
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text().toLowerCase()).toContain('missing')
  })

  test('uses singular "font" when count = 1', () => {
    const wrapper = mount(MissingFontsPill, { props: { missingCount: 1 } })
    expect(wrapper.text()).toContain('1 missing font')
    expect(wrapper.text()).not.toContain('1 missing fonts')
  })

  test('does not render when missingCount = 0', () => {
    const wrapper = mount(MissingFontsPill, { props: { missingCount: 0 } })
    expect(wrapper.find('[data-testid="missing-fonts-pill"]').exists()).toBe(false)
  })

  test('click emits open-font-manager event', async () => {
    const wrapper = mount(MissingFontsPill, { props: { missingCount: 1 } })
    await wrapper.find('[data-testid="missing-fonts-pill"]').trigger('click')
    expect(wrapper.emitted('open-font-manager')).toBeTruthy()
  })

  test('aria-label includes count for screen readers', () => {
    const wrapper = mount(MissingFontsPill, { props: { missingCount: 3 } })
    expect(
      wrapper.find('[data-testid="missing-fonts-pill"]').attributes('aria-label')
    ).toContain('3 missing fonts')
  })
})
