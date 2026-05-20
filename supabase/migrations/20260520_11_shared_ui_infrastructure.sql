-- ============================================================================
-- Cluster 11 — Shared UI Infrastructure
-- ============================================================================
-- Ships:
--   * public.idempotency_keys  (this migration)
--   * public.audit_log         (already shipped via 20260519_w1_audit_log.sql
--                              per W1 dispatch / founder lock #11; not
--                              re-created here because PostgreSQL has no
--                              CREATE POLICY IF NOT EXISTS, which would make
--                              this migration non-idempotent against a DB
--                              that already has the W1 row)
--
-- audit_log + idempotency_keys are append-only service-role-only tables.
-- The Cluster 11 helpers `writeAudit()` and `verifyIdempotency()` are the
-- only sanctioned writers from app code (Clusters 01, 03, 04, 05, 09, 11).
-- ============================================================================

BEGIN;

-- ---- idempotency_keys -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key             text PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint        text NOT NULL,
  request_hash    text NOT NULL,
  response_status integer NOT NULL,
  response_body   jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT idempotency_keys_key_length_check
    CHECK (length(key) >= 16 AND length(key) <= 64)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
  ON public.idempotency_keys(created_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_endpoint
  ON public.idempotency_keys(user_id, endpoint, created_at DESC);

COMMENT ON TABLE public.idempotency_keys IS
  'Per-request idempotency cache. Cluster 11. Retention 24 hours via daily prune (api/cron/idempotency-cleanup.ts). Service-role only.';

COMMENT ON COLUMN public.idempotency_keys.key IS
  'Client-supplied idempotency key. 16-64 chars matching ^[a-zA-Z0-9_-]+$ '
  'enforced by verifyIdempotency() helper plus the length CHECK on this column '
  '(B-MED18 closure).';

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY idempotency_service_only
  ON public.idempotency_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Default supabase grants stop at schema usage. Tables created in plain SQL
-- migrations need an explicit grant for the service role to run INSERT/UPDATE/
-- DELETE through PostgREST (anon/authenticated rely on RLS-empty = denied).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.idempotency_keys TO service_role;

COMMIT;
