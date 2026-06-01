-- M9 · Phase 3.5 fixup2 — database-reviewer findings (critical + high).
--
-- Critical fixes:
--   1. canvas_id: text → uuid (type must match canvases.id so FK can be added later)
--   2. brands(user_id) index — was missing; every RLS policy in this codebase
--      that filters via brands does a full scan without it.
--
-- High fixes:
--   3. created_at column — consistent with every other table in the project.
--   4. shopify_variant_id CHECK — guards against non-GID strings at the DB boundary.
--   5. bindings / child_ids jsonb CHECK — prevents scalar/array values from being
--      stored where objects are required.

-- 1. Widen canvas_id to uuid (table is empty at time of this migration).
ALTER TABLE canvas_product_variant_bindings
  ALTER COLUMN canvas_id TYPE uuid USING canvas_id::uuid;

-- 2. Index brands(user_id) — covers every table in the codebase that uses the
--    pattern: brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()).
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands (user_id);

-- 3. Add missing created_at column (DEFAULT now() fills the column on new rows).
ALTER TABLE canvas_product_variant_bindings
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

-- 4. Guard shopify_variant_id against non-GID strings.
ALTER TABLE canvas_product_variant_bindings
  ADD CONSTRAINT canvas_bindings_variant_id_gid_check
  CHECK (shopify_variant_id LIKE 'gid://shopify/ProductVariant/%');

-- 5. Enforce object shape for jsonb columns.
ALTER TABLE canvas_product_variant_bindings
  ADD CONSTRAINT canvas_bindings_bindings_is_object
  CHECK (jsonb_typeof(bindings) = 'object');

ALTER TABLE canvas_product_variant_bindings
  ADD CONSTRAINT canvas_bindings_child_ids_is_object
  CHECK (jsonb_typeof(child_ids) = 'object');
