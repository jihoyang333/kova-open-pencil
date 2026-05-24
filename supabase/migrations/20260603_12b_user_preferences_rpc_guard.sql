-- ============================================================
-- Migration 20260603_12b_user_preferences_rpc_guard
-- Cluster 12 Settings — audit follow-up (L10).
--
-- Wraps update_user_pref with bounded-depth + non-empty path guards so a
-- client bug passing a malformed/oversized path can't silently bloat the
-- preferences JSONB column. Switches LANGUAGE from sql → plpgsql for the
-- RAISE EXCEPTION control flow.
--
-- Depth cap of 5 covers every valid path under PRD 12 preferences shape
-- (accessibility/notifications/view/snap/defaults/ai are flat-or-2-deep
-- today; bumping to 5 leaves room for one nested extension without
-- another migration).
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.update_user_pref(p_path text[], p_value jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_path IS NULL OR array_length(p_path, 1) IS NULL THEN
    RAISE EXCEPTION 'update_user_pref: p_path empty' USING ERRCODE = '22023';
  END IF;
  IF array_length(p_path, 1) > 5 THEN
    RAISE EXCEPTION 'update_user_pref: p_path too deep (>5)' USING ERRCODE = '22023';
  END IF;

  UPDATE public.users
     SET preferences = jsonb_set(coalesce(preferences, '{}'::jsonb), p_path, p_value, true)
   WHERE id = auth.uid();
END;
$$;

COMMENT ON FUNCTION public.update_user_pref(text[], jsonb) IS
  'Cluster 12 partial pref update (audit L10 guard). p_path = JSONB key sequence, max 5 elements, non-empty. p_value = JSON-encoded new value. SECURITY INVOKER — RLS on users table enforces auth.uid() = id. Switched to plpgsql for RAISE EXCEPTION.';

COMMIT;
