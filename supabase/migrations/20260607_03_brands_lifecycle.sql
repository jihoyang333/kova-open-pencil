-- ============================================================
-- Migration 20260607_03_brands_lifecycle
-- Cluster 03 Brand Management — archive + restore + delete + color tint + slug + url
-- Per docs/kova-final-prds/03-brand-management.md §4 + §5.2
-- All RPCs are SECURITY DEFINER with SET search_path = public, pg_temp
--   (W0-5 / CT-013 founder lock #15)
-- ============================================================

BEGIN;

-- ---- 1. Add lifecycle + display columns ----

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'coral'
    CHECK (color IN ('coral', 'violet', 'sage', 'sand', 'graphite')),
  ADD COLUMN IF NOT EXISTS color_assigned_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS slug text NULL,
  ADD COLUMN IF NOT EXISTS url text NULL,
  ADD COLUMN IF NOT EXISTS description text NULL;

-- W9b audit M3: defence-in-depth URL length cap so a service-role write cannot
-- bypass the create_brand RPC's validation and store an unbounded URL.
ALTER TABLE public.brands
  DROP CONSTRAINT IF EXISTS brands_url_length_chk;
ALTER TABLE public.brands
  ADD CONSTRAINT brands_url_length_chk
  CHECK (url IS NULL OR length(url) <= 2048);

COMMENT ON COLUMN public.brands.archived_at IS
  'Soft-archive timestamp. Set by archive_brand(); cleared by restore_brand(). NOT a soft-delete — brand stays queryable; UI filters it from active lists. Restored from /account/brands (B12).';
COMMENT ON COLUMN public.brands.color IS
  'Auto-assigned palette tint at create-time. Stable across renames. User-overridable Phase 2.';
COMMENT ON COLUMN public.brands.color_assigned_at IS
  'Set when color is first assigned (NOT NULL means deterministic seed has run). Guards backfill idempotency.';
COMMENT ON COLUMN public.brands.slug IS
  'URL-safe derivative of name at create-time. Immutable after creation per A4.1 lock.';
COMMENT ON COLUMN public.brands.url IS
  'Display website URL captured at A3.a step 1.';
COMMENT ON COLUMN public.brands.description IS
  'Optional one-liner captured at A3.a step 1.';

-- ---- 2. Slug uniqueness per user ----
-- Slug is immutable after creation so an UPDATE conflict is impossible; index protects INSERTs.

CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_slug_per_user
  ON public.brands(user_id, slug)
  WHERE slug IS NOT NULL;

-- ---- 3. Hot-path index for "list my active brands" ----

CREATE INDEX IF NOT EXISTS idx_brands_active_per_user
  ON public.brands(user_id, updated_at DESC)
  WHERE archived_at IS NULL;

-- W9b audit M1: covering index for list_archived_brands access pattern.
CREATE INDEX IF NOT EXISTS idx_brands_archived_per_user
  ON public.brands(user_id, archived_at DESC)
  WHERE archived_at IS NOT NULL;

-- W9b audit M2: slug immutability trigger. The slug column has a "immutable
-- after creation" comment but nothing enforced it at the DB level; a service-
-- role UPDATE or a future RPC could silently change it. Guard via BEFORE
-- UPDATE trigger so URL routing built on slugs cannot drift.
CREATE OR REPLACE FUNCTION public.tg_brands_slug_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.slug IS NOT NULL AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'slug_immutable' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brands_slug_immutable ON public.brands;
CREATE TRIGGER brands_slug_immutable
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_brands_slug_immutable();

-- ---- 4. Backfill color + slug for existing rows ----
-- Idempotent: only rows whose color hasn't been assigned by this migration
-- get re-seeded. Rows already migrated (color_assigned_at IS NOT NULL) are skipped.

UPDATE public.brands
SET color = (ARRAY['coral','violet','sage','sand','graphite'])[
              (abs(hashtext(id::text)) % 5) + 1
            ],
    color_assigned_at = now()
WHERE color_assigned_at IS NULL;

UPDATE public.brands
SET slug = regexp_replace(lower(btrim(name)), '[^a-z0-9]+', '-', 'g')
WHERE slug IS NULL;

-- Resolve any backfill slug collisions (older rows might generate same slug).
DO $backfill_collision$
DECLARE
  v_row RECORD;
  v_attempt text;
  v_suffix int;
BEGIN
  FOR v_row IN
    SELECT user_id, slug
    FROM public.brands
    WHERE slug IS NOT NULL
    GROUP BY user_id, slug
    HAVING count(*) > 1
  LOOP
    v_suffix := 0;
    -- Walk dupes for this user+slug; keep oldest, suffix the rest
    FOR v_attempt IN
      SELECT id::text
      FROM public.brands
      WHERE user_id = v_row.user_id AND slug = v_row.slug
      ORDER BY created_at ASC
      OFFSET 1
    LOOP
      v_suffix := v_suffix + 1;
      UPDATE public.brands
      SET slug = v_row.slug || '-' || v_suffix::text
      WHERE id = v_attempt::uuid;
    END LOOP;
  END LOOP;
END $backfill_collision$;

-- ============================================================
-- RPCs — SECURITY DEFINER with search_path lock (W0-5)
-- Granted to authenticated. Each re-enforces auth.uid() defense-in-depth.
-- ============================================================

-- ---- create_brand: insert + auto-assign color + derive slug ----

CREATE OR REPLACE FUNCTION public.create_brand(
  p_name        text,
  p_url         text DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS public.brands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_palette      text[] := ARRAY['coral','violet','sage','sand','graphite'];
  v_count        int;
  v_color        text;
  v_slug_attempt text;
  v_slug         text;
  v_suffix       int := 0;
  v_brand        public.brands;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name_required' USING ERRCODE = '22023';
  END IF;
  IF length(p_name) > 80 THEN RAISE EXCEPTION 'name_too_long' USING ERRCODE = '22023'; END IF;
  IF p_description IS NOT NULL AND length(p_description) > 200 THEN
    RAISE EXCEPTION 'description_too_long' USING ERRCODE = '22023';
  END IF;

  -- Color: deterministic per user's existing brand count (stable + visually balanced)
  SELECT count(*) INTO v_count FROM public.brands WHERE user_id = v_user_id;
  v_color := v_palette[(v_count % 5) + 1];

  -- Slug: derive + suffix on collision per-user
  v_slug_attempt := regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g');
  v_slug_attempt := btrim(v_slug_attempt, '-');
  IF v_slug_attempt = '' THEN v_slug_attempt := 'brand'; END IF;
  v_slug := v_slug_attempt;
  WHILE EXISTS (SELECT 1 FROM public.brands WHERE user_id = v_user_id AND slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_slug_attempt || '-' || v_suffix::text;
  END LOOP;

  -- W9b audit H2: the WHILE-EXISTS loop above and the INSERT below are NOT
  -- atomic. Two concurrent same-user same-name creates can both pick the
  -- same slug, surface as Postgres unique-violation (23505). Catch it and
  -- raise a clean 'slug_collision' ERRCODE so the Edge Function can retry
  -- with a fresh idempotency-key (the next attempt picks a different
  -- suffix because the winning row now occupies the previous slug).
  BEGIN
    INSERT INTO public.brands (user_id, name, slug, url, description, color, color_assigned_at)
    VALUES (v_user_id, btrim(p_name), v_slug, p_url, p_description, v_color, now())
    RETURNING * INTO v_brand;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'slug_collision' USING ERRCODE = '40001';
  END;

  RETURN v_brand;
END;
$$;

-- ---- rename_brand: name only; slug immutable ----

CREATE OR REPLACE FUNCTION public.rename_brand(
  p_brand_id uuid,
  p_name     text
) RETURNS public.brands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_brand   public.brands;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name_required' USING ERRCODE = '22023';
  END IF;
  IF length(p_name) > 80 THEN RAISE EXCEPTION 'name_too_long' USING ERRCODE = '22023'; END IF;

  UPDATE public.brands
  SET name = btrim(p_name), updated_at = now()
  WHERE id = p_brand_id AND user_id = v_user_id
  RETURNING * INTO v_brand;

  IF v_brand.id IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  RETURN v_brand;
END;
$$;

-- ---- archive_brand: sets archived_at; rejects double-archive ----

CREATE OR REPLACE FUNCTION public.archive_brand(p_brand_id uuid)
RETURNS public.brands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_brand   public.brands;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;

  UPDATE public.brands
  SET archived_at = now()
  WHERE id = p_brand_id AND user_id = v_user_id AND archived_at IS NULL
  RETURNING * INTO v_brand;

  IF v_brand.id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'already_archived' USING ERRCODE = 'P0001';
    ELSE
      RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
    END IF;
  END IF;
  RETURN v_brand;
END;
$$;

-- ---- restore_brand: REAL — clears archived_at; rejects not_archived ----
-- MVP per 2026-05-17 reversal (PRD §12.10).
-- W9b audit H3: 'brand.restored' audit row is written INSIDE the RPC (not via
-- the Edge Function's writeAudit) so a post-commit Edge crash cannot lose
-- the audit. SECURITY DEFINER executes as the function owner (postgres) which
-- bypasses audit_log's service-role-only RLS policy. The Edge Function no
-- longer fires a duplicate writeAudit for the same event.

CREATE OR REPLACE FUNCTION public.restore_brand(p_brand_id uuid)
RETURNS public.brands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_brand   public.brands;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;

  UPDATE public.brands
  SET archived_at = NULL, updated_at = now()
  WHERE id = p_brand_id AND user_id = v_user_id AND archived_at IS NOT NULL
  RETURNING * INTO v_brand;

  IF v_brand.id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'not_archived' USING ERRCODE = 'P0001';
    END IF;
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  -- W9b audit H3: write audit row atomically with the restore so an Edge
  -- crash can never lose the audit. Same transaction as the UPDATE above.
  INSERT INTO public.audit_log (user_id, event_type, payload, cluster_owner)
  VALUES (
    v_user_id,
    'brand.restored',
    jsonb_build_object('brand_id', v_brand.id, 'name', v_brand.name),
    '03'
  );

  RETURN v_brand;
END;
$$;

-- ---- delete_brand: typed-confirm + hard cascade ----
-- FK CASCADE handles: canvases, media, brand_memories, chat_conversations,
-- chat_messages, chat_attachments, shopify_connections, product_catalog,
-- canvas_bindings, brand_fonts (where present).
-- W9b audit L3: shopify_webhook_log and shopify_compliance_log use
--   ON DELETE SET NULL (intentional for audit-retention per M9 02 catalog
--   migration) — those rows survive the brand delete with brand_id = NULL.
--   The summary jsonb returned to the caller intentionally does NOT count
--   the SET-NULL rows because they are not user-visible artifacts.

CREATE OR REPLACE FUNCTION public.delete_brand(
  p_brand_id     uuid,
  p_confirm_name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_actual_name text;
  v_summary     jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;

  -- Lock the row + read brand name (no read-then-write race)
  SELECT name INTO v_actual_name
  FROM public.brands
  WHERE id = p_brand_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_actual_name IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_actual_name <> p_confirm_name THEN
    RAISE EXCEPTION 'confirm_mismatch' USING ERRCODE = '22023';
  END IF;

  -- Snapshot meta for audit (canvas count is cheap — single index lookup)
  SELECT jsonb_build_object(
    'name', v_actual_name,
    'canvas_count', (SELECT count(*) FROM public.canvases WHERE brand_id = p_brand_id)
  ) INTO v_summary;

  -- W9b audit C1: re-assert user_id ownership on the final DELETE. Ownership
  -- was confirmed by the FOR UPDATE SELECT above + the typed-confirm guard,
  -- so this is defence-in-depth. A future refactor that relocates the NULL
  -- guard above must not allow a cross-user delete.
  DELETE FROM public.brands WHERE id = p_brand_id AND user_id = v_user_id;

  RETURN v_summary;
END;
$$;

-- ---- list_active_brands ----

CREATE OR REPLACE FUNCTION public.list_active_brands()
RETURNS SETOF public.brands
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  -- W9b audit L1: wrap auth.uid() in a SELECT so the planner evaluates it
  -- once per statement rather than potentially per row. Matches the project's
  -- established pattern for RLS / DEFINER bodies.
  SELECT * FROM public.brands
  WHERE user_id = (SELECT auth.uid()) AND archived_at IS NULL
  ORDER BY updated_at DESC;
$$;

-- ---- list_archived_brands ----
-- Used by B12 page + A2.a "Archived" filter dropdown.

CREATE OR REPLACE FUNCTION public.list_archived_brands()
RETURNS SETOF public.brands
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  -- W9b audit L1: same SELECT-wrap pattern as list_active_brands.
  SELECT * FROM public.brands
  WHERE user_id = (SELECT auth.uid()) AND archived_at IS NOT NULL
  ORDER BY archived_at DESC;
$$;

-- ============================================================
-- Grants
-- ============================================================
-- W9b audit L4: explicit REVOKE FROM PUBLIC before each GRANT so the
-- privilege surface is narrowed to authenticated even if Supabase's default
-- public-role disable ever flips. Defence-in-depth for security-sensitive
-- function execution.

REVOKE ALL ON FUNCTION public.create_brand(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rename_brand(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_brand(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_brand(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_brand(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_active_brands() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_archived_brands() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_brand(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_brand(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_brand(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_brand(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_brand(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_active_brands() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_archived_brands() TO authenticated;

COMMIT;
