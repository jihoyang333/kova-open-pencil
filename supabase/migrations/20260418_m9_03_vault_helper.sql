-- M9 · Post-audit cleanup · Vault helper
-- Creates a secret and returns its UUID without touching any other table.
-- Lets callback.ts vault the access token before the connection row is upserted,
-- so there is never a dangling placeholder UUID in shopify_connections.

CREATE OR REPLACE FUNCTION create_shopify_vault_secret(
  p_token text,
  p_name  text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  SELECT vault.create_secret(p_token, p_name, 'Shopify access token') INTO v_secret_id;
  RETURN v_secret_id;
END; $$;

REVOKE ALL ON FUNCTION create_shopify_vault_secret(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_shopify_vault_secret(text, text) TO service_role;
