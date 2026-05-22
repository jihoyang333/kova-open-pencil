# W12a — Cluster 09 (Version History + Trash + Image Export) AUDIT Prompt

**Wave:** W12a
**Cluster:** 09 — canvas_snapshots table, 4 SECURITY DEFINER RPCs, weekly cron, version-history panel, trash, image export (Slice → bytes), FORMAT_VERSION migration coord (cross-cluster with 07a)
**Audit type:** DB security + concurrency (FOR UPDATE SKIP LOCKED) + cross-cluster contract integrity (FORMAT_VERSION 2.0.0 migration registry coord with 07a).
**Status:** ready after W12a DONE (after Cluster 06 + 07a merged)
**Prerequisites:** Branch `app/cluster-09-version-history`. DONE at `cluster-reports/W12a-cluster-09-DONE.md`. Cluster 07a's FORMAT_VERSION 2.0.0 already shipped (verify lockstep with this cluster's migration registry).

---

## Founder pre-flight

1. W12a printed DONE
2. Cluster 07a merged (FORMAT_VERSION 2.0.0 lockstep)
3. Local Supabase for concurrency replay
4. Image-export locked policy confirmed (image only, NEVER HTML)

---

## Launch

Fresh session. Opus 4.7. Paste verbatim.

---

## PROMPT (paste verbatim)

