# W11a — Cluster 05 (Brand Kit + Drag-Drop) Execution Prompt

**Wave:** W11 (parallel-3: 05, 07b, 08)
**Cluster:** 05 — Brand Kit panel + Drag-Drop (color/font/logo/saved-block → canvas)
**Status:** ready after W10 (Cluster 06) merged
**Prerequisites:** Cluster 06 canvas chrome, Cluster 03 brand kit data
**Worktree:** YES — `/Users/jihoyang/kova-build-c05`

---

## Founder pre-flight (do once for W11)

```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1
git checkout feat/m9-shopify
git pull origin feat/m9-shopify
git branch app/cluster-05-brand-kit feat/m9-shopify
git branch app/cluster-07b-inspector feat/m9-shopify
git branch app/cluster-08-menus feat/m9-shopify

git worktree add ../kova-build-c05 app/cluster-05-brand-kit
git worktree add ../kova-build-c07b app/cluster-07b-inspector
git worktree add ../kova-build-c08 app/cluster-08-menus

git worktree list
```

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-build-c05`. Opus 4.7.

---

## PROMPT (paste verbatim)

```
You are the W11a execution-phase agent. Build Cluster 05 — Brand Kit
panel section + Drag-Drop from Brand Kit to canvas.

Parallel-3 wave. Siblings: 07b (inspector + overlays), 08 (menus +
shortcuts). Stay in your worktree at /Users/jihoyang/kova-build-c05.

## Worktree discipline (standard)

DO NOT run `git worktree add` or `git checkout <other branch>`.
DO push only `app/cluster-05-brand-kit`.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/kova-final-prds/05-brand-kit-and-drag-drop.md
4. docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md
5. docs/execution-phase/claude-design-files/README.md  (REFERENCE ONLY — plan supersedes per Mandate 8; ignore conflicts between this README and the plan)
6. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md  (CANONICAL FIDELITY CONTRACT — read end-to-end. §0 is the 3-rule formulation: (1) visual values are copied, (2) DOM structure is translated, (3) behavior is engineered. "Copy DOM verbatim" is FORBIDDEN. Phase 1 gate = KOVA_AUDIT.md + tokens-used.md before any Vue. Visual-diff thresholds 0.1% component / 0.5% screen. 3-screenshot PR artifact per surface.)
7. CLAUDE.md
8. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
9. Hi-fi (Brand Kit panel + saved-blocks + upload states) — full paths (also see Plan 05 §Hi-fi Visual Reference for complete mapping):
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi 03 Brand Dashboard - Dark.html (Assets panel)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html (Brand Kit settings — 7 sub-tabs)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/dark/batch-0/Kova Hi-Fi B3 Brand Kit CRUD Modals - Dark.html (Add/Edit/Delete tone-snippets + saved-blocks)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B8 Upload States - Dark.html (drop zone idle/hover/in-progress/success/error)
10. Canvas drag-drop visual reference (full path):
    - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/drag-and-snap-firing.png

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:executing-plans
3. superpowers:test-driven-development
4. superpowers:code-reviewer (end)

## Conditional subagents

- vue-expert — drag-drop reactivity, brand-kit panel state
- database-reviewer — 5 brand-kit RPCs (per W5a CT-013 — inline RPC
  bodies OR T8 search_path assertion)

## Cluster 05 scope

- Canvas Assets panel — Brand Kit section
  - Colors list (drag handle per row)
  - Fonts list (drag handle per row)
  - Logo (single, drag-handle)
  - Saved blocks list (drag handle per row — per Q8 founder lock)
- Drag-drop wiring:
  - MIME types:
    - application/x-kova-color-token
    - application/x-kova-font-token
    - application/x-kova-logo-asset
    - application/x-kova-saved-block (per Q24 founder spec)
  - use-canvas-drop.ts handler — spawn TEXT node from saved block
    payload with content pre-filled
  - Snap-on-drop visual feedback (matches Figma drag-and-snap)
- enqueueBrandKitExtract function (Cluster 02 consumes — per C-MED7)
- 5 brand-kit RPCs (per W5a CT-013):
  - Inline RPC bodies in Plan 05 T1 + T2 (with SET search_path =
    public, pg_temp), OR
  - T8 RLS test asserts every PRD §4.1 RPC has SET search_path
  - Whichever Plan 05 §6 task spec mandates

## Hi-fi references

Brand Kit panel layout in Assets panel section.
Saved blocks list with drag handles.
Snap visual states from drag-and-snap-firing.png.

## Branch + commits

Branch: app/cluster-05-brand-kit (already checked out in worktree)
Path: /Users/jihoyang/kova-build-c05

Commit format: feat(c05-tNN), test(c05), fix(c05-review)
ONE COMMIT PER TASK.

## Per-task flow

Standard TDD per Plan 05 §6.
Drag-drop tests use DataTransfer mock.
RPC integration tests against local supabase.

## Design-system compliance

Brand Kit panel = .panel.assets pattern.
Drag handle = .drag-handle icon (KovaIcon).
Token rows = .token-row variants (color swatch / font preview / logo
thumb / block preview).
Snap visual = existing .snap-target / .snap-line patterns from canvas
chrome (Cluster 06).
Zero new tokens.

## Cluster-end gates

1. All Plan tasks committed
2. bun run build / check / test:unit / test:dupes — green
3. supabase migration — RLS + 5 RPCs verified (or T8 assertion green)
4. database-reviewer — PASS on RPCs
5. superpowers:code-reviewer — PASS
6. e2e-runner — drag color → canvas → fill applied; drag saved block
   → canvas → TEXT node created with content pre-filled
7. Playwright visual diff (Brand Kit panel, drag preview) — ≤ 2%

## Done report

Path: docs/execution-phase/cluster-reports/W11a-cluster-05-DONE.md

Print when done:
  W11a CLUSTER 05 DONE. <N> commits pushed to app/cluster-05-brand-kit.

Begin.
```

---

**Estimated wall-clock: 6-10h (Opus). Token spend: $250-450.**
