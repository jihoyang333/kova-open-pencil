-- M9 · Post-audit cleanup · Schema fixes
-- Addresses remaining findings from the 2026-04-19 Ralphy audit.
-- C1/C2: RLS per-row auth.uid() and webhook_log FOR ALL gap on connections schema
-- C3: UNIQUE(shop_domain) to prevent one shop connecting to multiple brands
-- C4: CHECK on shopify_connections.status
-- C5: updated_at auto-trigger on shopify_connections
-- C6: missing index on shopify_media.variant_id
-- C7: missing indexes on shopify_compliance_log
-- C9: CHECK constraints on free-form status columns in catalog tables

-- ─── C1 + C2 — shopify_connections and shopify_webhook_log RLS ───────────────

-- Recreate connections policy with (SELECT auth.uid()) for per-statement eval.
DROP POLICY "users_own_brand_shopify_connections" ON shopify_connections;
CREATE POLICY "users_own_brand_shopify_connections" ON shopify_connections
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );

-- Change webhook_log from FOR ALL → FOR SELECT; service_role handles writes.
DROP POLICY "users_own_brand_shopify_webhook_log" ON shopify_webhook_log;
CREATE POLICY "users_own_brand_shopify_webhook_log" ON shopify_webhook_log
  FOR SELECT USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );

-- ─── C3 — UNIQUE(shop_domain) on shopify_connections ────────────────────────

ALTER TABLE shopify_connections
  ADD CONSTRAINT shopify_connections_shop_domain_unique UNIQUE (shop_domain);

-- ─── C4 — CHECK on shopify_connections.status ───────────────────────────────

ALTER TABLE shopify_connections
  ADD CONSTRAINT shopify_connections_status_check
  CHECK (status IN ('active', 'disconnected', 'error'));

-- ─── C5 — updated_at auto-trigger on shopify_connections ────────────────────

CREATE TRIGGER shopify_connections_updated_at
  BEFORE UPDATE ON shopify_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── C6 — missing index on shopify_media.variant_id ─────────────────────────

CREATE INDEX ON shopify_media (variant_id) WHERE variant_id IS NOT NULL;

-- ─── C7 — missing indexes on shopify_compliance_log ─────────────────────────

CREATE INDEX ON shopify_compliance_log (user_id);
CREATE INDEX ON shopify_compliance_log (brand_id, responded_at DESC);

-- ─── C9 — CHECK constraints on free-form status columns ─────────────────────

ALTER TABLE shopify_products
  ADD CONSTRAINT shopify_products_status_check
  CHECK (status IN ('active', 'archived', 'draft'));

ALTER TABLE shopify_discounts
  ADD CONSTRAINT shopify_discounts_status_check
  CHECK (status IN ('active', 'expired', 'scheduled'));

ALTER TABLE shopify_compliance_log
  ADD CONSTRAINT shopify_compliance_log_status_check
  CHECK (status IN ('received', 'purge_scheduled', 'purged', 'no_connection', 'acknowledged', 'acknowledged_no_data'));
