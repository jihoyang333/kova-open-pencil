# M9 Chunk 3 — Phase 3.2 Overlay Core (Steps 1–6)

## Pre-flight (CRITICAL — read first)

- DO NOT read the master plan (`docs/superpowers/plans/2026-04-18-m9-shopify.md`) unless you hit a reference gap.
- DO NOT read the master spec (`docs/superpowers/specs/2026-04-18-m9-shopify-design.md`) unless you hit a reference gap.
- This handoff's task body is extracted byte-for-byte from the master plan — it is self-contained.
- Current branch: `feat/m9-shopify`. Verify with `git status` and `git log -1`.
- Expected last commit: `feat(m9): useShopifyProductsStore with realtime→polling fallback` (from Chunk 2).
- Before you start: run `bun run check && bun run test:unit` from `kova-open-pencil-1/` — must be green.

## Scope

Task 3.2, Steps 1–6 only: the valibot `ProductVariantBindingSchema` (`schema.ts`), the `useProductVariantBindingsStore` (`product-variant-bindings.ts`), the `createProductVariantFrame` factory (`factory.ts`), and `sync.ts`. Includes the factory test (RED→GREEN). Steps 7–10 (register.ts, sync test, commit) are in Chunk 4.

**Reference:** When Step 1 says "paste `ProductVariantBindingSchema` verbatim from spec §6.2," read `docs/superpowers/specs/2026-04-18-m9-shopify-design.md` section §6.2 only.

## Out of scope

- Steps 7–10 of Task 3.2 (register.ts, sync test, commit) — those are Chunk 4.
- Tasks 3.3, 3.4, 3.5, or any later task.

## Quality gates — run after every step

```bash
cd kova-open-pencil-1
bun run check
bun run test:unit
```

<!-- BODY START — verbatim extract from master-plan lines 1772..1941. Do not edit. -->
### Task 3.2 — Product-variant overlay (register + factory + sync)

**Files:**
- Create: `src/canvas-extensions/product-variant/schema.ts`
- Create: `src/canvas-extensions/product-variant/register.ts`
- Create: `src/canvas-extensions/product-variant/factory.ts`
- Create: `src/canvas-extensions/product-variant/sync.ts`
- Create: `src/stores/product-variant-bindings.ts`
- Test: `tests/engine/shopify/overlay-factory.test.ts`, `tests/engine/shopify/overlay-sync.test.ts`

- [ ] **Step 1: Write `schema.ts`** — paste `ProductVariantBindingSchema` verbatim from spec §6.2.

- [ ] **Step 2: Write bindings store**

```ts
// src/stores/product-variant-bindings.ts
import { defineStore } from 'pinia'
import { shallowReactive } from 'vue'
import * as v from 'valibot'
import { ProductVariantBindingSchema } from '@/canvas-extensions/product-variant/schema'

type Binding = v.InferOutput<typeof ProductVariantBindingSchema>

export const useProductVariantBindingsStore = defineStore('product-variant-bindings', () => {
  const byFrameId = shallowReactive(new Map<string, Binding>())

  function set(binding: Binding): void {
    const parsed = v.parse(ProductVariantBindingSchema, binding)
    byFrameId.set(parsed.frame_id, parsed)
  }
  function get(frameId: string): Binding | undefined { return byFrameId.get(frameId) }
  function remove(frameId: string): void { byFrameId.delete(frameId) }
  function forCanvas(_canvasId: string): Binding[] {
    // Canvas scoping lives in persistence (3.5). In-memory registry returns all bindings for the currently-open canvas.
    return [...byFrameId.values()]
  }
  function hydrate(bindings: Binding[]): void {
    byFrameId.clear()
    for (const b of bindings) set(b)
  }
  function dehydrate(): Binding[] { return [...byFrameId.values()] }

  return { byFrameId, set, get, remove, forCanvas, hydrate, dehydrate }
})
```

- [ ] **Step 3: Write factory test**

```ts
// tests/engine/shopify/overlay-factory.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { createProductVariantFrame } from '../../../src/canvas-extensions/product-variant/factory'
import { useProductVariantBindingsStore } from '../../../src/stores/product-variant-bindings'

const variant = {
  id: 'v1', product_id: 'p1',
  shopify_variant_id: 'gid://shopify/ProductVariant/10',
  title: 'Medium', price: 19.99, inventory_qty: 42, available: true,
  image_url: 'https://cdn/img.jpg',
}

describe('createProductVariantFrame', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('creates a frame, image child, title text child, price text child', async () => {
    const { frame_id, child_ids } = await createProductVariantFrame({ variant, brand_id: 'b1' })
    expect(frame_id).toMatch(/^[a-z0-9-]+$/i)
    expect(child_ids.image_node_id).toBeTruthy()
    expect(child_ids.title_node_id).toBeTruthy()
    expect(child_ids.price_node_id).toBeTruthy()
  })

  it('registers a binding with default live bindings and snapshot', async () => {
    const { frame_id } = await createProductVariantFrame({ variant, brand_id: 'b1' })
    const binding = useProductVariantBindingsStore().get(frame_id)
    expect(binding).toBeDefined()
    expect(binding?.bindings.price).toBe('live')
    expect(binding?.snapshot?.price).toBe(19.99)
  })
})
```

