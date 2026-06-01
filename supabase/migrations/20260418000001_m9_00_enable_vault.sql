-- Enable Supabase Vault (wraps pgsodium) for encrypted secret storage.
CREATE EXTENSION IF NOT EXISTS "supabase_vault" CASCADE;

-- Smoke test: create + read + delete a secret to prove the extension works.
DO $$
DECLARE
  v_id uuid;
  v_val text;
BEGIN
  SELECT vault.create_secret('kova_vault_smoke_test_value', 'kova_vault_smoke', 'M9 vault smoke test') INTO v_id;
  SELECT decrypted_secret INTO v_val FROM vault.decrypted_secrets WHERE id = v_id;
  IF v_val <> 'kova_vault_smoke_test_value' THEN
    RAISE EXCEPTION 'Vault smoke test failed: decrypted value mismatch';
  END IF;
  -- vault.delete_secret() was removed in newer supabase_vault; delete the row directly.
  DELETE FROM vault.secrets WHERE id = v_id;
END $$;
