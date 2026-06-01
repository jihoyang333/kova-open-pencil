-- ============================================================
-- Migration 20260615000001_09_canvas_snapshots
-- Cluster 09 Version History + Trash — snapshot table, RLS, RPCs, Storage bucket
-- Pairs with: 20260317000001_m2_dashboard.sql (canvases.trashed_at already exists)
--
-- NOTE (schema-correctness deviation from PRD §4.1):
--   The PRD SQL filtered `canvases.user_id` in create_snapshot + purge_canvas_snapshot_paths,
--   but the actual schema has no canvases.user_id column — canvas ownership is
--   canvas -> brand -> user. Both RPCs derive ownership via a brands join instead
--   (consistent with restore_snapshot, which already did). The snapshot row's user_id
--   is the acting user (auth.uid()), which equals the owner.
-- ============================================================

BEGIN;

-- ---- 1. canvas_snapshots table ----

CREATE TABLE IF NOT EXISTS public.canvas_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id           uuid NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
  brand_id            uuid NOT NULL REFERENCES public.brands(id)   ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES public.users(id),
  taken_at            timestamptz NOT NULL DEFAULT now(),
  kind                text NOT NULL CHECK (kind IN ('autosave','manual','pre_restore','disconnect','tab_close')),
  label               text,
  description         text,
  scene_blob_path     text NOT NULL,
  scene_size_bytes    bigint NOT NULL CHECK (scene_size_bytes > 0 AND scene_size_bytes <= 52428800),  -- 50 MB blob cap per 00d ratification
  thumbnail_path      text,
  parent_snapshot_id  uuid REFERENCES public.canvas_snapshots(id) ON DELETE SET NULL,
  format_version      int  NOT NULL DEFAULT 1,
  retention_class     text NOT NULL DEFAULT 'free' CHECK (retention_class IN ('free','paid','permanent'))
);

COMMENT ON TABLE public.canvas_snapshots IS
  'Per-canvas Yjs document snapshots (Kiwi-encoded + Zstd-compressed). Q7 Figma-exact: 30-min autosave + manual + pre-restore + disconnect + tab-close kinds. Retention: free-tier autosaves prune at 30 days; manual + pre_restore + paid-tier autosaves kept forever. Bytes live in Storage bucket canvas-snapshots; this row carries the path only.';

COMMENT ON COLUMN public.canvas_snapshots.kind IS
  'Trigger that produced the snapshot. autosave = 30-min heartbeat; manual = user pressed Alt+Cmd+S (named); pre_restore = automatic backup taken at the start of a restore operation; disconnect = navigator.onLine flipped offline; tab_close = beforeunload final snap.';

COMMENT ON COLUMN public.canvas_snapshots.retention_class IS
  'Prune-cron filter. free = autosave on free-tier user -> 30-day prune. paid = autosave on paid-tier user -> kept forever. permanent = manual, pre_restore, disconnect, tab_close -> kept forever regardless of plan. Set by create_snapshot at insert time; Cluster 04 Stripe webhook bulk-updates free->paid on plan upgrade.';

-- ---- 2. Indexes ----

CREATE INDEX IF NOT EXISTS idx_canvas_snapshots_canvas_taken
  ON public.canvas_snapshots(canvas_id, taken_at DESC);
COMMENT ON INDEX idx_canvas_snapshots_canvas_taken IS
  'Powers the right-panel timeline list query (list_snapshots -> SELECT ... WHERE canvas_id = $1 ORDER BY taken_at DESC).';

CREATE INDEX IF NOT EXISTS idx_canvas_snapshots_brand
  ON public.canvas_snapshots(brand_id);
COMMENT ON INDEX idx_canvas_snapshots_brand IS
  'Powers per-brand quota arithmetic in create_snapshot (SELECT SUM(scene_size_bytes) ... WHERE brand_id = $1).';

CREATE INDEX IF NOT EXISTS idx_canvas_snapshots_prune
  ON public.canvas_snapshots(taken_at)
  WHERE retention_class = 'free' AND kind = 'autosave';
COMMENT ON INDEX idx_canvas_snapshots_prune IS
  'Partial index — only free-tier autosaves are pruning candidates. Keeps prune-cron index scan small.';

