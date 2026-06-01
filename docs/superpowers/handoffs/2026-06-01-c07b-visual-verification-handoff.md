# Cluster 07b — Visual Verification + Bug-Fix Handoff (2026-06-01)

> **You are picking up a remediation that is code-complete but VISUALLY UNVERIFIED.**
> Nothing built in this branch has been rendered in a browser. Your job: run it, look at
> it, diff it against the Figma hi-fi, and **fix every bug you find** until each surface is
> correct and proven. Be meticulous. Test relentlessly. Assume things are broken until you
> have seen them work.

---

## 0. TL;DR mission

1. Launch the app, exercise every Cluster 07b surface in a real browser.
2. Run the Playwright E2E spec; make it pass; expand it.
3. Visual-diff each surface against the Figma/hi-fi PNGs; fix pixel/layout/behavior drift.
4. Fix **all** bugs found (they will exist — none of this has been seen rendered).
5. Use the `superpowers:code-reviewer` agent after each batch of fixes.
6. Keep the gates green (`bun run check`, `bun run test:unit` for 07b files, `bun run test:dupes`).
7. Commit per logical fix; the branch is already pushed.

---

## 1. Where everything is

- **Repo / worktree:** `/Users/jihoyang/kova-build-c07b`
- **Branch:** `app/cluster-07b-inspector` (pushed to `origin`; remote `github.com/jihoyang333/kova-open-pencil`)
- **Last commit:** `a956351e` — `fix(c07b): remediate W11b audit …`
- **The audit you are satisfying:** `docs/execution-phase/wave-audits/reports/W11b-cluster-07b-AUDIT-REPORT.md` (read it fully — it is the spec for "done").
- **What was done + the fidelity gate + a founder-smoke checklist:**
  `docs/execution-phase/cluster-audits/cluster-07b/KOVA_AUDIT.md` (see **§7 checklist**)
  and `…/cluster-07b/tokens-used.md`.
- **Prepared PR body (PR not yet opened — `gh` was unauthenticated):**
  `/Users/jihoyang/.claude/jobs/8fad9ee1/tmp/PR_BODY_c07b.md`
  Open with: `gh auth login` then `gh pr create --base main --head app/cluster-07b-inspector --body-file <that file>`.

### Hi-fi reference sources (Rule-1 visual truth)
- Canvas overlays: `design-system/hifi/canvas-chrome/Kova Hi-Fi 09 Canvas Overlays - Dark.html`
- Inspector / right panel property groups: `design-system/hifi/canvas-chrome/Kova Canvas - Final.html` (`.right`, lines ~327–461)
- Top-chrome menus: `Kova Hi-Fi 08 Top Chrome Menus - Dark.html`
- Find the actual PNG/screenshot references under `design-system/hifi/**` and `claude-design-files/**`. If PNGs don't exist, render the hi-fi HTML in the browser and compare against that (it IS the source of truth).
- Token resolver: `main-main-kova-scope/design-system/TOKEN_CANONICAL.md`; values in `kova-hifi.css :root`; Tailwind binding in `src/app.css @theme`.

---

## 2. What was changed (the surfaces you must verify)

All on commit `a956351e`. **Each is logic/unit-tested in isolation but NOT visually verified.**

### CRITICAL fixes
- **C1 — find canvas-focus.** `src/views/EditorView.vue` now calls `useFindSearch()` +
  `useCameraPan()`. Files: `src/composables/use-find-search.ts`, `use-camera-pan.ts`,
  `src/stores/find.ts`, `src/components/find/SearchPanel.vue`,
  `src/components/canvas-overlays/{FindOverlay,DimLayerOverlay}.vue`.
  **Verify:** Cmd+F opens panel → type a node name → non-matches dim (rgba(0,0,0,0.6)) →
  single match auto-pans camera (250ms ease). Multi-match: no pan. Esc closes. Click a
  dimmed node → exits find + selects it.
