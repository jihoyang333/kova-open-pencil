# Verification: Shopify Product-Reference Design Spec

> **Verifies:** `2026-05-14-shopify-product-reference-design.md`
> **Date:** 2026-05-14
> **Method:** independent re-derivation against the actual codebase (Glob/Grep/Read). Trust-nothing pass.

---

## VERDICT: ⚠️ SOUND WITH GAPS

The replacement architecture is **coherent and founder-constraint-safe**. The AI insertion path needs **zero `packages/core/` changes**. Decisions D1–D9 do not internally contradict §4/§7.

But the **§5 migration plan is materially incomplete** and **§6 contains a factual error about the DB schema**. Authoring PRDs directly from §5/§6 as written would leave: a dangling component, dead cron config in `vercel.json`, a broken KEEP file (`purge-worker.ts`), orphaned dead code, and a wrong DB-column assumption. All gaps are fixable with specific, named additions — hence ⚠️, not ❌.

---

## 1. CODE-CLAIM ACCURACY

### RIP targets — all exist, classifications correct *for the items listed*

| Spec §5.1 RIP item | Exists? | Non-RIP dependents (would break) |
|---|---|---|
| `src/canvas-extensions/product-variant/` (6 files: factory, register, schema, state, sync, verify) | ✅ | `src/main.ts:10,23` only — **flagged by spec** ✓ |
| `src/stores/product-variant-bindings.ts` | ✅ | none outside RIP set ✓ |
| `src/components/inspector/ProductVariantInspector.vue` | ✅ | **none — fully orphaned.** No production file imports it; `PropertiesPanel.vue` has zero inspector references. Safer than spec implies. |
| `src/composables/use-shop-drop.ts` | ✅ | `ShopPanelProducts.vue:6` (REWORK, flagged ✓), `EditorView.vue:36,126` (flagged ✓) |
| `src/composables/useCanvasBindingsPersistence.ts` | ✅ | `EditorView.vue:8,86-89,108-110` (flagged ✓) |
| `api/shopify/cron/orders-agg.ts` | ✅ | `vercel.json:7` — **NOT flagged (Gap 3)** |
| `api/shopify/cron/inventory-delta.ts` | ✅ | `vercel.json:8` — **NOT flagged (Gap 3)** |

### REWORK targets — current behavior matches reality

- `ShopPanelProducts.vue` — confirmed: `draggable="true"` (l.188), `onDragStart` (l.104,191), `serializeShopPayload` import (l.6), lists **variants** not products (queries `shopify_variants`, l.44), sort dropdown A–Z/Price↑/Price↓ (l.161-164). §4.1's "Removed from M9 version" list is accurate. *Minor:* M9 version also has In-stock/On-sale **filter chips** (l.133-152) the new spec silently drops; "→ §4.1 spec" covers it but isn't explicit.
- `kova-tools.ts` `search_products` — `sort` picklist includes `'bestsellers'` (l.50) ✓. *Minor inaccuracy:* §5.2 says the sort "depended on cut analytics" — the `execute` (l.66-75) never implements sorting at all; the param is dead. Dropping the picklist entry is still correct.
- `src/stores/shopify-products.ts` — exists ✓.

### KEEP targets — all exist; one hidden dependency on the RIP set

OAuth (`api/shopify/oauth/*`), sync infra (`api/shopify/sync/*` + `shopify-bulk-processor.ts`), the 5 AI tools + `placeMediaImage` + `saveBrandMemory` (all confirmed in `kova-tools.ts:283-291`), `brand-kit-extract.ts` + `shopify-brand-kit.ts`, compliance handlers (`api/shopify/compliance/*`) — **all exist**.
**Exception:** `api/shopify/cron/purge-worker.ts:91` (KEEP) lists `shopify_orders_agg` in its delete table list — see Gap 4.

---

## 2. INTERNAL SOUNDNESS

No hard contradiction between D1–D9 and §4/§5/§7. Hybrid-payload shape is consistent across §3, §4.3, §6. D7/D8 chip lifecycle is consistent. **One coherent-but-unenumerated issue:** D4 ("no collections tab, no discounts in panel") is internally consistent — but §5 fails to list the files that currently violate it (Gap 2). The chip-persistence storage shape (§4.2/§6/§9) is explicitly deferred to the Cluster 10 PRD — acceptable, not a gap.

---

## 3. FOUNDER-CONSTRAINT FIT — ✅ CLEAN

