-- M5 prerequisite: Add image dimensions to media table

ALTER TABLE public.media ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS height INTEGER;
