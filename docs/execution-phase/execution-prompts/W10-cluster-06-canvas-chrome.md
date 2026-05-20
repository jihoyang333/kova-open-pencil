# W10 — Cluster 06 (Canvas Editor Core Chrome) Execution Prompt

**Wave:** W10 (sequential — single cluster)
**Cluster:** 06 — Canvas Editor Core Chrome (bottom toolbar, layers panel, properties panel, file menu, canvas shell)
**Status:** ready after W9 fully merged
**Prerequisites:** Cluster 07a (engine), Cluster 11 (foundation primitives + KovaIcon), Cluster 02 (routing canonical)
**Worktree:** NO

---

## Founder pre-flight

1. W9 merged
2. `/brand/:brandId` routes to a canvas placeholder (Cluster 02 routing)
3. Slice + Measurement NodeType available in packages/core/ scene graph (Cluster 07a)
4. KovaIcon + Reka wrappers + EmailShell available (Cluster 11)

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-main/kova-open-pencil-1`. Opus 4.7.

---

## PROMPT (paste verbatim)

```
You are the W10 execution-phase agent. Build Cluster 06 — Canvas
Editor Core Chrome.

This is the central canvas UI shell. It does NOT touch packages/core/
(canvas, renderer, scene graph are read-only). It wraps and presents
the engine through chrome surfaces.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/kova-final-prds/06-canvas-editor-core-chrome.md
4. docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md
5. docs/execution-phase/claude-design-files/README.md  (hi-fi bundle overview, authority chain, fidelity rule, screen inventory)
6. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md  (authoritative HTML → Vue translation method + Appendix A per-property extraction checklist; mockup wins; per-screen diff loop)
7. CLAUDE.md
8. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
9. Canvas-Final hi-fi (canonical reference implementation per `design.md` §7 — Plan 06 cites line ranges within this file): /Users/jihoyang/kova-main/main-main-kova-scope/batch-b/Kova Canvas - Final.html
10. Figma canvas UI screenshots — specific surfaces in this cluster, read these PNGs:
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/bottom-toolbar.png (+ variants -1, -2, -3, -4)
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/layers-panel-left-and-inspector-panel-right.png (+ variants -2, -3)
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/right-panel-rectangle-selected-1.png (+ -2, -3-drop-shadow)
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/right-panel-text-selected.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/frame-selected-on-canvas.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/multi-select-1.png (+ -hover variants)
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/hover-state.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/click-filter-button.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/click-plus-button.png
   - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/right-click-on-canvas.png
8. OpenPencil canvas baseline (read-only reference): packages/core/

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:executing-plans
3. superpowers:test-driven-development
4. superpowers:code-reviewer (end)

## Conditional subagents

- typescript-pro — complex scene-graph type interactions
- vue-expert — canvas chrome reactivity
- context7 MCP — Reka UI primitive APIs

## Cluster 06 scope

- Routing: /brand/:brandId/canvas/:canvasId (per CT-002 + W5a fix)
- Default tab on first canvas open: AI (per CT-005 + PRD 06 §12.13)
- Canvas shell wrapping OpenPencil engine
- Bottom toolbar with KovaIcon registry names (per B-HIGH7 lock):
  'mouse-pointer-2', 'crop', 'ruler', 'frame', 'square', 'circle',
  'pen-tool', 'type', 'sparkles', 'component'
  - Tool selection state
  - Disabled-state per founder lock (lastpage delete = Figma-style)
- Layers panel (left)
  - Tree view of scene graph
  - Selection sync
  - LeftPanel ResizeHandle (per W3 C-LOW06.3 — Plan 06 Task 11)
- Properties panel (right) with 2-tab framework
  - Design tab
  - AI tab (default per CT-005)
  - useRightPanelStore canonical (NOT useRightPanelTabStore per CT-002)
- File menu
  - Version history handshake bus (per W4 C-MED26 — Plan 06 W3)
  - Settings trigger (Cluster 12 cross-link)
- showUI 3-state enum: 'hidden' | 'minimized' | 'full' (per C-MED17 lock)
- Missing-fonts pill (per W3 C-LOW06.4 + C-LOW06.5)
- Malformed-drop crash-resistance (per W3 C-MED18 Plan 06 Task 8)
- Network-status indicator (Cluster 11 wrapper)

## Hi-fi + visual references

Read Figma canvas UI screenshots fully:
- bottom-toolbar.png (variants 1-4)
- layers-panel-left-and-inspector-panel-right.png (variants 1-3)
- right-panel-rectangle-selected*.png
- right-panel-text-selected.png
- multi-select-1*.png
- click-filter-button.png
- click-plus-button.png
- frame-selected-on-canvas.png
- right-click-on-canvas.png
- hover-state.png

These are the visual target for canvas chrome. Match exactly.

## Branch + commits

Branch: app/cluster-06-canvas-chrome
Pre-flight standard. Sequential wave; no worktree.

Commit format: feat(c06-tNN), test(c06), fix(c06-review)
ONE COMMIT PER TASK.

## Per-task flow

Standard TDD per Plan 06 §6.
For Vue components: mount in /dev/cluster-06 showcase route.
For toolbar tool defs: verify icon names resolve via KovaIcon registry.

## Design-system compliance — STRICT

This cluster has the most surface area + most chance to violate hi-fi
discipline. Re-read Design Rider §2.4 + §2.5 before writing each
component.

- Bottom toolbar = .toolbar.bottom from kova-hifi.css
- Layers panel = .panel.layers
- Properties panel = .panel.inspector
- All icons = <KovaIcon name="..."> (zero <icon-lucide-*> anywhere)
- ResizeHandle = existing primitive or per design.md §3 spec
- Selection states = .selected / .multi-selected classes
- Tool buttons = .tool-btn + .active variant
- No new tokens. No hex literals. No inline styles. No <style> blocks.

## Cluster-end gates

1. All Plan tasks committed
2. bun run build / check / test:unit / test:dupes — green
3. /dev/cluster-06 renders full canvas chrome with all panels
4. superpowers:code-reviewer — PASS
5. e2e-runner — open canvas, select tool, draw rectangle, see in layers,
   inspect in properties panel, toggle right-panel tabs (AI default)
6. Playwright visual diff vs Figma screenshots — ≤ 2% per surface
7. CI grep gate: zero <icon-lucide-*>, zero hex literals, zero <style>
   blocks in cluster code

## Done report

Path: docs/execution-phase/cluster-reports/W10-cluster-06-DONE.md

Print when done:
  W10 CLUSTER 06 DONE. <N> commits to app/cluster-06-canvas-chrome.

Begin.
```

---

**Estimated wall-clock: 8-12h (Opus). Token spend: $400-700.**
