# W12a — Cluster 09 (Version History + Trash) — Progress Report

**Status:** Backend + all store/composable logic COMPLETE + green (61 tests). Editor-snapshot
adapter approved (founder, 2026-06-01) + built. Only the Vue UI (Tasks 13–18) remains — gated on
the mandated Phase 1 design audit gate.
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

**Backend total: 43 tests green (30 integration + 13 unit).**

### Editor-snapshot adapter + store/composables (Tasks 8–12a) — DONE + green

Founder approved the **whole-document `.fig`** approach (engine's native serializer; no
`packages/core` change) over per-page Yjs — the engine has no Yjs/delta system at all (it stores
designs in plain Maps and saves whole `.fig` files). See
`W12a-cluster-09-EDITOR-ADAPTER-PROPOSAL.md`.

| Task | What | Tests |
|---|---|---|
| adapter | `src/stores/editor.ts` +3 methods: `serializeSnapshot` / `loadSnapshot` / `captureSnapshotThumbnail` (thin wrappers over `exportFigFile`/`openFigFile`/`renderThumbnail`) | (covered via store/composables) |
| 8+10 | `useSnapshotsStore` (list/create/restore/rename/duplicate/copyLink/preview; thumbnail folded into adapter) | 4 unit |
| 11 | `useAutosnapshot` (30-min tick, blur/focus/offline/tab-close, skip-if-unchanged via FNV hash, stop-on-trash) | 4 unit |
| 12 | `useDeepLinkedVersion` (?version) + `useVersionHistoryShortcut` (Cmd/Ctrl+Alt+S) | 6 unit |
| 12a | `useCanvasEditLock` (single-owner boolean + Sentry on double-lock) | 4 unit |

**Total now: 61 tests green (30 integration + 31 unit), 0 fail.** `oxlint` clean on all new source.

**Deviations (approved):** (1) snapshot = whole-doc `.fig`, not per-page Yjs; (2) Task 9
`useRestoreUndo` dropped — "undo a restore" = restore the auto-created `pre_restore` snapshot;
(3) thumbnail via `renderThumbnail`; (4) preview-side-doc deferred — needs a nonexistent engine
side-render API (the panel shows the snapshot thumbnail; live side-doc is a future engine item);
(5) snapshot blob stored as raw `.fig` (already compressed) with `format_version=1` — the codec
(Task 7) stays as a versioning utility but isn't in the whole-doc write path.

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
