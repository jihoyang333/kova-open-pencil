-- ============================================================
-- Migration 20260603_12_user_preferences_rpc
-- Cluster 12 Settings / Accessibility / User Preferences
-- Pairs with: Cluster 01 (W8a) migration that ships users.preferences JSONB column.
-- ============================================================

BEGIN;

-- ---- update_user_pref: partial JSONB update via path-array ----
--
-- Caller passes a path like ARRAY['accessibility','textSize'] and a JSON value.
-- RPC writes via jsonb_set(create_missing := true), scoped to auth.uid().
-- SECURITY INVOKER — RLS on public.users (auth.uid() = id) is the auth gate.
--
-- Why path-based: avoids client-side read-modify-write. Concurrent toggles
-- to different slices don't collide.

CREATE OR REPLACE FUNCTION public.update_user_pref(p_path text[], p_value jsonb)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  UPDATE public.users
     SET preferences = jsonb_set(preferences, p_path, p_value, true)
   WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.update_user_pref(text[], jsonb) TO authenticated;

COMMENT ON FUNCTION public.update_user_pref IS
  'Cluster 12 partial pref update. p_path = JSONB key sequence (e.g. ARRAY[''accessibility'',''textSize'']). p_value = JSON-encoded new value. SECURITY INVOKER — RLS on users table enforces auth.uid() = id.';

COMMIT;
