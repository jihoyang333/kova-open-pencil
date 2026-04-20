import { describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'

const { default: StoreTypeStep } = await import(
  '@/components/onboarding/StoreTypeStep.vue'
)

function mountStep(props: { brandName?: string; brandId?: string } = {}) {
  return mount(StoreTypeStep, {
    props: {
      brandName: props.brandName ?? 'Lumiere',
      brandId: props.brandId ?? 'brand-abc-123',
    },
  })
}

describe('StoreTypeStep', () => {
  test('renders three option cards', () => {
    const wrapper = mountStep()
    expect(wrapper.find('[data-test-id="store-type-shopify"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="store-type-something-else"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="store-type-no-store"]').exists()).toBe(true)
  })

  test('displays brand name in heading', () => {
    const wrapper = mountStep({ brandName: 'Acme' })
    expect(wrapper.text()).toContain('Acme')
  })

  test('shop input is hidden initially', () => {
    const wrapper = mountStep()
    expect(wrapper.find('[data-test-id="store-type-shop-input"]').exists()).toBe(false)
  })

  test('clicking Shopify card reveals shop input', async () => {
    const wrapper = mountStep()
    await wrapper.find('[data-test-id="store-type-shopify"]').trigger('click')
    expect(wrapper.find('[data-test-id="store-type-shop-input"]').exists()).toBe(true)
  })

  test('connect button is disabled when shop input is empty', async () => {
    const wrapper = mountStep()
    await wrapper.find('[data-test-id="store-type-shopify"]').trigger('click')
    const btn = wrapper.find('[data-test-id="store-type-connect"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  test('connect button is disabled when shop domain is invalid', async () => {
    const wrapper = mountStep()
    await wrapper.find('[data-test-id="store-type-shopify"]').trigger('click')
    const input = wrapper.find('[data-test-id="store-type-shop-input"]')
    await input.setValue('not-a-shopify-domain.com')
    const btn = wrapper.find('[data-test-id="store-type-connect"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  test('connect button is enabled when shop domain is valid', async () => {
    const wrapper = mountStep()
    await wrapper.find('[data-test-id="store-type-shopify"]').trigger('click')
    const input = wrapper.find('[data-test-id="store-type-shop-input"]')
    await input.setValue('mystore.myshopify.com')
    const btn = wrapper.find('[data-test-id="store-type-connect"]')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  test('clicking connect emits connect-shopify with OAuth URL containing shop and brand_id', async () => {
    const wrapper = mountStep({ brandId: 'brand-xyz' })
    await wrapper.find('[data-test-id="store-type-shopify"]').trigger('click')
    const input = wrapper.find('[data-test-id="store-type-shop-input"]')
    await input.setValue('mystore.myshopify.com')
    await wrapper.find('[data-test-id="store-type-connect"]').trigger('click')
    const emitted = wrapper.emitted('connect-shopify')
    expect(emitted).toHaveLength(1)
    const url = (emitted![0] as [string])[0]
    expect(url).toContain('/api/shopify/oauth/start')
    expect(url).toContain('shop=mystore.myshopify.com')
    expect(url).toContain('brand_id=brand-xyz')
  })

  test('connect normalizes shop domain before emitting (strips https scheme)', async () => {
    const wrapper = mountStep({ brandId: 'brand-xyz' })
    await wrapper.find('[data-test-id="store-type-shopify"]').trigger('click')
    const input = wrapper.find('[data-test-id="store-type-shop-input"]')
    await input.setValue('https://mystore.myshopify.com')
    await wrapper.find('[data-test-id="store-type-connect"]').trigger('click')
    const emitted = wrapper.emitted('connect-shopify')
    const url = (emitted![0] as [string])[0]
    expect(url).toContain('shop=mystore.myshopify.com')
    expect(url).not.toContain('https%3A%2F%2F')
  })

  test('clicking "Something else" emits something-else', async () => {
    const wrapper = mountStep()
    await wrapper.find('[data-test-id="store-type-something-else"]').trigger('click')
    expect(wrapper.emitted('something-else')).toBeTruthy()
  })

  test('clicking "No store yet" emits skip', async () => {
    const wrapper = mountStep()
    await wrapper.find('[data-test-id="store-type-no-store"]').trigger('click')
    expect(wrapper.emitted('skip')).toBeTruthy()
  })
})
