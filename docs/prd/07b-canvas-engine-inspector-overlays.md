# PRD 07b — Canvas Engine Inspector + Overlays

## 0. Status & ownership

| Field | Value |
|---|---|
| **Status** | `DRAFT` 2026-05-15 |
| **Wave** | 5 (canvas engine pair — sibling of 07a) |
| **Author** | Claude (Opus 4.7) |
| **Reviewer** | Jiho Yang (founder) |
| **Last updated** | 2026-05-15 |
| **Depends on PRDs** | 06 (Canvas Editor Core Chrome — hosts the inspector + overlay layer), 07a (Canvas Engine Core + Renderer — ships the NodeTypes, renderer compositing, and tool slots that 07b consumes) |
| **Blocks PRDs** | 08 (Menus + Popovers + Shortcuts — Boolean-ops shortcuts register into the registry 08 ships), 09 (Version History + Trash — slice-export pipeline must be stable before snapshot diffs ship), 10 (AI Chat + Memory + Tools — AI tool layer reads the same engine state and overlay flags) |
| **Source artifacts** | Hi-fi: 3 files (Inspector 11, Color Picker 12, Canvas Overlays 09). 03 doc: §2.7 buckets §3C #1c (Inspector wiring) + §3C #1d (App-level overlays). Q-decisions: Q3 (9 features engine-ready), Q20 (eyedropper canvas-only), Q21 (4 image-fill modes), Q22 (JPG export 3-level), Q23 (copy/paste props full set), Q24 (drag-drop semantics — image fill drop), Q3 #14 (boolean ops + Figma shortcuts). Audit §2.A Cluster 07 lines 1614–1683 (cluster 07 spec; 07b lifts 1c + 1d buckets). |

---

## 1. Problem & outcome

### 1.1 Plain language (for founder)

The canvas engine (sibling PRD 07a) ships the **data + render** for everything Kova adds on top of OpenPencil — Slice and Measurement node types, mask compositing, every effect, gradient, image-fill mode, and boolean operation. None of that is reachable through the UI today. **07b is the inspector + overlay layer that lets a designer actually use those features.** Three buckets:

1. **Inspector wiring** — when a designer selects a layer, the right-hand inspector now exposes: vertical text alignment, stroke alignment (Inside/Center/Outside), multiple fills (drag-reorder, per-fill opacity, per-fill visibility), 4 image-fill modes (Fill / Fit / Crop / Tile per Q21), the gradient editor (Linear / Radial), an Effects editor for all 5 effect types (drop-shadow, inner-shadow, layer-blur, background-blur, foreground-blur), a Boolean-ops row when a multi-select is active (Union / Subtract / Intersect / Exclude with Figma-exact ⌘⌥U/S/I/X shortcuts), and a JPG export quality dropdown (High 0.92 default / Medium 0.80 / Low 0.65 per Q22).

2. **Canvas overlays** — the 10 visual-feedback layers that ride above the canvas: frame outlines, mask outlines, slice region preview, snap indicators, layout guides (default-ON red 10% per Q24), pixel grid (auto-show > 800% zoom), hover contour, find highlight, eyedropper crosshair (canvas-only per Q20), and persistent measurement annotations.

3. **Cross-cut composables** — eyedropper, slice tool, measurement tool, export pipeline (iterates SLICE nodes → batches PNG/JPG ZIP per Q22), and a copy/paste-properties composable that lifts Figma's stroke-partial limitation (Q23 — Kova ships full property set).

**07b ships zero `packages/core/` modifications.** Every engine touch lives in 07a. 07b consumes the public engine API surface (FigmaAPI proxy + scene-graph types) and renders Vue components on top.

### 1.2 Caveman summary (per CLAUDE.md communication style)

Engine ready (07a). UI not. 07b add inspector rows + 10 canvas overlays + 4 composables. Designer click layer → see fields work. Designer drag layout → see snap line. Designer click eyedropper → magnifier on canvas. Designer hit ⌘⌥U → boolean union. JPG export get quality dropdown. Zero core touch — pure Vue + Pinia.

### 1.3 Outcome (acceptance gate)

A designer can: (1) edit every Q3-engine-ready property through the inspector with no console errors and live render updates, (2) drop an image into a fill slot and pick Fill/Fit/Crop/Tile mode, (3) build and edit gradients (Linear + Radial) with multi-stop add/remove + angle control, (4) see all 10 overlays render correctly across pan/zoom and dark theme, (5) use the eyedropper to sample a pixel inside the canvas (96px magnifier + 16px reticle + hex chip), (6) execute boolean ops on a multi-select via inspector buttons OR Figma-exact keyboard shortcuts, (7) batch-export every SLICE node on the page as PNG @1x/@2x or JPG with selectable quality and download as a ZIP, (8) copy properties from one selection and paste them onto another (full set per Q23). All UI matches hi-fi 09 / 11 / 12 byte-by-byte (colors, opacities, z-indexes per the spec table in §3).

---

## 2. Scope

### 2.1 In scope (this PRD)

**Inspector wiring (UI consumes existing engine APIs):**

- **Vertical text alignment row** — TOP / MIDDLE / BOTTOM segmented control inside `TypographySection.vue` (TEXT-node selection only). Wires `node.textAlignVertical` (existing field).
- **Stroke alignment row** — INSIDE / CENTER / OUTSIDE segmented control inside `StrokeSection.vue`. Wires `node.strokeAlign` (existing engine support per Q3 #5).
- **Multiple fills array UI** — drag-handle-reordered list inside `FillSection.vue` with per-fill swatch / type / opacity / visibility / delete; "Add fill" + control. Hi-fi 11.13 reference.
- **Image-fill mode picker** (`ImageFillPicker.vue` NEW) — popover with 4 modes per Q21: Fill (default), Fit, Crop (with 4 corner drag handles per hi-fi 11.12), Tile (with size slider per hi-fi 12.11). Source segmented control: Brand kit / Uploads / Shopify (matches hi-fi 11.12 lines 2558–2560).
- **Gradient editor** (`PaintEditor.vue` NEW) — full popover with mode tabs (Solid / Linear / Radial / Image), gradient strip preview, stop list (drag-reorder; 0% and 100% stops are non-removable; intermediate stops show ×), "Add stop", angle input (∠ 90° default), HSV canvas + hue + alpha sliders, hex/RGB/HSL toggle, eyedropper trigger button. Hi-fi 12.6–12.8 reference.
- **Effects inspector extension** — `properties/EffectsSection.vue` exists with all 5 effect types already wired. 07b ensures: collapsed-by-default header row, exact hi-fi 11.14/11.15 visual chrome (drag-handle · effect-icon · type-icon · label · meta · visibility-toggle · delete), per-effect editor popover (hi-fi 11.16) with X/Y/Blur/Spread fields + color swatch + Visible checkbox.
- **Boolean ops row** (`BooleanOpsRow.vue` NEW) — visible only on multi-select (≥2 layers). Four icon buttons (Union / Subtract / Intersect / Exclude) with tooltip-shown shortcuts ⌘⌥U/S/I/X per Q3 #14. Wires existing `figma.booleanOperation()` from `figma-api.ts`. Hi-fi 11.9.
- **JPG export quality dropdown** — extend `properties/ExportSection.vue` per-row format dropdown to add quality picker when format=JPG: High 0.92 (default) / Medium 0.80 / Low 0.65 per Q22. Hi-fi 11.18.
- **Copy/Paste properties composable** (`use-copy-paste-props.ts` NEW) — Q23 explicitly overrides Figma's stroke-partial limitation; Kova copies the full property set: position-independent fields (fills, strokes, strokeWeight, strokeAlign, effects, opacity, blendMode, cornerRadius, paddingLeft/Right/Top/Bottom, layoutMode, primaryAxisAlignItems, counterAxisAlignItems, itemSpacing, characterStyleOverrides, textAlignVertical). Bound to ⌘⌥C / ⌘⌥V (registered into Cluster 08's shortcut registry).

**Canvas overlays (10 net-new Vue components, all under `components/canvas-overlays/`):**

