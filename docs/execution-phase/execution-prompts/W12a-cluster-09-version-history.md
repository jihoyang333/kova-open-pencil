# W12a — Cluster 09 (Version History + Trash + Snapshots) Execution Prompt

**Wave:** W12 (parallel-2: 09, 10)
**Cluster:** 09 — Version history + Trash + autosave snapshots + export-image pipeline
**Status:** ready after W11 fully merged
**Worktree:** YES — `/Users/jihoyang/kova-build-c09`

---

## Founder pre-flight (do once for W12)

```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1
git checkout feat/m9-shopify
git pull origin feat/m9-shopify
git branch app/cluster-09-version-history feat/m9-shopify
git branch app/cluster-10-ai-chat feat/m9-shopify

git worktree add ../kova-build-c09 app/cluster-09-version-history
git worktree add ../kova-build-c10 app/cluster-10-ai-chat

git worktree list
```

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-build-c09`. Opus 4.7.

---

## PROMPT (paste verbatim)

```
You are the W12a execution-phase agent. Build Cluster 09 — Version
history + Trash + autosave snapshots + image export pipeline.

Parallel-2 wave. Sibling: Cluster 10 (AI chat).

## Worktree discipline

/Users/jihoyang/kova-build-c09 · app/cluster-09-version-history

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/kova-final-prds/09-version-history-and-trash.md
4. docs/kova-final-impl-plans/09-version-history-and-trash-plan.md
5. docs/execution-phase/claude-design-files/README.md  (REFERENCE ONLY — plan supersedes per Mandate 8; ignore conflicts between this README and the plan)
6. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md  (CANONICAL FIDELITY CONTRACT — read end-to-end. §0 is the 3-rule formulation: (1) visual values are copied, (2) DOM structure is translated, (3) behavior is engineered. "Copy DOM verbatim" is FORBIDDEN. Phase 1 gate = KOVA_AUDIT.md + tokens-used.md before any Vue. Visual-diff thresholds 0.1% component / 0.5% screen. 3-screenshot PR artifact per surface.)
7. CLAUDE.md
8. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
9. Hi-fi (version history + trash confirm — also see Plan 09 §Hi-fi Visual Reference for complete task→scene mapping):
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-b/chunk-b6/Kova Hi-Fi 17 Version History - Dark.html (17.1–17.11)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-b/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html (B13.1–B13.3)
10. Figma canvas UI screenshots — full paths:
    - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/version-history-1.png
    - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/version-history-2.png

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:executing-plans
3. superpowers:test-driven-development
4. superpowers:code-reviewer (end)

## Conditional subagents

- database-reviewer — canvas_snapshots table, claim_snapshots_for_prune
  RPC (per W4 C-HIGH8), 4 SECURITY DEFINER RPCs (per W4 CT-013)
- vue-expert — version history panel reactivity
- typescript-pro — canvas snapshot encoding (kiwi-schema + zstd)

## Cluster 09 scope (per Plan 09 + W4 closures)

- canvases.initial_state_blob_path column (per W4 C-HIGH7 —
  cross-cluster contract for Cluster 02 hydration; out-of-scope here
  to amend Plan 02, but cluster 09 ships the column + duplicate-to-
  canvas writes it)
- canvas_snapshots table + RLS
- create_snapshot RPC (with optional p_id uuid DEFAULT gen_random_uuid())
- claim_snapshots_for_prune RPC (FOR UPDATE SKIP LOCKED, claimed_at
  column per W4 C-HIGH8)
- Weekly snapshot-storage-sweep cron (orphan blob cleanup per W4
  C-HIGH9)
- useSnapshotsStore + useSnapshotThumbnail composable
- VersionHistoryPanel Vue component
- SNAPSHOT_FREE_RETENTION_DAYS constant via RPC param (per W4 C-MED24)
- duplicate-to-canvas function with verifyIdempotency (per W4 C-MED22)
- snapshot_id pre-generated for Storage path invariant (per W4 C-MED23)
- useCanvasEditLock single-owner boolean (warn + Sentry on contention
  per W4 C-MED25)
- File-menu version-history bus handshake (cross-cluster contract with
  Cluster 06 per W4 C-MED26)
- KovaSkeleton while loadingByCanvas (per W4 C-LOW09.12)
- CSS pointer-events overlay (remove __spaceHeld global per W4
  C-LOW09.10)
- format_version CI grep + snapshot-migration-registry (per W4
  C-LOW09.11 — coordinate with Cluster 07a)
- Edge runtime config on Vercel Functions (per W4 C-LOW09.9)
- Trash view + restore flow
- Image export pipeline (Slice → image bytes → download / push to ESP
  per founder lock — image export ONLY, no HTML)
- PRD path drift fixed: docs/prd → docs/kova-final-prds (per W4 B-MED9)

## Hi-fi references

Version history visual reference from Figma screenshots
(version-history-1.png, version-history-2.png).

## Branch + commits

Branch: app/cluster-09-version-history
Path: /Users/jihoyang/kova-build-c09

Commit format: feat(c09-tNN), test(c09), fix(c09-review)
ONE COMMIT PER TASK.

## Per-task flow

Standard TDD per Plan 09 §6.
Snapshot encoding tests: use kiwi-schema fixtures from packages/core/.
RPC tests: against local supabase start.
Cron tests: invoke handler directly with mocked retry scenarios per
C-HIGH8 (overlapping invocations must skip claimed rows).

## Design-system compliance

Version history panel = .panel.version-history pattern (or new spec'd
in design.md).
Snapshot rows = .snapshot-row + .selected variants.
Trash view = .panel.trash.
Restore CTA = .btn.primary.
Loading = <KovaSkeleton> while loadingByCanvas (per C-LOW09.12).
Zero new tokens. Zero hex. Zero <style> blocks. Zero <icon-lucide-*>.

## Cluster-end gates

1. All Plan tasks committed
2. bun run build / check / test:unit / test:dupes — green
3. supabase migration up — RLS + RPCs verified; concurrency test on
   claim_snapshots_for_prune (overlap scenario)
4. database-reviewer — PASS on 4 RPCs + cron handler
5. superpowers:code-reviewer — PASS
6. e2e-runner — autosave triggers snapshot, version history panel lists
   it, restore brings canvas back to prior state; export Slice as image
7. Playwright visual diff (version history panel, trash, export modal)
   — ≤ 2%

## Done report

Path: docs/execution-phase/cluster-reports/W12a-cluster-09-DONE.md

Print when done:
  W12a CLUSTER 09 DONE. <N> commits pushed to
  app/cluster-09-version-history.

Begin.
```

---

**Estimated wall-clock: 6-8h (Opus). Token spend: $250-450.**
