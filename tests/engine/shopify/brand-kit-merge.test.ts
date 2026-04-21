import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

import { applySelection, diffBrandKits } from '@/utils/diff-brand-kit'

// ----- Supabase mock -----

const mockFrom = mock(() => ({}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: {
      from: mock(() => ({ remove: mock(() => Promise.resolve({ error: null })) })),
    },
    auth: {
      getSession: mock(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

const { useBrandsStore } = await import('@/stores/brands')
const { useAuthStore } = await import('@/stores/auth')

// ----- Fixtures -----

const BASE_BRAND = {
  id: 'b1',
  user_id: 'user-1',
  name: 'Acme',
  colors: { primary: '#000000', secondary: '#ffffff', accent: '#ff0000', background: '#eeeeee' },
  fonts: { heading: 'Georgia', body: 'Arial' },
  logo_url: null,
  voice: null,
  industry: null,
  url: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

function mockUpdate(updated: typeof BASE_BRAND) {
  mockFrom.mockReturnValueOnce({
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: updated, error: null }),
        }),
      }),
    }),
  })
}

function seedStore(store: ReturnType<typeof useBrandsStore>) {
  mockFrom.mockReturnValueOnce({
    select: () => Promise.resolve({ data: [BASE_BRAND], error: null }),
  })
  return store.fetchBrands()
}

// ----- diffBrandKits + applySelection integration -----

describe('brand-kit merge — diff + apply integration', () => {
  test('handoff scenario: 2 diff rows for changed primaryColor and new logoUrl, heading omitted', () => {
    const current = { primaryColor: '#000000', headingFont: 'Inter' }
    const proposed = {
      primaryColor: '#FF0000',
      headingFont: 'Inter',
      logoUrl: 'https://cdn.example.com/logo.png',
    }

    const rows = diffBrandKits(current, proposed)

    expect(rows).toHaveLength(2)
    const keys = rows.map((r) => r.key)
    expect(keys).toContain('primaryColor')
    expect(keys).toContain('logoUrl')
    expect(keys).not.toContain('headingFont')
  })

  test('applySelection with all selected returns both changed values', () => {
    const rows = diffBrandKits(
      { primaryColor: '#000000', headingFont: 'Inter' },
      { primaryColor: '#FF0000', headingFont: 'Inter', logoUrl: 'https://cdn.example.com/logo.png' }
    )

    const kit = applySelection(rows)

    expect(kit.primaryColor).toBe('#FF0000')
    expect(kit.logoUrl).toBe('https://cdn.example.com/logo.png')
    expect(kit.headingFont).toBeUndefined()
  })

  test('applySelection with primaryColor deselected keeps only logoUrl', () => {
    const rows = diffBrandKits(
      { primaryColor: '#000000', headingFont: 'Inter' },
      { primaryColor: '#FF0000', headingFont: 'Inter', logoUrl: 'https://cdn.example.com/logo.png' }
    )
    const primaryRow = rows.find((r) => r.key === 'primaryColor')
    if (primaryRow) primaryRow.selected = false

    const kit = applySelection(rows)

    expect(kit.primaryColor).toBeUndefined()
    expect(kit.logoUrl).toBe('https://cdn.example.com/logo.png')
  })
})

// ----- useBrandsStore.applyShopifyMerge -----

describe('useBrandsStore.applyShopifyMerge', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    const authStore = useAuthStore()
    authStore.user = { id: 'user-1', email: 'test@test.com' } as never
  })

  test('applies primaryColor via applyShopifyMerge', async () => {
    const store = useBrandsStore()
    await seedStore(store)

    const expected = { ...BASE_BRAND, colors: { ...BASE_BRAND.colors, primary: '#FF0000' } }
    mockUpdate(expected)

    await store.applyShopifyMerge('b1', { primaryColor: '#FF0000' })

    expect(store.brands[0].colors?.primary).toBe('#FF0000')
    expect(store.brands[0].colors?.secondary).toBe('#ffffff')
  })

  test('applies headingFont via applyShopifyMerge', async () => {
    const store = useBrandsStore()
    await seedStore(store)

    const expected = { ...BASE_BRAND, fonts: { ...BASE_BRAND.fonts, heading: 'Inter' } }
    mockUpdate(expected)

    await store.applyShopifyMerge('b1', { headingFont: 'Inter' })

    expect(store.brands[0].fonts?.heading).toBe('Inter')
    expect(store.brands[0].fonts?.body).toBe('Arial')
  })

  test('applies logoUrl via applyShopifyMerge', async () => {
    const store = useBrandsStore()
    await seedStore(store)

    const expected = { ...BASE_BRAND, logo_url: 'https://cdn.example.com/logo.png' }
    mockUpdate(expected)

    await store.applyShopifyMerge('b1', { logoUrl: 'https://cdn.example.com/logo.png' })

    expect(store.brands[0].logo_url).toBe('https://cdn.example.com/logo.png')
  })

  test('clears proposedBrandKit after applyShopifyMerge', async () => {
    const store = useBrandsStore()
    await seedStore(store)
    store.proposeFromShopify('b1', { primaryColor: '#FF0000' })
    expect(store.proposedBrandKit).not.toBeNull()

    mockUpdate({ ...BASE_BRAND, colors: { ...BASE_BRAND.colors, primary: '#FF0000' } })
    await store.applyShopifyMerge('b1', { primaryColor: '#FF0000' })

    expect(store.proposedBrandKit).toBeNull()
  })

  test('does not call updateBrand when chosen kit is empty', async () => {
    const store = useBrandsStore()
    await seedStore(store)

    await store.applyShopifyMerge('b1', {})

    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  test('full flow: diff → select all → applyShopifyMerge updates brand', async () => {
    const store = useBrandsStore()
    await seedStore(store)

    const rows = diffBrandKits(
      { primaryColor: '#000000', headingFont: 'Georgia' },
      { primaryColor: '#FF0000', headingFont: 'Inter' }
    )
    const chosen = applySelection(rows)

    const expected = {
      ...BASE_BRAND,
      colors: { ...BASE_BRAND.colors, primary: '#FF0000' },
      fonts: { ...BASE_BRAND.fonts, heading: 'Inter' },
    }
    mockUpdate(expected)

    await store.applyShopifyMerge('b1', chosen)

    expect(store.brands[0].colors?.primary).toBe('#FF0000')
    expect(store.brands[0].fonts?.heading).toBe('Inter')
  })
})
