-- M9 · Phase 1 · Task 1.5 — Shopify disconnect primitives.
-- Adds: shopify_purge_queue (30-day deferred purge), delete_shopify_token RPC
-- (revokes vault secret on disconnect). Per spec §7.1, §7.9, §10.

-- Deferred-purge queue: when a user disconnects a Shopify store, we schedule a
-- cascade-delete 30 days out to allow reconnection without data loss.
CREATE TABLE shopify_purge_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  scheduled_at  timestamptz NOT NULL,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shopify_purge_queue_scheduled_at_idx
  ON shopify_purge_queue (scheduled_at)
  WHERE completed_at IS NULL;

-- RLS — only the brand owner can observe their own pending purge.
ALTER TABLE shopify_purge_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_brand_shopify_purge_queue" ON shopify_purge_queue
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
  );

-- Lock down table writes to service_role only; authenticated gets read.
REVOKE ALL ON shopify_purge_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, brand_id, scheduled_at, completed_at, created_at)
  ON shopify_purge_queue TO authenticated;

-- Vault token delete path — called from /api/shopify/oauth/disconnect.
-- Reads the secret pointer from shopify_connections, then deletes the vault
-- row. Idempotent: no-op if the connection has no vault pointer. The
-- access_token_secret_id column stays set (it is NOT NULL on the table); the
-- connection is marked disconnected via a separate status update so the
-- dangling pointer is harmless and the row remains for audit.
CREATE OR REPLACE FUNCTION delete_shopify_token(p_brand_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  SELECT access_token_secret_id INTO v_secret_id
    FROM shopify_connections
    WHERE brand_id = p_brand_id;

  IF v_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION delete_shopify_token(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_shopify_token(uuid) TO service_role;
