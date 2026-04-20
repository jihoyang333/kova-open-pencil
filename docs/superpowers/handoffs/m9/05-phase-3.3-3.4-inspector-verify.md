# M9 Chunk 5 — Phase 3.3 + 3.4: Inspector + Verify

## Pre-flight (CRITICAL — read first)

- DO NOT read the master plan (`docs/superpowers/plans/2026-04-18-m9-shopify.md`) unless you hit a reference gap.
- DO NOT read the master spec (`docs/superpowers/specs/2026-04-18-m9-shopify-design.md`) unless you hit a reference gap.
- This handoff's task body is extracted byte-for-byte from the master plan — it is self-contained.
- Current branch: `feat/m9-shopify`. Verify with `git status` and `git log -1`.
- Expected last commit: `feat(m9): product-variant overlay — factory + bindings registry + webhook sync` (from Chunk 4).
- Before you start: run `bun run check && bun run test:unit` from `kova-open-pencil-1/` — must be green.

## Scope

Tasks 3.3 and 3.4:
- **3.3** — `state.ts` status helpers (ok/oos/unavailable) + `ProductVariantInspector.vue` component. **IMPORTANT:** Before editing `PropertiesPanel.vue`, use `AskUserQuestion` to get explicit permission from Jiho per the plan note. If denied, fall back to mounting the inspector inside the Shop panel's "selected" state.
- **3.4** — `verifyProductVariantsOnCanvas` function + all four branch tests.

## Out of scope

- Task 3.5 (persistence migration) or any later task.

## Quality gates — run after every step

```bash
cd kova-open-pencil-1
bun run check
bun run test:unit
```

<!-- BODY START — verbatim extract from master-plan lines 1973..2208. Do not edit. -->

### Task 3.3 — Inspector variant switcher + unavailable state

**Files:**
- Create: `src/canvas-extensions/product-variant/state.ts`
- Create: `src/components/inspector/ProductVariantInspector.vue`
- Modify: `src/components/PropertiesPanel.vue` (or whichever properties-panel host exists — confirm during task) to mount the new inspector when a FRAME with a matching binding is selected. **CLAUDE.md exception:** this modifies the properties panel. Check the 2026-04-18 exception log at §13 of the spec — it only covers the **left sidebar**. Properties panel edits are NOT covered. Before editing `PropertiesPanel.vue`, Ralph MUST ask Jiho via AskUserQuestion for explicit permission. If denied, fall back to mounting the inspector inline inside the Shop panel's "selected" state.
- Test: `tests/engine/shopify/inspector-state.test.ts`

- [x] **Step 1: Write state helpers test**

```ts
// tests/engine/shopify/inspector-state.test.ts
import { describe, it, expect } from 'bun:test'
import { bindingStatus } from '../../../src/canvas-extensions/product-variant/state'

describe('bindingStatus', () => {
  it('returns "unavailable" when variant missing from store', () => {
    expect(bindingStatus({ snapshot: { inventory: 0 } } as never, undefined)).toBe('unavailable')
  })
  it('returns "oos" when variant present but inventory_qty=0', () => {
    const variant = { inventory_qty: 0, available: false } as never
    expect(bindingStatus({ snapshot: { inventory: 5 } } as never, variant)).toBe('oos')
  })
  it('returns "ok" otherwise', () => {
    const variant = { inventory_qty: 42, available: true } as never
    expect(bindingStatus({} as never, variant)).toBe('ok')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `state.ts`**

```ts
import type { InferOutput } from 'valibot'
import type { ProductVariantBindingSchema } from './schema'

type Binding = InferOutput<typeof ProductVariantBindingSchema>
interface Variant { inventory_qty: number; available: boolean }

export type BindingStatus = 'ok' | 'oos' | 'unavailable'

