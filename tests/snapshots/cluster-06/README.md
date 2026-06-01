# Cluster 06 — visual-diff snapshots + per-surface written diffs

**Status:** Phase 4 scaffold (W10 audit remediation 2026-05-27). Per-surface
baselines generate on first `bun run test:visual` run after Task 14 mounts the
new chrome under the production canvas route.

**Authority:** `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md`
§6 + §12. Cluster 06's mockup source is the outer-repo `compressed-figma-canvas-ui/`
PNG tree (NOT an in-repo `.html` hi-fi — the design source is rasterized).

---

## Surfaces

Cluster 06 ships chrome for the canvas editor. The 10 surfaces named in the
W10 audit prompt §M:

| # | Surface | Mockup PNG (outer-repo) | Clip selector |
|---|---|---|---|
| 1 | bottom-toolbar (4 variants) | `compressed-figma-canvas-ui/bottom-toolbar-*.png` | `[data-testid="bottom-toolbar"]` |
| 2 | layers-panel + inspector-panel (3 variants) | `compressed-figma-canvas-ui/layers-panel-left-and-inspector-panel-right-*.png` | `[data-testid="left-panel"]` + `[data-testid="right-panel"]` |
| 3 | right-panel rectangle-selected (3 variants) | `compressed-figma-canvas-ui/right-panel-rectangle-selected-*.png` | `[data-testid="right-panel"]` |
| 4 | right-panel text-selected | `compressed-figma-canvas-ui/right-panel-text-selected.png` | `[data-testid="right-panel"]` |
| 5 | multi-select-1 + hover variants | `compressed-figma-canvas-ui/multi-select-1*.png` | canvas surface |
| 6 | click-filter-button | `compressed-figma-canvas-ui/click-filter-button.png` | menu popover |
| 7 | click-plus-button | `compressed-figma-canvas-ui/click-plus-button.png` | menu popover |
| 8 | frame-selected-on-canvas | `compressed-figma-canvas-ui/frame-selected-on-canvas.png` | canvas surface |
| 9 | right-click-on-canvas | `compressed-figma-canvas-ui/right-click-on-canvas.png` | context menu |
| 10 | hover-state | `compressed-figma-canvas-ui/hover-state.png` | hovered tool |

Surface 1-4 are static-chrome surfaces — observable at `/dev/cluster-06`
without engine state. Surfaces 5-10 require engine state (selection,
hover, context menu) and roll into the Task 14 sweep, where EditorView
mounts the new chrome in the production canvas route.

---

## Clip-region method

For Cluster 06, the baseline is the **mockup PNG cropped to the surface's
bounding box**, NOT a live clip from a hi-fi HTML page (since Cluster 06's
source is the rasterized `compressed-figma-canvas-ui/` PNG tree).

**Method per surface (executed in `chrome.visual.spec.ts`):**

1. Open the Vue impl at `/dev/cluster-06`.
2. `await waitForStable(page)` (font ready + networkidle).
3. `await expect(page.locator('<selector>').first()).toHaveScreenshot('<surface>-impl.png', { maxDiffPixelRatio: 0.001 })`.
4. Manually pre-place the mockup-cropped PNG at `<surface>-mockup.png` once
   (one-time crop from outer-repo) so the per-surface `-diff.md` can cite
   identical mockup-vs-impl property values.

**Thresholds:** `maxDiffPixelRatio: 0.001` (0.1%) component-level + screen-level
`maxDiffPixelRatio: 0.005` (0.5%) for full-showcase regressions. `threshold: 0.2`
absorbs anti-aliasing noise.

---

## How to run

**Pre-requisites:**
1. Dev server up: `bun run dev` (Vite at localhost:1420 + `hifi-serve-plugin`).
2. `public/fonts/inter/Inter-Variable.woff2` present.
3. `public/vendor/lucide-sprite.svg` present.

**Generate baselines (first run):**

```sh
bun run test:visual --update-snapshots
```

Writes `<surface>-impl.png` to `tests/snapshots/cluster-06/` under per-test
fixture dirs (`chrome.visual.spec.ts-snapshots/`). Commit baselines.

**Verify diff (regression):**

```sh
bun run test:visual
```

**Update baselines after intentional change:**

```sh
bun run test:visual --update-snapshots
```

---

## Per-surface written diffs

Per IMPLEMENTATION_PROMPT.md §5 + §12 DoD: each surface ships a `<surface>-diff.md`
showing zero discrepancies between mockup-extracted spec and Vue impl. Cluster 06
consolidates per-property citations in:

  `docs/execution-phase/cluster-audits/cluster-06/tokens-used.md`

Per-surface `-diff.md` files in this directory enumerate static-chrome surface
property checks. Interactive surfaces (5-10) land in the Task 14 follow-up sweep.

---

## Carryovers per W10 audit

- **H1** — `/dev/cluster-06` showcase route shipped (W10 remediation).
- **H2** — visual-diff spec + snapshot tree scaffolded (this directory).
- **Deferred to T14** — interactive surfaces (multi-select, hover, context-menu,
  rectangle-selected, text-selected). Engine mount required.
- **Deferred to T14** — `bottom-toolbar` 4 variants (active-state per tool) —
  needs `editor.state.activeTool` toggling. Static baseline ships now; the
  remaining 3 variants land with the engine sweep.
