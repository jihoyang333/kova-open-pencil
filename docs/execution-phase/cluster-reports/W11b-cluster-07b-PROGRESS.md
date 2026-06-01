# W11b — Cluster 07b (Canvas Inspector + Overlays) — PROGRESS / Continuation Handoff

**Branch:** `app/cluster-07b-inspector` (worktree `/Users/jihoyang/kova-build-c07b`, off c06 `ccf02903`)
**Status:** **PARTIAL — Phase 0 + Phase 1 + Task 2.1 shipped. Phases 2.3→10 remain.**
**Date:** 2026-05-31
**Commits so far:** 11 (`5528ae59` exec-doc → `708215d0` eyedropper composable)

This cluster's plan is a **skeleton, not paste-ready**. The plan's code snippets were
written against an idealized Figma-style API and a Pinia editor store that do NOT match
the real OpenPencil core / c06 codebase. Every remaining task needs adaptation against
ground truth. This doc captures the reconciliation so the next agent does NOT re-discover it.

---

## Done (verified green)

| Task | What | Commit | Tests |
|---|---|---|---|
| pre-flight | exec-doc + dependency verify (c06 foundation present) | `5528ae59` | — |
| addendum | engine type-mapping (Fill≠Paint, no BooleanOperation type) | `3c41f4a5` | — |
| 0.1 | `src/constants/overlays.ts` — z-index/colors/find/shortcuts/gates | `3b46baca` | type-check |
| 1.1 | `useClipboardStore` (Q23, incompatible-field skip, markRaw) | `ea72e693` | 6 |
| 1.3 | `useEyedropperStore` (canvas-only) | `f418f91f` | 4 |
| 1.6 | `useFindStore` (find focus state) | `8cf4270c` | 7 |
| 1.5 | `useEditorStore` ext — `state.overlays` + Tool union SLICE/MEASUREMENT/EYEDROPPER | `272808eb` | 5 |
| 2.1 | `useEyedropper` composable + `EYEDROPPER_NATIVE_TAURI` flag + `src/config/feature-flags.ts` | `708215d0` | 4 |

All new tests green. **Pre-existing baseline: 32 failing unit tests** (auth/dashboard/
supabase-mock — see c06 DONE) + **134 oxlint errors in `packages/core/`** (read-only).
Gate precedent (c05/c06): scope gates to *created files* — zero new errors in 07b files.

---

## CRITICAL reconciliation rules (apply to every remaining task)

### R1 — Worktree paths are root-relative
Repo root **is** `kova-open-pencil-1` (nested git repo). Plan writes
`kova-open-pencil-1/src/...`; real paths are `src/...`, `tests/...`. Strip the prefix.

### R2 — Engine types: use real `@open-pencil/core` names (see exec-doc §1b)
- `Paint`/`GradientPaint`/`ImagePaint` → **`Fill`** (one interface, `type: FillType` =
  `SOLID`/`GRADIENT_LINEAR`/`GRADIENT_RADIAL`/`GRADIENT_ANGULAR`/`GRADIENT_DIAMOND`/`IMAGE`;
  gradient via `Fill.gradientStops`+`gradientTransform`; image via `imageHash`+`imageScaleMode`+`imageTransform`).
- `ScaleMode` → **`ImageScaleMode`** (`'FILL'|'FIT'|'CROP'|'TILE'`).
- `Effect`, `GradientStop`, `BlendMode`, `Stroke`, `SceneNode` → exact, re-exported from index.
- **No `BooleanOperation` type exists.** Boolean ops are core **tools**
  (`booleanUnion`/`booleanSubtract`/`booleanIntersect`/`booleanExclude`, `tools/registry.ts`).
  BooleanOpsRow dispatches these; define a 07b-local UI enum
  `BooleanOpKind='UNION'|'SUBTRACT'|'INTERSECT'|'EXCLUDE'`, NOT a core type.
- Never deep-import core internals (kiwi codec `Paint` etc.). Public index only. Task 10.2 grep-gates this.

### R3 — `useEditorStore` is a singleton composable, NOT Pinia
- Import `{ createEditorStore, setActiveEditorStore, useEditorStore }` from `@/stores/editor`.
- Tests: `beforeEach(() => setActiveEditorStore(createEditorStore()))` — NOT `setActivePinia`.
- State access is `store.state.X` (e.g. `store.state.activeTool`, `store.state.overlays`).
- `activeTool` values are **UPPERCASE** Tool union: `'SELECT'` (not `'move'`), `'SLICE'`,
  `'MEASUREMENT'`, `'EYEDROPPER'`, etc. Plan's lowercase `'slice'`/`'move'` is WRONG.
