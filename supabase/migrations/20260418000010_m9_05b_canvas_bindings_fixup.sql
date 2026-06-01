-- M9 · Phase 3.5 fixup — address database-reviewer findings on canvas_product_variant_bindings.
-- Fixes: missing updated_at trigger (CRITICAL), missing brand_id index (HIGH),
--        explicit WITH CHECK on RLS policy (LOW).
-- NOTE: canvas_id FK to canvases(id) intentionally deferred — canvases table
-- lands in M7. A follow-up migration will add the FK and ON DELETE CASCADE then.

-- Shared trigger function (idempotent; future tables can reuse it).
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_canvas_bindings_updated_at
  BEFORE UPDATE ON canvas_product_variant_bindings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Solo brand_id index so the RLS policy join does an index scan, not a seq scan.
CREATE INDEX ON canvas_product_variant_bindings (brand_id);

-- Re-create policy with explicit WITH CHECK for insert/upsert correctness.
DROP POLICY "users_own_brand_canvas_bindings" ON canvas_product_variant_bindings;

CREATE POLICY "users_own_brand_canvas_bindings" ON canvas_product_variant_bindings
  FOR ALL
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid())));
