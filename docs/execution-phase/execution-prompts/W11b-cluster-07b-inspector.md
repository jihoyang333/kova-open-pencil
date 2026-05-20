# W11b — Cluster 07b (Canvas Engine Inspector + Overlays) Execution Prompt

**Wave:** W11 (parallel-3: 05, 07b, 08)
**Cluster:** 07b — Canvas engine inspector + overlays (find, gradients, boolean ops, eyedropper, etc.)
**Status:** ready after W10 (Cluster 06) merged
**Worktree:** YES — `/Users/jihoyang/kova-build-c07b`

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-build-c07b`. Opus 4.7.

---

## PROMPT (paste verbatim)

```
You are the W11b execution-phase agent. Build Cluster 07b — Canvas
engine inspector + overlays.

Parallel-3 wave. Siblings: 05 (brand kit), 08 (menus + shortcuts).

## Worktree discipline

/Users/jihoyang/kova-build-c07b · app/cluster-07b-inspector

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md
4. docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md
5. docs/execution-phase/claude-design-files/README.md  (hi-fi bundle overview, authority chain, fidelity rule, screen inventory)
6. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md  (authoritative HTML → Vue translation method + Appendix A per-property extraction checklist; mockup wins; per-screen diff loop)
7. CLAUDE.md
8. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
9. Hi-fi (inspector + color picker + canvas overlays) — full paths (also see Plan 07b §Hi-fi Visual Reference for complete mapping):
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-b/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html (scenes 11.9–11.19)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-b/chunk-b5/Kova Hi-Fi 12 Color Picker - Dark.html (scenes 12.5–12.14)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-b/Kova Hi-Fi 09 Canvas Overlays - Dark.html (scenes B8.1–B8.10)
10. Figma canvas UI screenshots (extensive) — full paths, read each PNG:
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/right-panel-rectangle-selected-1.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/right-panel-rectangle-selected-2.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/right-panel-rectangle-selected-3-drop-shadow.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/right-panel-text-selected.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/frame-outline-toggles-on.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/figma-outline-image-reference.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/layout-guides-on.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/mask-glyph-applied.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/figma-find-command-ui-ux.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/figma-find-command-ui-ux-2.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/comment-pin-on-canvas.png

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:executing-plans
3. superpowers:test-driven-development
4. superpowers:code-reviewer (end)

## Conditional subagents

- typescript-pro — complex inspector type interactions (gradient stops,
  boolean op nodes, mask compositing)
- vue-expert — inspector reactivity, overlay rendering
- context7 MCP — verify Reka UI primitive APIs for find overlay

## Cluster 07b scope (per PRD 07b 15 founder locks 2026-05-17)

- Find canvas-focus mode (per CT-022 — Cluster 07b OWNS find feature
  end-to-end, NOT Cluster 08)
  - useFindStore
  - SearchPanel
  - DimLayerOverlay
  - FindOverlay
  - useCameraPan
- 4 gradient types: linear, radial, angular, diamond (per founder lock)
- Boolean operations: Union, Subtract, Intersect, Exclude
  - Keyboard shortcuts: ⌥⇧U / ⌥⇧S / ⌥⇧I / ⌥⇧E (per W5a fix —
    NOT ⌘⌥U/S/I/X)
  - BooleanOpsRow with disabled-state tests (per W3 C-LOW07b.2)
- Effects: drop shadow, inner shadow, layer blur, bg blur, fg blur
- 8 overlays split into per-overlay TDD tasks 4.5–4.11b (per W3
  C-MED-07b.1)
- Eyedropper:
  - Web fallback (default)
  - EYEDROPPER_NATIVE_TAURI feature flag (Phase 2 per W3 C-LOW07b.5)
- Pixel grid auto-on > 800% + Shift+' toggle (per founder lock)
- Mask compositing (per Plan 07a §7.1 + 07b consumer)
- Clipboard paste-skip incompatible-field test (per W3 C-LOW07b.4)
- 17 as-any casts refactored to typed mocks (per W3 B-LOW + W5a icon
  refactor + post-W5a as-any sweep)

## Hi-fi + visual references

Read ALL right-panel-*.png screenshots fully. These define the
inspector layout.

## Branch + commits

Branch: app/cluster-07b-inspector
Path: /Users/jihoyang/kova-build-c07b

Commit format: feat(c07b-tNN), test(c07b), fix(c07b-review)
ONE COMMIT PER TASK.

## Per-task flow

Standard TDD per Plan 07b §6.
For overlay rendering: mount in /dev/cluster-07b showcase.
For find mode: use Vercel Agent Browser interactive test at e2e stage.

## Design-system compliance — VERY STRICT

This cluster has THE most surface area for design violations. Re-read
Design Rider §2 entirely before each component.

- Inspector right-panel = .panel.inspector
- Property rows = .prop-row patterns from kova-hifi.css
- Gradient editor = existing pattern (no new component)
- Boolean op icons via <KovaIcon name="..."> with correct lucide names
- Find overlay = .overlay.find pattern (or new spec'd in design.md)
- Camera pan = scroll-based, no new gesture lib
- Zero new tokens. Zero hex. Zero <style> blocks. Zero <icon-lucide-*>.

## Cluster-end gates

1. All Plan tasks committed (including W5a icon refactor verification —
   zero <icon-lucide-*> anywhere in c07b code)
2. bun run build / check / test:unit / test:dupes — green
3. superpowers:code-reviewer — PASS
4. e2e-runner — apply gradient, perform boolean union, eyedropper pick
   color, find a text node via canvas-focus search, pixel grid toggle
5. Playwright visual diff (inspector panels, gradient editor, find
   overlay) — ≤ 2%

## Done report

Path: docs/execution-phase/cluster-reports/W11b-cluster-07b-DONE.md

Print when done:
  W11b CLUSTER 07b DONE. <N> commits to app/cluster-07b-inspector.

Begin.
```

---

**Estimated wall-clock: 8-12h (Opus). Token spend: $400-700.**
