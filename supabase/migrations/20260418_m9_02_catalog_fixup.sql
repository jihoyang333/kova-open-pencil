-- Fixup: address CRITICAL/HIGH findings from database-reviewer on catalog migration.
-- (1) auth.uid() → (SELECT auth.uid()) in all policies (per-statement evaluation)
-- (2) compliance_log policy changed to SELECT-only (service-role writes)
-- (3) compliance_log gets user_id column to preserve audit trail after brand deletion

-- (3) Add user_id to compliance log for audit trail durability
ALTER TABLE shopify_compliance_log
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- (1)+(2) Drop and recreate all policies with (SELECT auth.uid())
DROP POLICY "users_own_brand_shopify_products"            ON shopify_products;
DROP POLICY "users_own_brand_shopify_variants"            ON shopify_variants;
DROP POLICY "users_own_brand_shopify_variant_prices"      ON shopify_variant_prices;
DROP POLICY "users_own_brand_shopify_media"               ON shopify_media;
DROP POLICY "users_own_brand_shopify_metafields"          ON shopify_metafields;
DROP POLICY "users_own_brand_shopify_collections"         ON shopify_collections;
DROP POLICY "users_own_brand_shopify_collection_products" ON shopify_collection_products;
DROP POLICY "users_own_brand_shopify_discounts"           ON shopify_discounts;
DROP POLICY "users_own_brand_shopify_orders_agg"          ON shopify_orders_agg;
DROP POLICY "users_own_brand_shopify_compliance_log"      ON shopify_compliance_log;

CREATE POLICY "users_own_brand_shopify_products" ON shopify_products
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "users_own_brand_shopify_variants" ON shopify_variants
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );

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

-- SELECT-only for authenticated; service_role handles all writes (bypasses RLS).
CREATE POLICY "users_own_brand_shopify_compliance_log_select" ON shopify_compliance_log
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
  );