export function bindingStatus(_binding: Binding, variant: Variant | undefined): BindingStatus {
  if (!variant) return 'unavailable'
  if (variant.inventory_qty <= 0 || !variant.available) return 'oos'
  return 'ok'
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Implement `ProductVariantInspector.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useProductVariantBindingsStore } from '@/stores/product-variant-bindings'
import { useShopifyProductsStore } from '@/stores/shopify-products'
import { bindingStatus } from '@/canvas-extensions/product-variant/state'

const props = defineProps<{ frameId: string }>()
const bindings = useProductVariantBindingsStore()
const products = useShopifyProductsStore()
const { variantsByGid, variantsById, productsById } = storeToRefs(products)

const binding = computed(() => bindings.get(props.frameId))
const variant = computed(() => binding.value ? variantsByGid.value.get(binding.value.shopify_variant_id) : undefined)
const status  = computed(() => binding.value ? bindingStatus(binding.value, variant.value) : 'ok')
const siblingVariants = computed(() => {
  if (!variant.value) return []
  return [...variantsById.value.values()].filter((v) => v.product_id === variant.value?.product_id)
})

function swapTo(gid: string): void {
  const v = variantsByGid.value.get(gid)
  if (!binding.value || !v) return
  bindings.set({
    ...binding.value,
    shopify_variant_id: v.shopify_variant_id,
    snapshot: { ...binding.value.snapshot!, title: v.title, price: v.price, inventory: v.inventory_qty, image_url: v.image_url ?? '', captured_at: new Date().toISOString() },
  })
}
function remove(): void { bindings.remove(props.frameId) }
</script>

<template>
  <section class="flex flex-col gap-3 p-4" v-if="binding">
    <div class="flex items-center gap-2">
      <span v-if="status === 'unavailable'" class="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Unavailable</span>
      <span v-else-if="status === 'oos'" class="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">Out of stock</span>
      <span v-else class="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">In stock · {{ variant?.inventory_qty }}</span>
    </div>

    <label class="flex flex-col gap-1 text-xs text-neutral-600">
      Variant
      <select class="rounded border px-2 py-1 text-sm"
              :value="binding.shopify_variant_id"
              @change="(e) => swapTo((e.target as HTMLSelectElement).value)">
        <option v-for="v in siblingVariants" :key="v.id" :value="v.shopify_variant_id">{{ v.title }} · ${{ v.price }}</option>
      </select>
    </label>

    <div class="flex gap-2">
      <button class="rounded bg-neutral-900 px-3 py-1.5 text-xs text-white" @click="remove">Remove node</button>
    </div>
  </section>
</template>
```

- [ ] **Step 6: Mount the inspector** — AskUserQuestion Jiho first about the properties-panel exception. Then either edit `PropertiesPanel.vue` or (if denied) expose through Shop panel.

- [ ] **Step 7: Commit**

```bash
git add src/canvas-extensions/product-variant/state.ts src/components/inspector/ProductVariantInspector.vue tests/engine/shopify/inspector-state.test.ts
git commit -m "feat(m9): product-variant inspector — swap/remove + status badges"
```

---

### Task 3.4 — `verifyProductVariantsOnCanvas`

**Files:**
- Create: `src/canvas-extensions/product-variant/verify.ts`
- Test: `tests/engine/shopify/verify.test.ts`

- [ ] **Step 1: Write the failing test** — all four branches per spec §6.3.

```ts
// tests/engine/shopify/verify.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { verifyProductVariantsOnCanvas } from '../../../src/canvas-extensions/product-variant/verify'
import { useProductVariantBindingsStore } from '../../../src/stores/product-variant-bindings'
import { useShopifyProductsStore } from '../../../src/stores/shopify-products'

function seedBinding(frame_id: string, variant_gid: string): void {
  useProductVariantBindingsStore().set({
    frame_id, brand_id: 'b1',
    shopify_variant_id: variant_gid,
    bindings: { image: 'live', price: 'live', title: 'live', inventory: 'live' },
    snapshot: { title: 't', price: 1, currency: 'USD', image_url: '', inventory: 1, captured_at: '' },
    child_ids: { image_node_id: 'i', title_node_id: 't', price_node_id: 'p' },
  })
}

describe('verifyProductVariantsOnCanvas', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('ok when all variants present and in stock', async () => {
    seedBinding('f1', 'gid://shopify/ProductVariant/1')
    useShopifyProductsStore()._setVariantsForTest([
      { id: 'v1', product_id: 'p1', shopify_variant_id: 'gid://shopify/ProductVariant/1', title: 't', price: 1, inventory_qty: 5, available: true } as never,
    ])
    const r = await verifyProductVariantsOnCanvas('c1')
    expect(r.ok).toBe(true)
    expect(r.broken).toHaveLength(0)
    expect(r.oos).toHaveLength(0)
  })

  it('reports broken when variant missing', async () => {
    seedBinding('f1', 'gid://shopify/ProductVariant/999')
    const r = await verifyProductVariantsOnCanvas('c1')
    expect(r.ok).toBe(false)
    expect(r.broken).toHaveLength(1)
  })

  it('reports oos separately by default', async () => {
    seedBinding('f1', 'gid://shopify/ProductVariant/2')
    useShopifyProductsStore()._setVariantsForTest([
      { id: 'v2', product_id: 'p1', shopify_variant_id: 'gid://shopify/ProductVariant/2', title: 't', price: 1, inventory_qty: 0, available: false } as never,
    ])
    const r = await verifyProductVariantsOnCanvas('c1')
    expect(r.ok).toBe(true)
    expect(r.oos).toHaveLength(1)
  })

  it('rolls oos into broken when strictMode', async () => {
    seedBinding('f1', 'gid://shopify/ProductVariant/2')
    useShopifyProductsStore()._setVariantsForTest([
      { id: 'v2', product_id: 'p1', shopify_variant_id: 'gid://shopify/ProductVariant/2', title: 't', price: 1, inventory_qty: 0, available: false } as never,
    ])
    const r = await verifyProductVariantsOnCanvas('c1', { strictMode: true })
    expect(r.ok).toBe(false)
    expect(r.broken).toHaveLength(1)
    expect(r.oos).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `verify.ts`**

```ts
import type { InferOutput } from 'valibot'
import type { ProductVariantBindingSchema } from './schema'
import { useProductVariantBindingsStore } from '@/stores/product-variant-bindings'
import { useShopifyProductsStore } from '@/stores/shopify-products'

type Binding = InferOutput<typeof ProductVariantBindingSchema>
export interface VerifyOptions { strictMode?: boolean }
export interface VerifyResult { ok: boolean; broken: Binding[]; oos: Binding[] }

export async function verifyProductVariantsOnCanvas(
  canvasId: string, options: VerifyOptions = {},
): Promise<VerifyResult> {
  const bindings = useProductVariantBindingsStore().forCanvas(canvasId)
  const products = useShopifyProductsStore()
  const broken: Binding[] = []
  const oos: Binding[] = []
  for (const b of bindings) {
    const v = products.variantsByGid.get(b.shopify_variant_id)
    if (!v) { broken.push(b); continue }
    if (v.inventory_qty <= 0 || !v.available) {
      if (options.strictMode) broken.push(b)
      else oos.push(b)
    }
  }
  return { ok: broken.length === 0, broken, oos }
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/canvas-extensions/product-variant/verify.ts tests/engine/shopify/verify.test.ts
git commit -m "feat(m9): verifyProductVariantsOnCanvas — exposed to M6 export pipeline"
```

---


<!-- BODY END -->

## Exit criteria

- [ ] All steps in both 3.3 and 3.4 marked [x].
- [ ] `bun run check` passes.
- [ ] `bun run test:unit` passes — inspector state tests + all 4 verify tests green.
- [ ] Two commits: inspector commit + verify commit.
- [ ] Final commit subject: `feat(m9): verifyProductVariantsOnCanvas — exposed to M6 export pipeline`

## Handoff to next chunk

Next chunk: `06-phase-3.5-persistence.md`
