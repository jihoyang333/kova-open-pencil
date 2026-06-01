-- W4 C-HIGH8: cron-safe claim function + claimed_at column for snapshot-prune.
-- Two concurrent / retried cron invocations cannot claim the same row (FOR UPDATE SKIP LOCKED),
-- so the subsequent Storage remove + DELETE cannot race or double-count failures.
ALTER TABLE public.canvas_snapshots
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_canvas_snapshots_prune_candidates
  ON public.canvas_snapshots(taken_at)
  WHERE retention_class = 'free' AND kind = 'autosave' AND claimed_at IS NULL;

-- W4 C-MED24: retention days is single-sourced in TS (@/config/feature-flags
-- SNAPSHOT_FREE_RETENTION_DAYS); the cron handler passes it as p_retention_days.
CREATE OR REPLACE FUNCTION public.claim_snapshots_for_prune(
  p_batch_size      int DEFAULT 1000,
  p_retention_days  int DEFAULT 30
)
RETURNS TABLE (id uuid, scene_blob_path text, thumbnail_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  UPDATE canvas_snapshots
  SET claimed_at = now()
  WHERE canvas_snapshots.id IN (
    SELECT cs.id
      FROM canvas_snapshots cs
     WHERE cs.retention_class = 'free'
       AND cs.kind = 'autosave'
       AND cs.taken_at < now() - make_interval(days => p_retention_days)
       AND cs.claimed_at IS NULL
     ORDER BY cs.taken_at
     LIMIT p_batch_size
     FOR UPDATE SKIP LOCKED
  )
  RETURNING canvas_snapshots.id, canvas_snapshots.scene_blob_path, canvas_snapshots.thumbnail_path;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_snapshots_for_prune(int, int) FROM public;
GRANT  EXECUTE ON FUNCTION public.claim_snapshots_for_prune(int, int) TO service_role;
