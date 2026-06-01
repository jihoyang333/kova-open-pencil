# Cluster 07b — Canvas Engine Inspector + Overlays — Execution Doc

**Wave:** W11b (parallel-3: 05 brand-kit · 07b inspector · 08 menus+shortcuts)
**Branch:** `app/cluster-07b-inspector`
**Worktree:** `/Users/jihoyang/kova-build-c07b` (branched from `app/cluster-06-canvas-chrome` @ `ccf02903`)
**Plan:** `docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md` (4767 lines, 11 phases)
**PRD:** `docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md`
**Date:** 2026-05-31
**Skills:** superpowers:executing-plans (active) · TDD per task · code-reviewer at end

---

## 0. Pre-flight dependency verification (DONE)

07b launch gate = "Cluster 06 (W10) merged." W10 was PARTIAL on 2026-05-27 but
**completed 2026-05-31** (8 commits on `app/cluster-06-canvas-chrome`, tree clean,
HEAD `ccf02903`). 07b branched from that HEAD. All three foundation pieces 07b
hard-depends on are present and verified:

| Need | Source | Verified |
|---|---|---|
| `CanvasOverlayHost.vue` (mount point for 07b's 10 overlays) | c06 T16 (`2eab07dc`, "Cluster 07b slot") | ✓ `src/components/editor/CanvasOverlayHost.vue` |
| `ZoomHud.vue` | c06 T16 | ✓ `src/components/editor/ZoomHud.vue` |
| EditorView mounts new chrome (TopChrome/BottomToolbar/CanvasOverlayHost) | c06 T13+T14 (`35c1e1aa`) | ✓ `src/views/EditorView.vue:207,229,234` |
| `/canvas/:canvasId` route + guards (07b e2e gate) | c06 T17 (`ddd6936d`) | ✓ `src/router.ts:297` |
| `InspectorRouter` + RightPanel slot (07b inspector sections plug in) | c06 T15 (`37107862`) | ✓ |
| Phase-5 section targets | 07a / earlier | ✓ `src/components/properties/{Effects,Typography,Fill,Export,Stroke}Section.vue` + `src/components/ColorPicker.vue` |

**Still open (NOT blocking 07b build):** c06 T21 = founder manual smoke (founder action).

---

## 1. Critical review of the plan (concerns raised before execution)

1. **07a engine proxy surface (Phase 0/3/4).** Plan §7 says all engine APIs
   (GradientPaint, BooleanOperation, Effect, Paint, ScaleMode) consumed via the
   `@open-pencil/core` PUBLIC proxy only — never deep imports. Task 10.2 grep-gates
   this. **Action:** verify proxy exports at Task 0.1; if a needed type/op is missing
   from the proxy, STOP (07a gap, not a 07b task — `packages/core/` is lift-the-lock
   restricted and 07a-owned).
2. **`use-canvas-drop` triple-touch (wave-merge risk).** c06 T8 already extended it
   to 5-MIME dispatch; sibling c05 (brand-kit) touches it; 07b Task 6.1 adds the
   brand-asset image-fill receiver. **Action:** Task 6.1 must extend additively (new
   branch in existing dispatch), never rewrite — minimizes the W11 merge conflict.
3. **Cross-cluster contract stubs.** c06 DONE notes touchpoints to Cluster 10
   (chat-refs), 07a (tools), 02 (ownership) are contract-stubbed for wave-merge. 07b
   adds its own to-08 (shortcuts) + to-05 surfaces. Keep 07b's cross-cluster seams as
   thin typed contracts; do not reach into sibling internals.
4. **Find feature ownership (CT-022).** 07b OWNS find end-to-end (useFindStore,
   SearchPanel, DimLayerOverlay, FindOverlay, useCameraPan) — NOT 08. Confirmed in
   plan Phases 1.6/1.7, 2.11–2.14, 4.9, 4.10, 4.12–4.14. No 08 coordination needed
   for find.
5. **Boolean shortcuts** = ⌥⇧U / ⌥⇧S / ⌥⇧I / ⌥⇧E (W5a fix — NOT ⌘⌥U/S/I/X).
   Use `e.code` (KeyU/KeyS/KeyI/KeyE), never `e.key` (Option transforms chars on Mac).
6. **Eyedropper** = web fallback default; `EYEDROPPER_NATIVE_TAURI` flag stays FALSE
   (Phase 2, C-LOW07b.5).

No blockers. Proceeding.

---

## 1b. Engine type-mapping addendum (plan-vs-core reconciliation)

Pre-flight (Task 0.1) revealed the plan imports Figma-idealized type names that the
real OpenPencil core (`@open-pencil/core`, read-only) does NOT export. Core is ground
truth. The capability exists in every case — only names differ. Mapping applied
throughout Phases 1/3/5 (translate, don't copy-verbatim per IMPLEMENTATION_PROMPT §0):

| Plan name (Figma-ideal) | Real core export | Notes |
|---|---|---|
| `Paint` / `GradientPaint` / `SolidPaint` | `Fill` | One interface, discriminated by `type: FillType` (`SOLID` / `GRADIENT_LINEAR` / `GRADIENT_RADIAL` / `GRADIENT_ANGULAR` / `GRADIENT_DIAMOND` / `IMAGE`). Gradient stops via `Fill.gradientStops: GradientStop[]`, transform via `Fill.gradientTransform`. |
| `ImagePaint` | `Fill` w/ `type:'IMAGE'` | `imageHash`, `imageScaleMode`, `imageTransform` fields on `Fill`. |
| `ScaleMode` | `ImageScaleMode` | `'FILL' \| 'FIT' \| 'CROP' \| 'TILE'` — values already matched plan. |
| `Effect` | `Effect` | ✓ exact match (5 types: DROP_SHADOW/INNER_SHADOW/LAYER_BLUR/BACKGROUND_BLUR/FOREGROUND_BLUR). |
| `GradientStop`, `BlendMode`, `Stroke`, `SceneNode` | same | ✓ re-exported from index. |
| `BooleanOperation` (type) | — (no type) | Boolean ops are core **tools**: `booleanUnion` / `booleanSubtract` / `booleanIntersect` / `booleanExclude` (`tools/registry.ts`), invoked via tool/RPC. BooleanOpsRow dispatches these; 07b defines a local `BooleanOpKind = 'UNION'\|'SUBTRACT'\|'INTERSECT'\|'EXCLUDE'` UI enum, NOT a core type. |

**Rule:** never deep-import `packages/core` internals (kiwi codec `Paint` etc.); consume
only the public index re-exports above. Task 10.2 grep-gate enforces this.

## 2. Execution plan (phase → tasks → commit)

One commit per task. Commit prefixes: `feat(c07b-tNN)` · `test(c07b)` · `fix(c07b-review)`.
TDD every task: RED (write test, run, confirm FAIL) → GREEN (minimal impl, run, PASS) → COMMIT.

- **Phase 0 — Setup** (0.1): overlay constants + feature gates. Verify 07a proxy here.
- **Phase 1 — Stores** (1.1–1.7): useClipboardStore, useEyedropperStore, extend
  useEditorStore (overlays + activeTool), useFindStore.
- **Phase 2 — Composables** (2.1–2.14): useEyedropper, useSliceTool, useMeasurementTool,
  useExportPipeline, useCopyPasteProps, useFindSearch, useCameraPan.
- **Phase 3 — Inspector components** (3.1–3.10): VerticalTextAlignRow, StrokeAlignRow,
  JpgQualityDropdown, BooleanOpsRow, GradientStopList, PaintEditor, ImageFillPicker,
  EffectRow, EffectEditor, MultipleFillsList.
- **Phase 4 — Overlays** (4.1–4.14): CanvasOverlayLayer wrapper, FrameOutlines,
  MaskOutlines, SliceRegion, then per-overlay TDD 4.5–4.11b (PixelGrid, LayoutGuides,
  HoverContour, SnapIndicators, DimLayer, FindOverlay, EyedropperCrosshair,
  MeasurementAnnotations), SearchPanel, SearchResultRow, mount in EditorView.
- **Phase 5 — Section extensions** (5.1–5.6): Effects, Export, Stroke, Typography, Fill,
  ColorPicker wiring.
- **Phase 6 — DnD + mount** (6.1–6.2): brand-asset image-fill receiver (additive),
  mount CanvasOverlayLayer in EditorView.
- **Phase 7 — Shortcuts** (7.1): register all (⌥⇧U/S/I/E booleans, Shift+' pixel grid,
  etc.) via `e.code`.
- **Phase 8 — Integration tests** (8.1–8.9).
- **Phase 9 — E2E** (9.1–9.10): 10 Playwright specs.
- **Phase 10 — QA** (10.1–10.4): gates, grep verifications, manual smoke, PR.

Showcase mount point for overlay/component dev: `/dev/cluster-07b` showcase route.

---

## 3. Design-system discipline (STRICT — most surface area for violations)

Re-read Design Rider §2 before each component. Per-component:
- Inspector right-panel = `.panel.inspector`; rows = `.prop-row` from kova-hifi.css.
- Gradient editor = existing pattern (no net-new component family).
- Icons via `<KovaIcon name="...">` with correct lucide names. **Zero `<icon-lucide-*>`.**
- Find overlay = `.overlay.find` pattern. Camera pan = scroll-based, no gesture lib.
- **Zero new tokens. Zero hex. Zero `<style>` blocks.** Tailwind 4 utilities only.
- Hover/focus/active/selected/disabled = dynamic bindings, never hardcoded classes.
- Phase 1 fidelity gate (IMPLEMENTATION_PROMPT §0): KOVA_AUDIT.md + tokens-used.md
  before any Vue. Visual-diff ≤0.1% component / ≤0.5% screen. 3-screenshot PR artifact.

---

## 4. Cluster-end gates

1. All plan tasks committed; zero `<icon-lucide-*>` anywhere in c07b code (W5a refactor verify).
2. `bun run check` / `build` / `test:unit` / `test:dupes` (<3%) — green.
3. superpowers:code-reviewer — PASS (address CRITICAL/HIGH, fix MEDIUM where possible).
4. e2e-runner: apply gradient · boolean union · eyedropper pick · find text node via
   canvas-focus search · pixel grid toggle.
5. Playwright visual diff (inspector panels, gradient editor, find overlay) — ≤2%.
6. Done report → `docs/execution-phase/cluster-reports/W11b-cluster-07b-DONE.md`.

---

## 5. Wave-merge notes (for W11 integration)

- `use-canvas-drop.ts` touched by c06+c05+c07b — additive only.
- 07b's to-08 (keyboard) + to-05 (brand asset fill) seams = thin typed contracts.
- Branch base is c06 (`ccf02903`); siblings 05 branched earlier — integrator resolves.
