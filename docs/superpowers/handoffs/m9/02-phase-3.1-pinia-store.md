# M9 Chunk 2 — Phase 3.1: Pinia `useShopifyProductsStore`

## Pre-flight (CRITICAL — read first)

- DO NOT read the master plan (`docs/superpowers/plans/2026-04-18-m9-shopify.md`) unless you hit a reference gap.
- DO NOT read the master spec (`docs/superpowers/specs/2026-04-18-m9-shopify-design.md`) unless you hit a reference gap.
- This handoff's task body is extracted byte-for-byte from the master plan — it is self-contained.
- Current branch: `feat/m9-shopify`. Verify with `git status` and `git log -1`.
- Expected last commit: `feat(m9): shopify cron jobs — orders agg, deltas, purge worker` (from Chunk 1).
- Before you start: run `bun run check && bun run test:unit` from `kova-open-pencil-1/` — must be green.

## Scope

Implement the brand-scoped Pinia store `useShopifyProductsStore` (Task 3.1). This store caches products, variants, collections, and discounts from Supabase and provides Realtime→polling fallback. This is the foundational reactive data layer that all canvas overlay and Shop-panel features will consume.

## Out of scope

- Task 3.2 (overlay) or any later tasks.
- UI components.
- Any migration work.

## Quality gates — run after every step

```bash
cd kova-open-pencil-1
bun run check
bun run test:unit
```

<!-- BODY START — verbatim extract from master-plan lines 1633..1771. Do not edit. -->
## Phase 3 — Canvas product-variant overlay

### Task 3.1 — Pinia `useShopifyProductsStore` (brand-scoped)

**Files:**
- Create: `src/stores/shopify-products.ts`
- Test: `tests/engine/shopify/store-shopify-products.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/engine/shopify/store-shopify-products.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useShopifyProductsStore } from '../../../src/stores/shopify-products'

describe('useShopifyProductsStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('fetches brand-scoped products on loadForBrand', async () => {
    const store = useShopifyProductsStore()
    await store.loadForBrand('b1')
    expect(store.activeBrandId).toBe('b1')
    expect(store.productsById.size).toBeGreaterThanOrEqual(0)
  })

  it('clears previous brand data on brand switch', async () => {
    const store = useShopifyProductsStore()
    await store.loadForBrand('b1')
    store.productsById.set('p1', { id: 'p1', brand_id: 'b1' } as never)
    await store.loadForBrand('b2')
    expect(store.productsById.has('p1')).toBe(false)
  })

  it('exposes findVariant(shopify_variant_id) keyed by Shopify gid', async () => {
    const store = useShopifyProductsStore()
    store._setVariantsForTest([{ shopify_variant_id: 'gid://shopify/ProductVariant/10', id: 'v1' }])
    expect(store.findVariant('gid://shopify/ProductVariant/10')?.id).toBe('v1')
  })

  it('falls back from Realtime to 30s polling on subscription error (§14 open question resolution)', async () => {
    const store = useShopifyProductsStore()
    await store.loadForBrand('b1')
    store._simulateRealtimeFailureForTest()
    expect(store.syncMode).toBe('polling')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `src/stores/shopify-products.ts`**

```ts
import { defineStore } from 'pinia'
import { ref, shallowReactive, computed } from 'vue'
import { supabase } from '@/lib/supabase'

interface Product { id: string; brand_id: string; handle: string; title: string; status: string }
interface Variant { id: string; product_id: string; shopify_variant_id: string; title: string; price: number; inventory_qty: number; available: boolean; image_url?: string }
interface Collection { id: string; brand_id: string; title: string; handle: string; products_count: number }
interface Discount { id: string; brand_id: string; code: string | null; title: string; status: string }

export const useShopifyProductsStore = defineStore('shopify-products', () => {
  const activeBrandId = ref<string | null>(null)
  const productsById = shallowReactive(new Map<string, Product>())
  const variantsById = shallowReactive(new Map<string, Variant>())
  const variantsByGid = shallowReactive(new Map<string, Variant>())
  const collectionsById = shallowReactive(new Map<string, Collection>())
  const discountsById = shallowReactive(new Map<string, Discount>())
  const syncMode = ref<'realtime' | 'polling'>('realtime')
  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
  let pollingHandle: number | null = null

  function reset(): void {
    productsById.clear(); variantsById.clear(); variantsByGid.clear()
    collectionsById.clear(); discountsById.clear()
  }

  async function loadForBrand(brandId: string): Promise<void> {
    reset()
    activeBrandId.value = brandId
    const [p, v, c, d] = await Promise.all([
      supabase.from('shopify_products').select('*').eq('brand_id', brandId),
      supabase.from('shopify_variants').select('*').eq('brand_id', brandId),
      supabase.from('shopify_collections').select('*').eq('brand_id', brandId),
      supabase.from('shopify_discounts').select('*').eq('brand_id', brandId),
    ])
    for (const row of (p.data ?? []) as Product[])   productsById.set(row.id, row)
    for (const row of (v.data ?? []) as Variant[]) { variantsById.set(row.id, row); variantsByGid.set(row.shopify_variant_id, row) }
    for (const row of (c.data ?? []) as Collection[]) collectionsById.set(row.id, row)
    for (const row of (d.data ?? []) as Discount[])   discountsById.set(row.id, row)
    subscribeRealtime(brandId)
  }

  function subscribeRealtime(brandId: string): void {
    realtimeChannel?.unsubscribe().catch(() => null)
    realtimeChannel = supabase.channel(`shopify-${brandId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopify_variants', filter: `brand_id=eq.${brandId}` },
        (payload) => { if (payload.new) variantsById.set((payload.new as Variant).id, payload.new as Variant) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopify_products', filter: `brand_id=eq.${brandId}` },
        (payload) => { if (payload.new) productsById.set((payload.new as Product).id, payload.new as Product) })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') switchToPolling(brandId)
      })
  }

  function switchToPolling(brandId: string): void {
    syncMode.value = 'polling'
    if (pollingHandle) clearInterval(pollingHandle)
    pollingHandle = window.setInterval(() => { void loadForBrand(brandId) }, 30_000)
  }

  function findVariant(gid: string): Variant | undefined { return variantsByGid.get(gid) }

  // Test-only hooks
  function _setVariantsForTest(vs: Variant[]): void { for (const v of vs) { variantsById.set(v.id, v); variantsByGid.set(v.shopify_variant_id, v) } }
  function _simulateRealtimeFailureForTest(): void { if (activeBrandId.value) switchToPolling(activeBrandId.value) }

  return {
    activeBrandId, productsById, variantsById, variantsByGid,
    collectionsById, discountsById, syncMode,
    loadForBrand, findVariant,
    _setVariantsForTest, _simulateRealtimeFailureForTest,
  }
})
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/stores/shopify-products.ts tests/engine/shopify/store-shopify-products.test.ts
git commit -m "feat(m9): useShopifyProductsStore with realtime→polling fallback"
```
<!-- BODY END -->

## Exit criteria

- [ ] All steps marked [x].
- [ ] `bun run check` passes with zero errors.
- [ ] `bun run test:unit` passes — all 4 store tests green.
- [ ] Final commit subject: `feat(m9): useShopifyProductsStore with realtime→polling fallback`

## Handoff to next chunk

Next chunk: `03-phase-3.2-overlay-core.md`
