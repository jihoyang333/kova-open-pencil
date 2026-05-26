import { describe, expect, test, mock } from 'bun:test'
import { mount } from '@vue/test-utils'

// Stub supabase before component import — handleConnect reads it on click.
mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'test-jwt' } },
        error: null,
      }),
    },
  },
}))

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

interface FetchCall { 0: string; 1: RequestInit | undefined }

function mockBearerFetch(redirectUrl: string): {
  fetchSpy: { calls: FetchCall[] }
  restore: () => void
} {
  const calls: FetchCall[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push([String(input), init] as FetchCall)
    return new Response(JSON.stringify({ redirectUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch
  return {
    fetchSpy: { calls },
    restore: () => {
      globalThis.fetch = original
    },
  }
}

async function flushAsync(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
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

  test('clicking connect POSTs shop + brand_id with Bearer header and emits returned redirectUrl', async () => {
    const { fetchSpy, restore } = mockBearerFetch('https://kova.myshopify.com/admin/oauth/authorize?state=abc')
    try {
      const wrapper = mountStep({ brandId: 'brand-xyz' })
      await wrapper.find('[data-test-id="store-type-shopify"]').trigger('click')
      await wrapper.find('[data-test-id="store-type-shop-input"]').setValue('mystore.myshopify.com')
      await wrapper.find('[data-test-id="store-type-connect"]').trigger('click')
      await flushAsync()

      expect(fetchSpy.calls).toHaveLength(1)
      const [calledUrl, calledInit] = fetchSpy.calls[0]!
      expect(calledUrl).toBe('/api/shopify/oauth/start')
      expect(calledInit?.method).toBe('POST')
      expect(calledInit?.headers).toMatchObject({ Authorization: 'Bearer test-jwt' })
      const body = JSON.parse(calledInit?.body as string) as { shop: string; brand_id: string }
      expect(body.shop).toBe('mystore.myshopify.com')
      expect(body.brand_id).toBe('brand-xyz')

      const emitted = wrapper.emitted('connect-shopify')
      expect(emitted).toHaveLength(1)
      expect((emitted![0] as [string])[0]).toContain('admin/oauth/authorize')
    } finally {
      restore()
    }
  })

  test('connect normalizes shop domain before sending (strips https scheme)', async () => {
    const { fetchSpy, restore } = mockBearerFetch('https://kova.myshopify.com/admin/oauth/authorize?state=abc')
    try {
      const wrapper = mountStep({ brandId: 'brand-xyz' })
      await wrapper.find('[data-test-id="store-type-shopify"]').trigger('click')
      await wrapper.find('[data-test-id="store-type-shop-input"]').setValue('https://mystore.myshopify.com')
      await wrapper.find('[data-test-id="store-type-connect"]').trigger('click')
      await flushAsync()

      const body = JSON.parse(fetchSpy.calls[0]![1]?.body as string) as { shop: string }
      expect(body.shop).toBe('mystore.myshopify.com')
    } finally {
      restore()
    }
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