- The other 07b stores (clipboard/eyedropper/find) ARE real Pinia setup stores → use
  `setActivePinia(createPinia())` for those.

### R4 — Bun + Vue reactivity: `structuredClone` trips on reactive proxies
Use `markRaw(...)` when storing plain-data payloads in a ref that will later be cloned
(see `useClipboardStore`). DataCloneError = you forgot this.

### R5 — Slice/Measurement = 07a engine, 07b is the UI consumer
07a shipped SLICE NodeType, page-level Measurement system, `createSlice` factory,
`addMeasurement` ToolDef, `scaleNode` (W7 DONE). 07a explicitly DEFERRED the UI surface.
So `useSliceTool`/`useMeasurementTool` (2.3–2.6) are UI activation wrappers that flip
`store.state.activeTool` AND wire to the engine tools — they are NOT duplicates. The
pointer-drag drawing interaction belongs in canvas-input / the region overlays, not the
tool composable. Consume measurement methods via the public `figma`/proxy, never core internals.

### R6 — Plan tests contain bugs — fix, don't copy
Examples already hit: clipboard text→text asserted `fontSize` copies though it's not in
Q23_FIELDS (corrected to unchanged); editor test used Pinia (corrected to c06 pattern);
several tests omit the `SceneNode` import. Read each test critically before running.

### R7 — Design discipline (Phases 3/4/5 — highest risk)
Zero new tokens, zero hex in DOM/CSS, zero `<style>` blocks, zero `<icon-lucide-*>`
(use `<KovaIcon name="...">`). Overlay *canvas-paint* colors are the documented hi-fi-exempt
exception (constants in `overlays.ts`, like c06 `CTA_WRAP_FILL_HEX`). Inspector rows =
existing `properties/*Section.vue` + `.prop-row` patterns. Re-read Design Rider §2 per component.
Phase-1 fidelity gate (KOVA_AUDIT.md + tokens-used.md) before any Vue in Phases 3/4.

### R8 — Commit convention
`feat(c07b-tN.N)` / `test(c07b)` / `fix(c07b-review)`. ONE commit per task. TDD: RED→GREEN→commit.

---

## Remaining tasks (plan §, with known adaptations)

- **Phase 2 composables (2.3–2.14):** useSliceTool, useMeasurementTool (R5 + R3 uppercase),
  useExportPipeline (per-file fallback Phase A; ZIP batching gated `EXPORT_PIPELINE_ZIP_BATCHING`),
  useCopyPasteProps (wraps useClipboardStore + editor selection), useFindSearch (debounce
  `FIND_CONFIG.QUERY_DEBOUNCE_MS`, writes `find.matchedNodeIds`, RESULTS_MAX cap),
  useCameraPan (watches `find.focusedNodeId`, `CAMERA_PAN` params, scroll-based — no gesture lib).
- **Phase 3 inspector components (3.1–3.10):** VerticalTextAlignRow, StrokeAlignRow,
  JpgQualityDropdown, BooleanOpsRow (R2 BooleanOpKind + disabled-state tests C-LOW07b.2),
  GradientStopList, PaintEditor (R2 Fill), ImageFillPicker (R2 Fill type:IMAGE), EffectRow,
  EffectEditor, MultipleFillsList. Plug into `properties/*Section.vue` via Phase 5.
- **Phase 4 overlays (4.1–4.14):** CanvasOverlayLayer wrapper + 10 overlays (each its own
  TDD task + commit per C-MED-07b.1) + SearchPanel + SearchResultRow + EditorView mount.
  Mount point = c06 `CanvasOverlayHost.vue` (already present).
- **Phase 5 section extensions (5.1–5.6):** wire new components into Effects/Export/Stroke/
  Typography/Fill sections + ColorPicker (all exist under `src/components/`).
- **Phase 6 (6.1–6.2):** extend `use-canvas-drop` ADDITIVELY (brand-asset image-fill) —
  c06 already 5-MIME; c05 also touches it → additive only (wave-merge). Mount CanvasOverlayLayer.
- **Phase 7 (7.1):** register shortcuts via `e.code` (⌥⇧U/S/I/E booleans, Shift+' pixel grid),
  `KEYBOARD_SHORTCUTS_REGISTRY_AVAILABLE` false → local fallback handler.
- **Phase 8/9 (tests):** integration + 10 Playwright E2E.
- **Phase 10:** quality gates (scoped per R-precedent), grep verifications (§9.5), manual smoke, PR.

## Cluster-end gates (unchanged from prompt)
build/check/test:unit/test:dupes green (created-file-scoped) · code-reviewer PASS ·
e2e (gradient/boolean/eyedropper/find/pixel-grid) · visual-diff ≤2% · DONE report.
