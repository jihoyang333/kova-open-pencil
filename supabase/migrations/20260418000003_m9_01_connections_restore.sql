-- Restore shopify_connections and related tables after rollback_wrong_project.
-- This migration re-applies the content of 20260418_m9_01_connections.sql
-- on the correct project.

CREATE TABLE IF NOT EXISTS shopify_connections (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id               uuid NOT NULL UNIQUE REFERENCES brands(id) ON DELETE CASCADE,
  shop_domain            text NOT NULL,
  shop_id                bigint NOT NULL,
  access_token_secret_id uuid NOT NULL,
  scope                  text NOT NULL,
  currency               text NOT NULL,
  timezone               text NOT NULL,
  primary_locale         text NOT NULL,
  connected_at           timestamptz NOT NULL DEFAULT now(),
  last_synced_at         timestamptz,
  status                 text NOT NULL DEFAULT 'active',
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shopify_webhook_log (
  webhook_id   text PRIMARY KEY,
  brand_id     uuid REFERENCES brands(id) ON DELETE SET NULL,
  topic        text NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status       text NOT NULL DEFAULT 'received'
);

CREATE INDEX IF NOT EXISTS shopify_webhook_log_brand_received_idx
  ON shopify_webhook_log (brand_id, received_at DESC);

CREATE TABLE IF NOT EXISTS shopify_oauth_state (
  state       text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id    uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  shop        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '10 minutes'
);

CREATE INDEX IF NOT EXISTS shopify_oauth_state_expires_at_idx
  ON shopify_oauth_state (expires_at);

ALTER TABLE shopify_connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_webhook_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_oauth_state   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_brand_shopify_connections" ON shopify_connections;
CREATE POLICY "users_own_brand_shopify_connections" ON shopify_connections
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "users_own_brand_shopify_webhook_log" ON shopify_webhook_log;
CREATE POLICY "users_own_brand_shopify_webhook_log" ON shopify_webhook_log
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "users_own_brand_shopify_oauth_state" ON shopify_oauth_state;
CREATE POLICY "users_own_brand_shopify_oauth_state" ON shopify_oauth_state
  FOR ALL USING (
    user_id = (SELECT auth.uid())
    AND brand_id IN (SELECT id FROM brands WHERE user_id = (SELECT auth.uid()))
  );

CREATE OR REPLACE FUNCTION store_shopify_token(p_brand_id uuid, p_token text, p_name text)
  RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE v_secret_id uuid;
BEGIN
  SELECT vault.create_secret(p_token, p_name, 'Shopify access token') INTO v_secret_id;
  UPDATE shopify_connections SET access_token_secret_id = v_secret_id, updated_at = now() WHERE brand_id = p_brand_id;
  RETURN v_secret_id;
END; $$;

CREATE OR REPLACE FUNCTION read_shopify_token(p_brand_id uuid)
  RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE v_token text;
BEGIN
  SELECT decrypted_secret INTO v_token
    FROM vault.decrypted_secrets ds
    JOIN shopify_connections sc ON sc.access_token_secret_id = ds.id
    WHERE sc.brand_id = p_brand_id;
  RETURN v_token;
END; $$;

REVOKE ALL ON FUNCTION store_shopify_token(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION read_shopify_token(uuid)              FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION store_shopify_token(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION read_shopify_token(uuid)              TO service_role;

REVOKE ALL ON shopify_connections FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, brand_id, shop_domain, shop_id, scope, currency, timezone, primary_locale,
  connected_at, last_synced_at, status, created_at, updated_at
) ON shopify_connections TO authenticated;

CREATE OR REPLACE FUNCTION prune_shopify_oauth_state() RETURNS void LANGUAGE sql
  SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM shopify_oauth_state WHERE expires_at < now();
$$;

REVOKE ALL ON FUNCTION prune_shopify_oauth_state() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION prune_shopify_oauth_state() TO service_role;
