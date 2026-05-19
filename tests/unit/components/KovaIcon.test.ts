import { describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// `~icons/lucide/*` is a unplugin-icons virtual-module path resolved by Vite at
// build time. Bun's test runner does not load Vite plugins, so the real
// `kova-icon-registry.ts` cannot be imported here. We mock the registry with
// stub components that emit `<svg data-icon="<name>" />` so we can still assert
// every contract of <KovaIcon>: known name renders, size → width/height,
// aria-label flips role, class forwarding, unknown name renders nothing.
mock.module('../../../src/components/ui/kova-icon-registry', () => {
  const stub = (name: string) =>
    defineComponent({
      name: `IconStub-${name}`,
      inheritAttrs: false,
      setup(_, { attrs }) {
        return () => h('svg', { ...attrs, 'data-icon': name })
      },
    })

  return {
    KOVA_ICON_REGISTRY: new Map<string, ReturnType<typeof stub>>([
      ['check', stub('check')],
      ['x', stub('x')],
    ]),
    KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
  }
})

const { default: KovaIcon } = await import('../../../src/components/ui/KovaIcon.vue')

describe('<KovaIcon> (W0-4 / CT-003)', () => {
  test('renders known lucide name as svg', () => {
    const wrapper = mount(KovaIcon, { props: { name: 'check' } })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('svg').attributes('data-icon')).toBe('check')
  })

  test('default aria-hidden="true" when no aria-label', () => {
    const wrapper = mount(KovaIcon, { props: { name: 'check' } })
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.attributes('role')).toBeUndefined()
  })

  test('aria-label flips role to "img" and clears aria-hidden', () => {
    const wrapper = mount(KovaIcon, {
      props: { name: 'check' },
      attrs: { 'aria-label': 'Saved' },
    })
    expect(wrapper.attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.attributes('role')).toBe('img')
  })

  test('size prop maps to pixel dimensions: xs=12, sm=14, md=16, lg=20', () => {
    for (const [size, px] of [
      ['xs', '12'],
      ['sm', '14'],
      ['md', '16'],
      ['lg', '20'],
    ] as const) {
      const wrapper = mount(KovaIcon, { props: { name: 'check', size } })
      const svg = wrapper.find('svg')
      expect(svg.attributes('width')).toBe(px)
      expect(svg.attributes('height')).toBe(px)
    }
  })

  test('size defaults to "md" (16px)', () => {
    const wrapper = mount(KovaIcon, { props: { name: 'check' } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('16')
    expect(svg.attributes('height')).toBe('16')
  })

  test('class prop forwards to svg root', () => {
    const wrapper = mount(KovaIcon, {
      props: { name: 'check', class: 'text-accent' },
    })
    expect(wrapper.find('svg').classes()).toContain('text-accent')
  })

  test('unknown name renders nothing without throwing', () => {
    const wrapper = mount(KovaIcon, { props: { name: 'definitely-not-a-real-icon' } })
    expect(wrapper.find('svg').exists()).toBe(false)
  })
})