- [ ] **Step 4: Run — expect FAIL**

- [ ] **Step 5: Implement `factory.ts`**

```ts
// src/canvas-extensions/product-variant/factory.ts
import * as v from 'valibot'
import { ProductVariantBindingSchema } from './schema'
import { useProductVariantBindingsStore } from '@/stores/product-variant-bindings'
import { createNode, setLayout, setText, setImage, setFill } from '@/engine/tool-calls'

interface Variant { id: string; shopify_variant_id: string; title: string; price: number; inventory_qty: number; image_url?: string }

interface CreateInput { variant: Variant; brand_id: string; currency?: string }

export async function createProductVariantFrame(
  input: CreateInput,
): Promise<{ frame_id: string; child_ids: v.InferOutput<typeof ProductVariantBindingSchema>['child_ids'] }> {
  const frame_id = await createNode({ type: 'FRAME', name: `Product: ${input.variant.title}` })
  await setLayout(frame_id, { direction: 'VERTICAL', gap: 8, padding: 12 })

  const image_node_id = await createNode({ type: 'FRAME', parent: frame_id, name: 'Image' })
  await setLayout(image_node_id, { direction: 'HORIZONTAL', width: 320, height: 320 })
  if (input.variant.image_url) await setImage(image_node_id, input.variant.image_url)

  const title_node_id = await createNode({ type: 'TEXT', parent: frame_id, name: 'Title' })
  await setText(title_node_id, input.variant.title)

  const price_node_id = await createNode({ type: 'TEXT', parent: frame_id, name: 'Price' })
  await setText(price_node_id, formatPrice(input.variant.price, input.currency ?? 'USD'))

  const binding: v.InferOutput<typeof ProductVariantBindingSchema> = {
    frame_id, brand_id: input.brand_id,
    shopify_variant_id: input.variant.shopify_variant_id,
    bindings: { image: 'live', price: 'live', title: 'live', inventory: 'live' },
    snapshot: {
      title: input.variant.title, price: input.variant.price,
      currency: input.currency ?? 'USD',
      image_url: input.variant.image_url ?? '',
      inventory: input.variant.inventory_qty,
      captured_at: new Date().toISOString(),
    },
    child_ids: { image_node_id, title_node_id, price_node_id },
  }
  useProductVariantBindingsStore().set(binding)
  return { frame_id, child_ids: binding.child_ids }
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents)
}
```

**Note for Ralph:** `@/engine/tool-calls` must expose typed wrappers around OpenPencil's existing core tools. If the wrapper module does not already exist, create it at `src/engine/tool-calls.ts` and import from `packages/core/src/tools/*` (read-only access is allowed, only writes are forbidden).

- [ ] **Step 6: Implement `sync.ts`**

```ts
// src/canvas-extensions/product-variant/sync.ts
import { watch } from 'vue'
import { useShopifyProductsStore } from '@/stores/shopify-products'
import { useProductVariantBindingsStore } from '@/stores/product-variant-bindings'
import { setText, setImage } from '@/engine/tool-calls'

let started = false

export function startProductVariantSync(): void {
  if (started) return
  started = true
  const products = useShopifyProductsStore()
  const bindings = useProductVariantBindingsStore()

  watch(() => products.variantsByGid, async (map) => {
    for (const binding of bindings.byFrameId.values()) {
      const v = map.get(binding.shopify_variant_id)
      if (!v) continue
      if (binding.bindings.title === 'live')    await setText(binding.child_ids.title_node_id, v.title)
      if (binding.bindings.price === 'live')    await setText(binding.child_ids.price_node_id, formatPrice(v.price, binding.snapshot?.currency ?? 'USD'))
      if (binding.bindings.image === 'live' && v.image_url) await setImage(binding.child_ids.image_node_id, v.image_url)
    }
  }, { deep: true })
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents)
}
```
<!-- BODY END -->

## Exit criteria

- [ ] Steps 1–6 marked [x].
- [ ] `bun run check` passes.
- [ ] `bun run test:unit` passes — factory tests green.
- [ ] **Do not commit yet** — commit happens in Chunk 4 Step 10 after Steps 7–10 complete.

## Handoff to next chunk

Next chunk: `04-phase-3.2-overlay-sync.md`
