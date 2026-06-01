-- ============================================================
-- W8b Cluster 04 audit fix (M-1)
--
-- useBrandPicker.selectBrand did a read-modify-write on users.preferences
-- (SELECT preferences → spread → UPDATE). Two concurrent updates clobber.
--
-- Fix: atomic server-side jsonb_set RPC. Caller passes (key, value); the
-- function patches just that key into the user's preferences row, preserving
-- siblings and avoiding lost-update races.
--
-- SECURITY DEFINER + auth.uid() lookup → no parameter for user_id; the
-- function only ever mutates the caller's own row. Bound to 'authenticated'.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.set_user_preference(
  p_key   text,
  p_value jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_key IS NULL OR length(p_key) = 0 THEN
    RAISE EXCEPTION 'key_required' USING ERRCODE = '22023';
  END IF;
  IF length(p_key) > 64 THEN
    RAISE EXCEPTION 'key_too_long' USING ERRCODE = '22023';
  END IF;

  UPDATE public.users
     SET preferences = jsonb_set(
           coalesce(preferences, '{}'::jsonb),
           ARRAY[p_key],
           p_value,
           true
         )
   WHERE id = v_uid
   RETURNING preferences INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_preference(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_preference(text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.set_user_preference(text, jsonb) IS
  'Atomic single-key preference write. Patches caller''s users.preferences row via jsonb_set; preserves sibling keys. Avoids read-modify-write races (audit M-1, 2026-06-06). Use for any per-user preference write that does not span multiple keys.';

COMMIT;
