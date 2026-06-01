-- ============================================================
-- W8b Cluster 04 audit fix (H-2)
--
-- The original 20260605 migration shipped user_has_active_plan as
--   SELECT plan_status = 'active' AND ...
-- which excluded 'trialing' users despite CT-008 founder lock and the rest of
-- the code (useBillingStore.isTrialing, TrialBanner, daysUntilTrialEnds, the
-- 5-value PLAN_STATUS_VALUES constant) all treating trialing as a first-class
-- state. When trials flip on this denies access to all trial users.
--
-- Fix: include 'trialing' alongside 'active' in the RPC predicate.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.user_has_active_plan(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT plan_status IN ('active', 'trialing')
     AND (current_period_end IS NULL OR current_period_end > now())
    FROM public.users
   WHERE id = p_user_id;
$$;

COMMENT ON FUNCTION public.user_has_active_plan(uuid) IS
  'Returns true if the user has an active or trialing subscription whose period is still valid. Used by usePlanGate composable (stubbed open for everything at MVP until founder activates pricing). 2026-06-06 audit fix H-2: include trialing alongside active.';

COMMIT;
