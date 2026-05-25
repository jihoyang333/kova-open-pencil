import { describe, test, expect, mock } from 'bun:test'
import { mount } from '@vue/test-utils'

// Plan T30 + T32 — skeleton + canvas-creation transition contracts.

mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: { name: 'KovaIcon', template: '<span class="kova-icon-stub" :data-name="name" />', props: ['name', 'size'] },
}))

const { default: DashboardSkeleton } = await import(
  '@/components/dashboard/DashboardSkeleton.vue'
)
const { default: CanvasCreationTransition } = await import(
  '@/components/dashboard/CanvasCreationTransition.vue'
)

describe('DashboardSkeleton (T30)', () => {
  test('renders 8 skeleton cards in the file-grid', () => {
    const w = mount(DashboardSkeleton)
    expect(w.findAll('[data-test-id="skeleton-card"]')).toHaveLength(8)
  })

  test('applies animate-shimmer to multiple shimmer elements', () => {
    const w = mount(DashboardSkeleton)
    expect(w.findAll('.animate-shimmer').length).toBeGreaterThan(8)
  })

  test('mirrors dashboard chrome — has sidebar + main + topbar + file-grid', () => {
    const w = mount(DashboardSkeleton)
    expect(w.find('.sidebar').exists()).toBe(true)
    expect(w.find('.main').exists()).toBe(true)
    expect(w.find('.topbar').exists()).toBe(true)
    expect(w.find('.file-grid').exists()).toBe(true)
  })
})

describe('CanvasCreationTransition (T32)', () => {
  test('idle renders arrow-right on submit button', () => {
    const w = mount(CanvasCreationTransition, {
      props: { state: 'idle', prompt: 'Spring sale' },
    })
    const icons = w.findAll('[data-name]')
    expect(icons.some((i) => i.attributes('data-name') === 'arrow-right')).toBe(true)
  })

  test('submitting renders loader-2 spinner + Creating canvas copy', () => {
    const w = mount(CanvasCreationTransition, {
      props: { state: 'submitting', prompt: 'Spring sale' },
    })
    const icons = w.findAll('[data-name]')
    expect(icons.some((i) => i.attributes('data-name') === 'loader-2')).toBe(true)
    expect(w.find('[data-test-id="canvas-creation-status"]').text()).toContain('Creating canvas')
  })

  test('review renders .review modifier + Ready tick + check icon', () => {
    const w = mount(CanvasCreationTransition, {
      props: { state: 'review', prompt: 'Spring sale' },
    })
    expect(w.find('.composer-input.review').text()).toContain('Spring sale')
    expect(w.find('[data-test-id="canvas-creation-ready"]').exists()).toBe(true)
  })

  test('splash renders full-viewport spinner', () => {
    const w = mount(CanvasCreationTransition, {
      props: { state: 'splash', prompt: '' },
    })
    expect(w.find('[data-test-id="canvas-creation-splash"]').exists()).toBe(true)
    expect(w.find('.splash-spinner').exists()).toBe(true)
  })
})
