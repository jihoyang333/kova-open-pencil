import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

const CANVAS_ID = '00000000-0000-0000-0000-000000000002'
const BRAND_ID = '00000000-0000-0000-0000-000000000001'

const sampleBinding = {
  frame_id: 'frame-1',
  brand_id: BRAND_ID,
  shopify_variant_id: 'gid://shopify/ProductVariant/1',
  bindings: { image: 'live' as const, price: 'live' as const, title: 'live' as const, inventory: 'live' as const },
  child_ids: { image_node_id: 'n1', title_node_id: 'n2', price_node_id: 'n3' },
}

const dbRow = { ...sampleBinding, canvas_id: CANVAS_ID }

type SelectResult = { data: unknown[]; error: null | { message: string } }
type UpsertResult = { error: null | { message: string } }

let selectResult: SelectResult = { data: [dbRow], error: null }
let upsertResult: UpsertResult = { error: null }

const mockEqBrand = mock(() => Promise.resolve(selectResult))
const mockEqCanvas = mock(() => ({ eq: mockEqBrand }))
const mockSelect = mock(() => ({ eq: mockEqCanvas }))
const mockUpsert = mock((_rows: unknown, _opts: unknown) => Promise.resolve(upsertResult))
const mockFrom = mock(() => ({ select: mockSelect, upsert: mockUpsert }))

mock.module('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

const { useCanvasBindingsPersistence } = await import(
  '@/composables/useCanvasBindingsPersistence'
)
const { useProductVariantBindingsStore } = await import('@/stores/product-variant-bindings')

describe('useCanvasBindingsPersistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    selectResult = { data: [dbRow], error: null }
    upsertResult = { error: null }
    mockFrom.mockClear()
    mockSelect.mockClear()
    mockEqCanvas.mockClear()
    mockEqBrand.mockClear()
    mockUpsert.mockClear()
  })

  describe('loadBindings', () => {
    test('queries canvas_product_variant_bindings with canvas_id and brand_id', async () => {
      const { loadBindings } = useCanvasBindingsPersistence(CANVAS_ID, BRAND_ID)
      await loadBindings()

      expect(mockFrom).toHaveBeenCalledWith('canvas_product_variant_bindings')
      expect(mockEqCanvas).toHaveBeenCalledWith('canvas_id', CANVAS_ID)
      expect(mockEqBrand).toHaveBeenCalledWith('brand_id', BRAND_ID)
    })

    test('hydrates the store with bindings from DB', async () => {
      const { loadBindings } = useCanvasBindingsPersistence(CANVAS_ID, BRAND_ID)
      const store = useProductVariantBindingsStore()

      await loadBindings()

      expect(store.byFrameId.size).toBe(1)
      expect(store.byFrameId.get('frame-1')?.shopify_variant_id).toBe(
        'gid://shopify/ProductVariant/1',
      )
    })

    test('clears existing bindings when no rows returned', async () => {
      selectResult = { data: [], error: null }

      const { loadBindings } = useCanvasBindingsPersistence(CANVAS_ID, BRAND_ID)
      const store = useProductVariantBindingsStore()
      store.set(sampleBinding)
      expect(store.byFrameId.size).toBe(1)

      await loadBindings()

      expect(store.byFrameId.size).toBe(0)
    })

    test('strips canvas_id before hydrating so valibot schema is satisfied', async () => {
      const { loadBindings } = useCanvasBindingsPersistence(CANVAS_ID, BRAND_ID)
      const store = useProductVariantBindingsStore()

      await loadBindings()

      const binding = store.byFrameId.get('frame-1')
      expect(binding).toBeDefined()
      expect((binding as Record<string, unknown>).canvas_id).toBeUndefined()
    })

    test('does not throw when Supabase returns an error', async () => {
      selectResult = { data: [], error: { message: 'DB read error' } }

      const { loadBindings } = useCanvasBindingsPersistence(CANVAS_ID, BRAND_ID)

      await expect(loadBindings()).resolves.toBeUndefined()
    })
  })

  describe('saveBindings', () => {
    test('upserts all store bindings to canvas_product_variant_bindings', async () => {
      const { saveBindings } = useCanvasBindingsPersistence(CANVAS_ID, BRAND_ID)
      const store = useProductVariantBindingsStore()
      store.set(sampleBinding)

      await saveBindings()

      expect(mockFrom).toHaveBeenCalledWith('canvas_product_variant_bindings')
      expect(mockUpsert).toHaveBeenCalledTimes(1)
    })

    test('adds canvas_id to each upserted row', async () => {
      const { saveBindings } = useCanvasBindingsPersistence(CANVAS_ID, BRAND_ID)
      const store = useProductVariantBindingsStore()
      store.set(sampleBinding)

      await saveBindings()

      const rows = (mockUpsert.mock.calls[0] as [Array<Record<string, unknown>>, unknown])[0]
      expect(rows[0].canvas_id).toBe(CANVAS_ID)
      expect(rows[0].frame_id).toBe('frame-1')
    })

    test('uses frame_id,canvas_id as upsert conflict key', async () => {
      const { saveBindings } = useCanvasBindingsPersistence(CANVAS_ID, BRAND_ID)
      useProductVariantBindingsStore().set(sampleBinding)

      await saveBindings()

      const opts = (mockUpsert.mock.calls[0] as [unknown, Record<string, string>])[1]
      expect(opts.onConflict).toBe('frame_id,canvas_id')
    })

    test('upserts empty array when store has no bindings', async () => {
      const { saveBindings } = useCanvasBindingsPersistence(CANVAS_ID, BRAND_ID)

      await saveBindings()

      const rows = (mockUpsert.mock.calls[0] as [unknown[], unknown])[0]
      expect(rows).toEqual([])
    })

    test('does not throw when Supabase returns an error', async () => {
      upsertResult = { error: { message: 'write failed' } }
      const { saveBindings } = useCanvasBindingsPersistence(CANVAS_ID, BRAND_ID)

      await expect(saveBindings()).resolves.toBeUndefined()
    })
  })
})
