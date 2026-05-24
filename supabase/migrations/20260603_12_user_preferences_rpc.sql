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
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Depth guard: the deepest valid pref path today is 3 segments (e.g.
  -- view.layoutGuide vs accessibility.textSize). 5 buys headroom for future
  -- nesting without allowing a client bug to silently bloat the row via
  -- jsonb_set(create_missing := true).
  IF p_path IS NULL OR array_length(p_path, 1) IS NULL OR array_length(p_path, 1) = 0 THEN
    RAISE EXCEPTION 'update_user_pref: p_path must be a non-empty text[]';
  END IF;
  IF array_length(p_path, 1) > 5 THEN
    RAISE EXCEPTION 'update_user_pref: p_path exceeds max depth (5)';
  END IF;

  UPDATE public.users
     SET preferences = jsonb_set(preferences, p_path, p_value, true)
   WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_pref(text[], jsonb) TO authenticated;

COMMENT ON FUNCTION public.update_user_pref IS
  'Cluster 12 partial pref update. p_path = JSONB key sequence (e.g. ARRAY[''accessibility'',''textSize'']). p_value = JSON-encoded new value. SECURITY INVOKER — RLS on users table enforces auth.uid() = id.';

COMMIT;
