import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import type { Fill } from '@open-pencil/core'

// KovaIcon's registry resolves via unplugin-icons (~icons/lucide/*), not available under
// bun test. Mock the module before importing PaintEditor so the registry never loads
// (established pattern, see onboarding/brand-identity-step.test.ts).
mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: { name: 'KovaIcon', template: '<span class="kova-icon-stub" />' }
}))

const { default: PaintEditor } = await import('@/components/inspector/PaintEditor.vue')

function mountEditor(props: Record<string, unknown>) {
  return mount(PaintEditor, { props })
}

// Adapted per R2: the plan's `GradientPaint` type does not exist — core uses one `Fill`
// interface discriminated by `type: FillType`. PRD §12.5: all 4 gradient types ship.
const solid = (): Fill =>
  ({ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }) as Fill

const gradient = (m: 'linear' | 'radial' | 'angular' | 'diamond'): Fill =>
  ({
    type: `GRADIENT_${m.toUpperCase()}`,
    color: { r: 0, g: 0, b: 0, a: 1 },
    opacity: 1,
    visible: true,
    gradientStops: [
      { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
      { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } }
    ]
  }) as Fill

describe('PaintEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders 6 mode tabs in default context (all 4 gradient types + solid + image)', () => {
    const wrapper = mountEditor({ modelValue: solid(), mode: 'solid' })
    const tabs = wrapper.findAll('[data-test="mode-tab"]')
    expect(tabs).toHaveLength(6)
    expect(tabs.map((t) => t.attributes('data-mode'))).toEqual([
      'solid',
      'linear',
      'radial',
      'angular',
      'diamond',
      'image'
    ])
  })

  it('renders no mode tabs in page-bg context', () => {
    const wrapper = mountEditor({ modelValue: solid(), mode: 'solid', anchorContext: 'page-bg' })
    expect(wrapper.findAll('[data-test="mode-tab"]')).toHaveLength(0)
  })

  it('emits update:mode when a tab is clicked', async () => {
    const wrapper = mountEditor({ modelValue: solid(), mode: 'solid' })
    await wrapper.findAll('[data-test="mode-tab"]')[1].trigger('click')
    expect(wrapper.emitted('update:mode')![0]).toEqual(['linear'])
  })

  it('renders gradient-stops UI for all 4 gradient modes', () => {
    for (const m of ['linear', 'radial', 'angular', 'diamond'] as const) {
      const wrapper = mountEditor({ modelValue: gradient(m), mode: m })
      expect(wrapper.find('[data-test="gradient-stops"]').exists()).toBe(true)
    }
  })

  // C-LOW07b.3: one named test per gradient type
  for (const [m, hasAngle] of [
    ['linear', true],
    ['radial', false],
    ['angular', true],
    ['diamond', false]
  ] as const) {
    it(`renders ${m} gradient — stops UI present, angle input ${hasAngle ? 'visible' : 'hidden'}`, () => {
      const wrapper = mountEditor({ modelValue: gradient(m), mode: m })
      expect(wrapper.find('[data-test="gradient-stops"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-stop]').length).toBe(2)
      expect(wrapper.find('[data-test="gradient-angle"]').exists()).toBe(hasAngle)
      expect(wrapper.find(`[data-gradient-type="${m}"]`).exists()).toBe(true)
    })
  }
})
