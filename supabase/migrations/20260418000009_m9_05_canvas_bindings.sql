-- M9 · Phase 3.5 — Canvas product-variant bindings persistence.
-- One row per (frame_id, canvas_id) pair; stores the full binding record
-- including live/snapshot field mode, snapshot data, and child node ids.
-- RLS: users may only access bindings belonging to brands they own.

CREATE TABLE canvas_product_variant_bindings (
  frame_id            text NOT NULL,
  canvas_id           text NOT NULL,
  brand_id            uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  shopify_variant_id  text NOT NULL,
  bindings            jsonb NOT NULL,  -- {image,price,title,inventory}: 'live'|'snapshot'
  snapshot            jsonb,           -- nullable snapshot data
  child_ids           jsonb NOT NULL,  -- {image_node_id,title_node_id,price_node_id}
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (frame_id, canvas_id)
);

CREATE INDEX ON canvas_product_variant_bindings (canvas_id, brand_id);

ALTER TABLE canvas_product_variant_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_brand_canvas_bindings" ON canvas_product_variant_bindings
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );
