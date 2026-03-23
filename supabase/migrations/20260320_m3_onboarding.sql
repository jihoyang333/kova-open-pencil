-- M3: Onboarding — add name column to users + brand-logos storage bucket

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;

-- Update handle_new_user() to copy Google OAuth display name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO UPDATE SET name = COALESCE(EXCLUDED.name, public.users.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Brand logos storage bucket (public for display, write-scoped by RLS)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own brand logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own brand logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own brand logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
