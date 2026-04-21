# M9 Chunk 9 — Phase 5.3 + 5.4 + 5.5: Editor Surfaces

## Pre-flight (CRITICAL — read first)

- DO NOT read the master plan (`docs/superpowers/plans/2026-04-18-m9-shopify.md`) unless you hit a reference gap.
- DO NOT read the master spec (`docs/superpowers/specs/2026-04-18-m9-shopify-design.md`) unless you hit a reference gap.
- This handoff's task body is extracted byte-for-byte from the master plan — it is self-contained.
- Current branch: `feat/m9-shopify`. Verify with `git status` and `git log -1`.
- Expected last commit: `feat(m9): dashboard integrations card + monthly banner` (from Chunk 8).
- Before you start: run `bun run check && bun run test:unit` from `kova-open-pencil-1/` — must be green.

## Scope

Tasks 5.3, 5.4, and 5.5:
- **5.3** — `BrandKitMergeDiff.vue` (field-by-field diff screen for Shopify brand-kit import).
- **5.4** — `BrandContextPill.vue` (editor toolbar pill showing brand + shop tooltip).
- **5.5** — `ShopPanel.vue` + sub-components (products / collections / discounts tabs in left sidebar, drag-to-canvas). Per spec §13, left-sidebar bypass is approved for this task. **Do NOT extend to canvas/toolbar/layers/properties.**

## Out of scope

- Task 5.6 (Settings integrations page) or any later task.

## Quality gates — run after every step

```bash
cd kova-open-pencil-1
bun run check
bun run test:unit
```

<!-- BODY START — verbatim extract from master-plan lines 2581..2638. Do not edit. -->
### Task 5.3 — Brand-kit merge diff screen

**Files:**
- Create: `src/components/brand-kit/BrandKitMergeDiff.vue`
- Test: `tests/engine/shopify/brand-kit-merge.test.ts`

- [x] **Step 1: Merge test** — given `current = {primary: '#000', heading: 'Inter'}` and `proposed = {primary: '#F00', heading: 'Inter', logo: 'https://...'}`, renders two diff rows (primary, logo) and no row for heading (identical). Apply-selected writes the chosen values back.

- [x] **Step 2: Implement** — per-field radio group: `[x] Current #000  [ ] Shopify #F00`. Only diffing fields rendered. "Apply selected" calls `useBrandsStore().applyShopifyMerge(brandId, chosen)`.

- [x] **Step 3: Commit**

```bash
git add src/components/brand-kit/BrandKitMergeDiff.vue tests/engine/shopify/brand-kit-merge.test.ts
git commit -m "feat(m9): brand-kit merge diff — field-by-field"
```

---

### Task 5.4 — Editor brand-context pill

**Files:**
- Create: `src/components/editor/BrandContextPill.vue`
- Modify: `src/views/EditorView.vue` — mount the pill next to the canvas name.

- [x] **Step 1:** Pill displays `brand.name`. Reka UI `Tooltip` on hover shows shop domain + last-sync ago + "This canvas is linked to {brand}." Non-interactive for switching.
- [x] **Step 2:** Commit.

```bash
git add src/components/editor/BrandContextPill.vue src/views/EditorView.vue
git commit -m "feat(m9): editor brand-context pill"
```

---

### Task 5.5 — "Shop" panel in editor left sidebar

**Files:**
- Create: `src/components/editor/sidebar/ShopPanel.vue`
- Create: `src/components/editor/sidebar/ShopPanelProducts.vue`
- Create: `src/components/editor/sidebar/ShopPanelCollections.vue`
- Create: `src/components/editor/sidebar/ShopPanelDiscounts.vue`
- Modify: the existing left-sidebar host. Per spec §13, the left sidebar bypass is approved. **Do not extend to canvas/toolbar/layers/properties.**

- [x] **Step 1:** Tabbed panel using Reka UI `Tabs`. Products tab: search input (debounced) + filter chips (in-stock, on-sale, collection) + sort dropdown.
- [x] **Step 2:** Products render as cards; `draggable="true"` with custom drag payload `{type: 'shopify-variant', variant_id}`. Drop target: the canvas. Drop handler calls `createProductVariantFrame`.
- [x] **Step 3:** Post-drop toast (Reka UI `Toast`): *"Want me to build around this?"* [Yes, design a hero] [No]. Yes button pre-fills the AI chat and submits.
- [x] **Step 4:** Collections tab: list + drag → auto-layout frame with top 6 products in a 3×2 grid (use existing frame+auto-layout tools — no new primitive).
- [x] **Step 5:** Discounts tab: active codes; drag → styled text block bound to brand typography variable.
- [x] **Step 6:** Unit tests for: drag payload serialization, drop → `createProductVariantFrame` call, toast behavior.
- [x] **Step 7:** Commit.

```bash
git add src/components/editor/sidebar/ShopPanel*.vue tests/engine/shopify/shop-panel.test.ts
git commit -m "feat(m9): editor shop panel — products/collections/discounts"
```

---

<!-- BODY END -->

## Exit criteria

- [x] All steps in 5.3, 5.4, and 5.5 marked [x].
- [x] `bun run check` passes.
- [x] `bun run test:unit` passes — brand-kit merge + shop panel tests green.
- [x] Three commits: merge-diff, brand-context-pill, shop-panel.
- [x] Final commit subject: `feat(m9): editor shop panel — products/collections/discounts`

## Handoff to next chunk

Next chunk: `10-phase-5.6-6-settings-observability.md`
