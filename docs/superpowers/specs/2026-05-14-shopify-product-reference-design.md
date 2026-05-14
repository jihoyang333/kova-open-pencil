# Design: Shopify Product-Reference Architecture

> **Status:** APPROVED (founder-validated 2026-05-14 via brainstorming session)
> **Author:** Claude (brainstorming session)
> **Reviewer:** founder (Jiho Yang)
> **Supersedes:** the M9 "drag-to-place + live-binding" product model
>
> **Revision history:**
> - Rev 1, 2026-05-14 — initial APPROVED spec.
> - Rev 2, 2026-05-14 — 8 verification gaps closed (independent verification pass; see `2026-05-14-shopify-product-reference-VERIFICATION.md`).

---

## 1. Context & problem

M9 (`feat/m9-shopify`, built by an autonomous agent without explicit founder-intent alignment) shipped a **drag-to-place + live-binding** product model:

- `ShopPanelProducts.vue` cards are `draggable` — drag a product variant onto the canvas
- `canvas-extensions/product-variant/*` binds a dropped variant to a canvas frame
- `product-variant-bindings.ts` store maps `frameId → binding`
- `ProductVariantInspector.vue` is the inspector for a frame that "is" a product
- The frame stays synced to live Shopify price/inventory

**The founder rejected this model.** Users do not manually place store items onto the canvas. The correct model:

> User selects products in the Shop panel → imports them into the AI chat as a persistent reference → the AI pulls images, titles, and copy and inserts them into the canvas **itself**.

This document specifies the replacement architecture and the M9 migration plan.

---

## 2. Decisions (founder-ratified 2026-05-14)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Rip the whole M9 `product-variant` extension** — drag-to-place, live-binding, bindings store, inspector. AI inserts **static** product content. | Email is a one-time campaign snapshot exported as an image. Live sync has no value post-export. |
| D2 | **Hybrid import payload** — imported products attach a lightweight summary inline (title, primary image, price, product ID); the AI tool-calls the existing 5 AI tools for deep data on demand. | Balanced token cost. AI immediately knows *which* products; fetches detail only when the design needs it. |
| D3 | **Reference persists until changed** — imported products stay the active reference across every chat turn until the user removes or swaps them. | An email design session is multi-turn around the *same* featured products. Re-importing each turn is friction. |
| D4 | **Products only in the panel** + sort/filter **by collection**. No collections tab, no discounts as panel-selectable. | Collections are just groups of products. Collection-level requests go through chat ("pull a selection from X collection") — the `get_collection` AI tool handles it. |
| D5 | **Product-level granularity** — selecting a product imports a product-level summary; the AI handles variants on demand via tool-calls. | Consistent with D2. Email design features products; variant display is an AI concern. |
| D6 | **Cut all sales analytics** — rip `orders-agg` + `inventory-delta` crons and the `search_products` `bestsellers` sort. | Brands maintain their own "bestsellers" collection in Shopify. No need to compute analytics; it is unnecessary data collection for a design tool. |
| D7 | **Reference placement = composer chips (Approach A)** — imported products are removable chips directly above the chat text input. | Familiar Claude-reply pattern; compact. |
| D8 | **Each chip is individually removable (×)**. Removing the last chip empties the reference. | Founder explicit requirement. This is the mechanism behind D3 "persist until changed." |
| D9 | **Keep the `get_active_discounts` AI tool** — chat-driven only. | Harmless, chat-driven; marketers do ask about active discount codes. Not panel-selectable (per D4). |

---

## 3. Architecture & data flow

```
1 · CONNECT + SYNC
   Shopify store --OAuth--> bulk sync --> Supabase:
     shopify_products, shopify_variants, shopify_collections, shopify_media
1b · BRAND KIT
   Shopify theme + storefront --> brand-kit-extract (colors, fonts, logo)
                                + Claude API (brand voice + tone snippets — audit #3)
        |
        v
2 · SHOP PANEL  (canvas left sidebar, ~260px)
   Products grid (2-col) · search · sort (A–Z, Price ↑/↓) · filter by collection · multi-select
   click cards to select --> "Import N to chat" --> panel selection clears
        |
        v
3 · COMPOSER CHIPS  (AI chat, above text input)
   Imported products = removable chips · persist across turns until ×'d or swapped
   per-canvas chat state · each chip = thumbnail + name + ×
        |
        v
4 · AI TURN
   message carries hybrid payload (summary inline: title, image URL, price, id)
   AI tool-calls for depth: get_variant, get_collection
   AI inserts via CORE_TOOLS (frames, text nodes) + placeMediaImage (product image fill)
        |
        v
5 · CANVAS
   product inserted as STATIC content — image fill + text nodes
   no live binding · no manual drag-place
```

---

## 4. Component specs

### 4.1 Shop panel (`ShopPanelProducts.vue` — reworked)

