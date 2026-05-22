import { describe, test, expect, beforeEach, mock } from 'bun:test'

import { runStep } from '../../../../../api/cron/steps/shopify'

// Plan 01 Task 6b — cron step: shopify.

const originalFetch = globalThis.fetch

describe('cron step: shopify', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch
  })

  test('no brands → ok', async () => {
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ not: () => Promise.resolve({ data: [], error: null }) }) }),
      }),
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })

  test('iterates brands and calls Shopify DELETE + nulls brand shop fields', async () => {
    const brands = [
      { id: 'b1', shopify_shop_domain: 'shop1.myshopify.com', shopify_access_token_id: 'tok1' },
      { id: 'b2', shopify_shop_domain: 'shop2.myshopify.com', shopify_access_token_id: 'tok2' },
    ]
    const updateMock = mock(() => ({ eq: () => Promise.resolve({ error: null }) }))
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ not: () => Promise.resolve({ data: brands, error: null }) }) }),
        update: updateMock,
      }),
      rpc: mock(async () => ({ data: 'shpat_secret', error: null })),
    } as never

    const fetchMock = mock(async () => new Response(null, { status: 200 }))
    globalThis.fetch = fetchMock as never

    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(updateMock).toHaveBeenCalledTimes(2)
  })

  test('treats Shopify 404 as idempotent success', async () => {
    const brands = [{ id: 'b1', shopify_shop_domain: 'shop1.myshopify.com', shopify_access_token_id: 'tok1' }]
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ not: () => Promise.resolve({ data: brands, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }),
      rpc: mock(async () => ({ data: 'shpat_secret', error: null })),
    } as never
    globalThis.fetch = mock(async () => new Response(null, { status: 404 })) as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })

  test('returns retriable on Shopify 5xx', async () => {
    const brands = [{ id: 'b1', shopify_shop_domain: 'shop1.myshopify.com', shopify_access_token_id: 'tok1' }]
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ not: () => Promise.resolve({ data: brands, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }),
      rpc: mock(async () => ({ data: 'shpat_secret', error: null })),
    } as never
    globalThis.fetch = mock(async () => new Response(null, { status: 503 })) as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.retriable).toBe(true)
  })
})
