# W11c — Cluster 08 (Canvas Menus + Popovers + Shortcuts) Execution Prompt

**Wave:** W11 (parallel-3: 05, 07b, 08)
**Cluster:** 08 — Canvas menus + popovers + keyboard shortcuts
**Status:** ready after W10 (Cluster 06) merged
**Worktree:** YES — `/Users/jihoyang/kova-build-c08`

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-build-c08`. Opus 4.7.

---

## PROMPT (paste verbatim)

```
You are the W11c execution-phase agent. Build Cluster 08 — Canvas
menus + popovers + keyboard shortcuts.

Parallel-3 wave. Siblings: 05 (brand kit), 07b (inspector).

## Worktree discipline

/Users/jihoyang/kova-build-c08 · app/cluster-08-menus

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md
4. docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md
5. docs/execution-phase/claude-design-files/README.md  (hi-fi bundle overview, authority chain, fidelity rule, screen inventory)
6. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md  (authoritative HTML → Vue translation method + Appendix A per-property extraction checklist; mockup wins; per-screen diff loop)
7. CLAUDE.md
8. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
9. Hi-fi (top-chrome menus + canvas popovers + find overlay + trash confirm — also see Plan 08 §Hi-fi Visual Reference for complete mapping):
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-b/Kova Hi-Fi 08 Top Chrome Menus - Dark.html (B1.1–B1.9 + B1.11 + Reka shell LOCK)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-b/chunk-b1/Kova Hi-Fi 13 Canvas Popovers - Dark.html (13.1, 13.2)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-b/chunk-b1/Kova Hi-Fi 14 Find Overlay - Dark.html (14.1–14.4)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-b/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html (B13.1–B13.3)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html (modal shells)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html (canvas nav)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html (destructive confirm pattern)
10. Figma canvas UI screenshot (full path):
    - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/right-click-on-canvas.png

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:executing-plans
3. superpowers:test-driven-development
4. superpowers:code-reviewer (end)

## Conditional subagents

- vue-expert — menu reactivity, shortcut handler reactivity
- typescript-pro — keyboard shortcut type-safe handler registry

## Cluster 08 scope (per PRD 08 founder locks)

- Right-click context menus:
  - Empty canvas = Figma full 12-item menu (per founder lock 2026-05-17)
  - Node selected = standard context menu
- Last-page delete = Figma-style disabled item + tooltip (per founder
  lock 2026-05-17)
- Outlines = 3 separate toggles + global Outlines submenu (per founder
  lock)
- File menu (App menu)
  - Version history trigger (handshake bus to Cluster 06 per W4 C-MED26)
  - Settings trigger (Cluster 12 cross-link)
  - Export submenu (Cluster 09 cross-link for export)
- use-keyboard.ts shortcut registry
  - Boolean shortcuts (already in Cluster 07b: ⌥⇧U/S/I/E)
  - Standard shortcuts (Cmd+S, Cmd+Z, Cmd+Shift+Z, etc.)
  - e.code-based handlers (NOT e.key per CLAUDE.md)
  - Per W3 C-MED20 atomic rewrite + W3 C-MED21 split into 2.6a-e per-
    category TDD
- Plan 08 has been rewritten 435→1284 lines with full TDD (per W3
  C-MED20)
- Cmd+K palette KILLED (per 00g-CMDK_KILL_DISPATCH — no command palette
  anywhere)
- FindOverlay residuals stripped (per CT-022 — find is Cluster 07b)

## Hi-fi references

Read all 3 hi-fi files in scope. Menus + popovers + canvas-nav patterns
are extensive.

## Branch + commits

Branch: app/cluster-08-menus
Path: /Users/jihoyang/kova-build-c08

Commit format: feat(c08-tNN), test(c08), fix(c08-review)
ONE COMMIT PER TASK.

## Per-task flow

Standard TDD per Plan 08 §6.
Keyboard shortcut tests: dispatch real KeyboardEvent objects with .code.
Right-click menu tests: simulate contextmenu event, assert menu items.

## Design-system compliance

Menu chrome = .menu pattern from kova-hifi.css.
Menu items = .menu-item + .disabled + .with-shortcut variants.
Tooltips = <KovaTooltip> (Cluster 11 wrapper).
Popovers = <KovaPopover> (Cluster 11 wrapper).
Modals = .dlg per Cluster 11 KovaModal.
Disabled items = .menu-item.disabled (NOT visually hidden — Figma-style).
Keyboard shortcut display = .shortcut span with .key children.
Zero new tokens. Zero hex. Zero <style> blocks. Zero Cmd+K palette.

## Cluster-end gates

1. All Plan tasks committed (including W3 C-MED20 atomic rewrite
   subsumed findings verified individually)
2. bun run build / check / test:unit / test:dupes — green
3. CI grep gate: zero "Cmd+K" / "Command palette" anywhere in cluster
4. superpowers:code-reviewer — PASS
5. e2e-runner — right-click empty canvas → full 12-item menu;
   right-click node → context menu; Cmd+S → save; ⌥⇧U → boolean union
   (cross-cluster smoke with 07b)
6. Playwright visual diff (right-click menus, file menu, popovers) —
   ≤ 2%

## Done report

Path: docs/execution-phase/cluster-reports/W11c-cluster-08-DONE.md

Print when done:
  W11c CLUSTER 08 DONE. <N> commits to app/cluster-08-menus.

Begin.
```

---

**Estimated wall-clock: 6-10h (Opus). Token spend: $250-450.**
