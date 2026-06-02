# W12a Cluster 09 — Vue-panel handoff prompt

Paste the block below into a **fresh Claude Code session opened at
`/Users/jihoyang/kova-build-c09`** (browser-equipped — the visual-diff gates need screenshots).

---

```
You are finishing W12a — Cluster 09 (Version History + Trash). The backend, editor adapter,
Pinia store, composables, and Phase 1 design audit are DONE, tested (61 tests green), and pushed
on branch `app/cluster-09-version-history`. Your job is ONLY the remaining Vue UI panels
(Tasks 13–18) + cross-cluster mounts (21–23) + E2E (24–25).

## Worktree + branch
- Work in: /Users/jihoyang/kova-build-c09  (branch app/cluster-09-version-history, base feat/m9-shopify)
- Commit one-per-task: feat(c09-tNN), fix(c09-review). Do NOT squash.

## Local Supabase
- An isolated stack may still be running on offset ports 553xx. Check: `supabase status`.
- If down: `cd /Users/jihoyang/kova-build-c09 && supabase start -x studio,imgproxy,realtime,vector`
  (config.toml uses 553xx ports so it won't collide with the default-port stack).
- Env for integration/E2E: `set -a && . ./.env.local && set +a` then `KOVA_RUN_INTEGRATION=1 bun test ...`
- The migration set replays cleanly now (W12a infra fix). `.env.local` + supabase/config.toml are
  gitignored/untracked.

## Mandatory reading (in order)
1. docs/execution-phase/cluster-reports/W12a-cluster-09-PROGRESS.md   (what's done + what's left)
2. docs/execution-phase/cluster-audits/cluster-09-audit.md            (§1.3 reuse map, §1.6 decisions)
3. docs/execution-phase/cluster-audits/cluster-09-tokens-used.md      (every exact value + token)
4. docs/execution-phase/cluster-reports/W12a-cluster-09-EDITOR-ADAPTER-PROPOSAL.md  (the approved approach)
5. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md  (3-rule fidelity contract +
   Phase 3/4 per-screen visual-diff loop + Appendix A). Phase 1 gate is ALREADY GREEN — go to Phase 3/4.
6. docs/kova-final-impl-plans/09-version-history-and-trash-plan.md  Tasks 13–25 (the component specs)
7. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
8. Hi-fi (in-repo, CI-deterministic — use THESE, not the outer originals):
   - design-system/hifi/version-history/chunk-b6/Kova Hi-Fi 17 Version History - Dark.html (17.1–17.11)
   - design-system/hifi/version-history/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html (B13.1–B13.3)
9. CLAUDE.md

## Mandatory skills
superpowers:using-superpowers, superpowers:executing-plans, superpowers:test-driven-development,
superpowers:code-reviewer (end). e2e-runner subagent at the end.

## APPROVED decisions you MUST honor (do not re-litigate)
- Snapshots = whole-document `.fig` (engine's exportFigFile/openFigFile). The store already uses
  editor.serializeSnapshot / loadSnapshot / captureSnapshotThumbnail. NO per-page Yjs. NO packages/core edits.
- Task 9 (useRestoreUndo) is DROPPED — "undo a restore" = restore the auto-created pre_restore snapshot.
- Preview-side-doc (Task 12a step 3–4) is DEFERRED — no engine side-render API. The panel shows the
  snapshot thumbnail via store.previewSnapshot; do NOT build a live side-doc.
- Design tokens already added to src/app.css @theme: --color-danger (#e5484d) + --color-danger-hover
  (#d93a40) for destructive confirm buttons (RED, founder-approved), --color-scrim, --color-focus-ring.
  Use these; no new tokens, no raw hex/px in Vue.

## What to build (Tasks 13–18) — reuse map in cluster-09-audit.md §1.3
- TrashConfirmModal (T18) + RestoreConfirmModal (T14): reuse ui/ConfirmModal (danger variant uses --color-danger).
- AddVersionDialog (T13): compose KovaModal + KovaInput + KovaButton.
- SnapshotEmptyState (T15): reuse/extend ui/EmptyState.
- FilterDropdown (T15): compose KovaMenu/KovaPopover + KovaToggle ("Show autosaves" -> store.showAutosaves).
- SnapshotTimelinePanel (T17), SnapshotRow (T16), AutosaveGroupHead (T15), CurrentVersionRow (T15):
  build new. Ship .vh-timeline/.vh-row/.vh-group-head to src/assets/css/version-history.css
  (NOT inline <style>) using the EXACT values in tokens-used.md. Wire all to useSnapshotsStore +
  the composables (useAutosnapshot, useDeepLinkedVersion, useVersionHistoryShortcut, useCanvasEditLock).

## Per-screen workflow (IMPLEMENTATION_PROMPT §6 — do NOT batch)
For each surface: build Vue at /dev route -> screenshot it + the in-repo hi-fi at 1440px ->
walk Appendix A per property -> list diffs in tests/snapshots/cluster-09/<surface>-diff.md ->
fix -> re-diff until empty AND Playwright visual-diff ≤0.5% screen / ≤0.1% component
(maxDiffPixelRatio 0.005, threshold 0.2, mask volatile regions). 3-screenshot row per surface in the PR.

## Cross-cluster (Tasks 21–23) — light, owning cluster approves before merge
- 21: mount <SnapshotTimelinePanel> in the canvas right-rail when store.panelOpen. NOTE: Cluster 06
  CanvasView.vue is NOT in feat/m9-shopify yet — wire defensively or leave a documented TODO.
- 22: dashboard imports <TrashConfirmModal> via useConfirm.
- 23: register Alt+Meta+KeyS in the Cluster 08 keyboard registry.

## Gates before done
bun run check (new files must add 0 errors), bun run test:unit, bun run test:dupes (<3%),
superpowers:code-reviewer PASS, e2e-runner golden path (autosave->panel lists it->restore->export),
Playwright visual-diff ≤0.5% per surface. Update docs/execution-phase/cluster-reports/W12a-cluster-09-DONE.md.

Begin with superpowers:using-superpowers, then read the docs above, then executing-plans from Task 13.
```
