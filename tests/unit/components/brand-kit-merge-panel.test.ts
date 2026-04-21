import { describe, test, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const ArrowStub = defineComponent({ setup() { return () => h('span') } })

const { default: BrandKitMergePanel } = await import(
  '@/components/dashboard/BrandKitMergePanel.vue'
)

const CURRENT = { primaryColor: '#000000', headingFont: 'Inter' }
const PROPOSED = {
  primaryColor: '#FF0000',
  headingFont: 'Inter',
  logoUrl: 'https://cdn.example.com/logo.png',
}

function mountPanel(
  current = CURRENT,
  proposed = PROPOSED
) {
  return mount(BrandKitMergePanel, {
    props: { current, proposed },
    global: {
      stubs: { 'icon-lucide-arrow-right': ArrowStub },
    },
  })
}

describe('BrandKitMergePanel', () => {
  test('renders a row for primaryColor (changed)', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('[data-test-id="brand-kit-merge-row-primaryColor"]').exists()).toBe(true)
  })

  test('renders a row for logoUrl (new in proposed)', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('[data-test-id="brand-kit-merge-row-logoUrl"]').exists()).toBe(true)
  })

  test('does not render a row for headingFont (identical)', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('[data-test-id="brand-kit-merge-row-headingFont"]').exists()).toBe(false)
  })

  test('renders exactly two diff rows', () => {
    const wrapper = mountPanel()
    const rows = wrapper
      .findAll('[data-test-id^="brand-kit-merge-row-"]')
      .filter((el) => !el.attributes('data-test-id')?.includes('-checkbox'))
    expect(rows).toHaveLength(2)
  })

  test('all checkboxes are checked by default', () => {
    const wrapper = mountPanel()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThan(0)
    expect(checkboxes.every((cb) => (cb.element as HTMLInputElement).checked)).toBe(true)
  })

  test('shows no-changes message when all fields are identical', () => {
    const identical = { primaryColor: '#000', headingFont: 'Inter' }
    const wrapper = mountPanel(identical, identical)
    expect(wrapper.find('[data-test-id="brand-kit-merge-no-changes"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="brand-kit-merge-apply-btn"]').exists()).toBe(false)
  })

  test('hides no-changes message when there are diffs', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('[data-test-id="brand-kit-merge-no-changes"]').exists()).toBe(false)
  })

  test('apply button is enabled when at least one row is selected', () => {
    const wrapper = mountPanel()
    const btn = wrapper.find('[data-test-id="brand-kit-merge-apply-btn"]')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  test('unchecking all rows disables apply button', async () => {
    const wrapper = mountPanel()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    for (const cb of checkboxes) {
      await cb.trigger('change')
    }
    const btn = wrapper.find('[data-test-id="brand-kit-merge-apply-btn"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  test('clicking apply emits apply event with selected values', async () => {
    const wrapper = mountPanel()
    await wrapper.find('[data-test-id="brand-kit-merge-apply-btn"]').trigger('click')

    const emitted = wrapper.emitted('apply')
    expect(emitted).toHaveLength(1)
    const kit = (emitted![0] as [Record<string, string>])[0]
    expect(kit.primaryColor).toBe('#FF0000')
    expect(kit.logoUrl).toBe('https://cdn.example.com/logo.png')
    expect(kit.headingFont).toBeUndefined()
  })

  test('apply emits only checked rows after unchecking one', async () => {
    const wrapper = mountPanel()
    const primaryCheckbox = wrapper.find(
      '[data-test-id="brand-kit-merge-row-primaryColor-checkbox"]'
    )
    await primaryCheckbox.trigger('change')

    await wrapper.find('[data-test-id="brand-kit-merge-apply-btn"]').trigger('click')

    const emitted = wrapper.emitted('apply')
    const kit = (emitted![0] as [Record<string, string>])[0]
    expect(kit.primaryColor).toBeUndefined()
    expect(kit.logoUrl).toBe('https://cdn.example.com/logo.png')
  })

  test('displays current and proposed values in each row', () => {
    const wrapper = mountPanel()
    const rowText = wrapper.find('[data-test-id="brand-kit-merge-row-primaryColor"]').text()
    expect(rowText).toContain('#000000')
    expect(rowText).toContain('#FF0000')
  })

  test('shows em dash for missing current value', () => {
    const wrapper = mountPanel({}, { primaryColor: '#FF0000' })
    const rowText = wrapper.find('[data-test-id="brand-kit-merge-row-primaryColor"]').text()
    expect(rowText).toContain('—')
  })
})
