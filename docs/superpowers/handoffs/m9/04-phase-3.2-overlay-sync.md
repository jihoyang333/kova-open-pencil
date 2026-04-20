# M9 Chunk 4 — Phase 3.2 Overlay Sync (Steps 7–10)

## Pre-flight (CRITICAL — read first)

- DO NOT read the master plan (`docs/superpowers/plans/2026-04-18-m9-shopify.md`) unless you hit a reference gap.
- DO NOT read the master spec (`docs/superpowers/specs/2026-04-18-m9-shopify-design.md`) unless you hit a reference gap.
- This handoff's task body is extracted byte-for-byte from the master plan — it is self-contained.
- Current branch: `feat/m9-shopify`. Verify with `git status` and `git log -1`.
- Expected last commit: `feat(m9): useShopifyProductsStore with realtime→polling fallback` (Chunk 2 — Chunk 3 had no commit by design).
- Before you start: run `bun run check && bun run test:unit` from `kova-open-pencil-1/` — must be green. The factory and sync files from Chunk 3 should already exist but be uncommitted.

## Scope

Task 3.2, Steps 7–10: implement `register.ts`, write the sync test, run it green, and commit everything from both Chunk 3 and Chunk 4 in one commit. This completes the overlay layer.

## Out of scope

- Tasks 3.3, 3.4, 3.5, or any later task.
- Modifying `schema.ts`, `factory.ts`, `sync.ts`, or `product-variant-bindings.ts` (already written in Chunk 3).

## Quality gates — run after every step

```bash
cd kova-open-pencil-1
bun run check
bun run test:unit
```

<!-- BODY START — verbatim extract from master-plan lines 1943..1970. Do not edit. -->
- [ ] **Step 7: Implement `register.ts`**

```ts
// src/canvas-extensions/product-variant/register.ts
import { startProductVariantSync } from './sync'
import { useProductVariantBindingsStore } from '@/stores/product-variant-bindings'
import { useShopifyProductsStore } from '@/stores/shopify-products'

export function registerProductVariantOverlay(): void {
  useProductVariantBindingsStore()
  useShopifyProductsStore()
  startProductVariantSync()
}
```

Call `registerProductVariantOverlay()` from `src/main.ts` after Pinia is installed.

- [ ] **Step 8: Write sync test** — asserts that updating a variant in the products store triggers `setText`/`setImage` on the bound frame's children.

- [ ] **Step 9: Run — expect PASS**

- [ ] **Step 10: Commit**

```bash
git add src/canvas-extensions/product-variant/ src/stores/product-variant-bindings.ts src/engine/tool-calls.ts src/main.ts tests/engine/shopify/overlay-*.test.ts
git commit -m "feat(m9): product-variant overlay — factory + bindings registry + webhook sync"
```
<!-- BODY END -->

## Exit criteria

- [ ] Steps 7–10 marked [x].
- [ ] `bun run check` passes.
- [ ] `bun run test:unit` passes — factory + sync tests both green.
- [ ] Final commit subject: `feat(m9): product-variant overlay — factory + bindings registry + webhook sync`

## Handoff to next chunk

Next chunk: `05-phase-3.3-3.4-inspector-verify.md`
