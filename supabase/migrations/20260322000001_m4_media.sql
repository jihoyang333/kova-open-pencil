-- M4: Brand Kit & Media Library
-- Adds media table, media-assets storage bucket, and brands.url column

-- 1. Add url column to brands
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS url TEXT;

-- 2. Media table
CREATE TABLE IF NOT EXISTS public.media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id    UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  file_size   INT  NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RLS: per-operation policies (matches brands/canvases pattern)
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_select ON public.media FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY media_insert ON public.media FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY media_update ON public.media FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY media_delete ON public.media FOR DELETE
  USING (user_id = auth.uid());

-- 4. Index for common query pattern (list media by brand)
CREATE INDEX IF NOT EXISTS idx_media_brand_id ON public.media(brand_id);

-- 5. Storage bucket for media assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-assets', 'media-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage object policies (user-scoped via folder path)
-- SELECT is open: media-assets is a public bucket (images are non-sensitive brand assets).
-- Write policies scoped to authenticated users with user-folder enforcement.
CREATE POLICY media_assets_select ON storage.objects FOR SELECT
  USING (bucket_id = 'media-assets');
CREATE POLICY media_assets_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY media_assets_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY media_assets_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
