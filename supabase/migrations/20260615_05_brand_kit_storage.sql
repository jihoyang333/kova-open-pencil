-- ============================================================
-- Migration 20260615_05_brand_kit_storage.sql
-- Cluster 05 Brand Kit — private Storage buckets + path-prefix RLS (PRD §4.3, D-5 pattern)
-- ============================================================

BEGIN;

-- Create buckets if not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('brand-fonts',       'brand-fonts',       false, 5242880,  ARRAY['font/woff2','font/ttf','font/otf']::text[]),                                  -- 5 MB per founder ratification 2026-05-17
  ('brand-kb-sources',  'brand-kb-sources',  false, 10485760, ARRAY['application/pdf','text/plain','text/markdown']::text[])                      -- 10 MB per-file (no count cap per founder ratification 2026-05-17)
ON CONFLICT (id) DO NOTHING;

-- Path-prefix RLS per D-5 (00e §4 verified pattern). foldername(name)[1] is the
-- {brand_id} folder (Supabase stores the path after the bucket). auth.uid() is
-- wrapped as (SELECT auth.uid()) for per-statement eval; DROP IF EXISTS makes
-- re-runs idempotent (db-review H-1/M-1).
DROP POLICY IF EXISTS brand_fonts_owner_select ON storage.objects;
CREATE POLICY brand_fonts_owner_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'brand-fonts'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.brands WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS brand_fonts_owner_insert ON storage.objects;
CREATE POLICY brand_fonts_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brand-fonts'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.brands WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS brand_fonts_owner_delete ON storage.objects;
CREATE POLICY brand_fonts_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'brand-fonts'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.brands WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS brand_kb_sources_owner_select ON storage.objects;
CREATE POLICY brand_kb_sources_owner_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'brand-kb-sources'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.brands WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS brand_kb_sources_owner_insert ON storage.objects;
CREATE POLICY brand_kb_sources_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brand-kb-sources'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.brands WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS brand_kb_sources_owner_delete ON storage.objects;
CREATE POLICY brand_kb_sources_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'brand-kb-sources'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.brands WHERE user_id = (SELECT auth.uid()))
  );

COMMIT;
