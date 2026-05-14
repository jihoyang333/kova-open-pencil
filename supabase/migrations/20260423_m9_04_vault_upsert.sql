-- M9 · Make create_shopify_vault_secret idempotent
-- Re-auth and retry flows produce duplicate names. Update in place instead of failing.

CREATE OR REPLACE FUNCTION create_shopify_vault_secret(
  p_token text,
  p_name  text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  SELECT id INTO v_secret_id FROM vault.secrets WHERE name = p_name;
  IF v_secret_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_secret_id, p_token, p_name, 'Shopify access token');
  ELSE
    SELECT vault.create_secret(p_token, p_name, 'Shopify access token') INTO v_secret_id;
  END IF;
  RETURN v_secret_id;
END; $$;

REVOKE ALL ON FUNCTION create_shopify_vault_secret(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_shopify_vault_secret(text, text) TO service_role;
