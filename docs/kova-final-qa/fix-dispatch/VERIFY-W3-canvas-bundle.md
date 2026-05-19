# Wave 3 Canvas Bundle — Verification Audit

Per-finding verification record. One line appended per verify-only finding (W0 sweep confirmations). Real edits live in PRD/Plan markdown directly.

| Finding | Cluster | Verification command | Result | Notes |
|---|---|---|---|---|
| B-CRIT1 | 06 | `grep -n "/dashboard?brandId" docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md` | 0 hits — clean (W0-3 applied) | Plan 06:101 area shows `brand-label-navigates.spec.ts` routes to `/brand/:brandId` per W0-3 canonical |
| HIGH-10 | 06 | `grep -n "useRightPanelStore\|right-panel" docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md` | canonical at `src/stores/right-panel.ts` (Plan 06:33, 357) | W0-3 canonicalized; Cluster 10 Wave 4 will sync imports |
| C-MED17 | 06 | `grep -nE "showUI = !\|toggle.{0,20}showUI\|!editor\.showUI" docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md` | 0 hits — clean, enum already canonical | Plan 06 Task 2 defines `'hidden'\|'minimized'\|'full'` enum + `setUIVisibility()` action (line 242, 259-264, 307-313, 1708). Dispatch's `'all'\|'minimal'\|'hidden'` triple was off; PRD 06 §2.1 row 5 + §6.2 use `'hidden'\|'minimized'\|'full'` as authoritative. |
| B-NOTE2 | 07a | `grep -nE "packages/core/\|founder lock\|lift.{0,15}lock" docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md` | exception documented (Plan 07a §Goal line 5 + Architecture line 7 + file inventory lines 53–58 explicitly enumerate `packages/core/` modifications) | Per founder lock #16 / CLAUDE.md amendment (00c §895): Cluster 07a is the documented exception for SLICE + page-level Measurement. No change required. |
