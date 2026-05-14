import { describe, it, expect, mock, beforeAll, beforeEach, afterAll, afterEach } from 'bun:test'
import * as v from 'valibot'

type KovaToolsModule = typeof import('../../../src/ai/kova-tools')
type CreateKovaTools = KovaToolsModule['createKovaTools']
let createKovaTools: CreateKovaTools
let searchProductsSchema: KovaToolsModule['searchProductsSchema']
let getCollectionSchema: KovaToolsModule['getCollectionSchema']
let getVariantSchema: KovaToolsModule['getVariantSchema']
let getActiveDiscountsSchema: KovaToolsModule['getActiveDiscountsSchema']
let getShopContextSchema: KovaToolsModule['getShopContextSchema']

// --- figma-factory / core mock state (mutated per-test) ---
const figmaMock = {
  nodeResult: { fills: [] as unknown[] } as Record<string, unknown> | null,
}
const SUPABASE_IMG_URL = 'https://abc.supabase.co/storage/v1/object/public/media-assets/img.png'

// Tracks every .eq(col, val) call made against the mocked Supabase client.
// Reset in beforeEach to isolate assertions per test.
const eqArgs: Array<[string, unknown]> = []

type Thenable = { then: (onFulfilled: (val: { data: unknown[]; error: null; count: number }) => unknown, onRejected?: (err: unknown) => unknown) => Promise<unknown> }
type ChainableQuery = Record<string, unknown> & Thenable

const makeQuery = (): ChainableQuery => {
  const q = {} as ChainableQuery
  q['select'] = () => makeQuery()
  q['eq'] = (col: string, val: unknown) => {
    eqArgs.push([col, val])
    return makeQuery()
  }
  q['or'] = () => makeQuery()
  q['textSearch'] = () => makeQuery()
  q['limit'] = () => makeQuery()
  q['order'] = () => makeQuery()
  // maybeSingle() is always terminal — return a direct Promise
  q['maybeSingle'] = () => Promise.resolve({ data: null, error: null })
  // Make the builder itself awaitable so any call in the chain can be terminal
  q['then'] = (onFulfilled, onRejected) =>
    Promise.resolve({ data: [], error: null, count: 0 }).then(onFulfilled, onRejected)
  return q
}

beforeAll(async () => {
  mock.module('@/lib/supabase', () => ({
    supabase: { from: (_table: string) => makeQuery() },
    getSupabase: () => ({ from: (_table: string) => makeQuery() }),
  }))

  mock.module('@/automation/figma-factory', () => ({
    makeFigmaFromStore: () => ({
      getNodeById: (_id: string) => figmaMock.nodeResult,
      createImage: (_bytes: Uint8Array) => ({ hash: 'img-hash-1' }),
    }),
  }))

  mock.module('@open-pencil/core', () => ({
    computeAllLayouts: () => {},
  }))

  const mod = await import('../../../src/ai/kova-tools')
  createKovaTools = mod.createKovaTools
  searchProductsSchema = mod.searchProductsSchema
  getCollectionSchema = mod.getCollectionSchema
  getVariantSchema = mod.getVariantSchema
  getActiveDiscountsSchema = mod.getActiveDiscountsSchema
  getShopContextSchema = mod.getShopContextSchema
})

afterAll(() => mock.restore())

beforeEach(() => {
  eqArgs.length = 0
})

// ---------------------------------------------------------------------------
// Input schema shape tests — RED because tools don't exist on return value yet
// ---------------------------------------------------------------------------

