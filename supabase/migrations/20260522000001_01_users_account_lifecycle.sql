-- Migration 20260522_01_users_account_lifecycle
-- Cluster 01 Auth & Identity — schema for GDPR cascade + user preferences
-- Pairs with: 20260316_users.sql (creates public.users + base RLS)
--             20260521_11_idempotency_keys.sql (Cluster 11 idempotency primitive)
-- Refs: PRD 01 §4 + §5.2 + §5.3, Plan 01 Tasks 1 / 6c / 7

BEGIN;

-- ---- 1. users.deleted_at + preferences ----

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_users_pending_deletion
  ON public.users(deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.users.deleted_at IS
  'GDPR soft-delete timestamp. Set by request_account_deletion(); cleared by restore_account() within 30 days; hard-deleted by delete-account-cron after 30 days. Column-level GRANTs deny authenticated read+write — see C-LOW01.5.';
COMMENT ON COLUMN public.users.preferences IS
  'Cross-device user preferences JSONB (Q5 Layer 1). Consumed by Cluster 12 usePreferencesStore.';

-- C-LOW01.5: authenticated role must never SELECT or UPDATE users.deleted_at
-- directly. The only valid mutation path is via the SECURITY DEFINER RPCs.
REVOKE UPDATE (deleted_at) ON public.users FROM authenticated;
REVOKE SELECT (deleted_at) ON public.users FROM authenticated;

-- ---- 2. gdpr_deletion_queue (cron retry state) ----

CREATE TABLE IF NOT EXISTS public.gdpr_deletion_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  step            text NOT NULL CHECK (step IN ('stripe', 'shopify', 'anthropic', 'storage', 'db')),
  status          text NOT NULL CHECK (status IN ('pending', 'in_progress', 'succeeded', 'failed_terminal'))
                       DEFAULT 'pending',
  attempts        int  NOT NULL DEFAULT 0,
  queued_at       timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  succeeded_at    timestamptz,
  error           text,
  idempotency_key text,
  UNIQUE (user_id, step)
);

CREATE INDEX IF NOT EXISTS idx_gdpr_queue_pending
  ON public.gdpr_deletion_queue(status, queued_at)
  WHERE status IN ('pending', 'in_progress');

ALTER TABLE public.gdpr_deletion_queue ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gdpr_deletion_queue IS
  E'Step-by-step retry log for the GDPR delete-account cascade. '
  'One row per (user_id, step). Cron walks pending+in_progress rows daily; '
  'terminal failure caps at attempts >= 5. '
  'Access: service_role only (RLS bypassed by role); authenticated has no policy → deny by default.';

-- ---- 3. anthropic_deletion_log (Task 6c — operator manual-batch follow-up) ----

CREATE TABLE IF NOT EXISTS public.anthropic_deletion_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL CHECK (status IN ('queued_for_manual_request', 'submitted', 'confirmed_by_anthropic')) DEFAULT 'queued_for_manual_request',
  submitted_at timestamptz,
  confirmed_at timestamptz,
  notes        text
);

ALTER TABLE public.anthropic_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY anthropic_log_service_only
  ON public.anthropic_deletion_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.anthropic_deletion_log IS
  'Queue of users awaiting manual data-deletion request to Anthropic privacy@. '
  'Anthropic has no programmatic delete API; cron step anthropic enqueues here; '
  'operator runbook drains weekly per docs/operations/anthropic-manual-deletion-runbook.md.';

-- ---- 4. RPCs — request_account_deletion + restore_account ----

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id   uuid;
  v_scheduled timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  UPDATE public.users
     SET deleted_at = now()
   WHERE id = v_user_id
     AND deleted_at IS NULL
  RETURNING deleted_at + INTERVAL '30 days' INTO v_scheduled;

  IF v_scheduled IS NULL THEN
    RAISE EXCEPTION 'Already pending deletion or user not found' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.gdpr_deletion_queue (user_id, step) VALUES
    (v_user_id, 'stripe'),
    (v_user_id, 'shopify'),
    (v_user_id, 'anthropic'),
    (v_user_id, 'storage'),
    (v_user_id, 'db')
  ON CONFLICT (user_id, step) DO NOTHING;

  RETURN v_scheduled;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_updated int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  UPDATE public.users
     SET deleted_at = NULL
   WHERE id = v_user_id
     AND deleted_at IS NOT NULL
     AND deleted_at > now() - INTERVAL '30 days';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    DELETE FROM public.gdpr_deletion_queue
     WHERE user_id = v_user_id
       AND status = 'pending';
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_account() TO authenticated;

-- ---- 5. rate_limits + bump_rate_limit (B-CRIT8 — persistent across serverless isolates) ----

CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint     text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        int         NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON public.rate_limits(window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.rate_limits IS
  'Per-(user, endpoint, window_start) counter for Edge Function rate limiting. '
  'Service-role access only (RLS bypassed by role). Authenticated has no policy → deny by default. '
  '1-day TTL via cron prune (deferred — purge rows where window_start < now() - 1 day).';

CREATE OR REPLACE FUNCTION public.bump_rate_limit(
  p_user_id      uuid,
  p_endpoint     text,
  p_window_start timestamptz
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO public.rate_limits (user_id, endpoint, window_start, count)
  VALUES (p_user_id, p_endpoint, p_window_start, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_rate_limit(uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(uuid, text, timestamptz) TO service_role;

-- ---- 6. Cron RPCs (Task 7 — claim_deletion_queue_row + claim_pending_deletion_users) ----

-- C-MED1: SELECT FOR UPDATE SKIP LOCKED — atomic per-row claim for cron concurrency safety
CREATE OR REPLACE FUNCTION public.claim_deletion_queue_row(
  p_user_id uuid,
  p_step text,
  p_max_attempts int
)
RETURNS TABLE (id uuid, attempts int)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
BEGIN
  SELECT q.* INTO v_row
    FROM public.gdpr_deletion_queue q
   WHERE q.user_id = p_user_id
     AND q.step = p_step
     AND q.status IN ('pending', 'in_progress')
     AND q.attempts < p_max_attempts
   FOR UPDATE SKIP LOCKED;

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.gdpr_deletion_queue
     SET status = 'in_progress',
         attempts = attempts + 1,
         last_attempt_at = now()
   WHERE id = v_row.id;

  RETURN QUERY SELECT v_row.id, v_row.attempts + 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_deletion_queue_row(uuid, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_deletion_queue_row(uuid, text, int) TO service_role;

-- C-MED1: claim users whose 30-day soft-delete window has elapsed AND still
-- have pending/in_progress cascade steps. SKIP LOCKED prevents concurrent cron
-- isolates from claiming the same users.
CREATE OR REPLACE FUNCTION public.claim_pending_deletion_users(
  p_cutoff timestamptz,
  p_limit  int DEFAULT 100
)
RETURNS TABLE (user_id uuid, deletion_requested_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.deleted_at
    FROM public.users u
   WHERE u.deleted_at IS NOT NULL
     AND u.deleted_at < p_cutoff
     AND EXISTS (
       SELECT 1 FROM public.gdpr_deletion_queue q
        WHERE q.user_id = u.id
          AND q.status IN ('pending', 'in_progress')
     )
   ORDER BY u.deleted_at ASC
   LIMIT p_limit
   FOR UPDATE OF u SKIP LOCKED;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_pending_deletion_users(timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_deletion_users(timestamptz, int) TO service_role;

COMMIT;
