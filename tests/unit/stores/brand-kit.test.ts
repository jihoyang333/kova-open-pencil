import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

// Mock supabase: rpc (RPC actions) + from (fetchBrands read-back) + auth (auth store init).
const rpcMock = mock((_name: string, _args?: Record<string, unknown>) =>
  Promise.resolve({ data: 'new-uuid', error: null }),
)
let selectData: unknown[] = []
const fromMock = mock(() => ({
  select: () => Promise.resolve({ data: selectData, error: null }),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
    storage: { from: () => ({ remove: () => Promise.resolve({ error: null }) }) },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}))

const { useBrandKitStore } = await import('@/stores/brand-kit')
const { useBrandsStore } = await import('@/stores/auth').then(() => import('@/stores/brands'))

const baseBrand = {
  id: 'b1',
  user_id: 'u1',
  name: 'Nike',
  colors: { primary: '#111', secondary: '#222', accent: '', background: '#fff' },
  fonts: null,
  logo_url: 'https://cdn/logo.png',
  voice: null,
  industry: null,
  url: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  tone_snippets: [
    { id: 's2', label: 'B', category: 'X', content: 'b', order: 1 },
    { id: 's1', label: 'A', category: 'X', content: 'a', order: 0 },
  ],
  saved_blocks: [],
  writing_rules: { no_em_dash: true },
  identity: { about: { content: 'About', last_edited_at: '', last_edited_by: 'u1', word_count: 1 } },
}

function seedBrand(): void {
  const brands = useBrandsStore()
  brands.brands = [structuredClone(baseBrand)] as never
  brands.selectBrand('b1')
}

describe('useBrandKitStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    rpcMock.mockClear()
    fromMock.mockClear()
    selectData = []
  })

  test('toneSnippets getter returns sorted by order', () => {
    seedBrand()
    const store = useBrandKitStore()
    expect(store.toneSnippets.map((s) => s.id)).toEqual(['s1', 's2'])
  })

  test('brandColors derives non-empty slots from the 4-slot colors object', () => {
    seedBrand()
    const store = useBrandKitStore()
    // accent is empty → excluded; primary/secondary/background kept in slot order
    expect(store.brandColors).toEqual([
      { id: 'primary', hex: '#111', label: 'Primary', order: 0 },
      { id: 'secondary', hex: '#222', label: 'Secondary', order: 1 },
      { id: 'background', hex: '#fff', label: 'Background', order: 3 },
    ])
  })

  test('writingRules + identity + brandLogoUrl getters read through', () => {
    seedBrand()
    const store = useBrandKitStore()
    expect(store.writingRules['no_em_dash']).toBe(true)
    expect(store.identity.about?.content).toBe('About')
    expect(store.brandLogoUrl).toBe('https://cdn/logo.png')
  })

  test('addToneSnippet calls add_tone_snippet RPC then refetches', async () => {
    seedBrand()
    const store = useBrandKitStore()
    await store.addToneSnippet('Welcome', 'PROMO', 'Hello')
    expect(rpcMock).toHaveBeenCalledWith('add_tone_snippet', {
      p_brand_id: 'b1',
      p_label: 'Welcome',
      p_category: 'PROMO',
      p_content: 'Hello',
    })
    expect(fromMock).toHaveBeenCalledWith('brands')
  })

  test('updateToneSnippet optimistically patches local state', async () => {
    seedBrand()
    const store = useBrandKitStore()
    await store.updateToneSnippet('s1', 'A', 'X', 'updated')
    expect(store.toneSnippets.find((s) => s.id === 's1')?.content).toBe('updated')
    expect(rpcMock).toHaveBeenCalledWith('update_tone_snippet', {
      p_brand_id: 'b1',
      p_snippet_id: 's1',
      p_label: 'A',
      p_category: 'X',
      p_content: 'updated',
    })
  })

  test('deleteToneSnippet optimistically removes the row', async () => {
    seedBrand()
    const store = useBrandKitStore()
    await store.deleteToneSnippet('s1')
    expect(store.toneSnippets.find((s) => s.id === 's1')).toBeUndefined()
  })

  test('reorderToneSnippets reindexes order', async () => {
    seedBrand()
    const store = useBrandKitStore()
    await store.reorderToneSnippets(['s2', 's1'])
    expect(store.toneSnippets.map((s) => s.id)).toEqual(['s2', 's1'])
    expect(store.toneSnippets[0]?.order).toBe(0)
    expect(store.toneSnippets[1]?.order).toBe(1)
  })

  test('setWritingRule optimistically toggles', async () => {
    seedBrand()
    const store = useBrandKitStore()
    await store.setWritingRule('no_exclamation', true)
    expect(store.writingRules['no_exclamation']).toBe(true)
    expect(store.writingRules['no_em_dash']).toBe(true) // sibling preserved
  })

  test('rollback restores previous state when RPC errors', async () => {
    seedBrand()
    rpcMock.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: { code: '42501', message: 'forbidden' } }),
    )
    const store = useBrandKitStore()
    await expect(store.deleteToneSnippet('s1')).rejects.toBeDefined()
    // state restored — s1 still present
    expect(store.toneSnippets.find((s) => s.id === 's1')).toBeDefined()
  })

  test('actions throw when no brand selected', async () => {
    const store = useBrandKitStore()
    await expect(store.addToneSnippet('a', 'b', 'c')).rejects.toThrow('no_selected_brand')
  })
})