**Location:** canvas left sidebar, ~260px wide. Dark theme (authenticated app — per `feedback_app_dark_website_light`).

**Layout (top to bottom):**
1. **Search input** — debounced (~300ms), matches product title.
2. **Sort dropdown** — `A–Z` (default), `Price ↑`, `Price ↓`. (M9's `ShopPanelProducts.vue` already implements this — preserve.)
3. **Collection filter dropdown** — `All collections` (default) + one entry per synced collection. Filters the same grid; not a separate tab/page.
4. **Product grid** — 2-column. Each card: square product image, title (truncate), price. If a product's variants have differing prices, show a price range.
5. **Sticky bottom bar** — visible only when ≥1 product selected: primary button `Import N to chat`, secondary `Clear`.

**Interactions:**
- Click a card → toggle selection. Selected state = accent border + ✓ badge top-right. Whole card is the hit target (no checkbox UI).
- `Import N to chat` → emits selected products to the AI chat (becomes composer chips), then clears panel selection.
- `Clear` → deselects all.

**Data source:** `shopify_products` (+ `shopify_variants` for price-range, `shopify_media` for image), scoped by `brand_id`, via `useShopifyProductsStore`.

**Removed from M9 version:** `draggable` attribute, `onDragStart`, `serializeShopPayload` import, variant-flat listing. Panel now lists **products**, not variants.

### 4.2 Composer-chip reference (AI chat)

**Placement:** removable chips in a row directly above the chat text input (Approach A / D7).

**Chip:** product thumbnail + product name + `×` remove button.

**Lifecycle (D3 + D8):**
- Importing from the Shop panel adds chips. Importing again merges (no duplicates by product ID).
- Chips persist across every chat turn — they are the active reference for the whole design session.
- `×` on a chip removes that product. Removing the last chip empties the reference.
- State is **per-canvas chat** (chats are independent per canvas — M5 model). Persists across reloads (it is the campaign subject, part of the canvas's chat state).

**On send:** the outgoing message carries the hybrid payload (§4.3) for all active chips. Chips do **not** clear on send (D3).

### 4.3 AI consumption & insertion

**What the AI receives (hybrid payload — D2/D5):**
Per active chip, a lightweight inline summary:
```
{ product_id, title, primary_image_url, price (or price_range), handle }
```
This is injected into the message content so the AI immediately knows *which* products are referenced.

**Depth on demand:** the AI tool-calls the existing tools when the design needs more:
- `get_variant` — full variant detail (all sizes/colors, per-variant price/media)
- `get_collection` — collection members (for "pull a selection from X collection" — D4)
- `search_products`, `get_shop_context`, `get_active_discounts` — as needed

**Insertion (D1 — static):** the AI uses **existing tools** — no new insertion tools required:
- `CORE_TOOLS` (from `@open-pencil/core`, wired in `src/ai/tools.ts`) — create frames, text nodes, set layout
- `placeMediaImage` (`src/ai/kova-tools.ts`) — set the product image as an image fill on a node

Inserted content is static (image fill + text). It is **not** bound to Shopify; nothing auto-updates.

### 4.4 Shopify-connect gather (final list)

| Gathered | Source | Status |
|----------|--------|--------|
| Primary/secondary color, heading/body font, logo URL | Theme `settings_data.json` via `brand-kit-extract` | Keep (best-effort, theme-dependent) |
| Products + variants + media | Bulk sync | Keep |
| Collections | Bulk sync | Keep |
| Shop metadata — currency, timezone, locale | OAuth | Keep (powers `get_shop_context`) |
| **Brand voice + tone snippets** | Claude API analyzing storefront content | **ADD** (audit decision #3) |
| Discounts | Bulk sync | Keep syncing for the `get_active_discounts` tool; **not** panel-selectable (D4/D9) |
| Order aggregates + inventory deltas | `orders-agg` + `inventory-delta` crons | **CUT** (D6) |

Brand name is **not** from Shopify — it is the Brand record itself (from onboarding).

---

## 5. M9 migration plan

### 5.1 RIP (delete entirely)
- `src/canvas-extensions/product-variant/` — whole directory (`factory.ts`, `register.ts`, `schema.ts`, `state.ts`, `sync.ts`, `verify.ts`)
- `src/stores/product-variant-bindings.ts`
- `src/components/inspector/ProductVariantInspector.vue` — already orphaned: no production importer (`PropertiesPanel.vue` never wired it). Risk-free delete.
- `src/composables/use-shop-drop.ts` (drag payload serialization)
- `src/composables/useCanvasBindingsPersistence.ts` (binding persistence)
- `src/engine/tool-calls.ts` — imported only by the three ripped files above (`use-shop-drop.ts`, `product-variant/factory.ts`, `product-variant/sync.ts`); dead code post-migration.
- `src/components/editor/ShopBuildPrompt.vue` — the drag-place "build around this?" toast; imported only by `EditorView.vue`.
- `src/components/editor/sidebar/ShopPanelCollections.vue` and `src/components/editor/sidebar/ShopPanelDiscounts.vue` — panel-selectable collections/discounts contradict D4; imported only by `ShopPanel.vue`. Both self-contained (drag payload built inline, no shared imports).
- `api/shopify/cron/orders-agg.ts`, `api/shopify/cron/inventory-delta.ts`
- The `orders-agg` and `inventory-delta` entries in the `crons` array of `vercel.json` — otherwise Vercel cron points at deleted functions. (`product-delta` and `purge-worker` cron entries stay.)
- Registration / wiring lines referencing the above in `src/main.ts` and `src/views/EditorView.vue`. For `EditorView.vue` this is more than import lines: the `useCanvasBindingsPersistence` lifecycle (the `saveBindings` variable + its `onBeforeRouteLeave` call), the `useShopDrop` destructure, the canvas `@dragover`/`@drop` handler, and the `<ShopBuildPrompt>` render block.
- DB tables exclusive to the ripped model — now identified: `canvas_product_variant_bindings` (created `20260418_m9_05_canvas_bindings.sql`, altered by `_05b_`/`_05c_`) and `shopify_orders_agg` (created `20260418_m9_02_catalog.sql`). The drop migration has constraints — see §5.4.

### 5.2 REWORK
- `src/components/editor/sidebar/ShopPanelProducts.vue` → §4.1 spec (grid + multi-select + import bar; remove `draggable`/`onDragStart` and the `serializeShopPayload` import; remove the In-stock/On-sale filter chips; list products not variants)
- `src/components/editor/sidebar/ShopPanel.vue` → collapse the 3-tab `TabsRoot` (Products / Collections / Discounts) to render `ShopPanelProducts` directly. No tabs — products-only panel per D4.
- `src/ai/kova-tools.ts` → `search_products`: drop the `bestsellers` option from the `sort` picklist in `searchProductsSchema`. (Note: the tool's `execute` never actually implemented sorting, so this is a schema-only change — but the option must go regardless, per D6.)
- `src/stores/shopify-products.ts` → keep as the data store; trim variant-flat assumptions if any; ensure product-level grouping for the grid
- `api/shopify/cron/purge-worker.ts` → remove `'shopify_orders_agg'` from its `directTables` delete list. The analytics cut drops that table, and a `.delete()` against a missing table throws. This rework **must land in the same migration/PR as the table drop**.

### 5.3 KEEP (as-is or near-as-is)
- OAuth flow — `api/shopify/oauth/*`
- Sync infra — `api/shopify/sync/*` (`bulk-start`, `worker`, `poll`, `bulk-finish`), `api/_shared/shopify-bulk-processor.ts`
- Remaining crons — `api/shopify/cron/product-delta.ts` (catalog delta sync) and `api/shopify/cron/purge-worker.ts` (GDPR purge) stay scheduled in `vercel.json`. `purge-worker.ts` itself needs the small rework in §5.2.
- 5 AI tools — `search_products` (minus bestsellers sort), `get_collection`, `get_variant`, `get_active_discounts`, `get_shop_context`
- `placeMediaImage`, `saveBrandMemory`
- `brand-kit-extract.ts` + `api/_shared/shopify-brand-kit.ts` — keep, **extend** with voice/tone (audit #3); see §6 on the columns it writes to
- Compliance handlers — `api/shopify/compliance/*` (GDPR / Shopify app-store requirements)

### 5.4 Migration-drop caution

The drop migration that removes `canvas_product_variant_bindings` and `shopify_orders_agg` must be written **surgically as a forward migration** — not a wholesale revert of `_05`/`_05b`/`_05c`. For each table it drops: the table, its indexes, its RLS policy, its CHECK constraints, and its *dedicated* `updated_at` trigger (`set_canvas_bindings_updated_at`).

It must **NOT** drop these shared objects that those migrations touch but do not own:
- `public.update_updated_at()` — the shared `updated_at` trigger function. Born in `20260316_users.sql:34`; `20260418_m9_05b_canvas_bindings_fixup.sql:8` only re-declares it (`CREATE OR REPLACE`). Used by triggers on `users`, `brands`, `canvases`, the M5 chat tables, and `shopify_connections`. Dropping it breaks every one of those triggers.
- `idx_brands_user_id` — created in `20260420_m9_05c_canvas_bindings_fixup2.sql:20`. Backs every brand-scoped RLS policy in the codebase (`brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())`). Dropping it regresses RLS performance project-wide.

---

## 6. New data model surface

- **Composer-chip reference state** — per-canvas chat. Stored alongside chat state (Supabase, per M5 chat-storage model). Shape: ordered list of `product_id`s for the active canvas's chat. Hydrated on canvas load.
- No new product/catalog tables — `shopify_products` / `shopify_variants` / `shopify_collections` / `shopify_media` already exist from M9.
- **Brand voice/tone storage** — per audit decision #3, voice/tone snippets land on the `brands` table. ⚠️ **The columns do not exist yet.** Current reality (`20260317_m2_dashboard.sql`): `brands.voice` is `TEXT` (not JSONB), and `brands.tone_snippets` / `brands.saved_blocks` do not exist anywhere in `supabase/migrations/`. The Q8 JSONB columns (`tone_snippets`, `saved_blocks`, plus a decision on whether to widen `voice` `TEXT → JSONB` or keep it `TEXT`) require an **ADD migration owned by the Cluster 05 PRD** — not this design. `brand-kit-extract` populates them on connect once they exist.
- **GUARDRAIL — AI-scraped voice/tone is a draft, never a silent write** (per 00d external verification, concern on D-3). When `brand-kit-extract` infers brand voice + tone snippets from storefront content via a Claude API call, the result is presented to the user as an **editable draft they review and confirm** in the Brand Kit UI — it is never written to `brands.voice` / `brands.tone_snippets` silently. The Cluster 05 PRD must spec this confirm-before-write step.

---

## 7. Cross-cuts to PRD clusters

This design feeds five PRD clusters (per `docs/prd/00-PRD_SCOPE_PLAN.md` §5.5):

| Cluster | What it picks up from this design |
|---------|-----------------------------------|
| **02 Onboarding & Dashboard** | `StoreTypeStep.vue` Shopify connect step (also: light→dark theme refactor, audit #1) |
| **04 Account Page + Stripe Billing** | `SettingsBrandIntegrationsView.vue` — connect/disconnect/resync (also: theme refactor, IA re-route, `shopify_connection_history` table — audit #1/#4/#6) |
| **05 Brand Kit & Drag-Drop** | `brand-kit-extract` voice/tone extension (audit #3) |
| **06 Canvas Editor Core Chrome** | Shop panel (§4.1) docks in the left sidebar; composer chips (§4.2) live in the AI chat surface |
| **10 AI Chat + Memory + Tool Layer** | Hybrid payload (§4.3), composer-chip reference state (§6), 5 AI tools, insertion via `CORE_TOOLS` + `placeMediaImage` |

The M9 migration plan (§5) must be executed before or as part of these clusters' implementation — not deferred.

---

## 8. Out of scope (this design does NOT cover)

- The AI's *design intelligence* — how it decides layout, composition, which product goes where. That is M5.5 / Cluster 10 territory.
- The Shopify OAuth UX and connect/disconnect flows — Cluster 02/04 PRDs.
- The exact `brand-kit-extract` voice/tone scraping prompt + storefront-content source — Cluster 05 PRD (audit #3 ratified the decision; mechanism is PRD-level).
- Bundles — not a synced entity; out of MVP scope.
- The chat panel's broader UI (message rendering, history, etc.) — Cluster 10 PRD.

---

## 9. Open questions / risks

| Item | Severity | Note |
|------|----------|------|
| Composer-chip reference persistence — confirmed per-canvas + across reloads. Exact storage column/shape is a Cluster 10 PRD detail. | LOW | Spec'd in §6; finalize in PRD. |
| DB tables exclusive to the ripped model — now identified, no longer "may have". | RESOLVED | `canvas_product_variant_bindings` + `shopify_orders_agg`, named in §5.1; drop-migration constraints in §5.4. |
| `brand-kit-extract` logo extraction is best-effort (theme-dependent). | LOW | Acceptable — onboarding lets the user upload a logo manually as fallback. |
| Existing M9 tests reference ripped artifacts. Cleanup is part of the §5 migration, not separate "failing-test debt." | MEDIUM | **Delete** (tied to RIP'd code): `tests/engine/canvas-extensions/product-variant/schema.test.ts`; `tests/engine/shopify/{overlay-factory,overlay-sync,verify,inspector-state,store-product-variant-bindings}.test.ts`; `tests/unit/composables/useCanvasBindingsPersistence.test.ts`; `tests/api/shopify/{cron-orders-agg,cron-inventory-delta}.test.ts`. **Rework** (tied to REWORK'd code): `tests/engine/shopify/shop-panel.test.ts` (drag/serialize → import-flow); `tests/e2e/m9-shopify.spec.ts` (whole E2E is drag-place + inspector). **Audit** (coupled to the dropped `shopify_orders_agg` table): `tests/engine/shopify/lint-schema-invariants.test.ts`; `tests/unit/migrations/{pii-linter,catalog}.test.ts`; `tests/api/shopify/{migration-catalog,cron-purge-worker,cron-purge-worker-integration,compliance}.test.ts`. |