CREATE INDEX IF NOT EXISTS idx_canvas_snapshots_user_for_account_cascade
  ON public.canvas_snapshots(user_id);
COMMENT ON INDEX idx_canvas_snapshots_user_for_account_cascade IS
  'Powers Cluster 01 delete-account-cron storage step (enumerate user-owned blob paths).';

-- ---- 3. RLS ----

ALTER TABLE public.canvas_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY snapshots_select
  ON public.canvas_snapshots
  FOR SELECT
  TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

-- All writes go through SECURITY DEFINER RPCs (create_snapshot / restore_snapshot / rename_snapshot).
-- These negative policies block any client-side bypass attempt.
CREATE POLICY snapshots_insert_blocked
  ON public.canvas_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY snapshots_update_blocked
  ON public.canvas_snapshots
  FOR UPDATE
  TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY snapshots_delete_blocked
  ON public.canvas_snapshots
  FOR DELETE
  TO authenticated
  USING (false);

-- ---- 4. RPCs (SECURITY DEFINER) ----

-- 4a. create_snapshot — enforces 100 MB per-brand quota; assigns retention_class.
--     W4 C-MED23: accepts optional p_id so callers (e.g. duplicate-to-canvas) can pre-generate
--     the snapshot UUID, use it in the Storage path, and INSERT with the same value.
CREATE OR REPLACE FUNCTION public.create_snapshot(
  p_canvas_id       uuid,
  p_kind            text,
  p_label           text,
  p_description     text,
  p_scene_blob_path text,
  p_scene_size_bytes bigint,
  p_thumbnail_path  text,
  p_parent_snapshot_id uuid,
  p_id              uuid DEFAULT gen_random_uuid()  -- W4 C-MED23
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id          uuid;
  v_brand_id         uuid;
  v_plan             text;
  v_retention_class  text;
  v_total_size       bigint;
  v_snapshot_id      uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Verify canvas ownership (canvas -> brand -> user); pin brand_id.
  SELECT c.brand_id INTO v_brand_id
    FROM public.canvases c
    JOIN public.brands b ON b.id = c.brand_id
   WHERE c.id = p_canvas_id
     AND b.user_id = v_user_id
     AND c.trashed_at IS NULL;  -- Cannot snapshot a trashed canvas
  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Canvas not found or not owned' USING ERRCODE = 'P0002';
  END IF;

  -- Per-brand quota: 100 MB MVP (00d ratification)
  SELECT COALESCE(SUM(scene_size_bytes), 0) INTO v_total_size
    FROM public.canvas_snapshots
   WHERE brand_id = v_brand_id;
  IF v_total_size + p_scene_size_bytes > 100 * 1024 * 1024 THEN
    RAISE EXCEPTION 'quota_exceeded' USING ERRCODE = 'P0001';
  END IF;

  -- Resolve retention_class: kind != 'autosave' -> permanent;
  -- kind == 'autosave' -> plan-derived (free | paid)
  IF p_kind = 'autosave' THEN
    SELECT plan INTO v_plan FROM public.users WHERE id = v_user_id;
    v_retention_class := CASE WHEN v_plan = 'free' OR v_plan IS NULL THEN 'free' ELSE 'paid' END;
  ELSE
    v_retention_class := 'permanent';
  END IF;

  INSERT INTO public.canvas_snapshots
    (id, canvas_id, brand_id, user_id, taken_at, kind, label, description,
     scene_blob_path, scene_size_bytes, thumbnail_path, parent_snapshot_id, retention_class)
  VALUES
    (p_id, p_canvas_id, v_brand_id, v_user_id, now(), p_kind, p_label, p_description,
     p_scene_blob_path, p_scene_size_bytes, p_thumbnail_path, p_parent_snapshot_id, v_retention_class)
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

-- 4b. restore_snapshot — atomic: pre-restore snap of current state, then return target blob path
CREATE OR REPLACE FUNCTION public.restore_snapshot(
  p_target_snapshot_id           uuid,
  p_current_scene_blob_path      text,
  p_current_scene_size_bytes     bigint,
  p_current_thumbnail_path       text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id           uuid;
  v_canvas_id         uuid;
  v_target_blob_path  text;
  v_pre_restore_id    uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Verify target snapshot ownership + read its canvas_id + blob path
  SELECT s.canvas_id, s.scene_blob_path INTO v_canvas_id, v_target_blob_path
    FROM public.canvas_snapshots s
    JOIN public.brands b ON b.id = s.brand_id
   WHERE s.id = p_target_snapshot_id
     AND b.user_id = v_user_id;
  IF v_canvas_id IS NULL THEN
    RAISE EXCEPTION 'Snapshot not found or not owned' USING ERRCODE = 'P0002';
  END IF;

  -- Pre-restore snapshot of current state — kind = 'pre_restore', retention = permanent
  v_pre_restore_id := public.create_snapshot(
    v_canvas_id,
    'pre_restore',
    'Auto-saved before restore',
    NULL,
    p_current_scene_blob_path,
    p_current_scene_size_bytes,
    p_current_thumbnail_path,
    p_target_snapshot_id
  );

  -- Client downloads v_target_blob_path from Storage + swaps Yjs document.
  RETURN v_target_blob_path;
END;
$$;

-- 4c. rename_snapshot — handles "Name this version" (set label+description) AND
--     "Delete version info" (clear label+description). Pass NULL to clear.
CREATE OR REPLACE FUNCTION public.rename_snapshot(
  p_snapshot_id  uuid,
  p_label        text,
  p_description  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id  uuid;
  v_updated  int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  UPDATE public.canvas_snapshots
     SET label = p_label,
         description = p_description
   WHERE id = p_snapshot_id
     AND brand_id IN (SELECT id FROM public.brands WHERE user_id = v_user_id);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Snapshot not found or not owned' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- 4d. purge_canvas_snapshot_paths — helper for Cluster 02's canvas-permanent-delete flow.
-- Returns Storage object paths the caller must delete BEFORE deleting the canvas row.
-- Ownership derived via canvas -> brand -> user (no canvases.user_id column exists).
CREATE OR REPLACE FUNCTION public.purge_canvas_snapshot_paths(
  p_canvas_id uuid
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_owned   boolean;
  v_paths   text[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.canvases c
      JOIN public.brands b ON b.id = c.brand_id
     WHERE c.id = p_canvas_id AND b.user_id = v_user_id
  ) INTO v_owned;
  IF NOT v_owned THEN
    RAISE EXCEPTION 'Canvas not found or not owned' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(array_agg(scene_blob_path), '{}')
       || COALESCE(array_agg(thumbnail_path) FILTER (WHERE thumbnail_path IS NOT NULL), '{}')
    INTO v_paths
    FROM public.canvas_snapshots
   WHERE canvas_id = p_canvas_id;

  RETURN v_paths;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_snapshot(uuid, text, text, text, text, bigint, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_snapshot(uuid, text, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_snapshot(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_canvas_snapshot_paths(uuid) TO authenticated;

-- ---- 5. Test-helper RPCs (read-only meta; safe in prod) ----

CREATE OR REPLACE FUNCTION public.pg_get_columns(p_table text)
RETURNS TABLE (name text, data_type text, is_nullable text)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT column_name::text, data_type::text, is_nullable::text
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_table
   ORDER BY ordinal_position
$$;

CREATE OR REPLACE FUNCTION public.pg_get_indexes(p_table text)
RETURNS TABLE (indexname text)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT indexname::text FROM pg_indexes WHERE schemaname = 'public' AND tablename = p_table
$$;

GRANT EXECUTE ON FUNCTION public.pg_get_columns(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pg_get_indexes(text) TO authenticated, service_role;

COMMIT;

-- ---- 6. Storage bucket (outside the txn block; storage.* objects own their own policies) ----

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('canvas-snapshots', 'canvas-snapshots', false, 52428800,
        ARRAY['application/octet-stream', 'image/png'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "canvas-snapshots: select own" ON storage.objects;
CREATE POLICY "canvas-snapshots: select own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'canvas-snapshots'
     AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "canvas-snapshots: insert own" ON storage.objects;
CREATE POLICY "canvas-snapshots: insert own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'canvas-snapshots'
          AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "canvas-snapshots: delete own" ON storage.objects;
CREATE POLICY "canvas-snapshots: delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'canvas-snapshots'
     AND (storage.foldername(name))[1] = auth.uid()::text);