```
You are the W12a AUDIT agent for Kova. Independent reviewer for
Cluster 09 — version history + trash + image export.

Two paranoia targets:
1. FORMAT_VERSION 2.0.0 migration registry must be in lockstep with
   Cluster 07a's kiwi/protocol.ts constants. Schema drift across
   clusters = silent data corruption on snapshot replay.
2. Image export pipeline must use Slice → image bytes ONLY. Never
   HTML. This is founder-locked per [feedback_image_export_locked]
   memory. Any HTML export path = CRITICAL.

READ-ONLY. Surface CRITICAL via AskUserQuestion mid-audit.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
4. docs/execution-phase/execution-prompts/W12a-cluster-09-version-history.md
   (ORIGINAL execution prompt — scope boundary)
5. docs/kova-final-prds/09-version-history-and-trash.md
6. docs/kova-final-impl-plans/09-version-history-and-trash-plan.md
7. docs/execution-phase/cluster-reports/W12a-cluster-09-DONE.md
8. docs/execution-phase/cluster-reports/W7-cluster-07a-DONE.md
   (cross-cluster reference — verify FORMAT_VERSION 2.0.0 lockstep)
9. packages/core/CHANGELOG-KOVA.md (07a lift-the-lock log)
10. packages/core/src/kiwi/protocol.ts (FORMAT_VERSION constant)
11. CLAUDE.md root + outer
12. ~/.claude/rules/common/security.md

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:verification-before-completion

## Mandatory subagents

1. superpowers:code-reviewer — full diff sweep
2. database-reviewer — DEEP review of canvas_snapshots table +
   claim_snapshots_for_prune (FOR UPDATE SKIP LOCKED + claimed_at
   column per W4 C-HIGH8) + 4 SECURITY DEFINER RPCs (per W4 CT-013)
   + weekly cron handler
3. typescript-pro — canvas snapshot encoding (kiwi-schema + zstd)

## Conditional subagents

- vue-expert — VersionHistoryPanel reactivity, trash view
- e2e-runner — autosave → snapshot → list → restore; image export

## Cluster 09 expected scope

ALLOWED:
- supabase/migrations/*.sql — canvas_snapshots table +
  canvases.initial_state_blob_path column (per W4 C-HIGH7)
- supabase/migrations/*.sql — 4 SECURITY DEFINER RPCs
  (create_snapshot with optional p_id uuid DEFAULT
  gen_random_uuid(), claim_snapshots_for_prune, restore_snapshot,
  list_snapshots — per Plan 09)
- supabase/functions/cron/snapshot-storage-sweep.ts (weekly orphan
  blob cleanup per W4 C-HIGH9)
- src/components/canvas/version-history/VersionHistoryPanel.vue
- src/components/canvas/trash/TrashView.vue
- src/components/canvas/export/* — image export modal + slice
  picker
- src/composables/useSnapshotsStore.ts (Pinia) +
  useSnapshotThumbnail
- src/composables/useCanvasEditLock.ts (single-owner boolean +
  warn/Sentry per W4 C-MED25)
- src/services/snapshotEncoder.ts (kiwi + zstd; uses Cluster 07a's
  kiwi codec)
- src/services/imageExport.ts (Slice → image bytes pipeline)
- src/services/snapshotMigrationRegistry.ts (per W4 C-LOW09.11 —
  '1.0.0' → '2.0.0' entry coord with Cluster 07a)
- src/services/duplicateToCanvas.ts (with verifyIdempotency per W4
  C-MED22)
- tests/*
- vercel.json — Edge runtime config (per W4 C-LOW09.9)

FORBIDDEN:
- packages/core/** — CRITICAL (07a is the engine cluster; 09
  consumes but does not modify)
- Any HTML export path — CRITICAL (image export ONLY per founder
  lock)
- Cmd+K palette references — KILLED per 00g-CMDK_KILL_DISPATCH

## Audit dimensions

### A. Branch + diff baseline

  git fetch origin
  git log --oneline feat/m9-shopify..app/cluster-09-version-history
  git diff --stat feat/m9-shopify...app/cluster-09-version-history

One-per-task. Conventional commits.

### B. FORMAT_VERSION lockstep (cross-cluster with 07a — CRITICAL)

Verify EXACTLY:
- packages/core/src/kiwi/protocol.ts: FORMAT_VERSION = 2.0.0,
  KIWI_SCHEMA_VERSION = 2.0.0 (already shipped by 07a)
- src/services/snapshotMigrationRegistry.ts (or equivalent in this
  cluster): registry has '1.0.0' → '2.0.0' entry
- The migration function accepts a 1.0.0 snapshot and outputs a
  2.0.0 snapshot
- Coordination PR title includes "(coord: Cluster 07a
  FORMAT_VERSION 2.0.0)" per C-LOW07a.3 — check the commit
  message of the migration-registry task

  grep -nE "FORMAT_VERSION|KIWI_SCHEMA_VERSION" \
    src/services/ packages/core/src/kiwi/ 2>/dev/null

Constants MUST match (2.0.0 in both places). Drift = CRITICAL
silent data corruption risk.

### C. Image export = image ONLY (founder lock — CRITICAL)

Verify the export pipeline path:
- Slice node (07a's 17th NodeType) → renderer-canvas readback →
  image bytes → download / push to ESP
- NO HTML output
- NO inline-style block builder
- NO MJML / MIME multipart text/html generation
- NO 'text/html' Content-Type anywhere in export code

  git grep -inE "text/html|innerHTML|outerHTML|MJML|email.?html" \
    src/services/imageExport.ts src/components/canvas/export/ 2>/dev/null

Any hit = CRITICAL violation of locked policy
([feedback_image_export_locked]).

### D. 4 SECURITY DEFINER RPCs (W4 CT-013)

Per RPC verify:
- SET search_path = public, pg_temp
- Ownership check (auth.uid() ownership of canvas)
- Parameterized SQL only
- create_snapshot has optional p_id uuid DEFAULT gen_random_uuid()
  (per W4 — caller can pre-generate snapshot_id for Storage path
  invariant per C-MED23)
- restore_snapshot atomically updates canvas state + audit_log
  entry
- list_snapshots respects pagination + retention window

### E. claim_snapshots_for_prune RPC (W4 C-HIGH8)

This is THE concurrency hotspot. Verify:
- FOR UPDATE SKIP LOCKED clause present
- claimed_at column on canvas_snapshots — updated on claim
- Stale claim recovery: claims older than X minutes get re-claimable
  (verify the recovery query)
- Returns claimed snapshot IDs to the cron caller

Run concurrency test (overlapping invocations must skip claimed
rows). database-reviewer agent runs this scenario.

### F. snapshot-storage-sweep cron (W4 C-HIGH9)

- Weekly Vercel cron handler
- Identifies orphan blobs in Storage (snapshot file exists but no
  DB row OR row.deleted_at > threshold)
- Deletes blobs in batches with audit_log entry
- Env-guarded (no manual browser trigger)
- Edge runtime configured per W4 C-LOW09.9

### G. SNAPSHOT_FREE_RETENTION_DAYS (W4 C-MED24)

- Constant passed via RPC param (NOT hardcoded in RPC body)
- Free tier retention matches PRD 09 value (e.g., 30 days)
- Pro tier retention longer (verify cross-cluster contract with
  Cluster 04 plan_tier check)

### H. duplicate-to-canvas + verifyIdempotency (W4 C-MED22)

- Function exists at src/services/duplicateToCanvas.ts
- Idempotency key derived from source canvas_id + timestamp window
- verifyIdempotency wrapper around the actual duplicate logic
- audit_log entry per duplicate
- canvases.initial_state_blob_path column written during duplicate
  (Cluster 02 hydration depends on it per W4 C-HIGH7)

### I. useCanvasEditLock (W4 C-MED25)

- Single-owner boolean (only one tab/session can edit at a time)
- On contention: warn user via KovaToast + Sentry breadcrumb
- Lock released on tab close / explicit release
- Lock TTL prevents stale locks (e.g., 5-min TTL with heartbeat)

### J. File-menu version-history bus handshake (W4 C-MED26)

- Cluster 06 emits version-history-open event via bus
- This cluster's VersionHistoryPanel subscribes + opens
- Event payload SHAPE matches Cluster 06's emitter signature

### K. CSS pointer-events overlay (W4 C-LOW09.10)

Remove __spaceHeld global. Replace with CSS pointer-events on
overlay class. Verify the global is gone:

  git grep -n '__spaceHeld' src/ 2>/dev/null

Any hit = HIGH (regression of W4 closure).

### L. format_version CI grep (W4 C-LOW09.11)

- CI script greps for hardcoded format_version literals (e.g.,
  '1.0.0' as raw string) and fails build if found outside the
  registry
- Verify package.json scripts includes the grep gate

### M. KovaSkeleton on loadingByCanvas (W4 C-LOW09.12)

- VersionHistoryPanel renders <KovaSkeleton> while loadingByCanvas
  is true
- No flash of empty state before snapshots load

### N. PRD path drift fixed (W4 B-MED9)

  git grep -nE 'docs/prd/' src/ supabase/ docs/kova-final-impl-plans/09-*

All paths should reference docs/kova-final-prds/ — no docs/prd/
residuals.

### O. Design-system compliance

  git diff feat/m9-shopify...app/cluster-09-version-history -- 'src/**' \
    | grep -E 'Math\.random|: any|!\.[a-zA-Z]|<style|style scoped|<svg|<icon-lucide-'

Any hit = CRITICAL.

Verify:
- Version history panel = .panel.version-history
- Snapshot rows = .snapshot-row + .selected
- Trash view = .panel.trash
- Restore CTA = .btn.primary
- Loading = <KovaSkeleton>
- KovaIcon for all icons

### P. Visual fidelity

- KOVA_AUDIT.md + tokens-used.md at cluster-audits/cluster-09-*
- 3-screenshot artifact for VersionHistoryPanel, trash, export
  modal
- Visual-diff vs version-history-1.png + version-history-2.png

### Q. Quality gates (re-run)

  bun install
  bun run build / check / test:unit / test:dupes
  supabase migration up --local

Concurrency test on claim_snapshots_for_prune.

### R. Code-review sweep

Spawn superpowers:code-reviewer with brief:
  "Audit feat/m9-shopify...app/cluster-09-version-history. Focus:
  FORMAT_VERSION 2.0.0 lockstep with Cluster 07a, image-export
  ONLY (no HTML path), 4 SECURITY DEFINER RPCs (search_path +
  ownership + parameterization), claim_snapshots_for_prune
  concurrency (FOR UPDATE SKIP LOCKED + claimed_at + stale-claim
  recovery), useCanvasEditLock single-owner discipline,
  pointer-events overlay (no __spaceHeld global), design-system
  compliance, CLAUDE.md hard constraints.
  CRITICAL/HIGH/MEDIUM/LOW."

### S. Plan task completion + Done-report accuracy

Walk Plan 09 §6 task-by-task. Spot-check 5 DONE claims.

## Output

  docs/execution-phase/wave-audits/reports/W12a-cluster-09-AUDIT-REPORT.md

Format per W7 template. Include separate sections:
- "FORMAT_VERSION lockstep verification" (cross-cluster contract)
- "Image-export policy compliance"
- "Concurrency audit (claim_snapshots_for_prune)"
- "W4 closure verification" (C-HIGH7-9, C-MED22-26, C-LOW09.9-12,
  B-MED9)

Print:
  "W12a AUDIT COMPLETE. Verdict: <V>. <N> findings.
  Report: docs/execution-phase/wave-audits/reports/W12a-cluster-09-AUDIT-REPORT.md"

Begin. Mandatory docs first.
```

---

**Estimated wall-clock: 75-120 min. Token spend: $100-180.**
