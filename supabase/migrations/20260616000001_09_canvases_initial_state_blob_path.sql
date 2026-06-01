-- W4 C-HIGH7: hydrate seeding blob path for duplicate-to-canvas + snapshot-restore.
-- Additive + NULL-safe. Written by /api/snapshots/duplicate-to-canvas (PRD 09 §5.1.1);
-- read by Cluster 02 canvas-open to hydrate the Yjs doc on first open (follow-up amendment).
ALTER TABLE public.canvases
  ADD COLUMN IF NOT EXISTS initial_state_blob_path text;

COMMENT ON COLUMN public.canvases.initial_state_blob_path IS
  'Storage path (canvas-snapshots bucket) used to hydrate the Yjs doc on first open. Set by /api/snapshots/duplicate-to-canvas (PRD 09 §5.1.1); read by Cluster 02 canvas-open. NULL means "no seeding blob" (normal create path).';
