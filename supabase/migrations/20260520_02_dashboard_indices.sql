-- Cluster 02 Onboarding & Dashboard — file-grid + sidebar query indexes
-- PRD 02 §4.1, Plan T01

BEGIN;

-- File-grid recency lookup (canvases for a brand, newest-first, excluding trashed)
CREATE INDEX IF NOT EXISTS idx_canvases_brand_recent
  ON public.canvases (brand_id, updated_at DESC)
  WHERE trashed_at IS NULL;

-- Trigram extension for canvas-name fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_canvases_name_trgm
  ON public.canvases USING gin (name gin_trgm_ops)
  WHERE trashed_at IS NULL;

-- Brand-switcher recency lookup
CREATE INDEX IF NOT EXISTS idx_brands_user_recent
  ON public.brands (user_id, updated_at DESC);

COMMIT;
