-- M2: Dashboard & Brand Management
-- brands + canvases tables, RLS, triggers, thumbnails storage bucket

-- brands table
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  colors JSONB,
  fonts JSONB,
  logo_url TEXT,
  voice TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own brands" ON public.brands
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own brands" ON public.brands
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own brands" ON public.brands
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own brands" ON public.brands
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER set_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- canvases table
CREATE TABLE IF NOT EXISTS public.canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled',
  thumbnail_url TEXT,
  trashed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.canvases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own canvases" ON public.canvases
  FOR SELECT USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own canvases" ON public.canvases
  FOR INSERT WITH CHECK (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own canvases" ON public.canvases
  FOR UPDATE USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own canvases" ON public.canvases
  FOR DELETE USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

CREATE TRIGGER set_canvases_updated_at
  BEFORE UPDATE ON public.canvases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- thumbnails storage bucket
-- Intentionally public: thumbnails are non-sensitive preview images. Public URLs avoid
-- per-request auth overhead for grid rendering (same pattern as Figma, Canva).
-- Write access is still scoped to the user's own prefix via RLS policies below.
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own thumbnails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own thumbnails"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own thumbnails"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);
