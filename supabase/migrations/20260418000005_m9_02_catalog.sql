-- M9 · Phase 2 · Task 2.1 — Shopify catalog schema.
-- Adds: products, variants, variant_prices, media, metafields, collections,
-- collection_products, discounts, orders_agg, compliance_log. Plus sync_progress
-- column on shopify_connections. RLS + indexes. Per spec §7.2–§7.5, §7.8.

-- §7.2 shopify_products, shopify_variants, shopify_media, shopify_metafields
CREATE TABLE shopify_products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  shopify_product_id  text NOT NULL,  -- gid://shopify/Product/...
  handle              text NOT NULL,
  title               text NOT NULL,
  description_html    text,
  product_type        text,
  vendor              text,
  tags                text[],
  status              text,           -- active | draft | archived
  published_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, shopify_product_id)
);

CREATE TABLE shopify_variants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  product_id          uuid NOT NULL REFERENCES shopify_products(id) ON DELETE CASCADE,
  shopify_variant_id  text NOT NULL,  -- gid://shopify/ProductVariant/...
  sku                 text,
  title               text NOT NULL,
  price               numeric(12,2) NOT NULL,
  compare_at_price    numeric(12,2),
  currency            text NOT NULL,
  inventory_qty       integer,
  available           boolean NOT NULL DEFAULT true,
  option_values       jsonb,          -- [{name: 'Size', value: 'M'}, ...]
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, shopify_variant_id)
);

-- Multi-currency support (schema-first-class per locked decision #15)
CREATE TABLE shopify_variant_prices (
  variant_id  uuid NOT NULL REFERENCES shopify_variants(id) ON DELETE CASCADE,
  currency    text NOT NULL,
  price       numeric(12,2) NOT NULL,
  PRIMARY KEY (variant_id, currency)
);

CREATE TABLE shopify_media (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  product_id        uuid REFERENCES shopify_products(id) ON DELETE CASCADE,
  variant_id        uuid REFERENCES shopify_variants(id) ON DELETE CASCADE,
  shopify_media_id  text NOT NULL,
  url               text NOT NULL,
  alt               text,
  width             integer,
  height            integer,
  position          integer NOT NULL DEFAULT 0,
  UNIQUE(brand_id, shopify_media_id)
);

-- owner_id is polymorphic (product | variant | shop); no FK by design.
-- Sync path MUST delete metafields before deleting a product/variant to avoid orphans.
CREATE TABLE shopify_metafields (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  owner_type   text NOT NULL,  -- 'product' | 'variant' | 'shop'
  owner_id     uuid NOT NULL,
  namespace    text NOT NULL,
  key          text NOT NULL,
  value        jsonb,
  type         text,
  UNIQUE(brand_id, owner_type, owner_id, namespace, key)
);

-- §7.3 shopify_collections + membership
CREATE TABLE shopify_collections (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id               uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  shopify_collection_id  text NOT NULL,
  handle                 text NOT NULL,
  title                  text NOT NULL,
  description_html       text,
  collection_type        text NOT NULL,  -- 'manual' | 'smart'
  rules                  jsonb,          -- for smart collections
  image_url              text,
  products_count         integer NOT NULL DEFAULT 0,
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, shopify_collection_id)
);

CREATE TABLE shopify_collection_products (
  collection_id  uuid NOT NULL REFERENCES shopify_collections(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES shopify_products(id) ON DELETE CASCADE,
  position       integer,
  PRIMARY KEY (collection_id, product_id)
);

-- §7.4 shopify_discounts
CREATE TABLE shopify_discounts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  shopify_discount_id  text NOT NULL,
  code                 text,          -- null for automatic discounts
  title                text NOT NULL,
  status               text NOT NULL, -- 'active' | 'scheduled' | 'expired'
  starts_at            timestamptz,
  ends_at              timestamptz,
  value_type           text,          -- 'percentage' | 'fixed_amount'
  value                numeric(12,2),
  UNIQUE(brand_id, shopify_discount_id)
);

