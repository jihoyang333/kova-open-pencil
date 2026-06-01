-- ============================================================================
-- W1 Cluster 11 / W0-1 — public.audit_log table (founder lock #11)
-- ============================================================================
-- Dispatch: docs/kova-final-qa/fix-dispatch/FIX-W1-cluster-11.md (CT-001)
-- Authored: 2026-05-19
--
-- Append-only event log. Cross-cut primitive owned by Cluster 11.
-- Consumed via writeAudit() helper (api/_shared/audit.ts) by:
--   Cluster 01 — deletion-request / restore / email-change
--   Cluster 03 — brand CRUD
--   Cluster 04 — Stripe webhook events
--   Cluster 05 — voice-draft confirm
-- Service-role only. Authenticated clients have no SELECT/INSERT/UPDATE/DELETE.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES public.users(id) ON DELETE CASCADE,
  event_type     text NOT NULL,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  cluster_owner  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_event
  ON public.audit_log(user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_cluster_created
  ON public.audit_log(cluster_owner, created_at DESC);

COMMENT ON TABLE public.audit_log IS
  'Append-only event log. Cross-cut primitive owned by Cluster 11 (founder lock #11). '
  'Consumed via writeAudit() helper by Cluster 01 (deletion-request / restore / '
  'email-change), Cluster 03 (brand CRUD), Cluster 04 (Stripe webhook events), '
  'Cluster 05 (voice-draft confirm). Service-role only — no authenticated SELECT.';

COMMENT ON COLUMN public.audit_log.cluster_owner IS
  'Denormalized cluster identifier (e.g. ''01'', ''03'') for debugging which '
  'cluster wrote the row. Not enforced as FK.';

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Service-role only. The authenticated role has no policy → RLS denies by default.
CREATE POLICY audit_log_service_only
  ON public.audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