- `FrameOutlinesOverlay.vue` — 1px solid `rgba(126,126,121,0.55)` borders, z-index 3, always visible. Hi-fi B8.3.
- `MaskOutlinesOverlay.vue` — 1.5px solid `#3DDC97` outlines per mask shape (rect / ellipse / path), corner glyph (14×14, 9px font, `rgba(61,220,151,0.22)` bg, top-right of mask bbox), z-index 4. Hi-fi B8.4.
- `SliceRegionOverlay.vue` — visible when SLICE NodeType selected or in slice-tool active mode; renders region rectangle + dashed border + label tag. Consumes 07a's SLICE NodeType. Hi-fi B8.1 export-preview area.
- `SnapIndicatorsOverlay.vue` — `#F24822` (red-orange) snap pixels (1px wide/tall) + spacing tags (`#F24822` bg, white text, "tnum" 1, padding 1px 5px, 11px Inter), z-index snap=5 / tag=7. Appear on drag, disappear on release per hi-fi B8.1 line 830.
- `LayoutGuidesOverlay.vue` — three modes Uniform / Columns / Rows, color `rgba(255,0,0,0.10)` per Q24 default-ON red 10%. Cols: flex gap 12px padding 16px. Rows: flex-column gap 6px padding 8px. Uniform: 16×16 background-size checker. Z-index 3. Configured per-frame; visibility follows inspector state (no top-level toggle in MVP).
- `PixelGridOverlay.vue` — `rgba(126,126,121,0.18)` 1px linear-gradient, 8×8 background-size, z-index 3. Auto-show only when canvas zoom > 800% per hi-fi B8.5.
- `HoverContourOverlay.vue` — 1.5px solid `var(--select)` border (selection blue), border-radius 0, z-index 4. Renders only while hover holds; disappears the moment hover leaves.
- `FindHighlightOverlay.vue` — golden/yellow contour around find-result nodes (from Cluster 08's `useFind` composable). 07b owns the overlay; Cluster 08 owns the find composable that supplies the matched node IDs.
- `EyedropperCrosshair.vue` — 96px magnifier circle (2px white border, box-shadow `0 0 0 1px #1e1e1e, 0 8px 24px rgba(0,0,0,0.6)`) + inner 16×16 reticle + hex chip floats below-right (#2c2c2c bg, 1px `var(--line)` border, 11px Inter "tnum"). Z-index magnifier=9, hex chip=10. Hi-fi B8.7. Canvas-only per Q20 (Phase 2 = macOS Tauri screen-wide).
- `MeasurementAnnotations.vue` — persistent dashed lines (1px solid `#F24822`) + caps (1×8 vert / 8×1 horz, `#F24822`) + label (`#F24822` bg, white text, 11px Inter "tnum", padding 1px 5px). Z-index 7. Persists across save/reload via 07a's MEASUREMENT NodeType. Hi-fi B8.9.

**Composables (4 net-new):**

- `use-eyedropper.ts` — canvas-only sampling per Q20. Activates from `PaintEditor.vue` pipette button OR ^C shortcut. Reads pixel via canvas readback. Returns hex on click, cancels on Esc.
- `use-slice-tool.ts` — slice-tool mode handler. Listens to canvas drag, creates SLICE NodeType (07a), sets default crop rect.
- `use-measurement-tool.ts` — measurement-tool mode handler. Listens to canvas hover/click, creates MEASUREMENT NodeType (07a) with two anchor points.
- `use-export-pipeline.ts` — iterates SLICE nodes on the active page, renders each via 07a's `figma.exportAsync()`, batches into a ZIP via JSZip (Phase A → unbundled per-file download fallback if JSZip not installed; Phase B → JSZip in deps).

**DnD receiver (Q24 cross-cut):**

- `use-canvas-drop.ts` extension (existing composable) — register `application/x-kova-brand-color` payload handler that consumes Q24 image-fill drop semantics: when payload drops on existing node, opens `ImageFillPicker.vue` with that asset pre-selected; when on empty canvas, spawns image at natural size. Cluster 05 ships the asset MIME types and the asset panel; 07b ships the canvas-side receiver wiring for image-fill case.

### 2.2 Out of scope (handed to other clusters)

| Item | Owning PRD |
|---|---|
| All `packages/core/` modifications (NodeType additions: SLICE, MEASUREMENT; renderer mask compositing; renderer/measurements.ts; tool slot registration in `packages/core/src/tools/`; figma-api-proxy.ts proxy fields; kiwi/schema.ts version bump; CHANGELOG-KOVA.md) | **07a** Canvas Engine Core + Renderer |
| All renderer changes (`renderer/scene.ts`, `renderer/measurements.ts`) | 07a |
| Top-level chrome that hosts the inspector + bottom toolbar that hosts tool buttons (`<TopChrome>`, `<BottomToolbar>`, `<RightPanel>`, `<LeftPanel>`) | 06 Canvas Editor Core Chrome |
| Existing `properties/` inspector sections (PositionSection, LayoutSection, AppearanceSection, FillSection base, StrokeSection base, TypographySection base, EffectsSection base, ExportSection base, PageSection, VariablesSection) — 07b extends them; 06 owns the chrome and tab routing | 06 |
| Inspector tab routing (Design / Prototype) | 06 |
| Color-picker chrome (`ColorPicker.vue` exists with HSV picker) — 07b extends to render `PaintEditor.vue` for non-solid modes | 06 owns base ColorPicker; 07b extends |
| Right-click context-menu shell (`useObjectActions`, dispatch table) | 08 Canvas Menus |
| Keyboard shortcut registry (`useShortcutsStore`, the catalog) — 07b *registers into* it but does not own the registry primitive | 08 |
| `useFind` composable (find search composable) | 08 |
| `useConfirm` composable | 08 + 11 |
| `<KovaModal>` shell (used by export-preview overlay if a confirm is needed) | 11 Shared UI |
| Snapshot store / version-history store consuming export pipeline output | 09 Version History |
| AI tool registration (slice tool, measurement tool, vector tools as AI tools) | 10 AI Chat + Memory |
| Brand-color drag-drop MIME types + asset panel + saved-block payload | 05 Brand Kit + Drag-Drop |
| User preferences for show-text-suggestions / show-rulers (DEFERRED — Q5 unlock-ready) | 12 Settings + User Prefs |

### 2.3 Deferred to Phase 2

- **Eyedropper screen-wide on macOS Tauri** — Phase 2 per Q20. Phase A ships canvas-only.
- **Layer thumbnails strategy** for inspector preview (§2.4 from 03-doc) — Phase 2.
- **Advanced typography sliders** (per-axis variable font controls) — Phase 2 (engine-partial per Q3 #2).
- **Pen dropdown chevron stub** — Phase 2.
- **Arrow primitive** — Phase 2 (after Track 2 stroke-cap renderer audit).
- **Gradient types beyond Linear + Radial** — Angular and Diamond gradients are engine-ready per Q3, but the inspector UI ships only Linear + Radial in MVP per scope (matches Figma's 90th-percentile usage). Phase 2 unlocks Angular + Diamond pickers.
- **Layout-guides toggle** — Q24 locks layout guides default-ON; the user-facing toggle (preference UI) is DEFERRED to Cluster 12 Phase 2.
- **Snap toggles re-introduction** — DEFERRED to Cluster 12 Phase 2 (~7 prefs unlock-ready); Phase A behavior is default-ON snap with no user toggle.
- **Find composable + overlay UI** — `useFind` itself ships in Cluster 08. 07b ships the *overlay* component (`FindHighlightOverlay.vue`) so the visual is ready when 08 wires the consumer; the overlay is dormant (renders zero highlights) until 08 lands.

### 2.4 Cross-cut acknowledgments (foreign owners)

- **07a** ships the engine surface 07b consumes. Every API mentioned in §7 is *defined* there. If 07a's API name changes, 07b's component code updates the import; the *contract* (what fields exist, what methods do) stays the same.
- **06** owns `TopChrome`, `BottomToolbar`, `RightPanel`, `LeftPanel`, and the tab router. 07b's components mount inside `RightPanel`'s inspector dock or float as popovers / canvas-overlay layers — 07b never re-spec's the chrome.
- **08** owns the keyboard shortcut registry; 07b's `BooleanOpsRow` and `use-copy-paste-props` register their shortcuts via the registry's `register()` API.
- **05** owns brand-color / brand-asset drag-drop MIME types; 07b extends `use-canvas-drop.ts` to wire the image-fill receiver case. The MIME type taxonomy is owned by 05.
- **11** owns `<KovaModal>` shell + `useToast` + `useConfirm`. 07b consumes by composable name.

---

## 3. Visual spec

Every UI surface in 07b maps to a hi-fi file + scene ID. Engineers cite the scene when implementing.

### 3.1 Inspector surfaces (hi-fi 11 — DARK)

`main-main-kova-scope/batch-b/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html`

| Surface | Scene ID | Notes |
|---|---|---|
| Boolean ops row (multi-select ≥2 layers) | 11.9 | "Boolean" header (line 2254). 4 icon buttons. Tooltip shortcuts ⌘⌥U / ⌘⌥S / ⌘⌥I / ⌘⌥X per Q3 #14. Multi-select reduces inspector to Position + Appearance only. |
| Solid fill row (per-fill swatch + hex) | 11.10 | Reuses existing FillSection chrome. |
| Linear-gradient editor popover (anchored to fill row) | 11.11 | Cross-cuts hi-fi 12.6 (gradient editor). |
| Image-fill mode = Crop with 4 corner handles | 11.12 | Mode dropdown labeled "Crop" (line 2567). Source segmented control: Brand kit / Uploads (active) / Shopify (lines 2558-2560). |
| Multiple fills (3 stacked, varying opacity, drag-handle 6-dot) | 11.13 | Drag-handle visible at left of each row. `display:flex; flex-direction:column; gap:4px;` (line 2655). |
| Effects empty state (header + add button only) | 11.14 | "No effects · click + to add" (line 2754). Add icon: 14×14 plus button. |
| Effects list — 2 rows, 1 selected (drop-shadow + layer-blur) | 11.15 | Row layout: drag-handle · effect-icon · type-icon · label · meta · visibility · delete. Drop-shadow meta: "0 4 12" (X Y blur). Layer-blur meta: "8" (radius). |
| Effects per-effect editor popover | 11.16 | Position `top:120px; right:14px; width:248px;`. Header "Drop shadow" (line 2896). Fields 2×2 grid: X / Y / Blur / Spread. Color row: swatch `#000000` + opacity "30%". Visible checkbox. All fields use `.ipt` cell class. |
| Stroke section (color · weight 2 · Inside · dashed) | 11.17 | Stroke-alignment dropdown row INSIDE / CENTER / OUTSIDE (07b adds the alignment row). |
| Export — 2 rows (PNG @1x · JPG @2x) with JPG quality dropdown OPEN | 11.18 | Q22 quality dropdown options: High 0.92 (default) / Medium 0.80 / Low 0.65. |
| Export — adding new row | 11.19 | Add-row state. |

### 3.2 Color-picker / paint-editor surfaces (hi-fi 12 — DARK)

`main-main-kova-scope/batch-b/chunk-b5/Kova Hi-Fi 12 Color Picker - Dark.html`

| Surface | Scene ID | Notes |
|---|---|---|
| Linear-gradient editor (2 stops) | 12.6 | Mode tabs (pill-style): Solid / Linear (active) / Radial / Image. Stops list rows: swatch · hex · position% · ×. Outer stops (0%, 100%) hide ×. Default stops: 0% black `#000000`, 100% white `#FFFFFF`. Angle input: ∠ 90 (default), direction dropdown "Linear". HSV canvas 100px tall. Hex input with `cp-pre #` prefix. Eyedropper icon: `data-lucide="pipette"`. |
| Linear-gradient (4 stops, mid-stop selected) | 12.7 | Mid-stop highlighted with 1px accent ring + `--fill2` background. Inner stops show ×, outer stops hide ×. |
| Radial gradient (2 stops, center handle) | 12.8 | Radial preview 120px tall circular box. Center handle: 12px white circle, 1.5px white border, dark fill — drags to reposition. |
| Image (Brand Kit, Fill scale-mode) | 12.9 | 3-cell source segmented: Brand kit / Uploads / Shopify. Scale dropdown defaults to "Fill". |
| Image (Crop scale-mode, 4 white corner drag handles) | 12.10 | Mirrors 11.12 image-fill picker. |
| Image (Tile scale-mode, 50%) | 12.11 | Tile-size slider replaces brand-library row. |
| Eyedropper trigger active | 12.5 | Button active state: bg `--accent-soft`, ink `--accent-ink`, 1px accent border (line 1690). Cross-references B8.7 canvas overlay. Esc cancels. |
| Picker invoked from page background (single-mode) | 12.12 | 4 mode tabs removed — solid only. Image swatch + "+ Add to brand kit" hidden. |
| Picker invoked from stroke color (single-mode variant) | 12.13 | Anchored to Stroke row. |
| Picker invoked from drop-shadow color (chained popovers) | 12.14 | Drop-shadow editor (host) + color picker (floats further LEFT). Color cell shows 1px accent ring. Alpha slider knob at 18% (shadow's opacity) — line 2448 notes this is the only place alpha < 100% across all 14 scenes. |

### 3.3 Canvas overlay surfaces (hi-fi 09 — DARK)

`main-main-kova-scope/batch-b/Kova Hi-Fi 09 Canvas Overlays - Dark.html`

| Surface | Scene ID | Notes |
|---|---|---|
| Snap indicators | B8.1 | Snap-pixel: `#F24822` (z-index 5). Spacing tag: `#F24822` bg, white text 11px "tnum", padding 1px 5px, border-radius 2px (z-index 7). Spacing line: `#F24822` 65% opacity. Appear on drag, disappear on release (no fade, no glow per line 830). |
| Hover contour | B8.2 | 1.5px solid `var(--select)`, border-radius 0, z-index 4. Disappears the moment hover leaves (line 1521). |
| Frame outlines | B8.3 | 1px solid `rgba(126,126,121,0.55)`, z-index 3. Always visible. 0px outside frame edges. Peripheral by design (line 1818). |
| Mask outlines | B8.4 | 1.5px solid `#3DDC97`. Glyphs (rect / ellipse / path) at top-right corner: 14×14, 1px solid border, 9px font, `rgba(61,220,151,0.22)` bg. Z-index 4. |
| Pixel grid | B8.5 | `rgba(126,126,121,0.18)` linear-gradient horizontal + vertical, 8×8 background-size. Z-index 3. Auto-show only at canvas zoom > 800% per line 2177. |
| Layout guides (default ON) | B8.6 | `rgba(255,0,0,0.10)` per locked Q24 spec. Three modes: Uniform (16×16 checker), Columns (flex gap 12px padding 16px), Rows (flex-column gap 6px padding 8px). Z-index 3. No top-level toggle UI in MVP — visibility follows inspector state (line 2469-2470). |
| Eyedropper magnifier | B8.7 | 96px diameter, 2px white border, box-shadow `0 0 0 1px #1e1e1e, 0 8px 24px rgba(0,0,0,0.6)`. Inner pixel grid: `rgba(255,255,255,0.10)` 16×16. Reticle: 16×16 box at center, 1.5px white border, 1px `#1e1e1e` shadow. Hex chip below-right: `#2c2c2c` bg, 1px `var(--line)` border, 11px Inter "tnum", padding 4px 8px, border-radius 4px, box-shadow `0 4px 12px rgba(0,0,0,0.4)`. Z-index magnifier=9, hex chip=10. 6× zoom inside magnifier. |
| Selection (frame labels + size chip) | B8.8 | Selection box: 1px solid `var(--select)` (z-index 5). Handles: 8×8 white box, 1.5px `var(--select)` border, border-radius 1px (z-index 6). Frame label: `var(--select)` bg, white text Inter 11px, padding 1px 6px, border-radius 2px (z-index 7). Size chip (e.g., "360 × 100"): same chrome, centered below bbox. **Note:** selection box+handles ship with 06 chrome (consumes engine selection state). Frame label + size chip = 07b overlay. |
| Measurement annotation (persistent) | B8.9 | Dashed lines: 1px solid `#F24822`. Caps: 1×8 vert / 8×1 horz, `#F24822`. Label: `#F24822` bg, white text 11px Inter "tnum", padding 1px 5px, border-radius 2px. Z-index 7. Persists across save/reload via 07a's MEASUREMENT NodeType. Selecting a measurement reveals endpoint handles in same red; dragging an endpoint re-anchors. |
| AI assist panel (Kova whisper accent) | B8.10 | `#5a7dff` (Kova brand blue) — the only canvas surface that uses Kova blue. Rings the AI panel, marks the toolbar AI tool, tints the input affordance. Everything else stays neutral / industry-standard. **Note:** the AI panel chrome itself is owned by 10 AI Chat. 07b's `FindHighlightOverlay` and other overlays explicitly do NOT use Kova blue (per locked principle "identity surfaces only when AI is acting"). |

### 3.4 Z-index stacking (canonical, sourced from hi-fi 09)

| Z | Layer |
|---|---|
| 3 | Frame outlines, pixel grid, layout guides |
| 4 | Hover contour, mask outlines |
| 5 | Snap pixels, selection box, measurement lines |
| 6 | Selection handles |
| 7 | Spacing tags, frame labels, size chips, measurement label |
| 9 | Eyedropper magnifier |
| 10 | Eyedropper hex chip |

### 3.5 Color palette (canvas overlays canonical)

| Token / hex | Used by |
|---|---|
| `var(--select)` (selection blue) | Selection box (6 chrome), hover contour, frame labels, size chips |
| `#F24822` (warm red-orange) | Snap pixels, spacing tags, spacing lines (65% alpha), measurement lines + caps + label |
| `#3DDC97` (bright cyan-green) | Mask outlines + corner glyphs (22% bg) |
| `rgba(126,126,121,0.55)` (neutral gray 55%) | Frame outlines |
| `rgba(126,126,121,0.18)` (neutral gray 18%) | Pixel grid lines |
| `rgba(255,0,0,0.10)` (red 10%) | Layout guides (Q24-locked) |
| `#ffffff` (white) | Eyedropper magnifier border, eyedropper reticle border, selection handles |
| `#1e1e1e` (dark) | Eyedropper magnifier shadow |
| `#2c2c2c` | Eyedropper hex chip background |
| `#5a7dff` (Kova brand blue) | **EXCLUSIVE to AI assist panel (B8.10) — never used elsewhere on canvas** |

### 3.6 Design system references

All inspector + overlay surfaces are DARK (per `feedback_app_dark_website_light` — canvas is inside the authenticated app). Stylesheet: `main-main-kova-scope/design-system/kova-hifi.css`. No light-theme variant.

Component primitive classes lifted from hi-fi inline styles: `.ipt` (inspector input cell), `.cp-header`, `.cp-grad-strip`, `.cp-pre`, `.cp-val`, `.fill-row`, `.snap-pixel`, `.spacing-tag`, `.layout-cols`, `.layout-rows`, `.layout-uniform`, `.eyedropper-mag`, `.measurement-line`, `.frame-label`, `.size-chip`. Engineers translate each to a Vue component that renders the same markup contract per `00-PRD_SCOPE_PLAN.md §5` design-system rule.

---

## 4. Data model

**N/A — engine state persists via Yjs document + Kiwi serialization (07a manages).** 07b is pure UI on top of existing scene-graph state.

The two engine-side persistence touch points (both owned by 07a, listed here for visibility):

- **SLICE NodeType** (07a item 1) — slice regions persist as scene-graph nodes.
- **MEASUREMENT NodeType** (07a item 1) — measurement annotations persist as scene-graph nodes (per B8.9 "persists across save/reload").

Layout-guides per-frame configuration uses existing Frame.layoutGrids field (shipped in OpenPencil core; no migration). Inspector `LayoutGuidesOverlay.vue` reads it, renders accordingly.

Eyedropper sample state, tool-mode flags, and clipboard contents (copy/paste props) are **session-local Pinia state**, not persisted. Acceptable per Figma reference (Figma's eyedropper + tool mode + clipboard are likewise non-persisted).

---

## 5. Backend

**N/A — 07b is pure client-side.**

No Edge Functions. No RPCs. No cron. No external integrations. No DB migrations.

The only "backend" surface 07b touches indirectly: when `use-export-pipeline.ts` produces image bytes, those bytes flow downstream through 09 Version History snapshot store (which 07b does NOT manage) and through 10 AI Chat tool layer (which likewise consumes engine state). 07b stops at the byte boundary — it produces image bytes via 07a's `figma.exportAsync()` and zips them client-side.

---

## 6. Frontend

### 6.1 Routes

**N/A — 07b adds zero net-new routes.** All UI mounts inside the existing `/canvas/:canvasId` route shell (06).

### 6.2 Pinia stores

#### 6.2.1 `useEditorStore` extension (existing — owned by 06)

```typescript
// src/stores/editor.ts (existing — extend ONLY the pieces 07b reads/writes)
//
// Active-tool union extension (07a registers tool slots; 07b's composables consume them):
//   activeTool: 'move' | 'frame' | 'rectangle' | 'ellipse' | 'pen' | 'text' | 'comment' | 'ai'
//             | 'components' | 'slice' | 'measurement' | 'eyedropper' | 'scale'
//
// Overlay visibility flags (default values per Q24 + hi-fi B8.x defaults):
//   overlays: {
//     frameOutlines: boolean       // default true
//     maskOutlines: boolean        // default true (always-on for masks)
//     pixelGrid: boolean           // default true (auto-shows > 800% zoom; flag is the kill-switch)
//     layoutGuides: boolean        // default true (Q24-locked default ON)
//     hoverContour: boolean        // default true
//     measurements: boolean        // default true
//   }
```

#### 6.2.2 `useClipboardStore` (NEW — owned by 07b)

```typescript
// src/stores/clipboard.ts (NEW)
// Owns the copy/paste-properties state per Q23.
//
// Shape:
//   copiedProps: ClipboardPropsPayload | null
//
// type ClipboardPropsPayload = {
//   sourceNodeId: string
//   sourceNodeType: NodeType
//   props: {
//     fills?: Fill[]
//     strokes?: Paint[]
//     strokeWeight?: number
//     strokeAlign?: 'INSIDE' | 'CENTER' | 'OUTSIDE'
//     effects?: Effect[]
//     opacity?: number
//     blendMode?: BlendMode
//     cornerRadius?: number | { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number }
//     paddingLeft?: number
//     paddingRight?: number
//     paddingTop?: number
//     paddingBottom?: number
//     layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
//     primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
//     counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX'
//     itemSpacing?: number
//     characterStyleOverrides?: StyleRun[]
//     textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM'
//   }
// }
//
// Actions:
//   copyProps(nodeId: string): void   // reads ALL Q23-listed props off the node, stores
//   pasteProps(targetNodeIds: string[]): void   // applies stored props to each target (skips fields incompatible with the target's NodeType — e.g., textAlignVertical on a RECTANGLE silently drops)
//   clear(): void
//
// Persistence: NONE. Per-tab Pinia state. Matches Figma behavior (clipboard does not survive tab close).
```

#### 6.2.3 `useEyedropperStore` (NEW — owned by 07b)

```typescript
// src/stores/eyedropper.ts (NEW)
// Owns the active-eyedropper state.
//
// Shape:
//   active: boolean
//   sampledHex: string | null    // last sampled color (cleared on next activation)
//   onSample: ((hex: string) => void) | null   // callback wired by the invoker (PaintEditor pipette button)
//
// Actions:
//   activate(onSample: (hex: string) => void): void    // sets active=true, registers callback
//   sample(hex: string): void                          // calls onSample, sets active=false
//   cancel(): void                                     // sets active=false without invoking callback
```

### 6.3 Composables

| Composable | File | Signature | Used by |
|---|---|---|---|
| `useEyedropper` | `src/composables/use-eyedropper.ts` (NEW) | `(): { isActive: ComputedRef<boolean>; sampledHex: ComputedRef<string \| null>; activate(onSample: (hex: string) => void): void; cancel(): void }` | `PaintEditor.vue`, bottom-toolbar Eyedropper tool button (06 mounts) |
| `useSliceTool` | `src/composables/use-slice-tool.ts` (NEW) | `(): { isActive: ComputedRef<boolean>; activate(): void; deactivate(): void }`; on activate, hooks `useCanvasInput`'s drag handler to spawn SLICE nodes via `figma.createSlice({ x, y, width, height })` (07a API) | `BottomToolbar` (06 mounts the tool button) |
| `useMeasurementTool` | `src/composables/use-measurement-tool.ts` (NEW) | `(): { isActive: ComputedRef<boolean>; activate(): void; deactivate(): void }`; on activate, hooks two-click flow: first click anchors start, second click anchors end + creates MEASUREMENT node via `figma.createMeasurement({ start, end })` (07a API) | `BottomToolbar` (06 mounts) |
| `useExportPipeline` | `src/composables/use-export-pipeline.ts` (NEW) | `(): { exportAllSlices(opts: { quality?: number }): Promise<Blob>; exportSingleSlice(sliceId: string, opts: { format: 'PNG' \| 'JPG'; scale: 1 \| 2 \| 3; quality?: number }): Promise<Blob> }` | `ExportSection.vue` "Export N slices" button + Export-preview surface (B8.1 area) |
| `useCopyPasteProps` | `src/composables/use-copy-paste-props.ts` (NEW) | `(): { copy(): void; paste(): void; canPaste: ComputedRef<boolean> }`; reads selection from `useEditorStore.selectedNodes`; writes via `useClipboardStore` | `RightPanel` global keyboard binding via 08's shortcut registry (⌘⌥C / ⌘⌥V) |
| `useCanvasDrop` (existing — extend) | `src/composables/use-canvas-drop.ts` | (extension only) — register handler for `application/x-kova-brand-asset { assetId: uuid, kind: 'logo' \| 'image' }` MIME (Cluster 05 owns the MIME taxonomy): on drop over an existing node, opens `ImageFillPicker.vue` with the asset pre-selected; on drop over empty canvas, spawns image at natural size | Canvas drop receiver |

### 6.4 Components

#### 6.4.1 New inspector components (under `src/components/inspector/`)

| Component | File | Props | Slots | Emits | Hi-fi origin |
|---|---|---|---|---|---|
| `PaintEditor` | `src/components/inspector/PaintEditor.vue` | `modelValue: Paint` (Solid \| Linear \| Radial \| Image); `mode: 'solid' \| 'linear' \| 'radial' \| 'image'` (controls active tab); `anchorContext?: 'fill' \| 'stroke' \| 'effect' \| 'page-bg'` (selects single-mode vs all-modes; per hi-fi 12.12–12.14) | none | `update:modelValue`, `update:mode` | hi-fi 12.6, 12.7, 12.8 (gradients); 12.9–12.11 (image modes); 12.12–12.14 (anchor contexts) |
| `ImageFillPicker` | `src/components/inspector/ImageFillPicker.vue` | `modelValue: ImagePaint` (with scaleMode, src, alignment); `availableSources: Array<'brand-kit' \| 'uploads' \| 'shopify'>` (default all 3) | none | `update:modelValue` | hi-fi 11.12 (Crop mode + 4 corner handles), 12.10, 12.11 (Tile slider) |
| `BooleanOpsRow` | `src/components/inspector/BooleanOpsRow.vue` | (none — reads `useEditorStore.selectedNodes`) | none | none (writes via `figma.booleanOperation(op)` directly) | hi-fi 11.9 |
| `EffectEditor` | `src/components/inspector/EffectEditor.vue` | `modelValue: Effect`; `index: number` (for `effects[index]` array binding) | none | `update:modelValue`, `delete` | hi-fi 11.16 |
| `EffectRow` | `src/components/inspector/EffectRow.vue` | `effect: Effect`; `index: number`; `isSelected: boolean` | none | `select`, `toggle-visibility`, `delete` | hi-fi 11.15 (single row) |
| `GradientStopList` | `src/components/inspector/GradientStopList.vue` | `stops: GradientStop[]`; `selectedIndex: number` | none | `update:stops`, `update:selectedIndex`, `add`, `remove(index)` | hi-fi 12.6, 12.7 |
| `JpgQualityDropdown` | `src/components/inspector/JpgQualityDropdown.vue` | `modelValue: 'high' \| 'medium' \| 'low'` (default `'high'`); maps internally to 0.92 / 0.80 / 0.65 | none | `update:modelValue` | hi-fi 11.18 (dropdown OPEN scene) |
| `VerticalTextAlignRow` | `src/components/inspector/VerticalTextAlignRow.vue` | `modelValue: 'TOP' \| 'CENTER' \| 'BOTTOM'` | none | `update:modelValue` | hi-fi 11.7 + Q3 #1 |
| `StrokeAlignRow` | `src/components/inspector/StrokeAlignRow.vue` | `modelValue: 'INSIDE' \| 'CENTER' \| 'OUTSIDE'` | none | `update:modelValue` | hi-fi 11.17 + Q3 #5 |
| `MultipleFillsList` | `src/components/inspector/MultipleFillsList.vue` | `fills: Fill[]`; `mixed: boolean` (renders the "Click to enter mixed value" state) | none | `update:fills`, `add`, `remove(index)`, `reorder({ fromIndex, toIndex })`, `toggle-visibility(index)` | hi-fi 11.13 |

#### 6.4.2 Inspector section extensions (existing under `src/components/properties/` — 07b extends; 06 owns the parent migration to `inspector/`)

| Existing component | 07b extension |
|---|---|
| `properties/EffectsSection.vue` | (a) Default-collapsed header per Figma reference; (b) wire `<EffectRow>` and `<EffectEditor>` from §6.4.1; (c) verify all 5 effect types render per hi-fi 11.14–11.16. The existing scrub + commit pattern is preserved. |
| `properties/ExportSection.vue` | Add `<JpgQualityDropdown>` row below format dropdown when format=JPG. Add "Export N slices" button that invokes `useExportPipeline.exportAllSlices()`. |
| `properties/StrokeSection.vue` | Add `<StrokeAlignRow>` between weight and dash style. |
| `properties/TypographySection.vue` | Add `<VerticalTextAlignRow>` (renders only when selection is TEXT NodeType). |
| `properties/FillSection.vue` | Replace inline single-fill rendering with `<MultipleFillsList>` + `<PaintEditor>` popover wiring. Existing variable-binding logic preserved. |
| `ColorPicker.vue` | Extend the Reka Popover content: when caller supplies `mode != 'solid'`, render `<PaintEditor>`; when `mode === 'solid'`, render existing `<HsvColorArea>` (current behavior). Wire pipette button → `useEyedropper.activate()`. |

#### 6.4.3 Canvas overlay components (NEW under `src/components/canvas-overlays/`)

| Component | File | Props | Notes |
|---|---|---|---|
| `FrameOutlinesOverlay` | `FrameOutlinesOverlay.vue` | (none — reads engine via `useCanvas`) | Iterates frames in viewport, renders 1px borders. Z-index 3. |
| `MaskOutlinesOverlay` | `MaskOutlinesOverlay.vue` | (none) | Iterates nodes with `isMask=true`, renders shape outline + corner glyph. Z-index 4. |
| `SliceRegionOverlay` | `SliceRegionOverlay.vue` | (none) | Renders for SLICE nodes (07a NodeType): dashed border + label tag. |
| `SnapIndicatorsOverlay` | `SnapIndicatorsOverlay.vue` | `snapHits: SnapHit[]` (passed by `useCanvas` while a drag is active) | Renders snap-pixels + spacing tags. Empty array on idle. |
| `LayoutGuidesOverlay` | `LayoutGuidesOverlay.vue` | (none) | Reads `frame.layoutGrids[]` per visible frame, renders Uniform/Columns/Rows overlay per Q24 default-ON. |
| `PixelGridOverlay` | `PixelGridOverlay.vue` | (none) | Renders only when `useCanvas.zoom > 8.0` (800%). |
| `HoverContourOverlay` | `HoverContourOverlay.vue` | `hoveredNodeId: string \| null` (passed by `useCanvas`) | Renders only when hover is active. |
| `FindHighlightOverlay` | `FindHighlightOverlay.vue` | `matchedNodeIds: string[]` (passed by Cluster 08's `useFind`; pre-08 = empty array) | Dormant until 08 lands. |
| `EyedropperCrosshair` | `EyedropperCrosshair.vue` | (none — reads `useEyedropperStore`) | Renders only when `eyedropperStore.active`. Shows magnifier + reticle + hex chip. |
| `MeasurementAnnotations` | `MeasurementAnnotations.vue` | (none) | Iterates MEASUREMENT NodeType (07a), renders dashed lines + caps + label per node. |

All overlay components are pure-render (no internal mutation). They mount inside `<CanvasOverlayLayer>` (a wrapper component owned by 06's `EditorView.vue`) which provides the absolute-positioned canvas-aligned coordinate space. The overlay layer itself is a single `<div class="canvas-overlays">` block per scene-graph render frame.

### 6.5 Drag-and-drop (DnD)

Per Q24 image-fill drop semantics:

| MIME (owned by Cluster 05) | Receiver behavior (owned by 07b) |
|---|---|
| `application/x-kova-brand-asset` with `kind: 'image'` or `kind: 'logo'` — payload `{ assetId: uuid, kind: 'image' \| 'logo' }` | Drop on existing node with image-fill-compatible NodeType (RECTANGLE / FRAME / ELLIPSE / VECTOR / TEXT-with-image-fill): opens `<ImageFillPicker>` with the asset pre-selected and Fill mode default. Drop on empty canvas: spawns IMAGE node at the asset's natural size, anchored at drop position. |
| `application/x-kova-brand-color` — payload `{ hex: string }` | (Cluster 05 owns the receiver wiring for color drops; 07b's `PaintEditor` accepts the same payload via inspector swatch slots.) |

The receiver is registered inside `use-canvas-drop.ts` (existing composable). 07b adds a single new handler block; the existing brand-color and brand-font handlers stay untouched.

---

## 7. Tool layer / canvas-engine touches

**07b ships ZERO `packages/core/` modifications.** Every line of engine code lives in 07a. This section enumerates the engine API surface 07b *consumes* — not modifies.

### 7.1 Engine APIs read by 07b inspector components

| Inspector touch | Engine API (defined by 07a) | Caller |
|---|---|---|
| Vertical text alignment | `node.textAlignVertical` (existing field; 07a confirms TEXT NodeType binding) | `VerticalTextAlignRow` |
| Stroke alignment | `node.strokeAlign: 'INSIDE' \| 'CENTER' \| 'OUTSIDE'` (existing field) | `StrokeAlignRow` |
| Multiple fills | `node.fills: Fill[]` (existing array) | `MultipleFillsList` |
| Image-fill 4 modes | `ImagePaint.scaleMode: 'FILL' \| 'FIT' \| 'CROP' \| 'TILE'` (existing field — 07a confirms all 4 enum values per Q21) | `ImageFillPicker` |
| Gradient editor — Linear | `GradientPaint { type: 'GRADIENT_LINEAR', gradientStops: ColorStop[], gradientHandlePositions: Vector[] }` (existing) | `PaintEditor` |
| Gradient editor — Radial | `GradientPaint { type: 'GRADIENT_RADIAL', ... }` (existing) | `PaintEditor` |
| Effects all 5 types | `node.effects: Effect[]` with `Effect.type IN ('DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR', 'FOREGROUND_BLUR')` (existing) | `EffectsSection` extension |
| Boolean operations | `figma.booleanOperation(op: 'UNION' \| 'SUBTRACT' \| 'INTERSECT' \| 'EXCLUDE')` from `figma-api.ts` (existing per Q3 #14) | `BooleanOpsRow` |
| Eyedropper sample | `figma.canvas.readPixel(x: number, y: number): { r, g, b, a }` (07a exposes via figma-api-proxy) | `useEyedropper` |
| Slice creation | `figma.createSlice({ x, y, width, height }): SliceNode` (07a NEW per item 1) | `useSliceTool` |
| Measurement creation | `figma.createMeasurement({ start: Vector, end: Vector }): MeasurementNode` (07a NEW per item 1) | `useMeasurementTool` |
| Slice export | `figma.exportAsync(node, { format: 'PNG' \| 'JPG', constraint: { type: 'SCALE', value: 1 \| 2 \| 3 }, quality?: number }): Promise<Uint8Array>` (existing) | `useExportPipeline` |

### 7.2 Engine APIs read by 07b overlay components

| Overlay | Engine API (read-only) |
|---|---|
| `FrameOutlinesOverlay` | scene-graph traversal — `figma.currentPage.children.filter(n => n.type === 'FRAME')` |
| `MaskOutlinesOverlay` | scene-graph traversal — `node.isMask === true` |
| `SliceRegionOverlay` | `node.type === 'SLICE'` (07a NEW NodeType) |
| `SnapIndicatorsOverlay` | drag-state `useCanvas` hooks — snap detector emits `SnapHit[]` events during drag (existing OpenPencil composable; 07a confirms the API surface) |
| `LayoutGuidesOverlay` | `frame.layoutGrids: LayoutGrid[]` (existing OpenPencil field) |
| `PixelGridOverlay` | viewport zoom from `useCanvas.zoom` (existing) |
| `HoverContourOverlay` | hover-state from `useCanvasInput.hoveredNodeId` (existing) |
| `FindHighlightOverlay` | matched IDs from `useFind.matchedNodeIds` (Cluster 08 ships) |
| `EyedropperCrosshair` | active state from `useEyedropperStore` (07b owns) |
| `MeasurementAnnotations` | `node.type === 'MEASUREMENT'` (07a NEW NodeType) |

### 7.3 What 07b explicitly does NOT touch

- **`packages/core/src/scene-graph.ts`** — read by 07b via the public proxy; never modified. NodeType additions (SLICE, MEASUREMENT) live in 07a item 1.
- **`packages/core/src/renderer/scene.ts`** — mask compositing in 07a item 7.
- **`packages/core/src/renderer/measurements.ts`** — measurement rendering in 07a item 8.
- **`packages/core/src/figma-api-proxy.ts`** — proxy field exposure in 07a item 9.
- **`packages/core/src/kiwi/schema.ts`** — version bump for new NodeType serialization in 07a item 10.
- **`packages/core/src/tools/`** — tool slot registration in 07a item 6.
- **`SYSTEM_PROMPT` constant in `use-chat.ts`** — CLAUDE.md hard constraint; never touched by any cluster.
- **Yjs / y-indexeddb persistence** — CLAUDE.md hard constraint.

### 7.4 Boolean ops keyboard shortcuts (registers into Cluster 08 registry)

```typescript
// Registered via Cluster 08's useShortcutsStore.register() in 07b's setup hook
// (mounted once when 07b's BooleanOpsRow component first mounts on canvas)

[
  { id: 'boolean.union',     category: 'edit', keys: 'cmd+alt+u', description: 'Union selection',     action: () => figma.booleanOperation('UNION') },
  { id: 'boolean.subtract',  category: 'edit', keys: 'cmd+alt+s', description: 'Subtract selection',  action: () => figma.booleanOperation('SUBTRACT') },
  { id: 'boolean.intersect', category: 'edit', keys: 'cmd+alt+i', description: 'Intersect selection', action: () => figma.booleanOperation('INTERSECT') },
  { id: 'boolean.exclude',   category: 'edit', keys: 'cmd+alt+x', description: 'Exclude selection',   action: () => figma.booleanOperation('EXCLUDE') },
  { id: 'props.copy',        category: 'edit', keys: 'cmd+alt+c', description: 'Copy properties',     action: () => useCopyPasteProps().copy() },
  { id: 'props.paste',       category: 'edit', keys: 'cmd+alt+v', description: 'Paste properties',    action: () => useCopyPasteProps().paste() },
  { id: 'tool.eyedropper',   category: 'tools', keys: 'control+c', description: 'Eyedropper tool',    action: () => useEyedropper().activate() },
]
```

The `useShortcutsStore.register()` API is owned by Cluster 08. 07b imports and calls it. Pre-08, the registry primitive does not exist — feature gate `KEYBOARD_SHORTCUTS_REGISTRY_AVAILABLE` (hard-coded constant; flips to `true` when 08 ships) controls whether the registration runs. Default Phase A: `false` — Boolean ops accessible only via inspector buttons until 08 ships.

---

## 8. Acceptance criteria

Every line is testable in code or browser. No "feels right." Engineers verify each before founder review.

### 8.1 Inspector wiring

- [ ] Selecting a TEXT node shows the `<VerticalTextAlignRow>` row inside Typography section with TOP / MIDDLE / BOTTOM segmented buttons; clicking each updates `node.textAlignVertical` and re-renders within 16ms (one frame at 60fps)
- [ ] Selecting any node with strokes shows the `<StrokeAlignRow>` row inside Stroke section with INSIDE / CENTER / OUTSIDE; clicking each updates `node.strokeAlign` and re-renders
- [ ] Selecting a node with multiple fills renders `<MultipleFillsList>` with one row per fill; drag-handle reorders the array; per-row visibility toggle hides the fill from render; per-row delete removes it; "Add fill" button appends a default solid black fill
- [ ] Drop an image asset onto a fill row → opens `<ImageFillPicker>` popover with the image pre-loaded and scaleMode='FILL' (default)
- [ ] `<ImageFillPicker>` shows 4 mode tabs: Fill (active by default) / Fit / Crop / Tile; switching to Crop renders 4 corner drag handles per hi-fi 11.12; switching to Tile shows tile-size slider per hi-fi 12.11
- [ ] Clicking the swatch on any fill row opens `<PaintEditor>` popover anchored to that row; mode tabs Solid / Linear / Radial / Image render per hi-fi 12.6
- [ ] Switching to Linear gradient mode renders gradient-strip preview, 2 default stops (0% black, 100% white), angle input ∠ 90, stop list with × hidden on outer stops; "Add stop" inserts at midpoint
- [ ] Adding a 3rd stop in linear gradient renders × button on the new (intermediate) stop; selecting that stop renders 1px accent ring + `--fill2` highlight per hi-fi 12.7
- [ ] Switching to Radial gradient mode renders 120px circular preview with center handle per hi-fi 12.8; dragging center handle re-positions gradient origin
- [ ] Effects section header collapses by default; expanding shows the effect list; "+ Add effect" inserts a default DROP_SHADOW per hi-fi 11.14
- [ ] Each effect row renders with drag-handle / type-icon / type-label / meta (e.g., "0 4 12") / visibility-toggle / delete per hi-fi 11.15
- [ ] Clicking an effect row opens per-effect popover at `top:120px; right:14px; width:248px;` with X / Y / Blur / Spread fields + color swatch + Visible checkbox per hi-fi 11.16
- [ ] All 5 effect types are reachable from the type dropdown: DROP_SHADOW, INNER_SHADOW, LAYER_BLUR, BACKGROUND_BLUR, FOREGROUND_BLUR
- [ ] Multi-select of ≥2 layers shows `<BooleanOpsRow>` row in inspector; 4 buttons (Union / Subtract / Intersect / Exclude) with tooltip-shown shortcuts ⌘⌥U/S/I/X; clicking each invokes `figma.booleanOperation()` and produces a boolean node in scene-graph
- [ ] Inspector shows "3 layers selected" header label when 3 nodes are multi-selected per hi-fi 11.9 line 2244
- [ ] Multi-select inspector reduces to Position + Appearance + Boolean sections only (other sections hidden until selection collapses to 1 node)
- [ ] Export section per-row format dropdown shows PNG / JPG / SVG; selecting JPG reveals `<JpgQualityDropdown>` row with options "High (0.92)" (default) / "Medium (0.80)" / "Low (0.65)" per hi-fi 11.18
- [ ] "Export N slices" button on the page section invokes `useExportPipeline.exportAllSlices()` and triggers a browser ZIP download named `{canvasName}-export.zip`

### 8.2 Color picker / paint editor

- [ ] Solid mode renders existing HSV picker (no regression vs ColorPicker.vue baseline)
- [ ] Switching to Linear / Radial / Image preserves the popover anchor position; switching back to Solid restores original UI
- [ ] Hex/RGB/HSL toggle cycles input modes inline (line 1771); typed value updates color
- [ ] Pipette button (`data-lucide="pipette"`) inside `<PaintEditor>` activates eyedropper via `useEyedropper.activate()`
- [ ] Picker invoked from page background context (12.12) hides Image tab + "+ Add to brand kit" button (single-mode picker)
- [ ] Picker invoked from drop-shadow color (12.14) chains popovers — drop-shadow editor stays visible; color picker floats further LEFT; alpha slider at 18% per the only-place-with-alpha annotation

### 8.3 Canvas overlays

- [ ] All 10 overlay components render simultaneously without z-index conflicts per §3.4 stacking table
- [ ] Frame outlines render at 1px solid `rgba(126,126,121,0.55)`, z-index 3, on every FRAME node in viewport (verified via DevTools Computed Styles)
- [ ] Mask outlines render at 1.5px solid `#3DDC97` with corner glyph (rect / ellipse / path) on every node where `isMask=true`
- [ ] Slice region renders dashed border + label on every SLICE node (07a NodeType) in viewport
- [ ] Snap indicators appear during drag (1px `#F24822` snap-pixels + spacing tags) and disappear on release (no fade)
- [ ] Layout guides render default-ON at `rgba(255,0,0,0.10)` per Q24; per-frame configuration (Uniform / Columns / Rows) reads from `frame.layoutGrids[]`
- [ ] Pixel grid renders only when canvas zoom > 800% (verified by zooming from 100% to 1000% and inspecting overlay presence)
- [ ] Hover contour renders at 1.5px `var(--select)` border-radius 0 only while cursor hovers a node; disappears within 16ms of pointer leaving
- [ ] Find highlight renders golden contour for matched node IDs supplied by Cluster 08's `useFind`; pre-08 the overlay is dormant (zero highlights, zero render cost)
- [ ] Eyedropper crosshair renders 96px magnifier + 16px reticle + hex chip per hi-fi B8.7 specs ONLY when `useEyedropperStore.active=true`
- [ ] Measurement annotations render persistent dashed `#F24822` lines + caps + label per hi-fi B8.9 for every MEASUREMENT NodeType in viewport; persists after page reload (since 07a NodeType persists in Yjs)

### 8.4 Eyedropper flow

- [ ] Pressing the bottom-toolbar Eyedropper tool button (06 mounts) activates eyedropper via `useEyedropper.activate(callback)` with no-op callback (sample-and-discard mode)
- [ ] Pressing Esc cancels the eyedropper; magnifier disappears; no callback fires
- [ ] Clicking on canvas while eyedropper active samples the pixel at click coordinates via `figma.canvas.readPixel()`; hex value passed to callback; magnifier disappears
- [ ] Activating eyedropper from `<PaintEditor>` pipette button passes a callback that writes the sampled hex to the active fill / stop / effect color
- [ ] Eyedropper magnifier follows cursor at 6× zoom per hi-fi B8.7 line 3099; hex chip floats below-right of cursor

### 8.5 Slice tool flow

- [ ] Activating slice tool (`useSliceTool.activate()`) sets `useEditorStore.activeTool='slice'` and changes cursor to crosshair
- [ ] Dragging on canvas while slice tool active creates a SLICE NodeType node via `figma.createSlice()` with the dragged rectangle bounds
- [ ] Newly-created SLICE node renders via `SliceRegionOverlay`
- [ ] Selecting an existing SLICE node shows export-preview chrome per hi-fi B8.1
- [ ] `useExportPipeline.exportAllSlices()` iterates every SLICE on the active page and invokes `figma.exportAsync()` per node; resulting bytes batch into a ZIP via JSZip (Phase B) OR per-file download fallback (Phase A)

### 8.6 Measurement tool flow

- [ ] Activating measurement tool (`useMeasurementTool.activate()`) sets `useEditorStore.activeTool='measurement'`
- [ ] First click on canvas anchors the start point
- [ ] Second click anchors end point + creates MEASUREMENT NodeType node via `figma.createMeasurement()`
- [ ] Measurement renders via `MeasurementAnnotations` overlay with dashed `#F24822` lines + caps + label showing the distance
- [ ] Selecting a measurement reveals endpoint handles in `#F24822`; dragging an endpoint re-anchors and updates the label

### 8.7 Boolean ops + shortcuts

- [ ] Selecting ≥2 nodes and clicking Union button in `<BooleanOpsRow>` produces a boolean union node in scene-graph (verified by checking the new node's `booleanOperation` property)
- [ ] Subtract / Intersect / Exclude buttons each produce the correct boolean operation
- [ ] When Cluster 08's shortcut registry is available (`KEYBOARD_SHORTCUTS_REGISTRY_AVAILABLE=true`), pressing ⌘⌥U on a multi-select invokes Union; ⌘⌥S Subtract; ⌘⌥I Intersect; ⌘⌥X Exclude
- [ ] Pre-08 (registry not available), Boolean ops are reachable only via the inspector buttons (no keyboard shortcuts)

### 8.8 Copy / paste properties

- [ ] Selecting a node and triggering `useCopyPasteProps.copy()` writes ALL Q23 fields to `useClipboardStore.copiedProps`
- [ ] Selecting a different node and triggering `useCopyPasteProps.paste()` applies copied props to the target
- [ ] Pasting incompatible props onto a different NodeType silently drops them (e.g., `textAlignVertical` on a RECTANGLE) — no error, no toast
- [ ] Pasting onto multi-select applies props to every target node
- [ ] When 08's shortcut registry available: ⌘⌥C copies, ⌘⌥V pastes
- [ ] Clipboard is per-tab Pinia state; closing tab loses clipboard (matches Figma)

### 8.9 Drag-and-drop integration with Cluster 05

- [ ] Drop a brand-asset image onto an existing RECTANGLE / FRAME / ELLIPSE / VECTOR node opens `<ImageFillPicker>` popover with the asset pre-selected, mode='FILL'
- [ ] Drop the same payload on empty canvas spawns an IMAGE node at the asset's natural size, anchored at drop position
- [ ] Drop on an incompatible NodeType (e.g., a TEXT node without image-fill support) shows toast: "Cannot apply image fill to this layer type" (consumes Cluster 11's `useToast`)

### 8.10 Visual fidelity (browser smoke per `feedback_browser_smoke_test_before_done`)

- [ ] All inspector + popover surfaces match hi-fi 11 + 12 byte-identical (manual diff via DevTools)
- [ ] All 10 overlays match hi-fi 09 byte-identical (colors, opacities, z-indexes per §3.4 + §3.5 tables)
- [ ] Dark theme only — no light-theme variant exists or renders
- [ ] No `#5a7dff` (Kova brand blue) appears on any overlay other than the AI assist panel (B8.10 — owned by 10 AI Chat); enforce via grep (`grep -n "#5a7dff" src/components/canvas-overlays/` returns 0 except possibly inline style references that are dead code)

### 8.11 Performance

- [ ] All 10 overlays mounted simultaneously do not drop the 60fps render budget on a M1 MacBook Air (verified via Chrome DevTools Performance panel — Layout + Paint < 8ms per frame at canvas zoom 100%)
- [ ] Pixel grid at 800%+ zoom does not trigger layout thrash (use `transform: translate3d` or CSS background-image, never inline DOM elements per pixel)
- [ ] Frame outlines + measurement annotations cull to viewport (no offscreen overlay nodes mounted)

---

## 9. Test plan

### 9.1 Unit tests (`bun run test:unit`)

Target coverage: ≥85% on new composables, ≥80% on new components.

| Test file | Covers |
|---|---|
| `tests/unit/composables/use-eyedropper.test.ts` | activate / sample / cancel; callback wiring; sampledHex reactivity |
| `tests/unit/composables/use-slice-tool.test.ts` | activate sets activeTool; drag handler creates SLICE node via mocked `figma.createSlice` |
| `tests/unit/composables/use-measurement-tool.test.ts` | two-click flow: first click anchors start; second click creates MEASUREMENT |
| `tests/unit/composables/use-export-pipeline.test.ts` | iterates SLICE nodes; per-node exportAsync mocked; ZIP batching (mock JSZip); Phase A unbundled fallback |
| `tests/unit/composables/use-copy-paste-props.test.ts` | copy reads Q23 fields off node; paste applies to target; incompatible-NodeType silent drop; multi-select paste |
| `tests/unit/stores/clipboard.test.ts` | copyProps / pasteProps / clear; per-tab persistence (no localStorage) |
| `tests/unit/stores/eyedropper.test.ts` | activate registers callback; sample invokes callback + clears; cancel skips callback |
| `tests/unit/components/inspector/PaintEditor.test.ts` | Mode-tab switching; gradient stop add/remove; angle input update; eyedropper trigger emits |
| `tests/unit/components/inspector/ImageFillPicker.test.ts` | 4 mode-tab switching; Crop handle drag emits; Tile slider emits |
| `tests/unit/components/inspector/BooleanOpsRow.test.ts` | Renders only on multi-select; 4 buttons emit correct op; tooltip shortcuts present |
| `tests/unit/components/inspector/EffectEditor.test.ts` | X / Y / Blur / Spread input scrub; color swatch + opacity update; Visible checkbox toggle; delete emit |
| `tests/unit/components/inspector/EffectRow.test.ts` | Renders 5 effect types with correct icon + meta; visibility toggle; delete |
| `tests/unit/components/inspector/GradientStopList.test.ts` | Add / remove inner stops; outer stops always present; selectedIndex update |
| `tests/unit/components/inspector/JpgQualityDropdown.test.ts` | 3 options map to 0.92 / 0.80 / 0.65 |
| `tests/unit/components/inspector/VerticalTextAlignRow.test.ts` | 3-segment update emit |
| `tests/unit/components/inspector/StrokeAlignRow.test.ts` | 3-segment update emit |
| `tests/unit/components/inspector/MultipleFillsList.test.ts` | Drag-reorder emit; visibility toggle; delete; add row; mixed-state render |
| `tests/unit/components/canvas-overlays/FrameOutlinesOverlay.test.ts` | Renders one outline per FRAME node in viewport; correct z-index + color |
| `tests/unit/components/canvas-overlays/MaskOutlinesOverlay.test.ts` | Renders for nodes with isMask=true; corner glyph per shape type |
| `tests/unit/components/canvas-overlays/SliceRegionOverlay.test.ts` | Renders for SLICE NodeType; label tag |
| `tests/unit/components/canvas-overlays/SnapIndicatorsOverlay.test.ts` | Empty when no drag; renders when snapHits non-empty; disappears on release |
| `tests/unit/components/canvas-overlays/LayoutGuidesOverlay.test.ts` | Per-frame layout-grid read; Uniform / Columns / Rows render correctly; Q24 default red 10% |
| `tests/unit/components/canvas-overlays/PixelGridOverlay.test.ts` | Hidden ≤ 800% zoom; visible > 800% |
| `tests/unit/components/canvas-overlays/HoverContourOverlay.test.ts` | Renders only when hoveredNodeId set; disappears on null |
| `tests/unit/components/canvas-overlays/FindHighlightOverlay.test.ts` | Renders one highlight per matchedNodeId; empty when array empty |
| `tests/unit/components/canvas-overlays/EyedropperCrosshair.test.ts` | Hidden when eyedropperStore.active=false; visible when true; magnifier + reticle + hex chip render |
| `tests/unit/components/canvas-overlays/MeasurementAnnotations.test.ts` | Renders for MEASUREMENT NodeType; dashed lines + caps + label |

### 9.2 Integration tests (`bun run test:unit` against engine integration)

Per `project_pre_prd_audit_ratified` decision (local Supabase + CI ephemeral). 07b integration tests focus on engine contract — they assume 07a's APIs exist (mocked at boundary if 07a hasn't shipped at test time).

| Test file | Covers |
|---|---|
| `tests/integration/inspector/effects-end-to-end.test.ts` | Add a node, add 5 effects (one per type), verify scene-graph state, verify render output (canvas snapshot match) |
| `tests/integration/inspector/boolean-ops-end-to-end.test.ts` | Multi-select 3 nodes, invoke each of 4 boolean ops, verify resulting node's `booleanOperation` property + child geometry |
| `tests/integration/inspector/gradient-editor-end-to-end.test.ts` | Apply linear gradient, add 4 stops, change angle, verify scene-graph `gradientStops[]` + `gradientHandlePositions[]` |
| `tests/integration/inspector/image-fill-modes.test.ts` | Apply image fill, switch through all 4 scaleMode values (FILL / FIT / CROP / TILE), verify ImagePaint.scaleMode + render snapshot |
| `tests/integration/composables/eyedropper-canvas-only.test.ts` | Activate eyedropper, simulate canvas click at (100, 100), verify `figma.canvas.readPixel(100, 100)` invoked + callback fires with hex |
| `tests/integration/composables/export-pipeline.test.ts` | Create 3 SLICE nodes, invoke `exportAllSlices()`, verify 3 `figma.exportAsync()` calls with correct args, verify resulting ZIP contains 3 files |
| `tests/integration/composables/copy-paste-props.test.ts` | Source node with full Q23 prop set; copy; paste onto target; verify each field copied; verify incompatible field silently dropped |
| `tests/integration/canvas-overlays/snap-indicators-during-drag.test.ts` | Initiate drag on canvas, verify SnapIndicatorsOverlay renders snap-pixels + spacing tags during drag, disappears on release |
| `tests/integration/canvas-overlays/measurement-persistence.test.ts` | Create measurement, save canvas (Yjs flush), reload, verify measurement re-renders identically |

### 9.3 E2E tests (Playwright — `bun run test`)

Smoke tests via Vercel Agent Browser preferred per `e2e-runner` agent default. Playwright fallback. Critical flows only.

| Spec | Covers |
|---|---|
| `tests/e2e/canvas/inspector-effects.spec.ts` | Open canvas → select node → add drop-shadow effect → adjust X/Y/Blur → verify visual result via screenshot diff |
| `tests/e2e/canvas/inspector-multiple-fills.spec.ts` | Select node → add 3 fills via UI → drag-reorder via handle → verify scene-graph state matches expected order |
| `tests/e2e/canvas/inspector-image-fill-crop.spec.ts` | Drop image → switch to Crop mode → drag corner handle → verify crop applied + visual screenshot diff |
| `tests/e2e/canvas/gradient-editor-linear.spec.ts` | Open `<PaintEditor>` → switch to Linear → add 2 stops → change angle to 45° → verify rendered gradient |
| `tests/e2e/canvas/eyedropper-flow.spec.ts` | Open ColorPicker → click pipette → click on canvas color sample → verify hex written back to picker input |
| `tests/e2e/canvas/boolean-union.spec.ts` | Select 3 overlapping shapes → click Union → verify single boolean node in layers panel + visual matches expected union |
| `tests/e2e/canvas/slice-export.spec.ts` | Create 2 slices → click "Export N slices" → verify ZIP download triggered + ZIP contains 2 PNG files |
| `tests/e2e/canvas/measurement-persistence.spec.ts` | Create measurement → reload page → verify measurement still visible at same coordinates |
| `tests/e2e/canvas/overlays-render-all.spec.ts` | Load test canvas with 10 frames + 3 masks + 2 slices + 1 measurement → verify all overlays render without z-index conflicts |
| `tests/e2e/canvas/copy-paste-props.spec.ts` | Source rectangle with stroke + fill + effect → copy → paste onto target rectangle → verify all 3 props applied |

### 9.4 Manual QA (founder browser smoke per `feedback_browser_smoke_test_before_done`)

- [ ] Open a canvas → select a TEXT node → confirm vertical-text-align row appears with TOP/MIDDLE/BOTTOM; click each + observe re-render
- [ ] Select a node with stroke → confirm stroke-alignment row INSIDE/CENTER/OUTSIDE; click each + observe outline shift
- [ ] Add 3 fills to a node → drag-reorder → toggle visibility on middle fill → delete bottom fill → confirm scene-graph state
- [ ] Drop an image asset onto a rectangle → ImageFillPicker opens → switch through Fill/Fit/Crop/Tile → observe visual changes
- [ ] Open color picker on a fill → switch to Linear → add a stop at 50% → change angle to 45° → observe gradient
- [ ] Switch to Radial → drag center handle → observe origin shift
- [ ] Add a drop-shadow effect → tweak X/Y/Blur/Spread → toggle visibility → delete; repeat for inner-shadow / layer-blur / background-blur / foreground-blur
- [ ] Multi-select 3 shapes → confirm BooleanOpsRow appears → click each of 4 ops → observe result
- [ ] Press ⌘⌥U with 2 selected → observe Union (only when 08 ships)
- [ ] Press ⌘⌥C on a styled node → press ⌘⌥V on another node → observe full props copied (only when 08 ships)
- [ ] Set Export to JPG → confirm quality dropdown → select Medium → click "Export N slices" → confirm ZIP download
- [ ] Click bottom-toolbar Eyedropper button → magnifier follows cursor → click on canvas → confirm hex sampled
- [ ] Press Esc during eyedropper → magnifier disappears
- [ ] Activate slice tool → drag rectangle → confirm SLICE node created + region overlay
- [ ] Activate measurement tool → click two points → confirm dashed line + label appears
- [ ] Reload canvas → confirm measurement persisted
- [ ] Toggle layout guides on a frame in inspector → confirm red 10% overlay appears
- [ ] Zoom canvas to 1000% → confirm pixel grid appears; zoom back to 100% → confirm grid disappears
- [ ] Hover over various nodes → confirm hover contour appears + disappears instantly on leave
- [ ] Initiate a drag → confirm snap indicators (red snap-pixels + spacing tags) appear during drag, disappear on release
- [ ] Confirm AI panel (B8.10) is the only place Kova blue `#5a7dff` appears on canvas

### 9.5 Pre-commit + CI verifications

- `bun run check` — oxlint + type-check zero errors
- `bun run format` — oxfmt no diff
- `bun run test:unit` — all green
- `bun run test:dupes` — jscpd < 3%
- Grep: `#5a7dff` appears only inside `src/components/ai/` and `src/canvas-extensions/ai/` (NOT inside `src/components/canvas-overlays/` per §8.10 acceptance)
- Grep: no imports of `packages/core/src/scene-graph` or `packages/core/src/renderer/` from any 07b file (07b consumes via public proxy only, not direct imports)

---

## 10. Rollout phasing

### Phase A — initial deploy (Wave 5 close, paired with 07a)

- All 10 canvas overlay components shipped (Vue + Tailwind)
- All 9 new inspector components shipped (PaintEditor, ImageFillPicker, BooleanOpsRow, EffectEditor, EffectRow, GradientStopList, JpgQualityDropdown, VerticalTextAlignRow, StrokeAlignRow, MultipleFillsList)
- All 6 inspector section extensions wired (EffectsSection, ExportSection, StrokeSection, TypographySection, FillSection, ColorPicker)
- All 5 new composables shipped (useEyedropper, useSliceTool, useMeasurementTool, useExportPipeline, useCopyPasteProps)
- 2 new Pinia stores (useClipboardStore, useEyedropperStore)
- DnD receiver wiring for image-fill drop (Q24 cross-cut with 05)
- Boolean-ops keyboard shortcuts: registered into Cluster 08's registry IF available; otherwise inspector-buttons-only fallback
- Export pipeline: per-file fallback if JSZip not yet in deps
- All 9.1 unit tests green ≥85% coverage
- 9.2 integration tests green
- 9.3 E2E spec pack green in staging
- 9.4 manual QA pass

### Phase B — post-Wave 5 polish (paired with 08 + 09 + 10)

- JSZip dependency added → batched ZIP export
- Cluster 08 ships shortcut registry → Boolean ops + copy/paste shortcuts live
- Cluster 08 ships `useFind` → `FindHighlightOverlay` activates with real matched IDs
- Cluster 09 consumes export pipeline output for snapshot diffs
- Cluster 10 consumes engine state for AI tool layer (overlays remain pure-visual; AI tools are read-only against scene-graph)

### Feature flags (per `00d` 2.B 10 default — hard-coded constants for MVP)

| Flag | Default | Toggle condition |
|---|---|---|
| `KEYBOARD_SHORTCUTS_REGISTRY_AVAILABLE` | `false` (Phase A) → `true` (Phase B when 08 ships) | Flip when Cluster 08 lands `useShortcutsStore` |
| `EXPORT_PIPELINE_ZIP_BATCHING` | `false` (Phase A — per-file fallback) → `true` (Phase B when JSZip in deps) | Flip when JSZip added to package.json |
| `FIND_OVERLAY_DORMANT` | `true` (Phase A — overlay renders zero highlights) → `false` (Phase B when 08 ships `useFind`) | Flip when Cluster 08 lands |
| `LAYOUT_GUIDES_DEFAULT_ON` | `true` (Q24-locked) | Hardcoded; do not flip |
| `EYEDROPPER_CANVAS_ONLY` | `true` (Q20-locked for MVP) | Phase 2: Tauri macOS screen-wide flips this to `false` and registers a different sampling backend |
| `EFFECTS_SECTION_DEFAULT_COLLAPSED` | `true` (Figma-default behavior) | Hard-coded |
| `JPG_DEFAULT_QUALITY` | `'high'` (0.92 per Q22) | Hard-coded |

---

## 11. Cross-cuts to other PRDs

| Other PRD | What we depend on (from them) | What they depend on us for |
|---|---|---|
| **07a — Canvas Engine Core + Renderer** | Every engine API listed in §7.1 + §7.2: SLICE NodeType, MEASUREMENT NodeType, scaleMode enum, GradientPaint type, Effect type, `figma.booleanOperation()`, `figma.canvas.readPixel()`, `figma.createSlice()`, `figma.createMeasurement()`, `figma.exportAsync()`, mask compositing in renderer/scene.ts, renderer/measurements.ts, figma-api-proxy field exposure, kiwi schema serialization | Every overlay component reads engine state via the proxy; if 07a renames a field, 07b updates the import. |
| **06 — Canvas Editor Core Chrome** | `<TopChrome>`, `<BottomToolbar>`, `<RightPanel>`, `<LeftPanel>`, inspector tab routing, the `<EditorView>` shell that mounts `<CanvasOverlayLayer>`. Existing `properties/*Section.vue` chrome | Inspector section *extensions* (07b extends EffectsSection, ExportSection, StrokeSection, TypographySection, FillSection, ColorPicker) — 06 owns the parent components; 07b's extensions land inside them via composition / slots / direct edit |
| **08 — Canvas Menus + Popovers + Shortcuts** | `useShortcutsStore.register()` API for Boolean ops + copy/paste shortcuts; `useFind` composable for `FindHighlightOverlay`; `<KovaContextMenu>` for inspector right-click overflow (per Q18) | None at runtime |
| **09 — Version History + Trash** | None at runtime — 07b ships before 09; 09 consumes 07b's `useExportPipeline` output for snapshot thumbnails | `useExportPipeline.exportAllSlices()` produces image bytes 09 thumbnails consume |
| **10 — AI Chat + Memory + Tools** | None at runtime — 10 ships AFTER 07b; 10 consumes engine state read-only | AI tool layer reads the same scene-graph state 07b reads. AI Slice/Measurement creation tools wrap 07b's `useSliceTool` / `useMeasurementTool` composables |
| **05 — Brand Kit + Drag-Drop** | `application/x-kova-brand-asset` MIME type taxonomy; brand-asset payload shape `{ assetId, kind }` | Image-fill drop receiver (07b's `use-canvas-drop` extension consumes the brand-asset payload and routes to ImageFillPicker) |
| **11 — Shared UI Infrastructure** | `useToast` composable for incompatible-fill-type drop toast; `<KovaModal>` if export-preview confirm needed; theme-detection meta convention (canvas is dark) | None at runtime |
| **12 — Settings + User Prefs** | None at runtime — Phase 2 layout-guides toggle + show-rulers prefs land here | None at runtime |

### 11.1 Hygiene rules from `00e §6`

Acknowledged + enforced:

- **No live multi-device canvas sync promises** (§6 #2): 07b's overlays render LOCAL state — the snap indicator a user sees is THEIR drag, not a peer's. Trystero/awareness dormant per Q6.
- **D-5C Vite-only** (§6 #1 / D-5C reversal): no Nuxt / SSR — overlays + inspector are pure client-side Vue 3 components in the single Vite SPA.
- **D-3 brand-voice guardrail** (§6 #5): N/A in 07b (owned by 05). Acknowledged.

---

## 12. Risks + open questions

### 12.1 RISK (Medium) — 07a sequencing

07b's components import engine APIs that 07a defines. If 07a slips, 07b's components fail at compile time (TypeScript) or at runtime (proxy methods undefined).

**Mitigation:** 07a + 07b ship as a paired Wave 5 deploy — neither merges to main without the other. During development, 07b's tests mock the engine boundary (`figma.createSlice`, `figma.createMeasurement`, `figma.canvas.readPixel`) so 07b can build + test in isolation. CI runs the integration tests (§9.2) only after BOTH PRDs land on the integration branch.

### 12.2 RISK (Medium) — Existing `properties/` vs audit-recommended `inspector/` directory

Existing inspector sections live at `src/components/properties/` (10 files: PositionSection, LayoutSection, FillSection, StrokeSection, TypographySection, EffectsSection, AppearanceSection, ExportSection, PageSection, VariablesSection). Audit §2.A Cluster 06 + 07 recommend `src/components/inspector/`.

**Decision:** 07b creates NEW components at `src/components/inspector/` per audit. 07b *extends* existing files at their current `properties/` path (no rename mid-PRD). Cluster 06 PRD owns the rename decision — if 06 renames `properties/` → `inspector/`, 07b's extensions migrate automatically with 06's PR.

**Recommendation:** Cluster 06 PRD adopts `inspector/` rename as the canonical path. Founder ratifies during 06 review. 07b assumes ratification per audit.

### 12.3 RISK (Low) — JSZip dependency + bundle size

`useExportPipeline` Phase B depends on JSZip (~25KB gzipped). Adding a new dep to a single-feature path inflates the canvas bundle.

**Mitigation:** Lazy-import JSZip only when `exportAllSlices()` is called (`const { default: JSZip } = await import('jszip')`). Phase A ships per-file download fallback so bundle isn't impacted until JSZip actually loads.

### 12.4 RISK (Low) — Effects rendering vs renderer ownership

Q3 #12 says all 5 effect types are engine-ready (renderer ships them). 07b's `EffectsSection` extension is pure UI — but if hi-fi 11.15/11.16 reveals a render mismatch (e.g., `BACKGROUND_BLUR` doesn't visually composite), the fix is in 07a's renderer, not 07b.

**Mitigation:** 07b acceptance §8.1 includes "all 5 effect types … render correctly." If a render mismatch is found during testing, escalate to 07a as a renderer bug; 07b inspector wiring stays correct.

### 12.5 OPEN QUESTION — Gradient editor: Angular + Diamond defer reasoning

Q3 says all 4 gradient types are engine-ready (LINEAR / RADIAL / ANGULAR / DIAMOND). 07b ships only LINEAR + RADIAL UI in MVP — matches Figma's 90th-percentile usage and avoids a 4-tab clutter in the picker.

**Decision recommendation:** Ship LINEAR + RADIAL UI only. Phase 2 unlocks ANGULAR + DIAMOND tabs. Founder sign-off needed.

**Mitigation if founder wants all 4 in MVP:** Add 2 tabs to mode-tab row (Solid / Linear / Radial / Angular / Diamond / Image — 6 tabs). Acceptable but tight on the 280px popover width.

### 12.6 OPEN QUESTION — Find highlight color

Hi-fi 09 doesn't provide explicit B8.x scene for find highlight color. Suggested: golden / yellow contour to disambiguate from selection blue + measurement red + mask green.

**Decision recommendation:** `#FFC857` (yellow) at 1.5px solid + `rgba(255, 200, 87, 0.18)` halo. Founder confirms during PRD review.

### 12.7 OPEN QUESTION — Pixel-grid auto-show threshold

Hi-fi B8.5 says "auto-show > 800% zoom." Confirm threshold is exactly 800% (zoom value > 8.0) or interpret as approximate.

**Decision recommendation:** Exact 800% threshold (`zoom > 8.0`). Below 800%, `useEditorStore.overlays.pixelGrid=true` still keeps the overlay component mounted but the render is skipped. Toggling via inspector forces visibility independent of zoom.

### 12.8 OPEN QUESTION — Layout-guides per-frame UI vs top-level toggle

Hi-fi B8.6 line 2469 says "No top-level toggle UI in MVP; visibility follows inspector state." But the inspector for Layout Grids isn't fully designed yet — Cluster 06's `<LayoutSection>` may or may not include the grid type/color/spacing controls.

**Decision recommendation:** 07b's `LayoutGuidesOverlay` reads `frame.layoutGrids[]` directly. Cluster 06 PRD owns the inspector UI for editing those grids. If 06 doesn't ship the grid editor in Phase A, the overlay still works for any grid set programmatically (e.g., on canvas creation defaults). Founder confirms 06 / 07b split.

### 12.9 OPEN QUESTION — Eyedropper sampling implementation

`figma.canvas.readPixel(x, y)` is the proposed API. OpenPencil's existing canvas exposes a `getImageData()`-like surface via the renderer's WebGL canvas, but not a per-pixel proxy method. 07a may need to add a thin wrapper.

**Decision recommendation:** 07a adds `figma.canvas.readPixel(x, y): { r, g, b, a }` to the figma-api-proxy as item 9 of 07a's core mods. Falls naturally into 07a's "expose new fields/methods via proxy" item.

### 12.10 OPEN QUESTION — Boolean ops on a single selection

Figma allows boolean ops on a single selection (treats as no-op or selects N siblings depending on context). Q3 #14 confirms 4 ops + Figma shortcuts but doesn't specify single-selection behavior.

**Decision recommendation:** Boolean ops require ≥2 selected nodes. Single selection → buttons + shortcuts disabled. Matches Figma's "must select 2+ to combine" UX. Founder confirms.

### 12.11 OPEN QUESTION — Copy/paste props target compatibility table

Q23 says full property set copies. Need to enumerate the silent-drop matrix:

| Source field | Target NodeType | Behavior |
|---|---|---|
| `textAlignVertical` | RECTANGLE / FRAME / ELLIPSE | Silent drop |
| `characterStyleOverrides` | RECTANGLE / FRAME / ELLIPSE | Silent drop |
| `paddingLeft/Right/Top/Bottom` | non-FRAME | Silent drop |
| `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `itemSpacing` | non-FRAME | Silent drop |
| `cornerRadius` | TEXT / LINE / VECTOR (no native cornerRadius) | Silent drop |
| `strokeAlign` | TEXT (no stroke) | Silent drop |

**Decision recommendation:** Drop incompatible fields silently (no toast, no error). User-facing behavior matches Figma. Founder confirms.

---

## 13. References

### 13.1 03-doc rows covered

- **§2.7 Canvas-engine extensions — bucket #1c (Inspector wiring)** rows: vertical text align, stroke align, multiple fills, image fill picker, gradient editor UI, Effects inspector (5 types), Boolean ops menu+inspector
- **§2.7 Canvas-engine extensions — bucket #1d (App-level overlays)** rows: Frame outlines, Mask outlines, Slice region, Snap indicators, Layout guides, Pixel grid, Hover contour, Find highlight, Eyedropper crosshair, Measurement annotations
- **§3C #1c + #1d** (audit's split — 07a takes #1a/#1b, 07b takes #1c/#1d)

### 13.2 Q-decisions baked in

- **Q3** (corrected expanded — 9 features engine-ready, 1 partial, 4 missing): inspector wiring for vertical text align, all gradient types (UI ships LINEAR + RADIAL only — see §12.5), POLYGON / STAR / LINE shape registration (07a), stroke align, all 5 effect types, boolean operations (07b consumes), vector network field
- **Q3 #12** (Effects re-added to MVP): all 5 effect types ship — DROP_SHADOW, INNER_SHADOW, LAYER_BLUR, BACKGROUND_BLUR, FOREGROUND_BLUR
- **Q3 #14** (Boolean operations): wire existing `figma.booleanOperation()` from `figma-api.ts`. Standard Figma shortcuts: Union (⌘⌥U), Subtract (⌘⌥S), Intersect (⌘⌥I), Exclude (⌘⌥X)
- **Q20** (Eyedropper): canvas-only MVP. Phase 2 = screen-wide on macOS Tauri
- **Q21** (Image fill modes): all 4 ship — Fill (default), Fit, Crop, Tile
- **Q22** (JPG export quality): 3-level dropdown — High 0.92 (default) / Medium 0.80 / Low 0.65
- **Q23** (Copy/Paste properties): full set — overrides Figma's stroke-partial limitation
- **Q24** (Drag-drop semantics + Layout guides default): image fill drop semantics consumed by 07b receiver; Layout guides default-ON red 10%

### 13.3 Hi-fi files

- `main-main-kova-scope/batch-b/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html` (Inspector — 19 scenes; 07b consumes 11.7, 11.9, 11.10, 11.11, 11.12, 11.13, 11.14, 11.15, 11.16, 11.17, 11.18, 11.19)
- `main-main-kova-scope/batch-b/chunk-b5/Kova Hi-Fi 12 Color Picker - Dark.html` (Color Picker — 14 scenes; 07b consumes 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.13, 12.14)
- `main-main-kova-scope/batch-b/Kova Hi-Fi 09 Canvas Overlays - Dark.html` (Canvas Overlays — 10 scenes B8.1–B8.10; 07b consumes all 10)

### 13.4 Design system

- `main-main-kova-scope/design-system/design.md` (spec — token vocabulary, component contracts, bans)
- `main-main-kova-scope/design-system/kova-hifi.css` (canonical dark CSS — used by every 07b surface)
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` (vocabulary cheat-sheet — `--select`, `--accent-soft`, `--accent-ink`, `--ink3`, `--fill2`, `--line` referenced in §3 hi-fi extracts)

(No `kova-hifi-light.css` reference — 07b is dark-only.)

### 13.5 Audit + verification inputs

- `kova-open-pencil-1/docs/prd/00-PRD_SCOPE_PLAN.md` (master plan; §3 Cluster 07; §5 PRD template; §5.6 ratification log item 10 — split committed; §6 cross-cuts — keyboard registry, brand context, MIME types)
- `kova-open-pencil-1/docs/prd/00a-PRD_AUTHORING_GUIDE.md` (operator manual followed for this draft)
- `kova-open-pencil-1/docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md` (§2.A Cluster 07 lines 1614–1683 — buckets 1c + 1d lifted as base; §1.D cross-cuts — Tauri command-surface, Vue Router meta theme; §1.E.1 M9 Shopify reuse — N/A for 07b but acknowledged)
- `kova-open-pencil-1/docs/prd/00d-EXTERNAL_VERIFICATION_HANDOFF.md` (Top-10 ratifications; D-5C Vite-only single SPA reversal)
- `kova-open-pencil-1/docs/prd/00e-EXTERNAL_VERIFICATION_VERDICT.md` (§6 PRD-hygiene rules; no live multi-device canvas sync)
- `kova-open-pencil-1/docs/prd/01-auth-and-identity.md` (canonical structural template — 07b mirrors §0 / §1 / §2 / §3 / §11 / §13 format)

### 13.6 External sources cited

- [Figma Help — Boolean operations](https://help.figma.com/hc/en-us/articles/360039957534-Combine-shapes) (Boolean ops UX + ⌘⌥U/S/I/X shortcuts)
- [Figma Help — Eyedropper](https://help.figma.com/hc/en-us/articles/360039958654-Use-the-eyedropper-tool) (canvas-only behavior reference)
- [Figma Help — Effects](https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers) (5 effect types)
- [Figma Help — Slice tool](https://help.figma.com/hc/en-us/articles/360040028934-Export-slices) (slice → export pipeline)
- [Figma Help — Measurement](https://help.figma.com/hc/en-us/articles/360039956914-Annotate-and-measure-designs) (persistent measurement annotations)
- [Figma Help — Gradient editor](https://help.figma.com/hc/en-us/articles/360040672553-Add-and-modify-gradients) (Linear / Radial UI reference)
- [JSZip](https://stuk.github.io/jszip/) (Phase B export ZIP batching)

### 13.7 Memory pointers consulted

- `feedback_app_dark_website_light` — canvas is inside the authenticated app; dark only
- `feedback_figma_ui_theme` — Figma reference for inspector + overlay visual decisions
- `feedback_browser_smoke_test_before_done` — §9.4 manual QA gate
- `feedback_verify_with_docs` — Figma claims in §13.6 verified via help.figma.com
- `feedback_explain_for_nontechnical_founder` — §1.1 plain language + §1.2 caveman both included
- `feedback_image_export_locked` — JPG export pipeline ships images, not HTML; locked
- `project_design_system_master` — canonical design-system paths cited in §13.4
- `project_pre_prd_audit_ratified` — local Supabase + CI ephemeral (§9.2)

### 13.8 What is NOT in this PRD (handed elsewhere)

- All `packages/core/` modifications (NodeTypes, scene-graph extensions, renderer, tools, kiwi, figma-api-proxy, CHANGELOG-KOVA) — **Cluster 07a Canvas Engine Core + Renderer**
- All renderer changes (`renderer/scene.ts` mask compositing, `renderer/measurements.ts`) — **Cluster 07a**
- Tool slot registration in `packages/core/src/tools/` — **Cluster 07a**
- Inspector chrome shell + tab routing — **Cluster 06 Canvas Editor Core Chrome**
- Existing 10 `properties/*Section.vue` files (07b extends; 06 owns the parent migration) — **Cluster 06**
- Right-click context menu shell + `useObjectActions` dispatch table — **Cluster 08 Canvas Menus**
- Keyboard shortcut registry primitive (`useShortcutsStore`) — **Cluster 08**
- `useFind` composable — **Cluster 08**
- `useConfirm` composable — **Cluster 08 + 11**
- `<KovaModal>` shell — **Cluster 11 Shared UI**
- Toast composable — **Cluster 11**
- Brand-color / brand-asset / brand-font / saved-block MIME taxonomy — **Cluster 05 Brand Kit + Drag-Drop**
- Snapshot / version-history store consuming export pipeline output — **Cluster 09 Version History + Trash**
- AI tool registration (slice / measurement / vector tools as AI-callable) — **Cluster 10 AI Chat + Memory + Tools**
- Layout-guides / show-rulers preference toggles — **Cluster 12 Settings + User Prefs (Phase 2)**
- Marketing site / public-facing pages — out of MVP entirely (Astro project later)