- **C2 — eyedropper.** New `src/composables/use-eyedropper-sampler.ts`; rewrote
  `src/components/canvas-overlays/EyedropperCrosshair.vue`; `src/composables/use-canvas.ts`
  now sets `preserveDrawingBuffer: 1`; trigger in `src/composables/use-shortcut-registration.ts`.
  **Verify:** select a shape → Ctrl+C → cursor hidden, 96px circular magnifier follows
  pointer showing REAL magnified pixels + centered reticle + live hex chip (#2c2c2c bg) →
  click samples → selection fill becomes that color → Esc cancels. **High bug risk:** the
  Skia/WebGL/WebGPU pixel readback (`drawImage` of the canvas) may return blank/black or be
  DPR-misaligned. This is the single most likely thing to be broken. Verify the magnifier
  shows true colors and the sampled hex matches the pixel under the reticle exactly.
- **C3 — paste props.** `src/stores/clipboard.ts` (`buildPasteChanges`),
  `src/composables/use-copy-paste-props.ts`. **Verify:** copy props (⌘⌥C) from a styled
  node → select others → paste (⌘⌥V) → fills/strokes/effects/etc. apply, repaint, are
  undoable (⌘Z), incompatible fields skipped.

### HIGH fixes
- **H1 — inspector was completely empty on desktop.** NEW boot bridge
  `src/inspector/register-inspector-sections.ts` (called from EditorView). NEW section
  wrappers `src/components/inspector/sections/{Fill,Stroke,Effects}InspectorSection.vue`;
  NEW `src/components/inspector/fill-type.ts`; `BooleanOpsRow` registered directly;
  `EffectEditor.vue` width fix. Reuses legacy `src/components/properties/*Section.vue`.
  **Verify HEAVILY — this is brand-new UI that has never rendered:**
  - Select nothing → Page section. Select a rectangle → Position, Layout, Appearance,
    Boolean, Fill, Stroke, Effects, Export in that order. Select TEXT → Typography appears.
  - **Fill:** multi-fill list (add/remove/visibility/reorder); PaintEditor mode tabs
    (Solid/Linear/Radial/Angular/Diamond/Image) actually switch `Fill.type` and re-render
    the canvas; gradient stops add/remove; angle input (linear/angular only); image scale
    modes (Fill/Fit/Crop/Tile). **Note:** there is NO per-fill selection in the list yet —
    the editor edits the active index (defaults to last added). Confirm this is acceptable
    or wire row-click selection (likely needed — flag to founder).
  - **Stroke:** color (ColorInput→ColorPicker — watch for ResizeObserver/popover issues in
    the real app), weight, visibility, **StrokeAlignRow** (Inside/Center/Outside applies to
    all strokes).
  - **Effects:** add seeds a drop shadow; EffectRow list select/toggle/delete; EffectEditor
    X/Y/Blur/Spread (shadows) or Radius (blur) edits live.
  - Compare the whole right panel against `Kova Canvas - Final.html .right` — spacing,
    dividers, label sizes, swatch sizes. It was assembled from the spec, not pixel-matched.
- **H2 — slice + measurement.** `src/composables/use-canvas-input.ts` (added `SLICE` to
  `TOOL_TO_NODE`; added measurement two-click handler); NEW
  `src/composables/measurement-geometry.ts`. **Verify:** activate slice tool → drag → a
  SLICE region (dashed border + name tag) appears and the "Export N slices" button shows.
  Measurement tool → click node A → click node B → a measurement annotation draws between
  them (correct side/axis). The slice/measurement tools are activated from the bottom
  toolbar — confirm those toolbar buttons exist and set `activeTool` to `SLICE`/`MEASUREMENT`
  (if not wired in the toolbar, that's a bug to fix).
- **H3 — pixel grid.** `PixelGridOverlay.vue` + `CanvasOverlayLayer.vue` +
  `editor.ts` default `pixelGrid:false`. **Verify:** Shift+' toggles the grid at ANY zoom;
  it also auto-shows above 800%.

### MEDIUM/LOW
- **M1/M2:** `FrameOutlines/LayoutGuides/SliceRegion/MaskOutlines/FindOverlay` overlays now
  use `getAbsolutePosition` + full subtree DFS. **Verify with NESTED nodes** (frame inside
  frame, mask inside group): outlines/glyphs must land on the correct absolute position,
  including children, at all pan/zoom levels. Camera-transform alignment is bug-prone.
- **M3:** removed stale `find` store getter. **L1–L4:** EffectEditor `w-64`, chip color
  constant, camera-pan local state, `MULTIPLE_FILLS_CAP` wired.

### Test-infra (audit item 10) — be aware
- `tests/engine/shopify/ai-tools.test.ts` now uses dependency injection (no global
  `mock.module` of core/figma-factory). `src/ai/kova-tools.ts` gained an optional 2nd
  `deps` arg (production unaffected).
- `tests/vue-plugin.ts` resolves `~icons/*`; `tests/setup-dom.ts` adds
  ResizeObserver/StorageEvent/history polyfills.

---

## 3. KNOWN GAPS / SUSPECTED BUGS (start here)

1. **Eyedropper pixel readback** (C2) — most likely broken. WebGL `preserveDrawingBuffer`
   + DPR scaling + possible WebGPU backend. Verify true-color sampling; if blank/black,
   you may need to read via the Skia surface snapshot instead (note: `packages/core` is
   lift-the-lock-eligible for 07b but the audit praised zero core mods — prefer app-layer).
2. **Inspector section layout** (H1) — assembled to spec, never pixel-matched to hi-fi.
   Expect spacing/border/typography drift. PaintEditor/ImageFillPicker/EffectEditor are
   `w-64` popover-style blocks dropped into a 264px panel — confirm they fit and look right.
3. **No per-fill selection** in MultipleFillsList → PaintEditor edits a fixed index. Likely
   needs row-click-to-select. Confirm intended behavior with founder, or implement.
4. **Slice/Measurement toolbar entry** — verify the bottom toolbar actually exposes these
   tools and sets `activeTool`. If missing, wire it (`useSliceTool`/`useMeasurementTool`
   activate()).
5. **Measurement** is node→node anchored (Figma model), not free point-to-point. Sides are
   geometry-derived. Verify the annotation renders sensibly.
6. **Full `bun run test:unit` is at pre-existing baseline (~41 fail)** from cross-cluster
   Bun `mock.module` leakage (dashboard/settings tests globally stub `reka-ui`) + happy-dom
   event pollution — **all 07b tests pass in isolation.** Do NOT chase this unless asked; if
   you do, the real fix is converting those ~3 reka-ui `mock.module` files + ~20 KovaIcon
   mockers to local VTU stubs / the `~icons` resolver already added.

---

## 4. How to run

```sh
cd /Users/jihoyang/kova-build-c07b
bun install                      # if needed
bun run dev                      # Vite dev server → http://localhost:1420
# editor route exposes window.__OPEN_PENCIL_STORE__ (see tests/e2e/*.spec.ts pattern)
```

### Playwright E2E (the spec already written for you)
```sh
bunx playwright install          # if browsers missing
bunx playwright test tests/e2e/cluster-07b.spec.ts        # MAKE THIS PASS
bun run test                     # full Playwright visual-regression suite
```
- The spec is `tests/e2e/cluster-07b.spec.ts` — store-driven, covers slice/boolean/find/
  pixel-grid/inspector. It is UNVERIFIED; selectors may be wrong (e.g. the find input
  selector is a guess — check `SearchPanel.vue` for the real `data-test`). Fix selectors,
  make it green, then **add** specs for eyedropper sampling, gradient type switch, stroke
  align, effect add/edit, nested-overlay positioning.
- Prefer the **Vercel Agent Browser / `e2e-runner` agent** if available; Playwright fallback.

### Visual diff vs hi-fi
- The repo has `tests/visual-diff/` (`playwright.config.ts` present). Add visual snapshots
  for each 07b surface (right panel per selection type, frame/layout/mask/slice overlays,
  find dim+pan, eyedropper magnifier, pixel grid). Baseline against the hi-fi PNGs/HTML.
  Target ≤2% pixel diff per the audit. Where the hi-fi has no exact PNG, render the hi-fi
  HTML and compare structurally.
- Capture 3 screenshots per surface (default / hover-or-active / edge state) per the
  IMPLEMENTATION_PROMPT Phase-1 gate; drop them next to `cluster-audits/cluster-07b/`.

---

## 5. Gates to keep green (run before each commit)

```sh
bun run check        # oxlint --type-aware --type-check — MUST add 0 errors on 07b files
                     # (135 PRE-EXISTING repo errors exist; don't add to them)
bun run test:unit    # run 07b files in isolation to confirm green; full suite ~41 pre-existing fails
bun run test:dupes   # must stay < 3% (currently 1.1%/1.44%)
bun run format       # oxfmt
```
Quick 07b isolation check:
```sh
bun test tests/unit/components/inspector/ tests/unit/inspector/ tests/unit/integration/ \
  tests/unit/composables/{use-find-search,use-camera-pan,use-copy-paste-props,measurement-geometry}.test.ts \
  tests/unit/stores/{clipboard,find,editor-overlays}.test.ts \
  tests/unit/components/canvas-overlays/ tests/engine/shopify/ai-tools.test.ts
```

---

## 6. Working rules (from CLAUDE.md)

- Vue 3 `<script setup>`, Composition API, Tailwind utilities only (no `<style>`, no raw
  hex/px in `class` — overlay paint goes through `OVERLAY_COLOR` in `constants/overlays.ts`).
- `<KovaIcon>` only (no `<icon-lucide-*>`). `e.code` not `e.key`. `crypto.getRandomValues`.
  `culori` for color. No `any`, no `!`.
- **Never** modify `packages/core/` (engine/renderer/scene-graph) unless logged in
  `CHANGELOG-KOVA.md` — the audit's headline win was zero core mods; keep it.
- After a logical chunk of fixes: run **`superpowers:code-reviewer`** against the diff +
  the audit. Address CRITICAL/HIGH. Verify in the browser before claiming done — green
  unit tests ≠ working feature (founder rule).
- Use `AskUserQuestion` for any real decision (e.g. per-fill selection UX, whether a visual
  deviation from hi-fi is acceptable). The founder prefers being asked.

## 7. Definition of done for YOU

- [ ] Every surface in §2 rendered + manually exercised in the browser; bugs fixed.
- [ ] `tests/e2e/cluster-07b.spec.ts` green + expanded (eyedropper, gradient switch, stroke
      align, effects, nested overlays).
- [ ] Visual-diff snapshots for each surface vs hi-fi, ≤2% drift, committed.
- [ ] Eyedropper proven to sample true canvas pixels.
- [ ] `bun run check` adds 0 07b errors; `test:dupes` < 3%; 07b unit/integration green.
- [ ] `superpowers:code-reviewer` run on the final diff; CRITICAL/HIGH addressed.
- [ ] KOVA_AUDIT §7 checklist all ticked; commit + (if `gh` authed) open the PR.
- [ ] Update this handoff / the audit report with what you verified and any new findings.
