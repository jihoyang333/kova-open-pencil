import { describe, it, expect, mock, beforeAll, beforeEach, afterAll } from 'bun:test'
import * as v from 'valibot'

type CreateKovaTools = typeof import('../../../src/ai/kova-tools')['createKovaTools']
let createKovaTools: CreateKovaTools

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

  const mod = await import('../../../src/ai/kova-tools')
  createKovaTools = mod.createKovaTools
})

afterAll(() => mock.restore())

beforeEach(() => {
  eqArgs.length = 0
})

// ---------------------------------------------------------------------------
// Input schema shape tests — RED because tools don't exist on return value yet
// ---------------------------------------------------------------------------

describe('shopify AI tools — input schema shapes', () => {
  it('search_products: {query} is required; optional fields accepted', () => {
    const tools = createKovaTools({ activeBrandId: () => 'b1' } as never)
    const schema = (tools as Record<string, { inputSchema: v.GenericSchema }>)['search_products'].inputSchema
    expect(v.safeParse(schema, { query: 'shirt' }).success).toBe(true)
    expect(v.safeParse(schema, { query: 'shirt', limit: 10, sort: 'newest' }).success).toBe(true)
    expect(v.safeParse(schema, {}).success).toBe(false)
  })

  it('get_collection: {collection_id} is required', () => {
    const tools = createKovaTools({ activeBrandId: () => 'b1' } as never)
    const schema = (tools as Record<string, { inputSchema: v.GenericSchema }>)['get_collection'].inputSchema
    expect(v.safeParse(schema, { collection_id: 'col-1' }).success).toBe(true)
    expect(v.safeParse(schema, {}).success).toBe(false)
  })

  it('get_variant: {variant_id} is required', () => {
    const tools = createKovaTools({ activeBrandId: () => 'b1' } as never)
    const schema = (tools as Record<string, { inputSchema: v.GenericSchema }>)['get_variant'].inputSchema
    expect(v.safeParse(schema, { variant_id: 'var-1' }).success).toBe(true)
    expect(v.safeParse(schema, {}).success).toBe(false)
  })

  it('get_active_discounts: accepts empty object', () => {
    const tools = createKovaTools({ activeBrandId: () => 'b1' } as never)
    const schema = (tools as Record<string, { inputSchema: v.GenericSchema }>)['get_active_discounts'].inputSchema
    expect(v.safeParse(schema, {}).success).toBe(true)
  })

  it('get_shop_context: accepts empty object', () => {
    const tools = createKovaTools({ activeBrandId: () => 'b1' } as never)
    const schema = (tools as Record<string, { inputSchema: v.GenericSchema }>)['get_shop_context'].inputSchema
    expect(v.safeParse(schema, {}).success).toBe(true)
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