describe('shopify AI tools — input schema shapes', () => {
  // Tests run against raw valibot schemas exported from kova-tools.ts.
  // The AI SDK wraps these via valibotSchema() inside each tool definition;
  // unit tests use the raw form so v.safeParse() works directly.
  it('search_products: {query} is required; optional fields accepted', () => {
    expect(v.safeParse(searchProductsSchema, { query: 'shirt' }).success).toBe(true)
    expect(v.safeParse(searchProductsSchema, { query: 'shirt', limit: 10, sort: 'newest' }).success).toBe(true)
    expect(v.safeParse(searchProductsSchema, {}).success).toBe(false)
  })

  it('get_collection: {collection_id} is required', () => {
    expect(v.safeParse(getCollectionSchema, { collection_id: 'col-1' }).success).toBe(true)
    expect(v.safeParse(getCollectionSchema, {}).success).toBe(false)
  })

  it('get_variant: {variant_id} is required', () => {
    expect(v.safeParse(getVariantSchema, { variant_id: 'var-1' }).success).toBe(true)
    expect(v.safeParse(getVariantSchema, {}).success).toBe(false)
  })

  it('get_active_discounts: accepts empty object', () => {
    expect(v.safeParse(getActiveDiscountsSchema, {}).success).toBe(true)
  })

  it('get_shop_context: accepts empty object', () => {
    expect(v.safeParse(getShopContextSchema, {}).success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Brand-scoped query + output shape tests
// ---------------------------------------------------------------------------

type AnyExecute = { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }

describe('shopify AI tools — brand-scoped Supabase queries + output shape', () => {
  it('search_products: queries brand_id from activeBrandId() and returns { products }', async () => {
    const tools = createKovaTools({ activeBrandId: () => 'brand-abc' } as never)
    const result = await (tools as Record<string, AnyExecute>)['search_products'].execute({ query: 'tee' })

    expect(
      eqArgs.some(([col, val]) => col === 'brand_id' && val === 'brand-abc'),
      'search_products must call .eq("brand_id", activeBrandId())'
    ).toBe(true)
    expect(result).toHaveProperty('products')
    expect(Array.isArray(result['products'])).toBe(true)
  })

  it('get_collection: queries brand_id from activeBrandId() and returns { collection, products }', async () => {
    const tools = createKovaTools({ activeBrandId: () => 'brand-abc' } as never)
    const result = await (tools as Record<string, AnyExecute>)['get_collection'].execute({ collection_id: 'col-1' })

    expect(
      eqArgs.some(([col, val]) => col === 'brand_id' && val === 'brand-abc'),
      'get_collection must call .eq("brand_id", activeBrandId())'
    ).toBe(true)
    expect(result).toHaveProperty('collection')
    expect(result).toHaveProperty('products')
  })

  it('get_variant: queries brand_id from activeBrandId() and returns { variant }', async () => {
    const tools = createKovaTools({ activeBrandId: () => 'brand-abc' } as never)
    const result = await (tools as Record<string, AnyExecute>)['get_variant'].execute({ variant_id: 'var-1' })

    expect(
      eqArgs.some(([col, val]) => col === 'brand_id' && val === 'brand-abc'),
      'get_variant must call .eq("brand_id", activeBrandId())'
    ).toBe(true)
    expect(result).toHaveProperty('variant')
  })

  it('get_active_discounts: queries brand_id from activeBrandId() and returns { discounts }', async () => {
    const tools = createKovaTools({ activeBrandId: () => 'brand-abc' } as never)
    const result = await (tools as Record<string, AnyExecute>)['get_active_discounts'].execute({})

    expect(
      eqArgs.some(([col, val]) => col === 'brand_id' && val === 'brand-abc'),
      'get_active_discounts must call .eq("brand_id", activeBrandId())'
    ).toBe(true)
    expect(result).toHaveProperty('discounts')
    expect(Array.isArray(result['discounts'])).toBe(true)
  })

  it('get_shop_context: queries brand_id from activeBrandId() and returns { currency, timezone, topCollections }', async () => {
    const tools = createKovaTools({ activeBrandId: () => 'brand-abc' } as never)
    const result = await (tools as Record<string, AnyExecute>)['get_shop_context'].execute({})

    expect(
      eqArgs.some(([col, val]) => col === 'brand_id' && val === 'brand-abc'),
      'get_shop_context must call .eq("brand_id", activeBrandId())'
    ).toBe(true)
    expect(result).toHaveProperty('currency')
    expect(result).toHaveProperty('timezone')
    expect(result).toHaveProperty('topCollections')
  })
})

// ---------------------------------------------------------------------------
// placeMediaImage execute paths
// ---------------------------------------------------------------------------

type PlaceExecute = { execute: (args: { node_id: string; image_url: string; scale_mode?: string }) => Promise<Record<string, unknown>> }

describe('placeMediaImage — execute paths', () => {
  const savedFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = savedFetch
    figmaMock.nodeResult = { fills: [] as unknown[] }
  })

  const makeStore = () => ({
    state: { currentPageId: 'page-1' },
    graph: {},
    snapshotPage: () => ({ snap: true }),
    requestRender: () => {},
    pushUndoEntry: (_entry: unknown) => {},
    renderer: { aiClearActive: () => {} },
    aiFlashDone: (_ids: string[]) => {},
  })

  it('returns error for non-Supabase image URL', async () => {
    const tools = createKovaTools(makeStore() as never)
    const result = await (tools as Record<string, PlaceExecute>)['placeMediaImage'].execute({
      node_id: 'n1', image_url: 'https://evil.com/img.png',
    })
    expect(result).toHaveProperty('error')
  })

  it('returns error when node is not found in the scene graph', async () => {
    figmaMock.nodeResult = null
    globalThis.fetch = mock(() => Promise.resolve(new Response(new Uint8Array([1, 2, 3]).buffer, { status: 200 }))) as typeof fetch
    const tools = createKovaTools(makeStore() as never)
    const result = await (tools as Record<string, PlaceExecute>)['placeMediaImage'].execute({
      node_id: 'missing-node', image_url: SUPABASE_IMG_URL,
    })
    expect(result).toHaveProperty('error')
    expect(String(result['error'])).toContain('not found')
  })

  it('returns error when fetch returns a non-ok status', async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response(null, { status: 503 }))) as typeof fetch
    const tools = createKovaTools(makeStore() as never)
    const result = await (tools as Record<string, PlaceExecute>)['placeMediaImage'].execute({
      node_id: 'n1', image_url: SUPABASE_IMG_URL,
    })
    expect(result).toHaveProperty('error')
    expect(String(result['error'])).toContain('503')
  })

  it('returns error when fetch throws a network error', async () => {
    globalThis.fetch = (() => Promise.reject(new Error('network down'))) as typeof fetch
    const tools = createKovaTools(makeStore() as never)
    const result = await (tools as Record<string, PlaceExecute>)['placeMediaImage'].execute({
      node_id: 'n1', image_url: SUPABASE_IMG_URL,
    })
    expect(result).toHaveProperty('error')
    expect(String(result['error'])).toContain('network down')
  })

  it('happy path: places image fill and returns success', async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response(new Uint8Array([1, 2, 3]).buffer, { status: 200 }))) as typeof fetch
    const tools = createKovaTools(makeStore() as never)
    const result = await (tools as Record<string, PlaceExecute>)['placeMediaImage'].execute({
      node_id: 'n1', image_url: SUPABASE_IMG_URL, scale_mode: 'FIT',
    })
    expect(result).toEqual({ success: true, node_id: 'n1', scale_mode: 'FIT' })
  })
})

