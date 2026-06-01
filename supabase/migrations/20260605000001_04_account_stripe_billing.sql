-- ============================================================
-- PRD 04 — Account Page + Stripe Billing
-- - users: Stripe + avatar columns
-- - stripe_webhook_events (idempotency log)
-- - shopify_connection_history (M9 audit D-8 fix)
-- - RPCs: user_has_active_plan, log_shopify_connection_event
-- - RLS policies
-- ============================================================

BEGIN;

-- ---- 1. users Stripe + avatar columns ----

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_status            text NOT NULL DEFAULT 'active'
                            CHECK (plan_status IN ('active', 'past_due', 'cancelled', 'incomplete', 'trialing')),
  ADD COLUMN IF NOT EXISTS current_period_end     timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_storage_path    text NULL;

-- The plan column already exists from 20260316_users.sql as TEXT DEFAULT 'free'
-- (no CHECK constraint). Tighten with CHECK + NOT NULL via separate ALTERs so the
-- IF NOT EXISTS guard above is not silently bypassed.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'users_plan_check'
       AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'solo', 'agency'));
  END IF;
END $$;

ALTER TABLE public.users ALTER COLUMN plan SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer
  ON public.users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_past_due
  ON public.users(plan_status, current_period_end)
  WHERE plan_status = 'past_due';

COMMENT ON COLUMN public.users.stripe_customer_id IS
  'Stripe Customer ID (cus_…). One-per-user. Deleted from Stripe on account-deletion via Cluster 01 GDPR cron (D-2 amended 2026-05-17). NULL until first Checkout completes.';
COMMENT ON COLUMN public.users.plan IS
  'Current plan tier. CHECK in (free, solo, agency); founder activates pricing post-launch.';
COMMENT ON COLUMN public.users.plan_status IS
  'Stripe subscription lifecycle. CHECK includes "trialing" (founder decision 2026-05-17). Trial UI scaffold ships hidden at MVP per PRD 04 §3.4.';
COMMENT ON COLUMN public.users.avatar_storage_path IS
  'Storage path within media-assets bucket (e.g., users/{user_id}/avatar.png). NULL = default initials avatar.';

-- ---- 2. stripe_webhook_events (idempotency log) ----

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id      text PRIMARY KEY,
  type          text NOT NULL,
  processed_at  timestamptz NOT NULL DEFAULT now(),
  payload_hash  text,
  user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  outcome       text NOT NULL DEFAULT 'processed'
                  CHECK (outcome IN ('processed', 'duplicate', 'unhandled_type', 'error')),
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_recent
  ON public.stripe_webhook_events(processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_events_user
  ON public.stripe_webhook_events(user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.stripe_webhook_events IS
  'Idempotency log for Stripe webhooks. PRIMARY KEY on event.id prevents double-process. Retained 90 days (manual prune in PRD 04 Phase B).';

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stripe_events_service_only ON public.stripe_webhook_events;
CREATE POLICY stripe_events_service_only
  ON public.stripe_webhook_events
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ---- 3. shopify_connection_history (audit D-8 fix) ----

CREATE TABLE IF NOT EXISTS public.shopify_connection_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  event_type   text NOT NULL
                 CHECK (event_type IN (
                   'connected',
                   'disconnected',
                   'scope_changed',
                   'sync_started',
                   'sync_completed',
                   'sync_failed',
                   'reauthorize_required'
                 )),
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  source       text NOT NULL
                 CHECK (source IN ('user', 'system', 'webhook')),
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_shopify_history_brand_time
  ON public.shopify_connection_history(brand_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopify_history_event_type
  ON public.shopify_connection_history(event_type, occurred_at DESC);

COMMENT ON TABLE public.shopify_connection_history IS
  'Per-brand Shopify connection + sync audit trail. Powers the sync-history accordion in /account/integrations (audit D-8 fix). FK CASCADE deletes on brand removal.';

ALTER TABLE public.shopify_connection_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shopify_history_read_own ON public.shopify_connection_history;
CREATE POLICY shopify_history_read_own
  ON public.shopify_connection_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = shopify_connection_history.brand_id
        AND brands.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shopify_history_write_service ON public.shopify_connection_history;
CREATE POLICY shopify_history_write_service
  ON public.shopify_connection_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ---- 4. RPCs ----

-- 4a. Plan-gate helper (SECURITY DEFINER, read-only)
CREATE OR REPLACE FUNCTION public.user_has_active_plan(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT plan_status = 'active'
     AND (current_period_end IS NULL OR current_period_end > now())
    FROM public.users
   WHERE id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_active_plan(uuid) TO authenticated;

COMMENT ON FUNCTION public.user_has_active_plan(uuid) IS
  'Returns true if the user has an active subscription whose period is still valid. Used by usePlanGate composable at MVP (stubbed open for everything until founder activates pricing).';

-- 4b. Shopify history-log helper (SECURITY DEFINER; callable by service_role only)
CREATE OR REPLACE FUNCTION public.log_shopify_connection_event(
  p_brand_id   uuid,
  p_event_type text,
  p_source     text,
  p_metadata   jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.shopify_connection_history(brand_id, event_type, source, metadata)
       VALUES (p_brand_id, p_event_type, p_source, p_metadata)
    RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_shopify_connection_event(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_shopify_connection_event(uuid, text, text, jsonb) TO service_role;

COMMENT ON FUNCTION public.log_shopify_connection_event IS
  'Edge Functions and cron jobs call this to write a connection-history row. Service-role only; never user-callable.';

COMMIT;
