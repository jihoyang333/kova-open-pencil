# W12a — Cluster 09 (Version History + Trash) — Progress Report

**Status:** Backend half COMPLETE + green. Frontend half (store/composables/Vue) blocked on an
architectural decision (editor-snapshot adapter) + the mandated Phase 1 Vue audit gate.
**Worktree:** `/Users/jihoyang/kova-build-c09` · branch `app/cluster-09-version-history`
**Base:** `feat/m9-shopify`
**Date:** 2026-06-01

---

## Shared infra fix (prerequisite, benefits ALL clusters)

A stock `supabase start` could not replay this repo's migration set, blocking isolated local
integration testing for every cluster. Fixed (commit `fix(infra): make migration set clean-replayable`):

- **~6 duplicate version prefixes** (M9 batch alone had 10 files sharing `20260418`) → renamed all
  33 migrations to unique, order-preserving 14-digit `YYYYMMDDNNNNNN` prefixes via `git mv`
  (content unchanged).
- **`vault.delete_secret()`** removed in newer `supabase_vault` → `m9_00_enable_vault` now uses
  `DELETE FROM vault.secrets`.
- **`m9_01_connections_restore`** + **`m9_02_catalog_fixup`** re-created objects already made by
  their base migrations (wrong-project-rollback / folded-fixup artifacts) → made idempotent.
- Supabase CLI bumped 2.75 → 2.102 (vault compatibility).

Verified: a fresh `supabase start` now applies all migrations cleanly through
"Started supabase local development setup."

**Note:** `supabase/config.toml` in this worktree uses offset ports (553xx) so the c09 stack runs
alongside the default-port stack without conflict. It is untracked (worktree-local). A canonical
default-port `config.toml` for committed/CI use is a separate infra task.

---

## Completed tasks (TDD, one commit per task — 13 commits)

| Task | What | Tests |
|---|---|---|
| 1 | `canvas_snapshots` table + RLS + 4 RPCs + Storage bucket | 5 integration |
| 2 | `create_snapshot` RPC (quota + retention_class) | 6 integration |
| 3 | `restore_snapshot` RPC (atomic pre-restore) | 2 integration |
| 4 | `rename_snapshot` RPC (name + clear) | 3 integration |
| 5 | `purge_canvas_snapshot_paths` RPC | 2 integration |
| 6 | RLS SELECT + write-blocked + Storage path-prefix | 6 integration |
| 7 | `useSnapshotCodec` (Yjs page envelope + fflate) | 3 unit |
| 7b | `snapshot-migration-registry` + CI lockstep guard | 4 unit |
| 18b | `canvases.initial_state_blob_path` column | 1 integration |
| 19 | `/api/snapshots/duplicate-to-canvas` Edge Function | 2 unit + 2 integration |
| 19b | `claim_snapshots_for_prune` RPC + `claimed_at` (concurrency) | 2 integration |
| 20 | `snapshot-prune` cron + feature-flags + vercel.json | 2 unit + 1 integration |
| 20b | `snapshot-storage-sweep` cron (recursive orphan diff) | 2 unit + 1 integration |

**Total: 43 tests green (30 integration + 13 unit), 0 fail.** `oxlint` clean on all new source files.

### Corrections made vs the PRD/Plan (TDD-caught)

1. **Schema gap:** `canvases` has no `user_id` column (ownership is `canvas → brand → user`).
   `create_snapshot` + `purge_canvas_snapshot_paths` were rewritten to derive ownership via a
   `brands` join (consistent with `restore_snapshot`, which already did). No schema change needed.
2. **Quota test bug:** the plan filled the 100 MB brand quota with one 100 MB row, but the 50 MB
   per-blob CHECK rejects it → fixed to two 50 MB rows.
3. **Compression lib:** PRD says "Zstd"; the repo ships `fzstd` (decompress-only) + `fflate`. Codec
   uses `fflate` deflate (sync, already a dep, no wasm init) for our internal snapshot blob.
4. **Repo-API adaptation:** `verifyAuth`→`verifyAuthFull`, `create_canvas` RPC absent → RLS insert,
   `useToast().success`→`toast.show`, cron stub-guard + `verifyCronSecret` conventions, `@/`→`src/`
   only (api handlers use relative imports).

---

## Remaining work (NOT done) + why

### Tasks 8–12a — store + composables — BLOCKED on an architectural decision

`useSnapshotsStore` + `useAutosnapshot` + `useRestoreUndo` + `useSnapshotThumbnail` assume an
**editor-snapshot adapter** that does not exist:

- `getStateVector`, per-page `snapshotPage` (Yjs update bytes), `restorePageFromSnapshot`,
  `captureThumbnail`, `pushUndoEntry`, `userId`/`brandId`/`canvasId`.

The editor is a Pinia store (`useEditorStore`) wrapping `SceneGraph` (locked `packages/core`). The
public API exposes **no** Yjs-doc access (`encodeStateAsUpdate`), no thumbnail capture, and no undo
push. Building the adapter requires:
1. Discovering the engine's public serialization API (or a sanctioned Yjs-doc accessor) **without
   modifying `packages/core`** (CLAUDE.md hard lock).
2. A render→thumbnail capture path.
3. Browser verification of a snapshot → restore round-trip on a live canvas.

This is an architecture decision, not blind execution — flagged for the founder.

### Tasks 13–18 — Vue components — BLOCKED on the Phase 1 audit gate

Per the plan + master guide, no Vue may be written until `KOVA_AUDIT.md` + `tokens-used.md` are
produced and **founder-approved** (Phase 1 gate). Surfaces: AddVersionDialog, RestoreConfirmModal,
SnapshotEmptyState/AutosaveGroupHead/CurrentVersionRow/FilterDropdown, SnapshotRow,
SnapshotTimelinePanel, TrashConfirmModal.

### Tasks 21–23 — cross-cluster mounts — partially blocked

Cluster 06's `CanvasView.vue` (right-panel mount point) is not in `feat/m9-shopify` yet. Cluster 02
dashboard + Cluster 08 keyboard registry wiring are light edits owned by those clusters.

### Tasks 24–25 — E2E + founder QA — gated on the above.

---

## How to run the backend tests

```sh
cd /Users/jihoyang/kova-build-c09
# c09 stack already running on 553xx ports (supabase start -x studio,imgproxy,realtime,vector)
set -a && . ./.env.local && set +a
KOVA_RUN_INTEGRATION=1 bun test ./tests/integration/snapshots/ ./tests/integration/api/ \
  ./tests/unit/composables/version-history/ ./tests/unit/api/cron/snapshot-prune.test.ts \
  ./tests/unit/api/cron/snapshot-storage-sweep.test.ts ./tests/unit/api/snapshots/
```

`bun run check` is red at baseline (130 pre-existing errors in other clusters' files); all NEW
c09 source files are oxlint-clean.
