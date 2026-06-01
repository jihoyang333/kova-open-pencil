-- M9 · Phase 1 · Task 1.1 — Shopify connection primitives.
-- Adds: shopify_connections (1:1 brand↔shop), shopify_webhook_log (dedupe),
-- shopify_oauth_state (CSRF), vault token RPCs, RLS, column-level grants,
-- nightly prune of expired OAuth state. Per spec §7.1, §7.6–§7.9.

-- §7.1 shopify_connections
CREATE TABLE shopify_connections (
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

-- §7.6 shopify_webhook_log (dedupe)
CREATE TABLE shopify_webhook_log (
  webhook_id   text PRIMARY KEY,
  brand_id     uuid REFERENCES brands(id) ON DELETE SET NULL,
  topic        text NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status       text NOT NULL DEFAULT 'received'
);

CREATE INDEX shopify_webhook_log_brand_received_idx
  ON shopify_webhook_log (brand_id, received_at DESC);

-- §7.7 shopify_oauth_state (CSRF state, short-lived)
CREATE TABLE shopify_oauth_state (
  state       text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id    uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  shop        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '10 minutes'
);

CREATE INDEX shopify_oauth_state_expires_at_idx
  ON shopify_oauth_state (expires_at);

-- §7.8 RLS — users can read/write only rows belonging to brands they own.
ALTER TABLE shopify_connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_webhook_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_oauth_state   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_brand_shopify_connections" ON shopify_connections
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
  );

CREATE POLICY "users_own_brand_shopify_webhook_log" ON shopify_webhook_log
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
  );

CREATE POLICY "users_own_brand_shopify_oauth_state" ON shopify_oauth_state
  FOR ALL USING (
    user_id = auth.uid()
    AND brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
  );

-- §7.9 Vault token write path
CREATE OR REPLACE FUNCTION store_shopify_token(
  p_brand_id uuid,
  p_token    text,
  p_name     text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  SELECT vault.create_secret(p_token, p_name, 'Shopify access token') INTO v_secret_id;

  UPDATE shopify_connections
    SET access_token_secret_id = v_secret_id,
        updated_at = now()
    WHERE brand_id = p_brand_id;

  RETURN v_secret_id;
END; $$;

-- §7.9 Vault token read path
CREATE OR REPLACE FUNCTION read_shopify_token(p_brand_id uuid)
  RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE
  v_token text;
BEGIN
  SELECT decrypted_secret INTO v_token
    FROM vault.decrypted_secrets ds
    JOIN shopify_connections sc ON sc.access_token_secret_id = ds.id
    WHERE sc.brand_id = p_brand_id;

  RETURN v_token;
END; $$;

-- Lock down vault functions to service_role only.
-- Supabase default privileges auto-grant EXECUTE to anon + authenticated on new
-- functions, so revoke from PUBLIC *and* those roles explicitly before re-granting.
REVOKE ALL ON FUNCTION store_shopify_token(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION read_shopify_token(uuid)              FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION store_shopify_token(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION read_shopify_token(uuid)              TO service_role;

-- Column-level: anon/authenticated roles cannot see the vault pointer.
-- Supabase auto-grants table-wide ALL to anon + authenticated, which overrides
-- column-level REVOKE. So revoke table-wide first, then re-grant SELECT on the
-- safe column list for authenticated. anon gets nothing (RLS would filter
-- anyway, but belt-and-suspenders).
REVOKE ALL ON shopify_connections FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, brand_id, shop_domain, shop_id, scope, currency, timezone, primary_locale,
  connected_at, last_synced_at, status, created_at, updated_at
) ON shopify_connections TO authenticated;

-- Nightly purge of expired OAuth state rows. Service-role only.
CREATE OR REPLACE FUNCTION prune_shopify_oauth_state() RETURNS void LANGUAGE sql
  SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM shopify_oauth_state WHERE expires_at < now();
$$;

REVOKE ALL ON FUNCTION prune_shopify_oauth_state() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION prune_shopify_oauth_state() TO service_role;

-- pg_cron schedule — wrapped in DO so the migration does not fail if pg_cron is
-- unavailable; fallback is a Vercel Cron route (spec §14 open question #3).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('prune-shopify-oauth-state', '0 3 * * *', $cron$ SELECT prune_shopify_oauth_state(); $cron$);
  ELSE
    RAISE NOTICE 'pg_cron not enabled; prune-shopify-oauth-state will run via vercel cron instead';
  END IF;
END $$;
