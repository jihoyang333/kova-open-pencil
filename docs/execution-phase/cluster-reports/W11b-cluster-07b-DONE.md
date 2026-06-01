# W11b — Cluster 07b (Canvas Inspector + Overlays) — DONE report

**Branch:** `app/cluster-07b-inspector` (worktree `/Users/jihoyang/kova-build-c07b`, off c06 `ccf02903`)
**Date:** 2026-06-01 (Session 3)
**Status:** **Build phases COMPLETE (0–7). Verification phases (8 integration / 9 E2E / 10.2–10.4 review+smoke+PR) REMAIN.**

---

## What shipped (Phases 0–7)

| Phase | Scope | Tests |
|---|---|---|
| 0 | overlay constants + feature gates (`src/constants/overlays.ts`) | type-check |
| 1 | Pinia stores: clipboard, eyedropper, find; editor-store overlay flags + tool union | 22 |
| 2 | composables: useEyedropper, useSliceTool, useMeasurementTool, **useExportPipeline**, useCopyPasteProps, **useFindSearch**, **useCameraPan** | 34 |
| 3 | 10 inspector components: VerticalTextAlignRow, StrokeAlignRow, JpgQualityDropdown, BooleanOpsRow, GradientStopList, PaintEditor, ImageFillPicker, EffectRow, EffectEditor, MultipleFillsList | 48 |
| 4 | 11 overlays + wrapper + find panels + EditorView mount (FrameOutlines, MaskOutlines, SliceRegion, PixelGrid, LayoutGuides, HoverContour, SnapIndicators, DimLayer, FindOverlay, EyedropperCrosshair, MeasurementAnnotations, CanvasOverlayLayer, SearchPanel, SearchResultRow) | 36 |
| 5 | **additive** section wiring: VerticalTextAlignRow→TypographySection, JpgQualityDropdown+Export-N-slices→ExportSection | 4 |
| 6 | (pre-existing) brand-asset image-fill receiver already in `use-canvas-drop` (c06); CanvasOverlayLayer mounted (4.14) | — |
| 7 | keyboard shortcuts: ⌥⇧U/S/I/E booleans, Shift+' pixel grid, ⌘F/Esc find, eyedropper, copy/paste-props — `e.code` fallback handler, wired into EditorView | 6 |

~48 commits since `ccf02903`. **104 new tests, all green in isolation/batch.**

### Phase 5 scope decision (founder-approved 2026-06-01: "additive wiring, never rewrite")
Only **5.4** (vertical text align) and **5.2** (JPG quality + export-slices) were wired — both genuinely additive (no prior control existed). **5.1/5.3/5.5/5.6 were SKIPPED**: StrokeSection already has an align control (AppSelect), FillSection already renders multi-fill, EffectsSection already manages effects, and gradient editing already lives in FillPicker. Wiring the new components there would duplicate or rewrite working editor-UI rows, which the founder directive forbids. The Phase-3 components remain available for future use.

---

## Gate results

- **Lint** (`bun run lint`, oxlint type-aware + custom open-pencil rules): **0 errors / 0 warnings across all 35 07b-touched files.** Total-repo count (135 errors) is entirely pre-existing — `packages/core/*` (read-only) + untouched `use-canvas-drop.ts` / `use-shopify-connection.ts` (M9/c06). 07b contributes zero.
- **Dupes** (`bun run test:dupes`): **1.11% lines / 1.45% tokens — well under the 3% gate.**
- **Unit** (`bun run test:unit`): 2385 pass / 41 fail. **The 32 pre-existing baseline failures (auth/dashboard/supabase) are unchanged — no regression.**

### ⚠️ Known issue: full-suite mock.module contamination (pre-existing, R6/#6752)
`bun run test:unit` runs `./tests/engine ./tests/unit`. **`tests/engine/shopify/ai-tools.test.ts` calls `mock.module('@open-pencil/core', …)`, which Bun applies process-globally and never restores** — so any test loaded *after* it that uses the real core (scene graph, FigmaAPI) gets the stub. This contaminates 9 of this cluster's tests **only in the full run** (BooleanOpsRow ×1, TypographySection ×2, ExportSection ×2, JpgQualityDropdown ×3, useShortcutRegistration ×1). **All 104 c07b tests pass when run in isolation or as a c07b batch** (`bun test tests/unit/components/{inspector,canvas-overlays,find} tests/unit/composables/use-{export-pipeline,find-search,camera-pan,shortcut-registration} …`). The fix belongs in the M9 test (`mock.restore()` / scoped mock), not in 07b. Surfaced here so the cluster gate isn't misread as a 07b regression.

---

## Engine/plan reconciliations applied (the plan was a skeleton — see PROGRESS R1–R20)
- No `figma.*` singleton: export via editor-store `renderExportImage` (quality plumbed); find via real graph DFS; camera via `state.{panX,panY,zoom}`; booleans via `makeFigmaFromStore(...).booleanOperation(op, ids)`.
- `Paint`→`Fill`, `ImagePaint`→`Fill type:IMAGE` (`imageScaleMode`/`imageTransform`), no `BooleanOperation` type (local `BooleanOpKind`).
- Boolean shortcuts ⌥⇧ (not ⌘⌥). Overlays read real graph (no core mock.module). KovaIcon tests mock the module before dynamic import.
- Fixed a latent plan bug in useCameraPan (superseded-pan promise dangled → resolve-on-cancel).

---

## Remaining work (for next session)
- **Phase 8** — integration tests (effects/export/stroke/typography/fill end-to-end, find flow). Use real-store batch pattern; avoid the ai-tools contamination by not co-running with `tests/engine`.
- **Phase 9** — 10 Playwright E2E specs (gradient apply, boolean union, eyedropper, find canvas-focus, pixel-grid) + visual diff ≤2%. Needs running app + canvas.
- **Phase 10.2** — grep verifications (no `<icon-lucide-*>` in 07b code; no deep core imports).
- **Phase 10.3** — founder manual smoke (`bun run dev` → Cmd+F find, ⌥⇧U boolean, gradient editor, JPG quality, export slices, overlays render under pan/zoom).
- **superpowers:code-reviewer** pass; then **Phase 10.4** PR. (Branch NOT pushed — gated behind review + E2E + founder smoke.)
