# M9 Chunk 8 — Phase 5.1 + 5.2: Onboarding + Dashboard

## Pre-flight (CRITICAL — read first)

- DO NOT read the master plan (`docs/superpowers/plans/2026-04-18-m9-shopify.md`) unless you hit a reference gap.
- DO NOT read the master spec (`docs/superpowers/specs/2026-04-18-m9-shopify-design.md`) unless you hit a reference gap.
- This handoff's task body is extracted byte-for-byte from the master plan — it is self-contained.
- Current branch: `feat/m9-shopify`. Verify with `git status` and `git log -1`.
- Expected last commit: `feat(m9): dynamic system prompt — per-brand Shopify context block` (from Chunk 7).
- Before you start: run `bun run check && bun run test:unit` from `kova-open-pencil-1/` — must be green.

## Scope

Tasks 5.1 and 5.2:
- **5.1** — `StoreTypeStep.vue` onboarding screen (Shopify | Something else | No store yet) + `src/lib/shop-domain.ts` + router wiring.
- **5.2** — `IntegrationsCard.vue` dashboard card (three states: not-connected / connected / reauthorize) + monthly banner in `DashboardView.vue`.

## Out of scope

- Tasks 5.3–5.6 or any later task.

## Quality gates — run after every step

```bash
cd kova-open-pencil-1
bun run check
bun run test:unit
```

<!-- BODY START — verbatim extract from master-plan lines 2482..2579. Do not edit. -->
## Phase 5 — UX surfaces

### Task 5.1 — Onboarding store-type step

**Files:**
- Create: `src/components/onboarding/StoreTypeStep.vue`
- Modify: `src/router.ts` — add `/onboarding/store-type` between brand-name and brand-kit review.
- Modify: `src/components/onboarding/BrandUrlStep.vue` — drop its router next-link to brand-kit extraction; route to `/onboarding/store-type` first when user reaches the brand-URL point.
- Test: `tests/engine/shopify/onboarding-routing.test.ts`

- [ ] **Step 1: Write `StoreTypeStep.vue`** — three cards (Shopify | Something else | No store yet), brand-name passed as a prop. On "Shopify" → capture `shop` from an input + validate via `normalizeShopDomain` client-side → navigate to `/api/shopify/oauth/start?shop=...&brand_id=...`. On "Something else" → route to existing `BrandUrlStep`. On "No store yet" → skip to brand-kit review with defaults.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { normalizeShopDomain } from '@/lib/shop-domain' // client-side copy of the server util

const props = defineProps<{ brandId: string }>()
const router = useRouter()
const shop = ref('')
const error = ref<string | null>(null)

function startShopifyOAuth(): void {
  const normalized = normalizeShopDomain(shop.value)
  if (!normalized) { error.value = 'Enter a shop like your-store.myshopify.com'; return }
  window.location.href = `/api/shopify/oauth/start?shop=${encodeURIComponent(normalized)}&brand_id=${props.brandId}`
}
function somethingElse(): void { router.push({ path: '/onboarding/brand-url', query: { brandId: props.brandId } }) }
function noStoreYet():  void { router.push({ path: '/onboarding/brand-kit-review', query: { brandId: props.brandId } }) }
</script>

<template>
  <section class="mx-auto flex max-w-xl flex-col gap-6 p-8">
    <h1 class="text-2xl font-semibold">Where does this client sell?</h1>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <button class="rounded-xl border p-4 text-left hover:bg-neutral-50" @click="shop = ''">
        <div class="text-base font-medium">Shopify</div>
        <div class="text-xs text-neutral-500">Connect their store</div>
      </button>
      <button class="rounded-xl border p-4 text-left hover:bg-neutral-50" @click="somethingElse">
        <div class="text-base font-medium">Something else</div>
        <div class="text-xs text-neutral-500">We'll scrape their site</div>
      </button>
      <button class="rounded-xl border p-4 text-left hover:bg-neutral-50" @click="noStoreYet">
        <div class="text-base font-medium">No store yet</div>
        <div class="text-xs text-neutral-500">Start with defaults</div>
      </button>
    </div>

    <div class="flex gap-2">
      <input v-model="shop" class="flex-1 rounded border px-3 py-2 text-sm" placeholder="your-store.myshopify.com" />
      <button class="rounded bg-neutral-900 px-4 py-2 text-sm text-white" @click="startShopifyOAuth">Connect Shopify</button>
    </div>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </section>
</template>
```

- [ ] **Step 2: Add `src/lib/shop-domain.ts`** — client-safe mirror of `normalizeShopDomain` from `api/_shared/shopify-client.ts`. (Duplicated intentionally; api/ is server-only.)

- [ ] **Step 3: Wire router** — modify `src/router.ts` to register the new route.

- [ ] **Step 4: Routing test** (Playwright unit, or Vue Router unit test) — asserts that after brand-name step, user lands on store-type, and "Shopify" button builds the correct OAuth URL.

- [ ] **Step 5: Commit**

```bash
git add src/components/onboarding/StoreTypeStep.vue src/lib/shop-domain.ts src/router.ts tests/engine/shopify/onboarding-routing.test.ts
git commit -m "feat(m9): onboarding store-type step (Shopify | other | none)"
```

---

### Task 5.2 — Dashboard integration banner + per-brand integrations card

**Files:**
- Create: `src/components/dashboard/IntegrationsCard.vue`
- Modify: `src/views/DashboardView.vue`
- Test: `tests/engine/shopify/dashboard-integrations.test.ts`

- [ ] **Step 1: `IntegrationsCard.vue`** — takes `brandId` prop. Queries `shopify_connections` for status. Renders three states:
  - **Not connected:** "Connect Shopify" button → opens OAuth popup (`window.open(url, 'shopify', 'width=620,height=780')`). Listens for `postMessage` from callback to close popup + refresh store.
  - **Connected:** shop domain + last-sync time + [Disconnect] [Settings] links.
  - **Reauthorize needed:** amber banner + [Reauthorize] button.

- [ ] **Step 2: Monthly-resurface banner** — `DashboardView.vue` computes "any brand missing Shopify?" and "last dismissed > 30d ago" from localStorage. If both true, show a top-of-page banner; dismiss stores timestamp.

- [ ] **Step 3: Tests** — snapshot the three states of `IntegrationsCard`, and assert banner shows/hides based on localStorage fixtures.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/IntegrationsCard.vue src/views/DashboardView.vue tests/engine/shopify/dashboard-integrations.test.ts
git commit -m "feat(m9): dashboard integrations card + monthly banner"
```
<!-- BODY END -->

## Exit criteria

- [ ] All steps in 5.1 and 5.2 marked [x].
- [ ] `bun run check` passes.
- [ ] `bun run test:unit` passes — onboarding routing + dashboard integrations tests green.
- [ ] Two commits: onboarding commit + dashboard commit.
- [ ] Final commit subject: `feat(m9): dashboard integrations card + monthly banner`

## Handoff to next chunk

Next chunk: `09-phase-5.3-5.4-5.5-editor-surfaces.md`
