import { describe, test, expect, mock } from 'bun:test'
import { mount } from '@vue/test-utils'

// PRD 02 §3.1 + Plan T16 — A1.01.f splash step contract.

mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: { name: 'KovaIcon', template: '<span class="kova-icon-stub" />' },
}))

const { default: SplashStep } = await import('@/components/onboarding/SplashStep.vue')

describe('SplashStep (A1.01.f)', () => {
  test('renders success medal + 2x2 starter grid + Enter primary CTA', () => {
    const w = mount(SplashStep, { props: { brandName: 'Nike' } })
    expect(w.find('.check-medal').exists()).toBe(true)
    expect(w.findAll('.onb-next .opt')).toHaveLength(4)
    expect(w.find('[data-test-id="splash-enter"]').text()).toContain('Enter Nike workspace')
  })

  test('emits enter on primary click', async () => {
    const w = mount(SplashStep, { props: { brandName: 'Nike' } })
    await w.find('[data-test-id="splash-enter"]').trigger('click')
    expect(w.emitted('enter')).toHaveLength(1)
  })

  test('emits pick with choice on starter card click', async () => {
    const w = mount(SplashStep, { props: { brandName: 'Nike' } })
    const buttons = w.findAll('.onb-next .opt')
    await buttons[0]!.trigger('click')
    await buttons[2]!.trigger('click')
    const emitted = w.emitted('pick')
    expect(emitted).toHaveLength(2)
    expect((emitted![0] as [string])[0]).toBe('draft')
    expect((emitted![1] as [string])[0]).toBe('browse')
  })
})
