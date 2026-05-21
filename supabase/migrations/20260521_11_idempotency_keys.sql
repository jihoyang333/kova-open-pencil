-- ============================================================================
-- W6 Cluster 11 Phase 5c — public.idempotency_keys table (Plan 11 Task 1.1)
-- ============================================================================
-- Authored: 2026-05-21 (post-audit_log shipped 2026-05-19 / 20260519_w1_audit_log.sql).
-- Companion table for the audit_log cross-cut: Edge Functions in
-- Clusters 01 (deletion-request, restore, email-change), 04 (Stripe webhook),
-- 09 (snapshot create) cache per-request idempotency keys here so retried
-- requests return the cached response instead of double-applying side effects.
--
-- Service-role only. Authenticated clients have NO read / write.
--
-- Body-hash policy: helper hashes the raw `req.text()` BYTES — does NOT
-- canonicalize JSON. Callers needing deterministic replay MUST serialize JSON
-- deterministically (stable key order, no incidental whitespace). Same key
-- with different body returns 422, not the cached response. See PRD 11 §5.5
-- + C-HIGH11 closure.
--
-- TTL: 24-hour retention. Pruned daily via api/cron/idempotency-cleanup.ts
-- (Plan 11 Task 1.8). Index on created_at supports the prune sweep.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key             text PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint        text NOT NULL,
  request_hash    text NOT NULL,
  response_status int  NOT NULL,
  response_body   jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (length(key) >= 16 AND length(key) <= 64)
);

-- TTL prune index — supports `DELETE FROM idempotency_keys WHERE created_at < ...`.
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
  ON public.idempotency_keys(created_at);

-- Per-user / per-endpoint debug lookup.
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_endpoint
  ON public.idempotency_keys(user_id, endpoint, created_at DESC);

COMMENT ON TABLE public.idempotency_keys IS
  'Per-request idempotency cache. Cross-cut primitive owned by Cluster 11. '
  'Consumed by Cluster 01 (deletion-request, restore, email-change), '
  'Cluster 04 (Stripe webhook), Cluster 09 (snapshot create). '
  'Retention 24 hours via daily prune cron.';

COMMENT ON COLUMN public.idempotency_keys.request_hash IS
  'sha256(method || ''|'' || path || ''|'' || bodyText). The verifyIdempotency() '
  'helper hashes the raw bodyText byte-for-byte — it does NOT canonicalize '
  'JSON. Clients that need deterministic replays MUST serialize JSON '
  'deterministically. Second call with same key but different bodyText returns '
  '422, not the cached response. See PRD 11 §5.5 + C-HIGH11.';

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY idempotency_service_only
  ON public.idempotency_keys
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
