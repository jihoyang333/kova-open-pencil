# M9 Chunk 7 — Phase 4: AI Tools + System Prompt

## Pre-flight (CRITICAL — read first)

- DO NOT read the master plan (`docs/superpowers/plans/2026-04-18-m9-shopify.md`) unless you hit a reference gap.
- DO NOT read the master spec (`docs/superpowers/specs/2026-04-18-m9-shopify-design.md`) unless you hit a reference gap.
- This handoff's task body is extracted byte-for-byte from the master plan — it is self-contained.
- Current branch: `feat/m9-shopify`. Verify with `git status` and `git log -1`.
- Expected last commit: `feat(m9): canvas product-variant bindings persistence` (from Chunk 6).
- Before you start: run `bun run check && bun run test:unit` from `kova-open-pencil-1/` — must be green.

## Scope

Phase 4 entirely (Tasks 4.1 and 4.2):
- **4.1** — Five Shopify AI tools added to `src/ai/kova-tools.ts` (valibot schemas, brand-scoped Supabase queries).
- **4.2** — `buildShopifyContextBlock` in `src/ai/build-system-prompt.ts`, wired into the existing M5 dynamic-context pipeline.

**CRITICAL constraint:** `SYSTEM_PROMPT` constant in `use-chat.ts` is NEVER touched. Only `build-system-prompt.ts` is extended.

## Out of scope

- Phase 5, 6, or 7.
- Any UI work.

## Quality gates — run after every step

```bash
cd kova-open-pencil-1
bun run check
bun run test:unit
```

<!-- BODY START — verbatim extract from master-plan lines 2253..2480. Do not edit. -->
## Phase 4 — AI Shopify tools + context injection

### Task 4.1 — Five Shopify tools in `kova-tools.ts`

**Files:**
- Modify: `src/ai/kova-tools.ts`
- Test: `tests/engine/shopify/ai-tools.test.ts`

- [ ] **Step 1: Write the failing test** — one case per tool that asserts input/output valibot shape + Supabase query is brand-scoped.

```ts
// tests/engine/shopify/ai-tools.test.ts
import { describe, it, expect } from 'bun:test'
import { createKovaTools } from '../../../src/ai/kova-tools'

describe('shopify AI tools', () => {
  it('search_products input rejects extra fields', () => {
    const tools = createKovaTools({ activeBrandId: () => 'b1' } as never)
    const schema = tools.search_products.inputSchema
    // valibot parses {query, filters?, sort?, limit?}
    expect(() => schema.parse({ query: 'shirt' })).not.toThrow()
  })
  it('get_collection returns collection + products', async () => {
    const tools = createKovaTools({ activeBrandId: () => 'b1' } as never)
    const r = await tools.get_collection.execute({ collection_id: 'c1' })
    expect(r).toHaveProperty('collection')
    expect(r).toHaveProperty('products')
  })
  it('get_shop_context returns currency + timezone + top collections', async () => {
    const tools = createKovaTools({ activeBrandId: () => 'b1' } as never)
    const r = await tools.get_shop_context.execute({})
    expect(r).toHaveProperty('currency')
    expect(r).toHaveProperty('timezone')
    expect(r).toHaveProperty('topCollections')
  })
  // Add cases for get_variant, get_active_discounts
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Extend `src/ai/kova-tools.ts`** — add the five tools to the returned object. Each tool:

```ts
import * as v from 'valibot'
import { tool } from 'ai'
import { supabase } from '@/lib/supabase'

// Inside createKovaTools({activeBrandId, ...}):

const search_products = tool({
  description: 'Search Shopify products for the active brand. Returns up to `limit` matches with variants.',
  inputSchema: v.object({
    query: v.string(),
    filters: v.optional(v.object({
      in_stock: v.optional(v.boolean()),
      on_sale: v.optional(v.boolean()),
      collection_id: v.optional(v.string()),
    })),
    sort: v.optional(v.picklist(['bestsellers', 'newest', 'price_asc', 'price_desc'])),
    limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(50))),
  }),
  execute: async (args) => {
    const brandId = activeBrandId()
    let q = supabase.from('shopify_products').select('*, shopify_variants(*)').eq('brand_id', brandId)
    if (args.query) q = q.textSearch('title', args.query)
    const { data } = await q.limit(args.limit ?? 20)
    return { products: data ?? [] }
  },
})

const get_collection = tool({
  description: 'Return a Shopify collection and its ordered member products.',
  inputSchema: v.object({ collection_id: v.string() }),
  execute: async ({ collection_id }) => {
    const brandId = activeBrandId()
    const { data: collection } = await supabase
      .from('shopify_collections').select('*').eq('brand_id', brandId).eq('id', collection_id).maybeSingle()
    const { data: links } = await supabase
      .from('shopify_collection_products').select('product_id, position, shopify_products(*)')
      .eq('collection_id', collection_id).order('position', { ascending: true })
    return { collection, products: (links ?? []).map((l) => l.shopify_products) }
  },
})

const get_variant = tool({
  description: 'Return a variant with its parent product + media.',
  inputSchema: v.object({ variant_id: v.string() }),
  execute: async ({ variant_id }) => {
    const brandId = activeBrandId()
    const { data: variant } = await supabase
      .from('shopify_variants').select('*, shopify_products(*), shopify_media(*)')
      .eq('brand_id', brandId).eq('id', variant_id).maybeSingle()
    return { variant }
  },
})

