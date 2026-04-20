# M9 Chunk 1 — Finish Phase 2.5 (Nightly Crons + Purge Worker)

## Pre-flight (CRITICAL — read first)

- DO NOT read the master plan (`docs/superpowers/plans/2026-04-18-m9-shopify.md`) unless you hit a reference gap.
- DO NOT read the master spec (`docs/superpowers/specs/2026-04-18-m9-shopify-design.md`) unless you hit a reference gap.
- This handoff's task body is extracted byte-for-byte from the master plan — it is self-contained.
- Current branch: `feat/m9-shopify`. Verify with `git status` and `git log -1`.
- Expected last commit: `bf1b627 chore(m9): add vercel.json with Shopify cron schedules`
- Before you start: run `bun run check && bun run test:unit` from `kova-open-pencil-1/` — must be green.

## Scope

Complete Task 2.5 of the M9 Shopify plan: the three remaining cron handlers (`inventory-delta.ts`, `product-delta.ts`, `purge-worker.ts`) and their unit tests. Steps 1 and 2 (`vercel.json` and `orders-agg.ts`) were completed in the previous session and are already committed.

## Out of scope

- Any Phase 3, 4, 5, 6, or 7 work.
- Modifying `vercel.json` or `orders-agg.ts` (already done).
- Any UI changes.

## Quality gates — run after every step

```bash
cd kova-open-pencil-1
bun run check         # oxlint --type-aware --type-check
bun run test:unit     # bun:test
```

<!-- BODY START — verbatim extract from master-plan lines 1592..1631. Do not edit. -->
### Task 2.5 — Nightly crons + purge worker

**Files:**
- Create: `api/shopify/cron/orders-agg.ts`
- Create: `api/shopify/cron/inventory-delta.ts`
- Create: `api/shopify/cron/product-delta.ts`
- Create: `api/shopify/cron/purge-worker.ts`
- Modify: `vercel.json` (create if missing — current repo does not have one)

- [x] **Step 1: Create `vercel.json`**

```json
{
  "crons": [
    { "path": "/api/shopify/cron/orders-agg",       "schedule": "0 2 * * *" },
    { "path": "/api/shopify/cron/inventory-delta",  "schedule": "0 * * * *" },
    { "path": "/api/shopify/cron/product-delta",    "schedule": "0 */6 * * *" },
    { "path": "/api/shopify/cron/purge-worker",     "schedule": "30 3 * * *" }
  ]
}
```

- [x] **Step 2: Implement `orders-agg.ts`** — per-brand: query Shopify `orders.json?updated_at_min=yesterday` paginated, aggregate `variant_id → { qty, revenue }` per date, upsert into `shopify_orders_agg`. Zero PII.

- [ ] **Step 3: Implement `inventory-delta.ts`** — webhook-loss fallback: for each active brand, query `inventory_levels.json?updated_at_min=last_hour`, upsert into `shopify_variants.inventory_qty`.

- [ ] **Step 4: Implement `product-delta.ts`** — every 6h: query `products.json?updated_at_min=last_6h`, upsert.

- [ ] **Step 5: Implement `purge-worker.ts`** — every night: for each `shopify_purge_queue` row with `scheduled_at < now() AND completed_at IS NULL`, cascade-delete all `shopify_*` rows for that `brand_id`, then set `completed_at`.

- [ ] **Step 6: Unit tests** — shape assertions per handler; integration test for `purge-worker` that seeds a connection + products and asserts all rows gone.

- [ ] **Step 7: Commit**

```bash
git add api/shopify/cron/ vercel.json tests/api/shopify/cron-*.test.ts
git commit -m "feat(m9): shopify cron jobs — orders agg, deltas, purge worker"
```

---

<!-- BODY END -->

## Exit criteria

- [ ] Steps 3–7 all marked [x] above.
- [ ] `bun run check` passes with zero errors.
- [ ] `bun run test:unit` passes — new cron tests green.
- [ ] Coverage on `api/shopify/cron/*` ≥ 80%.
- [ ] Final commit subject: `feat(m9): shopify cron jobs — orders agg, deltas, purge worker`

## Handoff to next chunk

Next chunk: `02-phase-3.1-pinia-store.md`