- **No `packages/core/` changes.** `CORE_TOOLS` is imported from `@open-pencil/core` and consumed (`tools.ts:8,83`), never modified. `placeMediaImage` (`kova-tools.ts:163-247`) operates on **existing** nodes via `makeFigmaFromStore(store)` + `computeAllLayouts` — read-only consumption of core. The static-insertion path (`CORE_TOOLS` + `placeMediaImage`) needs zero core edits. ✓
- **valibot, not Zod, in the tool layer** — `kova-tools.ts:1-3` uses `@ai-sdk/valibot` + `valibot`; raw valibot schemas exported for tests. No Zod. ✓ (Global TS rule file says Zod — project CLAUDE.md overrides; spec complies with the override.)
- **No React/Next/PixiJS** — spec introduces none. ✓
- **Dark-app theme** — §4.1 explicitly cites `feedback_app_dark_website_light`. ✓
- **Image-export-only** — not contradicted; D1's "static snapshot exported as an image" reinforces it. ✓

---

## 4. MIGRATION SAFETY

### DB tables exclusive to the ripped model

- **`canvas_product_variant_bindings`** — created `20260418_m9_05_canvas_bindings.sql`, altered by `_05b_` and `20260420_..._05c_`. Exclusive to product-variant bindings. **Needs a DROP migration.** Spec §9 flags this ✓ — but understates the entanglement (see below).
- **`shopify_orders_agg`** — created `20260418_m9_02_catalog.sql:118-128` (+ bestseller index l.160). Exclusive to the cut analytics. Drop is implied by D6 but **not explicit in §5**, and dropping it breaks `purge-worker.ts:91` (Gap 4) and a cluster of tests (Gap 8).
- `inventory-delta` has **no dedicated table** — it only writes `shopify_variants.inventory_qty` (`inventory-delta.ts:1-6,111-116`). Ripping it leaves that column stale, which D1 (static content) makes harmless. *Minor:* D6/§4.4 mis-frame `inventory-delta` as "sales analytics" — it is a webhook-loss inventory-freshness fallback.

### Migration entanglement — NOT flagged by §9 (Gap 6)

`public.update_updated_at()` — the shared trigger function — is **first created inside** `20260418_m9_05b_canvas_bindings_fixup.sql:8`, then **consumed by `shopify_connections`** in `20260418_m9_04_schema_cleanup.sql:42`. `idx_brands_user_id` (created in `_05c_:20`) is documented as "covers every table in the codebase." A naive "revert the canvas-bindings migrations" would break `shopify_connections`'s trigger and every brand-scoped RLS policy. The drop migration **must** keep `update_updated_at()` and `idx_brands_user_id`.

### Routes / stores / EditorView