-- §7.5 shopify_orders_agg (bestsellers — anonymized)
-- Invariant (column comment + CI lint): zero customer identifiers. Ever.
CREATE TABLE shopify_orders_agg (
  brand_id    uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  variant_id  uuid NOT NULL REFERENCES shopify_variants(id) ON DELETE CASCADE,
  date        date NOT NULL,
  qty_sold    integer NOT NULL DEFAULT 0,
  revenue     numeric(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (brand_id, variant_id, date)
);

COMMENT ON TABLE shopify_orders_agg IS
  'Aggregated order data for bestseller rankings. NO customer identifiers, ever. Verified by CI lint.';

-- Sync progress for the UI indicator and the block-new-canvas gate (locked decision #25).
ALTER TABLE shopify_connections ADD COLUMN sync_progress jsonb NOT NULL DEFAULT '{"phase":"idle","count_done":0,"count_total":0}'::jsonb;

-- Compliance audit log (Task 2.4).
-- user_id is stored directly so the audit trail survives brand deletion
-- (brand_id uses ON DELETE SET NULL per Shopify GDPR webhook semantics).
-- Writes are service-role-only; authenticated users get SELECT on their own rows.
CREATE TABLE shopify_compliance_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic         text NOT NULL,
  brand_id      uuid REFERENCES brands(id) ON DELETE SET NULL,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  shop_domain   text NOT NULL,
  customer_id   text, -- stored only for audit trail; no PII beyond Shopify's opaque id
  received_at   timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,
  status        text NOT NULL DEFAULT 'received'
);

-- Indexes.
CREATE INDEX ON shopify_products          (brand_id, updated_at DESC);
CREATE INDEX ON shopify_variants          (brand_id, product_id);
CREATE INDEX ON shopify_variants          (brand_id, shopify_variant_id);
CREATE INDEX ON shopify_media             (brand_id, product_id);
CREATE INDEX ON shopify_collections       (brand_id, updated_at DESC);
CREATE INDEX ON shopify_collection_products (product_id);
CREATE INDEX ON shopify_discounts         (brand_id, status, starts_at);
-- Basic recency scan
CREATE INDEX ON shopify_orders_agg        (brand_id, date DESC);
-- Bestseller hot-path: filter by brand+date range, sort by qty_sold DESC
CREATE INDEX ON shopify_orders_agg        (brand_id, date DESC, qty_sold DESC) INCLUDE (variant_id, revenue);

-- §7.8 RLS — users can read/write only rows belonging to brands they own.
-- All auth.uid() calls use the (SELECT auth.uid()) form so they are evaluated
-- once per statement rather than once per row.
ALTER TABLE shopify_products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_variants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_variant_prices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_media                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_metafields             ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_collections            ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_collection_products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_discounts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_orders_agg             ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_compliance_log         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_brand_shopify_products" ON shopify_products
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "users_own_brand_shopify_variants" ON shopify_variants
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );

-- shopify_variant_prices has no brand_id; scope through the parent variant.
CREATE POLICY "users_own_brand_shopify_variant_prices" ON shopify_variant_prices
  FOR ALL USING (
    variant_id IN (
      SELECT id FROM shopify_variants
      WHERE brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "users_own_brand_shopify_media" ON shopify_media
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "users_own_brand_shopify_metafields" ON shopify_metafields
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "users_own_brand_shopify_collections" ON shopify_collections
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );

-- shopify_collection_products has no brand_id; scope through the parent collection.
CREATE POLICY "users_own_brand_shopify_collection_products" ON shopify_collection_products
  FOR ALL USING (
    collection_id IN (
      SELECT id FROM shopify_collections
      WHERE brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "users_own_brand_shopify_discounts" ON shopify_discounts
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "users_own_brand_shopify_orders_agg" ON shopify_orders_agg
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );

-- shopify_compliance_log: service-role writes only; authenticated users get SELECT.
CREATE POLICY "users_own_brand_shopify_compliance_log_select" ON shopify_compliance_log
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
  );
