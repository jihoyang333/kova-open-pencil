# M9 Chunk 6 — Phase 3.5: Canvas Bindings Persistence

## Pre-flight (CRITICAL — read first)

- DO NOT read the master plan (`docs/superpowers/plans/2026-04-18-m9-shopify.md`) unless you hit a reference gap.
- DO NOT read the master spec (`docs/superpowers/specs/2026-04-18-m9-shopify-design.md`) unless you hit a reference gap.
- This handoff's task body is extracted byte-for-byte from the master plan — it is self-contained.
- Current branch: `feat/m9-shopify`. Verify with `git status` and `git log -1`.
- Expected last commit: `feat(m9): verifyProductVariantsOnCanvas — exposed to M6 export pipeline` (from Chunk 5).
- Before you start: run `bun run check && bun run test:unit` from `kova-open-pencil-1/` — must be green.

## Scope

Task 3.5 only: the `canvas_product_variant_bindings` Supabase migration (applied via `mcp__supabase__apply_migration`) and the `useCanvasBindingsPersistence` composable that hydrates/dehydrates the bindings store on canvas open/save.

## Out of scope

- Phase 4, 5, 6, or 7.
- Any UI work.

## Quality gates — run after every step

```bash
cd kova-open-pencil-1
bun run check
bun run test:unit
```

<!-- BODY START — verbatim extract from master-plan lines 2209..2251. Do not edit. -->
### Task 3.5 — Canvas persistence: `product_variant_bindings` column

**Files:**
- Create: `supabase/migrations/20260418_m9_03_canvas_bindings.sql`
- Modify: the canvas-load + canvas-save composables (find via `Grep` for where canvases are persisted — see §14 open question #3)

- [ ] **Step 1: Confirm existing canvas table name**

```
Grep("CREATE TABLE canvases", supabase/migrations)
```

If the canvases table does not exist in M7 yet (likely true as of 2026-04-18), create a standalone table:

```sql
CREATE TABLE canvas_product_variant_bindings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id   text NOT NULL,
  brand_id    uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  bindings    jsonb NOT NULL DEFAULT '[]',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(canvas_id, brand_id)
);

ALTER TABLE canvas_product_variant_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_brand_canvas_bindings" ON canvas_product_variant_bindings
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));
```

When M7 lands, a migration folds these rows into `canvases.product_variant_bindings jsonb` and drops the standalone table.

- [ ] **Step 2: Write load/save composable** — `src/composables/useCanvasBindingsPersistence.ts` that (a) on canvas load: queries `canvas_product_variant_bindings` for `(canvas_id, brand_id)`, calls `useProductVariantBindingsStore().hydrate(data)`. (b) on canvas save: calls `dehydrate()` and upserts. Hook into the existing canvas-open and canvas-save lifecycle (find via `Grep("onCanvasOpen|onCanvasSave")`).

- [ ] **Step 3: Test** — integration test with a stubbed Supabase that asserts hydrate on load and upsert on save.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260418_m9_03_canvas_bindings.sql src/composables/useCanvasBindingsPersistence.ts tests/engine/shopify/canvas-bindings-persistence.test.ts
git commit -m "feat(m9): canvas product-variant bindings persistence"
```

---

<!-- BODY END -->

## Exit criteria

- [ ] All 4 steps marked [x].
- [ ] Migration applied to Supabase via `mcp__supabase__apply_migration`.
- [ ] `database-reviewer` agent dispatched on the migration SQL file.
- [ ] `bun run check` passes.
- [ ] `bun run test:unit` passes — persistence test green.
- [ ] Final commit subject: `feat(m9): canvas product-variant bindings persistence`

## Handoff to next chunk

Next chunk: `07-phase-4-ai-tools.md`