- `EditorView.vue` is **more than "wiring lines"** (§5.1's wording undersells it): it owns the `saveBindings` lifecycle (l.65,86-89,108-110), the canvas `@drop` handler (l.211-213), the `useShopDrop` destructure (l.126), and **renders `<ShopBuildPrompt>`** (l.288-294). Removable, but the PRD must treat it as a real rework surface, not import-line deletion.
- No router/store outside the RIP set depends on ripped artifacts. `product-delta` cron is clean (touches no ripped tables).

---

## 5. COMPLETENESS FOR PRD AUTHORING

§7 cross-cuts are usable for Clusters 02 and 04 (audit-driven, self-contained). **Clusters 05, 06, 10 have gaps** — see Gap 2, 4, 5, 7 below. A Cluster 06 author reading §4.1 alone would miss the `ShopPanel.vue` tab removal and the `ShopPanelCollections/Discounts` RIP. A Cluster 05 author would assume `brands.tone_snippets` exists.

---

## GAPS (each with recommended fix)

**Gap 1 — `ShopBuildPrompt.vue` missing from RIP list. [HIGH]**
`src/components/editor/ShopBuildPrompt.vue` exists, is 100% the drag-to-place "build around this?" flow, referenced only by `EditorView.vue:34,289`. §5.1 claims the RIP list is "complete — nothing dangling"; it isn't.
**Fix:** add `src/components/editor/ShopBuildPrompt.vue` to §5.1 RIP.

**Gap 2 — `ShopPanel.vue` tabs + `ShopPanelCollections/Discounts.vue` not addressed, contradicts D4. [HIGH]**
`ShopPanel.vue:2-6,17-49` renders a 3-tab `TabsRoot` (Products / Collections / Discounts) wrapping `ShopPanelCollections.vue` and `ShopPanelDiscounts.vue`. D4 says "no collections tab, no discounts as panel-selectable." Both child components and the tab structure survive untouched under §5 as written.
**Fix:** §5.2 REWORK `ShopPanel.vue` → drop the Collections + Discounts `TabsTrigger`/`TabsContent` (likely collapse `TabsRoot` → render `ShopPanelProducts` directly). §5.1 RIP `ShopPanelCollections.vue` + `ShopPanelDiscounts.vue` (both self-contained — they import only `supabase`/`vue`/`brands` store, so RIP is clean).

**Gap 3 — `vercel.json` cron entries left dangling. [HIGH]**
`vercel.json:7-8` schedules `/api/shopify/cron/orders-agg` and `/api/shopify/cron/inventory-delta`. Ripping the handler files without removing these entries leaves Vercel cron pointed at deleted functions.
**Fix:** §5.1 must include "remove the `orders-agg` and `inventory-delta` entries from `vercel.json`."

**Gap 4 — `purge-worker.ts` (KEEP) depends on the `shopify_orders_agg` table. [MEDIUM]**
`api/shopify/cron/purge-worker.ts:89-104` iterates a `directTables` list containing `'shopify_orders_agg'` and calls `.delete().eq('brand_id', …)`; a missing table throws `${table}: ${error.message}`. If the table is dropped (per §9/D6), this KEEP file breaks at runtime.
**Fix:** §5.2 REWORK `purge-worker.ts` — remove `'shopify_orders_agg'` from `directTables` (l.91), to land in the same migration as the table drop.

**Gap 5 — `src/engine/tool-calls.ts` becomes orphaned dead code. [LOW]**
`src/engine/tool-calls.ts` is imported **only** by the three RIP'd files (`use-shop-drop.ts`, `product-variant/factory.ts`, `product-variant/sync.ts`). After the RIP it is dead. Spec claims "nothing dangling."
**Fix:** add `src/engine/tool-calls.ts` to §5.1 RIP (or explicitly note it as newly-dead and confirm no future use).

**Gap 6 — Migration drop must not revert shared infrastructure. [MEDIUM]**
The `canvas_product_variant_bindings` drop migration cannot blindly revert `_05b_`/`_05c_`: `update_updated_at()` (`_05b_:8`) is used by `shopify_connections` (`_04_schema_cleanup.sql:42`), and `idx_brands_user_id` (`_05c_:20`) backs every brand-scoped RLS policy.
**Fix:** expand §9's "include drop migrations" note — the new migration drops only `canvas_product_variant_bindings` (table, indexes, policy, its trigger); it must **preserve** `update_updated_at()` and `idx_brands_user_id`.

**Gap 7 — §6 brand voice/tone columns do not exist as described. [MEDIUM]**
§6 says voice/tone "lands on `brands.voice` + `brands.tone_snippets` (Q8 JSONB columns)." Reality: `brands.voice` exists but is **`TEXT`** (`20260317_m2_dashboard.sql:12`); **`brands.tone_snippets` does not exist** in any migration.
**Fix:** §6 should state that a Cluster 05 migration must **add** `tone_snippets` (and decide whether to alter `voice` TEXT→JSONB), not present them as existing.

**Gap 8 — §9 test-cleanup scope understated. [MEDIUM]**
§9 names only "`product-variant`, `use-shop-drop`" tests. Also requiring cleanup/rework: `tests/engine/shopify/{overlay-factory,overlay-sync,verify,inspector-state,store-product-variant-bindings,shop-panel}.test.ts`, `tests/engine/canvas-extensions/product-variant/schema.test.ts`, `tests/unit/composables/useCanvasBindingsPersistence.test.ts`, `tests/api/shopify/{cron-orders-agg,cron-inventory-delta}.test.ts`, and — if `shopify_orders_agg` is dropped — `tests/engine/shopify/lint-schema-invariants.test.ts`, `tests/unit/migrations/{pii-linter,catalog}.test.ts`, `tests/api/shopify/{migration-catalog,cron-purge-worker,cron-purge-worker-integration,compliance}.test.ts`, plus the `tests/e2e/m9-shopify.spec.ts` E2E (built entirely around drag-place + the inspector).
**Fix:** §9 should reference this list (or point to a migration-time test audit) so the fallout isn't mistaken for unrelated failing-test debt.

---

## What is SOUND (no action needed)

- The replace-the-model architecture (panel select → composer chips → hybrid payload → AI inserts static content via `CORE_TOOLS` + `placeMediaImage`).
- Zero `packages/core/` modification required — verified against `tools.ts` and `kova-tools.ts`.
- valibot-only tool layer, no React/Next/Pixi, dark-app theme — all honored.
- Every RIP/REWORK/KEEP item **that is listed** points at a real file with correctly-described behavior.
- `ProductVariantInspector.vue` RIP is risk-free — it's already orphaned.
- §9 correctly flags the `canvas_product_variant_bindings` drop migration and the test debt category (it just under-scopes both).

**Bottom line:** fix Gaps 1–8 (mechanical, all named above) and the spec is safe to author PRDs from. The design thinking is sound; the migration inventory is incomplete.

---

## Resolution — 2026-05-14 (spec Rev 2)

All 8 gaps closed in `2026-05-14-shopify-product-reference-design.md` Rev 2. Re-verified each code fact before writing.

| Gap | Status | Where closed |
|---|---|---|
| 1 — `ShopBuildPrompt.vue` missing from RIP | ✅ closed | §5.1 — added; re-swept, importer = `EditorView.vue` only. |
| 2 — `ShopPanel.vue` tabs + collections/discounts children | ✅ closed | §5.2 — `ShopPanel.vue` → REWORK (collapse to products-only, no tabs); §5.1 — `ShopPanelCollections.vue` + `ShopPanelDiscounts.vue` → RIP. Both children re-swept: self-contained, importer = `ShopPanel.vue` only. |
| 3 — dangling `vercel.json` cron entries | ✅ closed | §5.1 — added "remove the `orders-agg` + `inventory-delta` entries from the `crons` array"; `product-delta` + `purge-worker` entries explicitly retained. |
| 4 — `purge-worker.ts` deletes the dropped `shopify_orders_agg` table | ✅ closed | §5.2 — `purge-worker.ts` moved to REWORK (remove `'shopify_orders_agg'` from `directTables`, land in same migration as the drop); §5.3 KEEP note updated. |
| 5 — `src/engine/tool-calls.ts` orphaned post-RIP | ✅ closed | §5.1 — added; re-swept, importers = the 3 RIP'd files + 3 test files (all in the §9 test list). |
| 6 — drop migration must not revert shared objects | ✅ closed | New **§5.4 Migration-drop caution**. **Fact correction:** the original verdict said `update_updated_at()` was "born in `_05b_`" — wrong. Re-verified: it is born in `20260316_users.sql:34` (first migration); `_05b_:8` only `CREATE OR REPLACE`-re-declares it. It is used by `users`/`brands`/`canvases`/M5-chat/`shopify_connections` triggers — so the "do not drop" warning is *more* load-bearing than first stated. `idx_brands_user_id` (`_05c_:20`) named alongside it. |
| 7 — §6 brand voice/tone columns do not exist | ✅ closed | §6 — rewritten: `brands.voice` is `TEXT` (not JSONB), `brands.tone_snippets`/`saved_blocks` absent from all migrations; ADD migration for the Q8 JSONB columns explicitly assigned to the Cluster 05 PRD. |
| 8 — §9 test-cleanup scope under-scoped | ✅ closed | §9 — row expanded into Delete / Rework / Audit buckets naming all ~16 affected test files (product-variant, overlay, inspector, store-bindings, cron, the `orders_agg`-coupled lint/migration/compliance/purge tests, and the `m9-shopify.spec.ts` E2E). |

### Post-fix RIP-completeness sweep

Re-grepped importers of every newly-added RIP target — **no new dangling references surfaced:**
- `ShopBuildPrompt.vue` → `EditorView.vue` only (handled in §5.1 wiring).
- `src/engine/tool-calls.ts` → `use-shop-drop.ts`, `product-variant/factory.ts`, `product-variant/sync.ts` (all RIP) + 3 test files (in §9 list). No production importer survives.
- `ShopPanelCollections.vue` / `ShopPanelDiscounts.vue` → `ShopPanel.vue` only (now REWORK). Both import only `vue`/`supabase`/`brands` store — build their drag payloads inline, no shared module to chase.
- `ShopPanel.vue` → `EditorView.vue` only.

The §5.1 RIP list is now genuinely complete — nothing dangling.

### Revised verdict: ✅ SOUND

The spec (Rev 2) is internally consistent, founder-constraint-safe (zero `packages/core/` changes; valibot-only tool layer; no React/Next/Pixi; dark-app theme), and its migration inventory is now complete and accurate. **Safe to author PRDs from** for Clusters 02 / 04 / 05 / 06 / 10.