const get_active_discounts = tool({
  description: 'Return currently-active discount codes for the active brand.',
  inputSchema: v.object({}),
  execute: async () => {
    const brandId = activeBrandId()
    const nowIso = new Date().toISOString()
    const { data } = await supabase
      .from('shopify_discounts').select('*')
      .eq('brand_id', brandId).eq('status', 'active')
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    return { discounts: data ?? [] }
  },
})

const get_shop_context = tool({
  description: 'Return shop-level metadata: currency, timezone, locale, product count, top 5 collections.',
  inputSchema: v.object({}),
  execute: async () => {
    const brandId = activeBrandId()
    const { data: conn } = await supabase.from('shopify_connections').select('currency,timezone,primary_locale').eq('brand_id', brandId).maybeSingle()
    const { count: productCount } = await supabase.from('shopify_products').select('*', { count: 'exact', head: true }).eq('brand_id', brandId)
    const { data: topCollections } = await supabase
      .from('shopify_collections').select('id,title,products_count').eq('brand_id', brandId)
      .order('products_count', { ascending: false }).limit(5)
    return {
      currency: conn?.currency ?? null,
      timezone: conn?.timezone ?? null,
      locale: conn?.primary_locale ?? null,
      productCount: productCount ?? 0,
      topCollections: topCollections ?? [],
    }
  },
})

return {
  ...existing,
  search_products, get_collection, get_variant, get_active_discounts, get_shop_context,
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/ai/kova-tools.ts tests/engine/shopify/ai-tools.test.ts
git commit -m "feat(m9): five Shopify AI tools (valibot + brand-scoped)"
```

---

### Task 4.2 — Dynamic system-prompt context for Shopify

**Files:**
- Modify: `src/ai/build-system-prompt.ts`
- Test: `tests/engine/shopify/build-system-prompt.test.ts`

**CRITICAL constraint:** `SYSTEM_PROMPT` constant in `use-chat.ts` is never modified. This task extends the **existing M5 dynamic-context pipeline** in `build-system-prompt.ts`, appending a Shopify block.

- [ ] **Step 1: Read `build-system-prompt.ts`** to locate the existing context-append points.

- [ ] **Step 2: Write the failing test**

```ts
// tests/engine/shopify/build-system-prompt.test.ts
import { describe, it, expect } from 'bun:test'
import { buildShopifyContextBlock } from '../../../src/ai/build-system-prompt'

describe('buildShopifyContextBlock', () => {
  it('emits a "not connected" line when no connection row exists', async () => {
    const text = await buildShopifyContextBlock({ brandId: 'b1', hasConnection: false } as never)
    expect(text).toContain('Shopify: not connected')
  })
  it('emits shop domain, currency, timezone, top collections, bestsellers when connected', async () => {
    const text = await buildShopifyContextBlock({
      brandId: 'b1', hasConnection: true,
      conn: { shop_domain: 'foo.myshopify.com', currency: 'USD', timezone: 'America/Los_Angeles' },
      topCollections: [{ title: 'Summer' }], bestsellers: [{ title: 'Tshirt' }],
    } as never)
    expect(text).toContain('foo.myshopify.com')
    expect(text).toContain('USD')
    expect(text).toContain('Summer')
    expect(text).toContain('Tshirt')
  })
})
```

- [ ] **Step 3: Run — expect FAIL**

- [ ] **Step 4: Extend `build-system-prompt.ts`**

```ts
// export async function buildSystemPrompt(...): concatenates existing blocks
// Add a new helper:

export interface ShopifyContextInput {
  brandId: string
  hasConnection: boolean
  conn?: { shop_domain: string; currency: string; timezone: string }
  topCollections?: Array<{ title: string }>
  bestsellers?: Array<{ title: string }>
  brandName?: string
}

export async function buildShopifyContextBlock(input: ShopifyContextInput): Promise<string> {
  if (!input.hasConnection || !input.conn) {
    return `## Brand: ${input.brandName ?? 'unknown'}\nShopify: not connected for this brand.`
  }
  const lines: string[] = []
  lines.push(`## Brand: ${input.brandName ?? 'unknown'}`)
  lines.push(`Shopify: connected → ${input.conn.shop_domain}`)
  lines.push(`Currency: ${input.conn.currency} · Timezone: ${input.conn.timezone}`)
  if (input.topCollections?.length) lines.push(`Top collections: ${input.topCollections.map((c) => c.title).join(', ')}`)
  if (input.bestsellers?.length)    lines.push(`Bestsellers (30-day): ${input.bestsellers.map((b) => b.title).join(', ')}`)
  return lines.join('\n')
}

// Wire into existing pipeline: after the existing brand-kit block, call buildShopifyContextBlock
// with data resolved from shopify_connections / shopify_collections / shopify_orders_agg for the active brand.
```

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/ai/build-system-prompt.ts tests/engine/shopify/build-system-prompt.test.ts
git commit -m "feat(m9): dynamic system prompt — per-brand Shopify context block"
```

---

<!-- BODY END -->

## Exit criteria

- [ ] All steps in 4.1 and 4.2 marked [x].
- [ ] `bun run check` passes.
- [ ] `bun run test:unit` passes — AI tools tests + system-prompt tests green.
- [ ] Two commits: AI tools commit + system-prompt commit.
- [ ] Final commit subject: `feat(m9): dynamic system prompt — per-brand Shopify context block`

## Handoff to next chunk

Next chunk: `08-phase-5.1-5.2-onboarding-dashboard.md`
