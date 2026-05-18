# PRD 07a — Canvas Engine Core + Renderer

## 0. Status & ownership

| Field | Value |
|---|---|
| **Status** | `DRAFT` 2026-05-15 |
| **Wave** | 5 (engine) |
| **Author** | Claude (Opus 4.7) |
| **Reviewer** | Jiho Yang (founder) |
| **Last updated** | 2026-05-15 |
| **Depends on PRDs** | 06 (Canvas Editor Core Chrome — hosts the engine), 11 (Shared UI Infrastructure — toast variant taxonomy for engine error surfacing) |
| **Blocks PRDs** | 07b (Canvas Engine Inspector + Overlays — wires inspector UI + B8.x overlays on top of the engine surface this PRD ships), 08 (Menus + Shortcuts — keyboard registry consumes the new tool slots), 09 (Version History — snapshots depend on the stable serialized scene graph this PRD bumps), 10 (AI Chat + Tools — AI tool registry consumes the new NodeTypes + scaleNode) |
| **Source artifacts** | Hi-fi: 2 files (Canvas-Final + Hi-Fi 09 Canvas Overlays — visual reference only; 07b owns rendering UI). 03 doc: §2.7 Canvas-engine extensions (33 rows; §3C #1a + #1b only). Q-decisions: Q1, Q2, Q3 (#1, #2, #3, #4, #5, #6, #10 — engine-side), Q11. Audit §2.A Cluster 07 lines 1614–1683 items 1–8 (with #9–#11 re-scoped into 07a per §12.1 — see divergence note). Founder ratifications: Q4 lift-the-lock policy (00c §895), 07 split decision (00d §3.A D-10, 00-PRD_SCOPE_PLAN §5.6 item 10). |

---

## 1. Problem & outcome

### 1.1 Plain language (for founder)

OpenPencil (the canvas engine Kova ships on top of) is feature-rich but missing a small number of primitives Figma users expect — most importantly the ability to define **slices** (named regions that export as separate images, the foundation of Kova's "design once, export many" model) and **measurements** (persistent dashed-line distance annotations that survive across sessions, used by marketers documenting spacing for engineering handoff). The data shape for masks (one shape revealing another beneath it) already exists in OpenPencil's scene-graph but the renderer never wired the actual compositing — masks would be settable in the inspector but invisible on canvas. Finally, four small page-level + text-level properties are missing: an aspect-ratio lock that constrains resize, a per-page "include in exports" flag (so customers can keep working-pages out of the final ZIP), a page-background-visibility toggle, and a scale tool that resizes a node while keeping its proportions intact. This PRD is the **engine-side** half of Cluster 07. It changes one file's worth of TypeScript inside `packages/core/` — the section CLAUDE.md hard-locks against modification — and that's exactly why it needs its own reviewable PRD: every change lifts that lock and must be tracked, justified, and prepped for upstream contribution back to OpenPencil. No UI lives here. The inspector toggles, the toolbar buttons, the on-canvas dashed outlines that *visualise* slices and measurements, the eyedropper, the layer outlines, the snap indicators — all of that ships in PRD 07b, on top of the engine surface this PRD makes possible.

### 1.2 Caveman summary (per CLAUDE.md communication style)

Engine miss few things. Slice. Measurement. Mask render. Aspect-ratio. Page export flag. Page-bg-vis. Scale tool. Text run OpenType + list/link. PRD lift core lock. Add 2 NodeType. Add 5 SceneNode field. Wire mask in renderer. Bump kiwi schema. Log every change in CHANGELOG-KOVA.md. PR back to OpenPencil upstream. 07b wire UI later. No DB. No backend. All client engine.

### 1.3 Outcome (acceptance gate)

After this PRD ships:

1. A SLICE NodeType + a MEASUREMENT NodeType exist in `packages/core/src/scene-graph.ts`'s union; both round-trip through Kiwi+Zstd serialization without loss; both survive Yjs document load/reload; both are listable via `figma.findAll({ type: 'SLICE' | 'MEASUREMENT' })`; both can be cloned, removed, reparented, and renamed via the standard `FigmaNodeProxy` API.
2. `SceneNode.aspectRatio` (number | null), `SceneNode.includeInExports` (boolean, CANVAS-type semantic only), `SceneNode.pageBackgroundVisible` (boolean, CANVAS-type semantic only) ship as fields; all three survive serialization round-trip; all three are reachable through `figma-api-proxy`.
3. `CharacterStyleOverride` carries the OpenType-feature wiring (font features list) and per-text-run list-marker + link-href metadata; `StyleRun` propagates them through the Kiwi schema.
4. `tools/modify.ts` exports `scaleNode(id: string, factor: number)`; the function is registered in `tools/registry.ts` (EXTENDED_TOOLS); it scales width, height, font-size, corner-radius, stroke-weight, and effect radius/offset proportionally — matching Figma's "K"-key scale tool semantics.
5. `tools/create.ts` `createSlice` no longer fabricates a Frame; it creates a true SLICE NodeType. A new `createMeasurement` ships alongside.
6. `renderer/scene.ts` `renderChildren` performs sibling-traversal mask compositing for all three `MaskType` values (`ALPHA`, `VECTOR`, `LUMINANCE`); masks render correctly on Skia/CanvasKit and on the headless renderer; mask propagation stops at the next mask, the parent frame/group, or a clip-content container — matching Figma's mask propagation rule (verified against help.figma.com).
7. `packages/core/src/kiwi/kiwi-schema/schema.ts` carries a schema version bump; the corresponding kiwi converters serialize/deserialize the new NodeTypes + fields; the version-bump is documented in `CHANGELOG-KOVA.md`.
8. `figma-api-proxy.ts` exposes `figma.createSlice()`, `figma.createMeasurement()`, the new SceneNode fields, the OpenType run metadata, and `scaleNode()` on `FigmaNodeProxy`.
9. `packages/core/CHANGELOG-KOVA.md` exists; it lists every change in this PRD with a one-line description, the affected file, and a "PR-to-upstream" status field (`drafted` / `submitted` / `merged` / `declined`). The first PR-to-upstream draft for the SLICE NodeType is opened (a draft commit on a fork branch, even if not yet pushed) before this PRD's status flips to `IN-IMPLEMENTATION`.
10. The full unit-test suite (`bun run test:unit`) is green; the engine smoke test (load a saved file containing each new field + NodeType and rerender) passes on Skia + headless renderers; `bun run check` and `bun run test:dupes` are green.

The engine surface in this PRD is **invisible to a customer opening the app**: a user with a built and shipped 07a but no 07b sees zero new UI. The acceptance gate above is verified by engineers in tests + a programmatic engine smoke; founder visual sign-off lives in PRD 07b.

---

## 2. Scope

### 2.1 In scope (this PRD)

**`packages/core/` modifications (lift the core lock per CLAUDE.md amendment — ratified in `00c §895`, not yet documented in CLAUDE.md prose; this PRD's merge surfaces the amendment text — see §12.3 + §12.7):**

- `scene-graph.ts`:
  - Append `'SLICE'` and `'MEASUREMENT'` to the `NodeType` union.
  - Add `SceneNode.aspectRatio: number | null` (default `null`; non-null means width/height ratio is locked during interactive resize — semantics consumed by 07b inspector + drag handles).
  - Add `SceneNode.includeInExports: boolean` (default `true`; CANVAS-type semantic — per-page export inclusion flag for the Slice-batch ZIP path).
  - Add `SceneNode.pageBackgroundVisible: boolean` (default `true`; CANVAS-type semantic — toggles the page background fill in editor view only; export pipeline ignores this).
  - Extend `CharacterStyleOverride` with `openTypeFeatures?: string[]` (e.g. `['liga', 'kern', 'tnum']` — CSS `font-feature-settings` vocabulary) and `linkHref?: string` for hyperlink runs.
  - Extend the structure with `ListMarker` per-text-run metadata (`ListType = 'NONE' | 'BULLETED' | 'NUMBERED'`, indent level int) carried on `StyleRun`.
  - Update `createDefaultNode` to include defaults for the new fields.
  - Add `SLICE` + `MEASUREMENT` to `CONTAINER_TYPES` evaluation if either should be selectable but **not** allow children — both are leaf nodes (verified: Figma's SliceNode + MeasurementNode are leaf nodes); explicitly **not** added to `CONTAINER_TYPES`.
- `tools/modify.ts`:
  - Export `scaleNode(id: string, factor: number)`: scales `width`, `height`, `fontSize` (TEXT), all four corner radii (independent + uniform), per-side stroke weights, effect `radius` + `offset.x` + `offset.y`. Does **not** scale `x`, `y`, or `rotation` (matches Figma's "K"-key scale-tool which scales geometry while keeping the node anchored).
  - Recursive scale applies to descendant nodes if `node.childIds.length > 0` (consistent with Figma's scale tool descending the tree).
  - Reuses existing geometry helpers; no new geometry math.
- `tools/create.ts`:
  - Refactor `createSlice` (currently fabricates a fill-less Frame) to instantiate a real SLICE NodeType via `figma.createSlice()` proxy, falling through to the `createDefaultNode('SLICE')` factory after the new NodeType lands.
  - Add `createMeasurement` tool definition (params: `start_x`, `start_y`, `end_x`, `end_y`, `name?`, `parent_id?`).
- `tools/registry.ts`:
  - Export the new tools; add `createMeasurement` and `scaleNode` to `EXTENDED_TOOLS` (kept out of `CORE_TOOLS` to avoid schema-token bloat — AI invokes them on explicit prompt only).
- `figma-api-proxy.ts`:
  - Expose `figma.createSlice(): FigmaNodeProxy` and `figma.createMeasurement(): FigmaNodeProxy`.
  - Expose `FigmaNodeProxy.scale(factor: number): void` (proxy method that calls `modify.scaleNode`).
  - Surface the new SceneNode fields (`aspectRatio`, `includeInExports`, `pageBackgroundVisible`, `openTypeFeatures` via `StyleRun.style`) on the proxy property getters/setters.
- `kiwi/kiwi-schema/schema.ts` + `kiwi/kiwi-convert.ts`:
  - Schema **major version bump** (Kova-side; the upstream OpenPencil schema is untouched in the proto definition by Kova's mods until upstream accepts the PR — see §12.5 dual-schema risk).
  - Add `SLICE` + `MEASUREMENT` enum variants to the NodeType field.
  - Add `aspect_ratio`, `include_in_exports`, `page_background_visible` fields to the SceneNode struct.
  - Add `open_type_features` (string-list) + `link_href` + `list_marker_*` to the StyleRun + CharacterStyleOverride structures.
  - `kiwi-convert.ts` maps both directions; an unknown-NodeType backwards-compat fallback flips an old-build reader into "render as INTERNAL_ONLY frame stub" rather than crashing (downgrade path documented in CHANGELOG).
- `renderer/scene.ts`:
  - Refactor `renderChildren` (lines 85–114 today) to perform sibling-traversal mask compositing per Q2 + the help.figma.com mask propagation rule.
  - All three `MaskType` branches ship in this PRD: `ALPHA` (default — full alpha-channel mask), `VECTOR` (mask shape stroked outline ignores opacity, treats every visible-in-mask pixel as 100%), `LUMINANCE` (brightness-based reveal — pure black hides, pure white reveals).
  - Mask propagation rule: when iterating a parent's `childIds` array, a child with `isMask: true` opens a mask-layer scope on the renderer; subsequent siblings rendered within that scope are clipped/composited against the mask; the scope closes at the **next** mask sibling, the end of the parent's `childIds`, or — when nested inside a clip-content container — implicit re-clipping at the container edge.
  - Reuses existing CanvasKit `saveLayer` + `clipPath`/`clipRect` primitives + `BlendMode.SrcIn` (alpha) / `BlendMode.Luminosity` (luminance) — no new geometry math; just sequencing.
- `packages/core/CHANGELOG-KOVA.md` (NEW file):
  - Maintained log of every Kova-side modification to `packages/core/`.
  - Per entry: date, author, change summary, affected file(s), upstream-PR status (`drafted` / `submitted` / `merged` / `declined`), link to upstream issue/PR if any.
  - Forward-incompatibility notes: a Kova-built scene-graph cannot load in an upstream-only `packages/core/` build until the upstream PR lands; Kova builds load both Kova and upstream scene-graphs via the unknown-field fallback.

**Tool registry slots reserved for 07b (engine ships the underlying ops; 07b wires the interactive tool modes):**

- Slice tool (S key) — drag-on-canvas creation → calls `figma.createSlice()` (07a) then sets pos+size from the drag rectangle.
- Measurement tool (⇧M) — click-drag from origin to target node → calls `figma.createMeasurement()` (07a) with the two-point geometry.
- Eyedropper tool (^C) — canvas-only MVP per Q20; uses the engine's existing color-sampling API (no engine work needed in 07a).
- Scale tool (K) — drag a handle → calls `FigmaNodeProxy.scale(factor)` (07a) with the factor derived from drag distance.
- Arrow stub — Phase-2-deferred per scope plan §3; registry slot reserved by 07a (a no-op `arrowStub` ToolDef entry); 07b's keyboard registry will hide it until the Phase-2 arrow primitive ships in a later PRD.

### 2.2 Out of scope (handed to other clusters)

| Item | Owning PRD |
|---|---|
| Inspector wiring: vertical text align toggle, stroke align toggle, multiple-fills list UI, image-fill 4-mode picker UI, gradient editor UI, Effects inspector (drop shadow / inner shadow / layer blur / background blur / foreground blur) | **07b** — Canvas Engine Inspector + Overlays |
| Inspector wiring: Boolean operations row (Union/Subtract/Intersect/Exclude buttons + ⌘⌥U/S/I/X shortcuts) | **07b** (engine API already exists in `packages/core/src/tools/vector.ts` — Cluster 07b just renders the inspector row + binds the shortcuts via Cluster 08's keyboard registry) |
| Inspector wiring: aspect-ratio toggle in the Position/Layout section (consumes `aspectRatio` field this PRD ships) | **07b** |
| Inspector wiring: per-page "Include in exports" + "Show background" toggles in the no-selection Pages section (consumes `includeInExports` + `pageBackgroundVisible` fields this PRD ships) | **07b** |
| App-level overlays B8.1–B8.10: Frame outlines, Mask outlines, Slice region, Snap indicators, Layout guides (default-ON red 10% per Q24), Pixel grid (auto > 800% zoom), Hover contour, Find highlight, Eyedropper crosshair, Measurement annotations, AI assist panel | **07b** |
| Tool-mode UX: S/⇧M/^C/K key bindings, drag-on-canvas creation gestures, slice-region drag-handle drag-resize, measurement two-point click-drag, eyedropper crosshair cursor | **07b** (uses Cluster 08's keyboard registry; this PRD only reserves the registry slots) |
| Export pipeline: `use-export-pipeline.ts` composable that iterates SLICE nodes + batches into a ZIP via JSZip + JPG-quality dropdown UX (Q22 — 3 levels: High 0.92 / Medium 0.80 / Low 0.65) | **07b** |
| Effects renderer wiring | **N/A — already shipped** per Q3 #12 (verified: `renderEffects` exists at `renderer/scene.ts:412`; drop-shadow, inner-shadow, all blurs render today; 07a does not modify) |
| OpenType per-text-run application to glyph rendering (Skia textPicture pre-rasterization + CanvasKit ParagraphBuilder feature-set wiring) | **07b** — applies the per-run feature-set this PRD adds to `CharacterStyleOverride`; the data model lands here, the rendering call lands in the inspector-paragraph rebuilder owned by 07b |
| Layer tree icons for SLICE + MEASUREMENT, auto-name strings ("Slice N" / "Measurement N") in the layers panel | **07b** (layer-tree owns name display; engine factory just emits the default `type.charAt(0) + type.slice(1).toLowerCase()`-style name — kept as "Slice" / "Measurement" verbatim) |
| Visual rendering of the Slice region (dashed bounding-box) + Measurement annotation (dashed line + label) | **07b** (B8 overlay components — engine surface in this PRD just persists the geometry; rendering belongs to the overlay layer) |

### 2.3 Deferred to Phase 2

Per scope plan §3 Cluster 07:

- Layer thumbnails strategy (§2.4) — not engine-touching at MVP.
- Advanced typography sliders (§2.6) — kerning/tracking sliders beyond the engine-side `letterSpacing` already shipped.
- Pen dropdown chevron stub (§2.3) — Pen tool has additional shapes (Curve, Free-form) Figma exposes via a chevron; deferred until Track 2 stroke-cap renderer audit.
- Arrow primitive — registry slot reserved in 07a (`arrowStub`), full primitive blocked on stroke-cap renderer audit.
- Eyedropper screen-wide on macOS Tauri (Q20 Phase 2) — engine has the sample-color API today; the Tauri privilege wiring is a `kova.eyedropper.sampleScreen` command surfaced later (Cluster 06 owns Tauri command surface naming per scope plan §6 cross-cut).
- Mask compositing optimization (image-cached mask atlas for large mask trees) — naive `saveLayer`-per-mask is correct for the MVP scale (50–300 nodes per Q3 #13 perf budget) but a `nodePictureCache`-style cache may be added later. Out of scope here.

### 2.4 Cross-cut acknowledgments (foreign owners)

- **Cluster 06 — Canvas Editor Core Chrome** owns the bottom toolbar where Slice/Measurement/Eyedropper/Scale tool buttons live. This PRD reserves the registry slots; 06 places the buttons; 07b wires the tool-mode UX.
- **Cluster 08 — Menus + Shortcuts** owns the keyboard shortcut registry. This PRD does **not** add `e.code`-string shortcut entries; 08's registry consumes the registered tool slots and binds the S / ⇧M / ^C / K shortcuts.
- **Cluster 09 — Version History** snapshots the kiwi-serialized scene graph. This PRD's schema version bump forces a `format_version` row on the snapshot record (Cluster 09 PRD owns adding this column per `00c` Q7 review action item). Pre-bump snapshots remain restorable via the unknown-field fallback.
- **Cluster 10 — AI Chat + Tools** consumes the EXTENDED_TOOLS registry. New tools added here (`createSlice` refactor, `createMeasurement`, `scaleNode`) become AI-callable automatically; 10 PRD does not need to re-register them. Cluster 10 PRD §13 References should cite this PRD's `tools/registry.ts` extension.
- **Cluster 11 — Shared UI Infrastructure** owns the toast variant taxonomy. Engine errors (e.g. kiwi deserialization fallback fired) surface as toast `error` variant via the host-app subscription to the engine's `node:errored` event — this PRD adds the `node:errored` event payload shape, Cluster 11's `useToast()` is the consumer.

---

## 3. Visual spec

The engine surface this PRD ships is **invisible** to a customer — it is data shape + serialization + a sibling-traversal change in the renderer. Visual evidence of these changes (the dashed slice rectangle, the dashed measurement line + label, the three mask-type corner-glyphs B8.4, the masked composite visible on canvas) renders via overlay components + the inspector that PRD 07b ships on top of this engine surface.

This section exists for traceability — it maps each engine-surface change to the hi-fi scene where the **end-user-facing rendering** of that change will appear.

| Engine surface | Visual evidence (07b) | Hi-fi file | Scene IDs |
|---|---|---|---|
| SLICE NodeType (geometry + name persisted) | Dashed-line bounding box on canvas + entry in layers panel + entry in Export panel batched into ZIP | `main-main-kova-scope/batch-b/Kova Hi-Fi 09 Canvas Overlays - Dark.html` (B8.x slice region overlay) + `batch-b/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html` (Export section batching) | B8 export-preview + B8 slice region (visual evidence owned by 07b) |
| MEASUREMENT NodeType (start/end + name persisted) | Dashed line + auto-distance label rendered as overlay; selectable; double-click to edit text | `main-main-kova-scope/batch-b/Kova Hi-Fi 09 Canvas Overlays - Dark.html` | B8.9 Measurement annotation (visual evidence owned by 07b) |
| Mask compositing (Q2 — all 3 maskType branches) | Mask outlines render with corner glyph indicating type; masked child renders correctly on canvas | `main-main-kova-scope/batch-b/Kova Hi-Fi 09 Canvas Overlays - Dark.html` | B8.4 Mask outlines (overlay UI owned by 07b; **mask compositing on the actual canvas pixels is the change this PRD ships**) |
| `aspectRatio` field | Aspect-ratio lock icon in the Position/Layout inspector section; drag-resize honors locked ratio | `batch-b/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html` | Inspector layout section (owned by 07b) |
| `includeInExports` + `pageBackgroundVisible` | Page-row toggle in the no-selection Pages section of the inspector | `batch-b/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html` | Inspector no-selection / Pages section (owned by 07b) |
| `CharacterStyleOverride.openTypeFeatures` + list/link metadata | Per-character style features rendered correctly in TEXT nodes (ligatures, tabular numerals) + list bullets/numbers + clickable links in exported PDF (Phase 2 only) | Cross-cut to text-rendering surfaces — no dedicated hi-fi | n/a |
| `scaleNode` (modify tool) | K-key drag-resize keeps font-size + corner-radius + stroke-weight + effect-radius proportional | Cross-cut to the K-tool UX in 07b | n/a |

**Caveats per `00c §1.D` cross-cut:**

- All canvas-level visual rendering happens in dark theme; light theme is auth/marketing only per `feedback_app_dark_website_light`. Engine surface does not branch on theme.
- The mask propagation rule rendered here must match `help.figma.com/hc/en-us/articles/360040450253-Masks` (re-verified 2026-05-15 — quoted directly into §13 References).

---

## 4. Data model

### 4.1 Schema migrations

**None.** Canvas-engine state persists locally via Yjs + y-indexeddb (CLAUDE.md hard-locked, never modified) and remotely via `canvas_snapshots` blobs (Kiwi+Zstd-serialized scene-graph bytes — owned by Cluster 09). This PRD bumps the **Kiwi schema version** (an in-bytes format version, not a DB column).

The downstream `canvas_snapshots.format_version int` column that Cluster 09 PRD will add — flagged in `00c` Q7 review action item — is the visible Postgres-side consequence of this PRD's bump. Cluster 09 owns the column; this PRD owns the format_version constant that gets written into it. See §11 cross-cuts.

### 4.2 RLS policies

N/A — no new database tables.

### 4.3 Storage buckets

N/A — no new Storage buckets. Existing `canvas-snapshots` bucket (Cluster 09) stores serialized scene-graph blobs that include the new fields after this PRD merges; the bucket layout is unchanged.

---

## 5. Backend

### 5.1 Edge Functions

N/A — this PRD ships only client-side engine work. The engine runs in the browser (and in the Tauri WebView for desktop deploys). No Vercel Function is added.

### 5.2 RPCs / database functions

N/A — same reason as §5.1.

### 5.3 Cron jobs

N/A.

### 5.4 External integrations

N/A. The kiwi (= proto-ish wire format) is a Kova-internal serialization library. No third-party SDK is added.

---

## 6. Frontend

### 6.1 Routes (Vue Router)

N/A — no new routes. The canvas editor route `/canvas/:canvasId` (owned by Cluster 06) is the only consumer of the engine surface this PRD ships.

### 6.2 Pinia stores

**One existing store extended; no new stores.**

| Store | File | Extension |
|---|---|---|
| `useEditorStore` | `kova-open-pencil-1/src/stores/editor.ts` (existing — Cluster 06 owns) | This PRD does **not** modify the store. 07b extends `activeTool` union with `'slice' \| 'measurement' \| 'eyedropper' \| 'scale'`. The engine surface added here is unaware of the store. |

The engine is intentionally Pinia-free per CLAUDE.md ("Don't put OpenPencil editor state in Pinia"). Engine state lives in the scene-graph; Pinia hosts tool mode, UI mode, selection-display state — all owned by Clusters 06 + 07b.

### 6.3 Composables

**None in this PRD.** The composables specced in `00c §2.A` lines 1652–1658 (`use-eyedropper`, `use-measurement-tool`, `use-slice-tool`, `use-export-pipeline`) are all interactive-tool-mode wiring + UI composition — they belong to 07b and are listed in `00c §2.A` as part of the inspector-wiring + overlays bucket.

### 6.4 Components

**None in this PRD.** Every Vue component in `00c §2.A` lines 1663–1675 (overlay components + inspector sections) belongs to 07b.

### 6.5 Drag-and-drop handlers

N/A — drag-drop semantics for color/font/logo/saved-block are owned by Cluster 05 (Brand Kit & Drag-Drop). This PRD's engine surface is unaware of drop targets.

---

## 7. Tool layer / canvas-engine touches

This is the load-bearing section of the PRD. Every change lifts the `packages/core/` lock per the CLAUDE.md amendment ratified in `00c §895`. Each subsection lists the affected file, the exact line range where the change lands (current line numbers from the snapshot of `packages/core/src/scene-graph.ts` as of 2026-05-15), the field/method shape, the upstream-PR posture, and the Kiwi serialization implication.

### 7.1 NodeType additions — SLICE + MEASUREMENT

**File:** `packages/core/src/scene-graph.ts`, lines 66–83.

```typescript
// Existing — 17 members
export type NodeType =
  | 'CANVAS'
  | 'FRAME'
  | 'RECTANGLE'
  | 'ROUNDED_RECTANGLE'
  | 'ELLIPSE'
  | 'TEXT'
  | 'LINE'
  | 'STAR'
  | 'POLYGON'
  | 'VECTOR'
  | 'GROUP'
  | 'SECTION'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'CONNECTOR'
  | 'SHAPE_WITH_TEXT'
  // — new in 07a —
  | 'SLICE'
  | 'MEASUREMENT'
```

**Numbering note (§12.2 documents):** the audit and Q1/Q11 refer to "SLICE = 17th NodeType" and "MEASUREMENT = 18th NodeType." The existing union already lists 17 members. SLICE becomes the **18th** member in the union literal order; MEASUREMENT the **19th**. The Q1/Q11 "17th/18th" wording is preserved for traceability with the founder decision log, but the implementation count is +2 on the existing 17. Documented for engineering clarity.

**Figma alignment (verified 2026-05-15 against developers.figma.com/docs/plugins/api/SliceNode/):**

SliceNode in Figma's plugin API:
- `type: 'SLICE'` [readonly]
- `name: string`
- `exportSettings: ReadonlyArray<ExportSettings>` — list of export settings
- `x`, `y`, `width` (readonly), `height` (readonly), `rotation`, `relativeTransform`, `absoluteTransform`, `absoluteBoundingBox`, `layoutAlign`, `layoutGrow`, `layoutPositioning`
- `visible`, `locked`, `parent`
- Methods: `clone()`, `exportAsync()`, `remove()`

Kova's SLICE NodeType uses the existing `SceneNode` interface — slices inherit the full `SceneNode` shape (most fields irrelevant for a slice; they hold their defaults — `fills: []`, `strokes: []`, etc.). The `width`/`height` are not marked readonly at the type level (Kova's `SceneNode` keeps them mutable for the proxy setter); the runtime constraint that slice geometry is set only through drag-on-canvas + manual handle resize lives in 07b's slice tool. Slice nodes are leaf nodes — `createDefaultNode('SLICE')` returns a node with `childIds: []`; the `appendChild` proxy method on a slice rejects with `Error('Slice nodes cannot have children')` (consistent with Figma — slices are leaf nodes).

**Figma alignment (verified 2026-05-15 against help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotate-designs):**

Figma's measurement tool: Shift+M shortcut, click-drag from origin to layer, persisted, selectable, deletable via Delete/Backspace, double-clickable to edit text. Distinct from the ephemeral Alt/Option hover-distance measurement which is not saved.

Kova's MEASUREMENT NodeType uses the existing `SceneNode` shape plus two semantic fields stored in the `SceneNode` proper: the start/end geometry is encoded in `x`, `y`, `width`, `height` (start point = `x`, `y`; end point = `x + width`, `y + height`); the displayed label text lives in `text` (default = the auto-computed distance string, computed at render time in 07b — engine stores the **override** label only, empty string means "use computed"). The `name` field is "Measurement N" auto-incremented. The leaf-node constraint applies: `createDefaultNode('MEASUREMENT')` returns `childIds: []`; `appendChild` rejects.

### 7.2 SceneNode field additions — aspectRatio, includeInExports, pageBackgroundVisible

**File:** `packages/core/src/scene-graph.ts`, `interface SceneNode` block (lines 208–329 today).

```typescript
export interface SceneNode {
  // … existing fields …

  // — new in 07a —
  /** When non-null, interactive resize keeps width:height proportional to this value.
   *  null = free resize (default).
   *  Type semantic: any NodeType. */
  aspectRatio: number | null

  /** Whether this page is included in the Slice-batch export ZIP.
   *  Type semantic: CANVAS only. Default true.
   *  Other NodeTypes carry the field at the type level for serialization simplicity
   *  but its value is ignored.
   *  07b inspector toggles this in the no-selection Pages section. */
  includeInExports: boolean

  /** Whether the page background fill renders in editor view.
   *  Type semantic: CANVAS only. Default true.
   *  Other NodeTypes carry the field for serialization simplicity.
   *  Export pipeline (Cluster 07b) ignores this — it always renders the canvas
   *  background. The toggle is editor-view-only convenience for transparent-bg
   *  design work. */
  pageBackgroundVisible: boolean
}
```

**Why these three sit on `SceneNode` rather than a discriminated union variant:** the existing `SceneNode` is a flat interface where every node carries every field (most are no-ops per NodeType); the codebase relies on this shape for the proxy property bag + Kiwi struct. Adding three more no-op-for-most-types fields is consistent with the existing pattern; introducing a discriminated union now is a larger refactor (~12-hour rewrite of `figma-api-proxy.ts`) with no MVP payoff. Documented in §12.4.

`createDefaultNode` is extended (line 363 onwards) to set `aspectRatio: null`, `includeInExports: true`, `pageBackgroundVisible: true` by default.

### 7.3 CharacterStyleOverride extensions — OpenType, list, link

**File:** `packages/core/src/scene-graph.ts`, lines 164–179.

```typescript
export type ListType = 'NONE' | 'BULLETED' | 'NUMBERED'

export interface CharacterStyleOverride {
  fontWeight?: number
  italic?: boolean
  textDecoration?: TextDecoration
  fontSize?: number
  fontFamily?: string
  letterSpacing?: number
  lineHeight?: number | null
  fills?: Fill[]
  // — new in 07a —
  /** CSS font-feature-settings tags, e.g. ['liga', 'kern', 'tnum'].
   *  Empty array = browser default.
   *  Per-text-run; falls through to the node-level default. */
  openTypeFeatures?: string[]
  /** Hyperlink target; clicking the run opens it in a new tab
   *  (browser export only; canvas/PNG export ignores). Empty = no link. */
  linkHref?: string
  /** List-item marker type for this run. */
  listType?: ListType
  /** Indent level for nested lists, 0 = root. */
  listIndent?: number
}
```

`StyleRun` (line 175–179) is unchanged in shape — it already wraps a `CharacterStyleOverride`. The new fields propagate by structural inclusion.

**07b consumer:** the inspector text section reads `selectedNode.styleRuns[run].style.openTypeFeatures`/`linkHref`/`listType` and renders the OpenType-features popover + link-href modal + list-toggle buttons. 07b's paragraph-rebuilder is the one that passes the features into Skia's `ParagraphBuilder` via the `fontFeatures` field of `TextStyle`.

### 7.4 Tool registrations — scaleNode, createSlice refactor, createMeasurement, arrowStub

**File:** `packages/core/src/tools/modify.ts` — add `scaleNode`.

```typescript
export const scaleNode = defineTool({
  name: 'scale_node',
  mutates: true,
  description:
    'Scale a node by a factor, preserving its position and rotation. ' +
    'Scales width, height, font-size, corner radii, stroke weights, ' +
    'and effect radius/offset proportionally. Applies recursively to descendants.',
  params: {
    id: { type: 'string', description: 'Node ID', required: true },
    factor: { type: 'number', description: 'Scale factor (1.0 = no change)', required: true, min: 0.01 }
  },
  execute: (figma, args) => {
    const node = figma.getNodeById(args.id)
    if (!node) return { error: 'Node not found' }
    scaleNodeRecursive(node, args.factor)  // implementation in modify.ts
    return nodeSummary(node)
  }
})

// internal — not exported
function scaleNodeRecursive(node: FigmaNodeProxy, factor: number): void {
  node.width = node.width * factor
  node.height = node.height * factor
  if (node.type === 'TEXT') node.fontSize = node.fontSize * factor
  node.cornerRadius = node.cornerRadius * factor
  node.topLeftRadius = node.topLeftRadius * factor
  node.topRightRadius = node.topRightRadius * factor
  node.bottomRightRadius = node.bottomRightRadius * factor
  node.bottomLeftRadius = node.bottomLeftRadius * factor
  node.borderTopWeight = node.borderTopWeight * factor
  node.borderRightWeight = node.borderRightWeight * factor
  node.borderBottomWeight = node.borderBottomWeight * factor
  node.borderLeftWeight = node.borderLeftWeight * factor
  for (const stroke of node.strokes) stroke.weight = stroke.weight * factor
  for (const effect of node.effects) {
    effect.radius = effect.radius * factor
    effect.offset = { x: effect.offset.x * factor, y: effect.offset.y * factor }
    effect.spread = effect.spread * factor
  }
  for (const childId of node.childIds) {
    const child = figma.getNodeById(childId)
    if (child) scaleNodeRecursive(child, factor)
  }
}
```

The recursive walk + per-field multiplication is < 40 lines per CLAUDE.md function-size convention. Position (`x`, `y`) + `rotation` are explicitly unchanged — Figma's K-tool semantics.

**File:** `packages/core/src/tools/create.ts` — refactor `createSlice` + add `createMeasurement`.

The existing `createSlice` (line 191 today) calls `figma.createFrame()` and clears fills — a stub from the OpenPencil baseline. Refactor:

```typescript
export const createSlice = defineTool({
  name: 'create_slice',
  mutates: true,
  description: 'Create a slice (export region) on the canvas.',
  params: {
    x: { type: 'number', description: 'X position', required: true },
    y: { type: 'number', description: 'Y position', required: true },
    width: { type: 'number', description: 'Width', required: true, min: 1 },
    height: { type: 'number', description: 'Height', required: true, min: 1 },
    name: { type: 'string', description: 'Slice name' },
    parent_id: { type: 'string', description: 'Parent node ID' }
  },
  execute: (figma, args) => {
    const node = figma.createSlice()  // now backed by SLICE NodeType
    node.x = args.x
    node.y = args.y
    node.resize(args.width, args.height)
    node.name = args.name ?? 'Slice'
    if (args.parent_id) {
      const parent = figma.getNodeById(args.parent_id)
      if (parent) parent.appendChild(node)
    }
    return nodeSummary(node)
  }
})

export const createMeasurement = defineTool({
  name: 'create_measurement',
  mutates: true,
  description: 'Create a measurement annotation between two points on the canvas.',
  params: {
    start_x: { type: 'number', description: 'Start X', required: true },
    start_y: { type: 'number', description: 'Start Y', required: true },
    end_x: { type: 'number', description: 'End X', required: true },
    end_y: { type: 'number', description: 'End Y', required: true },
    name: { type: 'string', description: 'Measurement name' },
    parent_id: { type: 'string', description: 'Parent node ID' }
  },
  execute: (figma, args) => {
    const node = figma.createMeasurement()
    node.x = args.start_x
    node.y = args.start_y
    node.resize(args.end_x - args.start_x, args.end_y - args.start_y)
    node.name = args.name ?? 'Measurement'
    if (args.parent_id) {
      const parent = figma.getNodeById(args.parent_id)
      if (parent) parent.appendChild(node)
    }
    return nodeSummary(node)
  }
})
```

**File:** `packages/core/src/tools/registry.ts` — re-export + extend EXTENDED_TOOLS.

```typescript
import { /* existing imports */, createMeasurement } from './create'
import { /* existing imports */, scaleNode } from './modify'

export const EXTENDED_TOOLS: ToolDef[] = [
  // … existing entries …
  createSlice,           // already present
  createMeasurement,     // NEW
  scaleNode,             // NEW
  // arrowStub deferred to Phase 2 — registry slot reserved as a no-op ToolDef
  arrowStub,
]
```

The `arrowStub` ToolDef is a no-op:

```typescript
export const arrowStub = defineTool({
  name: 'arrow_stub',
  description: 'Phase-2-deferred. Arrow primitive not yet shipped.',
  params: {},
  execute: () => ({ error: 'Arrow primitive deferred to Phase 2' })
})
```

Reserves the registry-slot name so 07b's keyboard registry hides it cleanly; the slot becomes a real arrow tool in a later PRD (post-Track-2 stroke-cap renderer audit).

### 7.5 Renderer mask compositing — `renderer/scene.ts`

**File:** `packages/core/src/renderer/scene.ts`, lines 85–114 (`renderChildren` function today).

Current state: `renderChildren` iterates `node.childIds` and calls `r.renderNode(canvas, graph, childId, …)` for each — no awareness of `isMask`/`maskType`. Masks are settable via the inspector + persist correctly in serialization, but the renderer never composites them. Per Q2 + the audit, this PRD ships the sibling-traversal mask compositing.

**Algorithm (per help.figma.com/hc/en-us/articles/360040450253-Masks rule):**

```
for each childId in node.childIds (in z-order):
  child = graph.getNode(childId)
  if child.isMask:
    // Open mask scope: every subsequent sibling renders INTO this mask
    canvas.saveLayer(maskScopePaint)
    renderNode(child)                                    // render the mask shape
    canvas.saveLayer(blendModeForMaskType(child.maskType))  // composite mode
    // … continue iterating siblings, rendering them inside this layer …
    // The mask scope ends at:
    //   – the next sibling with child.isMask === true (open a fresh scope)
    //   – the end of childIds (close the scope and exit)
    //   – an external clip-content container above us already closed our layer
  else:
    renderNode(child)
```

Concretely:

```typescript
function renderChildren(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  node: SceneNode,
  overlays: RenderOverlays,
  absX: number,
  absY: number
): void {
  // 1. Existing clip-content path
  const isClippableContainer =
    node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
  let restoreClipCount = 0
  if (isClippableContainer && node.clipsContent && node.childIds.length > 0) {
    canvas.save()
    restoreClipCount++
    const hasRadius = nodeHasRadius(node)
    if (hasRadius) {
      canvas.clipRRect(r.makeRRect(node), r.ck.ClipOp.Intersect, true)
    } else {
      canvas.clipRect(r.ck.LTRBRect(0, 0, node.width, node.height), r.ck.ClipOp.Intersect, true)
    }
  }

  // 2. Mask-aware sibling traversal (NEW)
  let maskOpen = false
  for (const childId of node.childIds) {
    const child = graph.getNode(childId)
    if (!child) continue

    if (child.isMask) {
      // Close any open mask scope first
      if (maskOpen) {
        canvas.restore()  // close composite layer
        canvas.restore()  // close mask-scope outer layer
        maskOpen = false
      }
      // Open new mask scope
      canvas.saveLayer(r.maskOuterPaint)
      r.renderNode(canvas, graph, childId, overlays, absX, absY)
      r.maskCompositePaint.setBlendMode(blendModeForMaskType(r, child.maskType))
      canvas.saveLayer(r.maskCompositePaint)
      maskOpen = true
    } else {
      r.renderNode(canvas, graph, childId, overlays, absX, absY)
    }
  }
  if (maskOpen) {
    canvas.restore()  // composite layer
    canvas.restore()  // outer mask-scope layer
  }

  // 3. Close clip-content path
  while (restoreClipCount > 0) {
    canvas.restore()
    restoreClipCount--
  }
}

function blendModeForMaskType(r: SkiaRenderer, maskType: MaskType): EmbindEnumEntity {
  switch (maskType) {
    case 'ALPHA':     return r.ck.BlendMode.SrcIn
    case 'VECTOR':    return r.ck.BlendMode.SrcIn   // shape-only; opacity ignored (handled by paint setup at mask-shape draw time — see §12.6)
    case 'LUMINANCE': return r.ck.BlendMode.Luminosity
  }
}
```

**Paint setup (added on SkiaRenderer):**

```typescript
maskOuterPaint: Paint        // default — saveLayer outer container
maskCompositePaint: Paint    // BlendMode applied per maskType at saveLayer time
```

Both paints initialized in `SkiaRenderer.init` next to the existing `opacityPaint`/`effectLayerPaint`.

**Per-maskType nuance:**

- **ALPHA** (default per Figma docs): pure alpha-channel mask. Shape's alpha is used directly. CanvasKit `BlendMode.SrcIn` clips siblings to where the mask has non-zero alpha; opacity gradients on the mask shape propagate as the masked content's alpha.
- **VECTOR**: ignores the mask's translucency — only the shape geometry matters at 100% alpha. Implementation: when rendering the **mask shape** under a VECTOR mask, override fill opacity to 1.0 and clip strokes; otherwise use `SrcIn` blend. The shape rendering path needs to detect "I am the mask shape of a VECTOR mask" and short-circuit opacity — done by passing a `forceOpaque: true` flag down `renderShape` for VECTOR mask shapes. See §12.6.
- **LUMINANCE**: brightness-based. Black pixels hide, white reveals. `BlendMode.Luminosity` blends the layer-below's color into the layer-above's luminance. CanvasKit ships this blend mode natively.

**Headless renderer parity:** the headless renderer at `packages/core/src/headless-render.ts` consumes the same `renderNode` entry. The mask path lives in `renderer/scene.ts` which both renderers share. Single source of truth.

**Verification:** unit test (`tests/engine/renderer/mask-compositing.test.ts`) seeds a 3-node group (mask shape + 2 maskee children for each maskType) and asserts the resulting pixel snapshot matches a baseline per maskType. CI runs this on headless renderer.

### 7.6 Kiwi schema bump

**Files:** `packages/core/src/kiwi/kiwi-schema/schema.ts`, `packages/core/src/kiwi/kiwi-convert.ts`, `packages/core/src/kiwi/protocol.ts`.

**Change set:**

- `protocol.ts` — bump `SCHEMA_VERSION` constant (Kova-side major bump). Format: `MAJOR.MINOR.PATCH`. This PRD shifts MAJOR (breaks forward-compat with old readers). Pre-bump version was `1.X.Y`; this PRD lands at `2.0.0`.
- Add `SLICE` + `MEASUREMENT` enum members to the NodeType serialization. Enum tags are append-only — never renumber existing entries. SLICE = next integer after the existing 17; MEASUREMENT = SLICE+1.
- Add `aspect_ratio: float?` (nullable), `include_in_exports: bool`, `page_background_visible: bool` fields to the SceneNode struct.
- Add `open_type_features: string[]?`, `link_href: string?`, `list_type: ListType?`, `list_indent: int32?` fields to the CharacterStyleOverride struct.
- `kiwi-convert.ts` maps SceneNode <-> kiwi struct bidirectionally; the new fields use the same field-name <-> field-index mapping kiwi uses.

**Backwards-compat fallback:**

When a Kova build reads a pre-bump (v1.X.Y) snapshot: missing fields fall through to their default values (`aspectRatio = null`, `includeInExports = true`, etc.) — the kiwi reader is forgiving of trailing-field-omission.

When a pre-bump build reads a Kova-built (v2.0.0) snapshot: kiwi's "unknown NodeType enum value" fallback fires — the old reader cannot deserialize SLICE/MEASUREMENT nodes; it skips them (logs a warning) and continues. This is acceptable because:
1. Kova ships v2.0.0 as the only production reader; pre-bump readers exist only in OpenPencil upstream until the PR lands.
2. Skipping unknown nodes is the conservative degrade — better than crashing.

**Documented in CHANGELOG-KOVA.md** under the kiwi-schema entry; surfaced in §12.5 risk.

### 7.7 figma-api-proxy exposure

**File:** `packages/core/src/figma-api-proxy.ts`.

Additions to the `figma` global proxy:

```typescript
// In figma-api-proxy.ts:
figma.createSlice = (): FigmaNodeProxy => {
  const node = createDefaultNode('SLICE')
  graph.nodes.set(node.id, node)
  graph.emitter.emit('node:created', node)
  return new FigmaNodeProxy(node.id, graph)
}

figma.createMeasurement = (): FigmaNodeProxy => {
  const node = createDefaultNode('MEASUREMENT')
  graph.nodes.set(node.id, node)
  graph.emitter.emit('node:created', node)
  return new FigmaNodeProxy(node.id, graph)
}
```

Additions to `FigmaNodeProxy`:

```typescript
class FigmaNodeProxy {
  // … existing property accessors …

  // — new in 07a —
  get aspectRatio(): number | null { … }
  set aspectRatio(value: number | null) { … }
  get includeInExports(): boolean { … }
  set includeInExports(value: boolean) { … }
  get pageBackgroundVisible(): boolean { … }
  set pageBackgroundVisible(value: boolean) { … }

  scale(factor: number): void {
    // calls the modify.ts scaleNode logic on this node + recurse
  }
}
```

The setter implementations emit `node:updated` events as the existing setters do.

### 7.8 CHANGELOG-KOVA.md — upstream-PR pipeline

**File:** `packages/core/CHANGELOG-KOVA.md` (NEW).

Initial content (mock — engineer fills line-counts/file-refs during implementation):

```markdown
# Kova modifications to packages/core/

Kova maintains a fork of OpenPencil's `packages/core/`. The hard-lock policy
in CLAUDE.md prohibits modifying core; the lift-the-lock amendment ratified
in `docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md §895` permits Kova-side mods
provided they are listed in this file and prepped for upstream PR contribution.

Each entry: date, change summary, affected file(s), upstream-PR status.

Statuses:
- `drafted` — Kova-side branch ready; PR not yet submitted upstream.
- `submitted` — PR open against open-pencil/main; reviewer feedback pending.
- `merged` — accepted into upstream main.
- `declined` — upstream rejected; Kova-side stays as a permanent fork delta.

---

## 2026-05-?? — Cluster 07a Canvas Engine Core + Renderer (PRD 07a)

**Author:** Kova engineering · **Reviewer:** Jiho Yang

| Change | File(s) | Upstream-PR |
|---|---|---|
| Add SLICE + MEASUREMENT NodeTypes; default factories; leaf-node `appendChild` rejection | `src/scene-graph.ts` | drafted (one PR per NodeType — split to ease upstream review) |
| Add `aspectRatio` / `includeInExports` / `pageBackgroundVisible` fields on SceneNode | `src/scene-graph.ts` | drafted (single PR — small change set) |
| Extend `CharacterStyleOverride` with `openTypeFeatures` + `linkHref` + `listType` + `listIndent` | `src/scene-graph.ts` | drafted (single PR) |
| Add `scaleNode` modify tool; recursive scale walk | `src/tools/modify.ts`, `src/tools/registry.ts` | drafted |
| Refactor `createSlice` from Frame-stub to SLICE NodeType; add `createMeasurement` | `src/tools/create.ts`, `src/tools/registry.ts` | drafted |
| Add `arrowStub` registry slot (Phase-2-deferred no-op) | `src/tools/registry.ts` | held — submit after arrow primitive ships |
| Sibling-traversal mask compositing (all 3 maskType branches) | `src/renderer/scene.ts` | drafted (this is the most valuable upstream contribution — masks are already a data-model surface) |
| Kiwi schema v2.0.0: enum extensions + new fields; backwards-compat skip on unknown NodeType | `src/kiwi/kiwi-schema/schema.ts`, `src/kiwi/kiwi-convert.ts`, `src/kiwi/protocol.ts` | drafted |
| `figma-api-proxy` exposure of new fields + createSlice / createMeasurement / scale | `src/figma-api-proxy.ts` | drafted |
```

**Upstream-PR submission cadence:** PRs are drafted on a Kova-internal fork branch during implementation. After this PRD's status flips to `SHIPPED` (Cluster 07a ships into production), each `drafted` row is submitted upstream within 14 days. The CHANGELOG row status flips as upstream review progresses.

The submission posture is "small, focused PRs" — one PR per change row above, sequenced to avoid merge conflicts. SLICE NodeType + Measurement NodeType each get their own PR (Figma has the same data shape in their plugin API, so upstream OpenPencil is the natural home).

**Risk if upstream declines:** Kova-side stays as a permanent fork delta documented in CHANGELOG. No engineering blocker — the lock is already lifted on the Kova side. §12.8 documents.

---

## 8. Acceptance criteria

Every line is testable in code or an engine smoke. No "feels right." Engineers verify each before founder review.

### 8.1 Scene-graph types

- [ ] `NodeType` union contains `'SLICE'` and `'MEASUREMENT'` (TypeScript type test: assignment to a variable of `NodeType` compiles)
- [ ] `SceneNode` interface contains `aspectRatio`, `includeInExports`, `pageBackgroundVisible` with the declared types
- [ ] `CharacterStyleOverride` contains `openTypeFeatures`, `linkHref`, `listType`, `listIndent`
- [ ] `createDefaultNode('SLICE')` returns a node with `type === 'SLICE'`, `childIds: []`, `aspectRatio: null`, `includeInExports: true`, `pageBackgroundVisible: true`
- [ ] `createDefaultNode('MEASUREMENT')` returns the analogous shape
- [ ] `createDefaultNode('CANVAS')` defaults `includeInExports: true`, `pageBackgroundVisible: true`
- [ ] `appendChild` on a SLICE or MEASUREMENT throws `Error('Slice nodes cannot have children')` / `('Measurement nodes cannot have children')`
- [ ] `SLICE` and `MEASUREMENT` are NOT in `CONTAINER_TYPES`

### 8.2 Tool layer

- [ ] `tools/modify.ts` exports `scaleNode`
- [ ] `EXTENDED_TOOLS` registry contains `scaleNode`, `createMeasurement`, `arrowStub`
- [ ] `createSlice` execute() now backs a real SLICE NodeType (assertion: `result.type === 'SLICE'`, not `'FRAME'`)
- [ ] `scaleNode(id, 2.0)` on a 100×100 rect yields width=200, height=200, but `x`/`y` unchanged
- [ ] `scaleNode(id, 0.5)` on a TEXT node with fontSize=14 yields fontSize=7
- [ ] `scaleNode(id, 2.0)` recurses into child nodes — a parent 100×100 with a child 50×50 yields parent 200×200 / child 100×100
- [ ] `scaleNode(id, 2.0)` scales `dropShadow.radius`, `dropShadow.offset.x`, `dropShadow.offset.y`, `dropShadow.spread` proportionally
- [ ] `scaleNode(id, 1.0)` is a no-op (idempotent)
- [ ] `arrowStub.execute()` returns `{ error: 'Arrow primitive deferred to Phase 2' }`

### 8.3 Renderer (mask compositing)

- [ ] A 3-child group (mask shape + 2 maskees) with `maskType: 'ALPHA'` renders such that maskees are visible only where the mask shape has non-zero alpha (pixel snapshot test)
- [ ] Same group with `maskType: 'VECTOR'` renders maskees at full opacity (no opacity gradient on the mask shape) within the shape geometry (pixel snapshot test)
- [ ] Same group with `maskType: 'LUMINANCE'` renders maskees with brightness-modulated visibility — black mask area hides, white reveals (pixel snapshot test)
- [ ] A 4-child group with two masks renders correctly — first mask scopes its maskees, second mask opens a fresh scope (pixel snapshot test)
- [ ] A mask inside a frame with `clipsContent: true` does not bleed outside the frame edge — the clip-content scope wraps the mask scope (pixel snapshot test)
- [ ] Mask compositing works on both Skia/CanvasKit and the headless renderer

### 8.4 Kiwi serialization

- [ ] `SCHEMA_VERSION` constant is `'2.0.0'` (or whatever the next major increment is from the pre-bump value)
- [ ] A scene-graph containing 1 SLICE + 1 MEASUREMENT + 1 TEXT with `openTypeFeatures: ['liga', 'tnum']` + 1 mask round-trips through Kiwi serialize→deserialize with byte-for-byte equality on a second serialize (assertion: `kiwi.serialize(kiwi.deserialize(bytes)) === bytes`)
- [ ] A pre-bump (v1.x) snapshot is deserializable by the v2.0.0 reader — new fields default in, no error
- [ ] A v2.0.0 snapshot containing SLICE/MEASUREMENT is deserialized by a synthesized "old reader" mock (used in test only) with the unknown NodeType skipped + a console warning logged

### 8.5 figma-api-proxy

- [ ] `figma.createSlice()` returns a `FigmaNodeProxy` wrapping a SLICE node
- [ ] `figma.createMeasurement()` returns a `FigmaNodeProxy` wrapping a MEASUREMENT node
- [ ] `nodeProxy.aspectRatio = 1.5` mutates the scene-graph node + emits `node:updated`
- [ ] `nodeProxy.scale(2.0)` calls the underlying scaleNode logic + emits a `node:updated` per affected descendant

### 8.6 CHANGELOG-KOVA.md

- [ ] `packages/core/CHANGELOG-KOVA.md` exists at the path
- [ ] Every change row above (scene-graph types, tool layer, mask compositing, kiwi schema, figma-api-proxy, arrowStub registry) is enumerated with a status (`drafted` minimum at PRD-merge time)
- [ ] At least one upstream-PR draft (SLICE NodeType is the smallest, lowest-risk PR — submit first) is open on a Kova-internal fork branch by the time this PRD's status flips to `SHIPPED`

### 8.7 Quality gates

- [ ] `bun run check` — oxlint + type-check zero errors after the engine surface lands
- [ ] `bun run test:unit` — all engine unit tests green (existing + new); coverage on changed files ≥ 80%
- [ ] `bun run test:dupes` — jscpd < 3% (engine code is naturally diverse — should pass)
- [ ] `bun run build` — production build succeeds (engine is bundled into the SPA; build catches broken types)
- [ ] No `console.log` left in shipped code (per global TypeScript hook rule)
- [ ] No `Math.random()` in engine code (CLAUDE.md — `crypto.getRandomValues()` only); existing IDs use `0:N` counter so this is satisfied by default
- [ ] No `any` types introduced in this PRD's diffs
- [ ] All new exports include explicit return types (TypeScript public-API rule)

### 8.8 Security

- [ ] `CharacterStyleOverride.linkHref` is **not** rendered as a clickable element in the canvas (canvas is image-export-only per `feedback_image_export_locked`); 07b's text rendering will defensively `sanitize` (validate URL scheme is `https://` or `mailto:`) before any future PDF/HTML export ships — note for 07b PRD §12 to pick up
- [ ] Kiwi deserialization of malicious bytes does not crash the renderer (fuzz test: random byte input → reader either fails-soft or returns a valid scene-graph; never a process crash). The kiwi reader is already fail-soft for unknown enum values; the test confirms the new enum members don't degrade this.

---

## 9. Test plan

### 9.1 Unit tests (`bun run test:unit`)

Target coverage: ≥85% on the changed files (`scene-graph.ts`, `tools/modify.ts`, `tools/create.ts`, `tools/registry.ts`, `renderer/scene.ts`, `kiwi-convert.ts`, `figma-api-proxy.ts`).

| Test file | Covers |
|---|---|
| `tests/engine/scene-graph/node-types.test.ts` | NodeType union exhaustiveness check; `createDefaultNode('SLICE')` / `('MEASUREMENT')` shape; `appendChild` rejection on SLICE/MEASUREMENT; CONTAINER_TYPES exclusion |
| `tests/engine/scene-graph/new-fields.test.ts` | Default values for `aspectRatio`, `includeInExports`, `pageBackgroundVisible`; mutability via proxy setters; mutation emits `node:updated` |
| `tests/engine/scene-graph/character-style.test.ts` | `CharacterStyleOverride.openTypeFeatures` propagates via `StyleRun`; default empty; serialization round-trip |
| `tests/engine/tools/scale-node.test.ts` | Idempotency at factor=1; non-uniform geometry (corner radii independent); TEXT fontSize scaling; nested recursion; effect-radius/offset/spread scaling; stroke-weight per-side; rejection of factor<=0 via min constraint |
| `tests/engine/tools/create-slice-refactor.test.ts` | Old createSlice would return a FRAME; new createSlice returns a SLICE NodeType; the test imports the tool, invokes execute, asserts result type |
| `tests/engine/tools/create-measurement.test.ts` | createMeasurement execute → MEASUREMENT NodeType with correct x/y/width/height from start/end |
| `tests/engine/tools/registry.test.ts` | `EXTENDED_TOOLS` contains `scaleNode`, `createMeasurement`, `arrowStub`; `CORE_TOOLS` does not (token-bloat avoidance) |
| `tests/engine/renderer/mask-compositing-alpha.test.ts` | 3-node group, ALPHA mask; pixel snapshot via headless renderer |
| `tests/engine/renderer/mask-compositing-vector.test.ts` | Same with VECTOR mask; mask opacity overridden to 1.0 inside mask shape |
| `tests/engine/renderer/mask-compositing-luminance.test.ts` | Same with LUMINANCE mask; brightness-based reveal |
| `tests/engine/renderer/mask-compositing-multi.test.ts` | 4-node group with two masks; each scopes its own siblings |
| `tests/engine/renderer/mask-compositing-clip-content.test.ts` | Mask nested inside `clipsContent: true` Frame; mask doesn't bleed beyond frame edge |
| `tests/engine/kiwi/version-bump.test.ts` | `SCHEMA_VERSION === '2.0.0'`; previous-version snapshot loads with defaults; new-version snapshot loads completely |
| `tests/engine/kiwi/round-trip-slice-measurement.test.ts` | Build graph with 1 SLICE + 1 MEASUREMENT + 1 TEXT + 1 mask; serialize → deserialize → re-serialize → byte-equality |
| `tests/engine/kiwi/unknown-node-type-fallback.test.ts` | Synthesized "old reader" mock encounters SLICE in bytes; skips + logs; no crash |
| `tests/engine/figma-api-proxy/create-methods.test.ts` | `figma.createSlice()` + `figma.createMeasurement()` return proxies wrapping correct NodeType |
| `tests/engine/figma-api-proxy/new-properties.test.ts` | Get/set for `aspectRatio`, `includeInExports`, `pageBackgroundVisible`, `openTypeFeatures` via proxy |
| `tests/engine/figma-api-proxy/scale-method.test.ts` | `proxy.scale(2.0)` calls scaleNode logic; events emitted |
| `tests/engine/changelog/exists.test.ts` | `packages/core/CHANGELOG-KOVA.md` file exists; contains at least one row tagged `drafted`/`submitted`/`merged` for each change category in §7 |

### 9.2 Integration tests

This PRD has **no backend** — no API/DB integration tests apply. The "integration" surface is the engine-host integration: the host app (Vue + Pinia) consuming the engine surface.

| Test file | Covers |
|---|---|
| `tests/integration/engine-host/scene-load-mixed.test.ts` | Host app loads a `.fig`-equivalent Kova snapshot containing the new NodeTypes; Pinia `useCanvasStore` updates correctly; selection works on a SLICE; layer-tree (Cluster 06) shows the slice with correct name |
| `tests/integration/engine-host/scene-export-with-slices.test.ts` | Host app exports a scene with 2 slices; verifies the Slice-batch path enumerates them via `graph.getAllNodes() filter type==='SLICE'` (07b consumes this enumeration — the engine surface tested here is just the iteration shape) |
| `tests/integration/engine-host/measurement-persistence.test.ts` | Create a measurement via `figma.createMeasurement()`; close + reopen the canvas; measurement survives via Yjs + Kiwi |

### 9.3 E2E tests

Engine-level E2E lives in the existing Playwright suite (`bun run test`). Critical user-facing E2Es around slices + measurements + masks ship as part of 07b. This PRD ships **one** smoke spec:

| Spec | Covers |
|---|---|
| `tests/e2e/engine/slice-measurement-load.spec.ts` | Headless Vercel Agent Browser flow: open `/canvas/test-fixture-with-slice-measurement-mask`; assert the page renders without engine error (kiwi load succeeds, mask compositing fires, canvas paints) |

All visible-UX E2Es for slices + measurements + masks live in 07b.

### 9.4 Manual QA (founder browser smoke)

Per `feedback_browser_smoke_test_before_done` memory — required before claiming this PRD shipped.

For 07a alone the surface is invisible. Manual QA is **engineer-facing**, not founder-facing:

- [ ] Engineer opens DevTools console; types `figma.createSlice()` in a canvas-loaded session; verifies a SLICE node ID is returned + appears in `graph.getAllNodes()`
- [ ] Engineer types `figma.createMeasurement()`; same verification
- [ ] Engineer programmatically sets `isMask: true` on a frame's first child + `maskType: 'ALPHA'`; reloads the canvas; verifies the masked region renders correctly on the actual canvas pixels (open mask, see-through to the maskee shape underneath)
- [ ] Engineer toggles `maskType` to `'VECTOR'` and `'LUMINANCE'` via console; verifies the visible compositing changes
- [ ] Engineer saves the scene; closes the browser tab; reopens; verifies the slice + measurement + mask all survive (Yjs + Kiwi round-trip)

Founder visual sign-off lives in 07b once the dashed-line slice region + measurement annotation + B8.4 mask outline glyph ship as visible overlays.

### 9.5 Pre-commit + CI verifications

- `bun run check` — green
- `bun run format` — no diff
- `bun run test:unit` — green; coverage on changed files ≥ 80%
- `bun run test` — Playwright smoke (E2E) green
- `bun run test:dupes` — jscpd < 3%
- Grep: no `console.log` in `packages/core/src/` diffs (production engine code)
- Grep: no `Math.random()` in any diff (CLAUDE.md hard rule)
- Grep: no `any` type introduced in diffs

---

## 10. Rollout phasing

### Phase A — initial deploy (Wave 5 ship)

- All `packages/core/` mods land on `feat/m9-shopify` (or the active feature branch at implementation time)
- Kiwi schema v2.0.0 active
- `CHANGELOG-KOVA.md` first row populated with `drafted` upstream status for every change
- Unit + integration + smoke E2E all green
- Engine-facing manual QA (§9.4) complete

**Customer-visible result of Phase A alone:** none. Engine surface is invisible until 07b lands. The customer-facing milestone is "07a + 07b shipped together" — the founder reviews both PRDs as a pair before either ships into a customer-touching deploy.

### Phase B — upstream PR submission (post-ship)

- Within 14 days of Phase A merging, the SLICE NodeType PR is submitted to upstream `open-pencil/main` (smallest, lowest-risk first)
- CHANGELOG row for SLICE flips to `submitted`
- Subsequent PRs (MEASUREMENT, mask compositing, scaleNode, kiwi schema bump, etc.) are submitted on a 1-per-week cadence to keep upstream reviewer load manageable
- CHANGELOG rows update as upstream feedback lands

There is no production-side feature flag for 07a — the engine surface is foundational and the kiwi schema bump means there is no "rollback to v1.x" once a customer saves a snapshot. Risk-mitigation here lives in the unknown-NodeType fallback (§7.6) + the comprehensive engine unit-test suite, not a runtime toggle.

### Feature flags

None. The engine surface is binary: either the build contains the new NodeTypes + renderer mask path, or it does not. No runtime branching.

---

## 11. Cross-cuts to other PRDs

| Other PRD | What we depend on (from them) | What they depend on us for |
|---|---|---|
| **06 — Canvas Editor Core Chrome** | Editor route `/canvas/:canvasId` hosts the engine; bottom toolbar reserves the Slice/Measurement/Scale/Eyedropper/Arrow button slots (07a registers, 06 mounts the buttons) | Engine surface — `figma.*` proxy methods + new NodeTypes available to the toolbar buttons |
| **07b — Canvas Engine Inspector + Overlays** | Inspector wiring for all 9 Q3 engine-ready surfaces + B8.1–B8.10 app-level overlays + interactive tool modes (Slice/Measurement/Eyedropper/Scale drag-on-canvas UX) + Effects inspector wiring; the visible UI for everything this PRD ships data-side for | Engine surface — every field/method this PRD adds is consumed by 07b's UI |
| **08 — Menus + Popovers + Shortcuts** | Keyboard shortcut registry (`use-keyboard.ts`); 08 consumes the registered tool slots and binds S / ⇧M / ^C / K bindings via `e.code` per CLAUDE.md keyboard rule | Tool registry slots — 07a reserves `slice`, `measurement`, `eyedropper`, `scale`, `arrow_stub` (no-op) |
| **09 — Version History + Trash** | `canvas_snapshots` table — Cluster 09 owns; this PRD's kiwi v2.0.0 forces a `canvas_snapshots.format_version int` column (action item flagged in `00c` Q7) | Stable scene-graph kiwi format; the byte-equal round-trip guarantee underpins snapshot integrity |
| **10 — AI Chat + Memory + Tools** | ToolLoopAgent + `@ai-sdk/anthropic` integration (per CLAUDE.md); Cluster 10 PRD §13 References should cite this PRD's `tools/registry.ts` extension | New AI-callable tools (`scaleNode`, `createMeasurement`, refactored `createSlice`) available via EXTENDED_TOOLS registry |
| **11 — Shared UI Infrastructure** | Toast variant `error` is fired when the kiwi reader logs a "skipped unknown NodeType" warning; toast displays "Canvas contains content from a newer Kova build — some nodes hidden." Cluster 11 owns the toast primitive | `node:errored` event payload shape — added to `SceneGraphEvents` for 11's `useToast()` subscription |
| **12 — Settings & User Preferences** | None at runtime — engine has no user prefs | None — engine is preference-free |

### 11.1 Hygiene rules from `00e §6`

Acknowledged + enforced in this PRD:

- **No live multi-device canvas sync promises** (`00e §6 #2` / `2.C.7`): the mask compositing + new NodeTypes + scaleNode all work in single-device Yjs + y-indexeddb. This PRD does not promise live cross-device sync; Trystero/awareness dormant per Q6.
- **No marketing-site spec** (`00e §6 #1`): N/A — engine work is post-auth canvas.
- **D-5E persistent staging Supabase trigger** (`00e §6 #3`): N/A — engine has no Supabase touchpoint.
- **D-3 RoPA disclosure** (`00e §6 #4`): N/A — engine does not transmit data to Anthropic; AI tool registration is data-shape only, not a data flow.
- **Marketing-site framework choice frozen at Astro** (`00d §3.B D-5C` reversal): N/A — engine is consumed by the SPA only.

---

## 12. Risks + open questions

### 12.1 DIVERGENCE from `00c §2.A` Cluster 07 split — items #9–#11 re-scoped into 07a

`00c §2.A` lines 1620–1633 list 11 core mods and recommend (line 1678–1680):

- **07a** = Core mods + Renderer (items 1–8)
- **07b** = Inspector wiring + Overlays (items 9–11 + components + composables)

But items 9 (`figma-api-proxy.ts` expose), 10 (`kiwi/schema.ts` version bump), and 11 (`CHANGELOG-KOVA.md`) are not "inspector + overlay" work — they are engine-internal serialization + proxy plumbing. Without them, the NodeTypes added in items 1–4 cannot be exposed to consumers (proxy missing) and cannot be persisted across reloads (kiwi missing serialization). Splitting them away from items 1–8 would ship a non-load-bearing 07a (NodeTypes exist in TypeScript but cannot be created via `figma.*` or saved across sessions).

**This PRD includes items 1–11 in 07a.** 07b retains the inspector-wiring + overlay surface only. Documented here so the §11 cross-cut to 07b lines up with what each PRD actually ships.

Per CLAUDE.md "Demand Elegance — Balanced": the right split is engine-internals-as-shippable-unit (07a) vs. UI-on-top-of-engine (07b). The auditor's literal item numbering accidentally cut across the shippable boundary; we correct it here. Founder review confirms or pushes back.

### 12.2 NodeType count nit (Q1/Q11 wording)

Q1 says "SLICE = 17th NodeType." Q11 says "MEASUREMENT = 18th NodeType." The existing `NodeType` union already contains 17 members (CANVAS through SHAPE_WITH_TEXT). SLICE becomes the **18th** in the union literal order; MEASUREMENT the **19th**. Q-decision wording is preserved verbatim for traceability with the founder decision log; engineering count is "+2 on the existing 17." Documented for engineering clarity. No founder action needed — pure documentation nit.

### 12.3 CLAUDE.md amendment text — pending publication

The "lift the core lock" amendment is referenced throughout the audit, the scope plan, and this PRD, but the actual prose has not been added to `CLAUDE.md` yet. `00c §895` reads: "Lift-the-lock policy on `packages/core/` | Q4, CLAUDE.md amendment | HARD | Maintainer commitment to CHANGELOG-KOVA.md + upstream PR pipeline | ✅ ratified | **Doc the policy in CLAUDE.md prior to Wave 5**."

**Action item:** prior to or alongside this PRD merging, the CLAUDE.md "Never modify packages/core/" subsection (line 84–88 today) gets a paragraph appended:

> **Lift-the-lock policy:** Modifications to `packages/core/` are permitted only when listed in `packages/core/CHANGELOG-KOVA.md` and prepped for upstream PR contribution to OpenPencil. The policy is reviewed per-cluster — Clusters 07a, 07b, 06, 08, and 10 are the only clusters cleared to lift the lock under the Kova MVP. All other clusters remain hard-locked.

Flagged here so a reviewer reading 07a can confirm CLAUDE.md is updated before merge — otherwise 07a's commit body would claim to follow an amendment that doesn't exist in writing. **Recommendation:** founder reviews this PRD's amendment text and instructs the implementing engineer to land both changes (CLAUDE.md amendment + 07a engine mods) in the same merge group.

### 12.4 Risk (Low) — flat-SceneNode shape limits per-NodeType field discipline

Adding `includeInExports` + `pageBackgroundVisible` as fields on the flat `SceneNode` interface means every node carries them, even though they are semantically CANVAS-only. The pattern is consistent with the existing codebase (every node carries `text`, `fontSize`, etc., even though most node types ignore them). The audit accepts this; the alternative is a 12-hour discriminated-union refactor of `figma-api-proxy.ts` for no MVP payoff.

**Mitigation:** documentation. Field JSDoc comments mark the type semantic ("CANVAS only"). 07b's inspector reads these only on CANVAS nodes.

**If this becomes painful post-MVP:** consider a `SceneNode` to `CanvasNode | NonCanvasNode` discriminated-union refactor in Phase 2. Tracked as a Phase 2 cleanup item, not a blocker.

### 12.5 Risk (Medium) — Kiwi schema dual-state during upstream-PR window

When the Kova-side Kiwi schema is at v2.0.0 but the upstream PR to OpenPencil has not yet merged:

- A Kova build can read both v1.x and v2.0.0 snapshots correctly.
- An upstream-only build (someone consuming OpenPencil's `packages/core/` without Kova's fork) reading a v2.0.0 snapshot skips the unknown SLICE/MEASUREMENT enum values + warns.
- Kova production users see no issue (everyone is on Kova's build).
- The risk surfaces only if someone outside Kova consumes a Kova-built file.

**Mitigation:**

1. Kova builds always run the Kiwi reader in "Kova v2.0.0" mode — no upstream-only readers in production.
2. The unknown-NodeType fallback ensures no crash even if a hypothetical external reader encounters our bytes.
3. Upstream PR cadence (Phase B §10) keeps the divergence window short — within ~3 months of 07a shipping, upstream main should be at v2.0.0 too.

If upstream declines the PR, Kova ships a permanent fork delta; the kiwi divergence becomes permanent. This is acceptable — Kova's product depends on the new NodeTypes, OpenPencil's product may not — but documented in CHANGELOG.

### 12.6 Risk (Low) — VECTOR mask shape opacity override implementation

The VECTOR maskType "ignores the translucency—or opacity value of more than zero percent" per Figma docs. Implementing this means **when rendering the mask shape itself** under a VECTOR mask scope, the renderer must override fill `opacity: 1.0` regardless of the shape's actual fill alpha.

**Approach:** pass a `forceOpaque: boolean` flag through `renderNode` → `renderShape` → `applyFill` for the mask-shape render call. The flag is `true` only when rendering the mask shape of a VECTOR mask; everywhere else it is `false`. This is a small targeted plumbing change to four functions.

**Verification:** the VECTOR mask compositing pixel-snapshot test (§9.1 `mask-compositing-vector.test.ts`) uses a 50% opacity rectangle as the mask shape + a colored fill underneath; the assertion confirms the maskee renders at 100% (not 50%) inside the rect boundary.

### 12.7 Risk (Medium) — CharacterStyleOverride backwards-compat across plain-TEXT and OpenType-TEXT runs

Adding `openTypeFeatures` + `linkHref` + `listType` + `listIndent` as optional fields on `CharacterStyleOverride` means existing TEXT nodes without these fields continue to work. But 07b's text-rendering update will need to read these fields and apply them through Skia's `ParagraphBuilder.TextStyle.fontFeatures` (or equivalent). The Skia/CanvasKit API for per-character font features is a per-`TextStyle` setting, and Kova's `buildParagraph` function (in `renderer/scene.ts` line 569+) doesn't yet split styled-run TextStyles. 07b owns this work.

**Engine surface in 07a is field-data only:** the storage shape lands here, the rendering call lands in 07b. Documented to avoid scope creep.

### 12.8 Risk (Low) — upstream PR rejection on any of the 7 PR threads

If OpenPencil upstream declines any of the 7 planned PRs (SLICE NodeType, MEASUREMENT NodeType, new SceneNode fields, CharacterStyleOverride extension, scaleNode, mask compositing, kiwi schema bump), the Kova fork stays as a permanent fork delta.

**Mitigation:** PR posture is "small + focused + well-tested + clear upstream value." Mask compositing has the strongest upstream argument (the data shape was already there; only the renderer was missing). SLICE + MEASUREMENT are first-class Figma NodeTypes — upstream OpenPencil likely wants them. The risk is asymmetric but the downside is "stay on permanent fork," not "feature broken."

### 12.9 OPEN QUESTION — measurement-label rendering store

The measurement annotation displays a label string (e.g. "120 px"). The label is either:

(a) **Auto-computed at render time** from the geometry (`Math.hypot(end_x - start_x, end_y - start_y)` rounded to the active unit's precision), and the engine stores only the geometry + an optional user-override label.

(b) **Stored explicitly** on the MEASUREMENT node — engine writes the label on creation + recompute on resize.

**This PRD defaults to (a):** the engine stores `text: ''` by default (empty = "use computed label"); 07b's render loop computes the label string at draw time. A user-override sets `text` to a non-empty string, and the engine respects the override.

**Why (a):** keeps the engine schema minimal; ties the label to live geometry; matches Figma's "double-click to customize text" pattern (verified against `help.figma.com/hc/en-us/articles/20774752502935`) — Figma's measurement label is auto-computed until a user overrides via double-click.

**Founder confirms or pushes back.** Default `(a)` ships if no pushback.

### 12.10 OPEN QUESTION — measurement node 2-point geometry encoding

The MEASUREMENT NodeType represents a 2-point line. The encoding in this PRD uses `x, y, width, height`: start point = `(x, y)`, end point = `(x + width, y + height)`. Negative width/height handle the case where the user drags right-to-left or bottom-to-top.

**Alternative:** add `startX, startY, endX, endY` as new fields on `SceneNode` (or specifically on MEASUREMENT-typed nodes).

**This PRD defaults to the existing-field encoding** — keeps the schema lean. The downside is `width`/`height` semantics differ for MEASUREMENT vs. RECTANGLE (rectangle width is always positive; measurement width can be negative). Documented in the JSDoc on the MEASUREMENT default factory.

**Founder confirms or pushes back.** Default (existing-field encoding) ships if no pushback.

### 12.11 RESOLVED 2026-05-15 — split items #9–#11 sit in 07a not 07b

Per §12.1 above. Founder approves the auditor-split correction during PRD review.

### 12.12 RESOLVED 2026-05-15 — mask-shape NOT rendered as a visible layer

Per Figma docs (verified §13.6): "The mask object itself creates a visible grouping in the Layers panel but doesn't render as a separate visible element — it functions structurally to control what displays beneath it." This PRD's renderer matches: the mask shape's own visible-on-canvas rendering is consumed by the mask scope, not drawn as a stand-alone shape. The B8.4 mask outline overlay (07b) renders the mask shape's bounding-outline + corner glyph for editor-only visibility.

### 12.13 RESOLVED 2026-05-15 — scaleNode does not modify rotation

Figma's K-tool semantics: scale geometry while keeping rotation + position. Verified against the audit + Figma's own scale-tool documentation. This PRD's `scaleNode` preserves `x`, `y`, `rotation` per the spec in §7.4.

---

## 13. References

### 13.1 03-doc rows covered

- §2.7 Canvas-engine extensions (33 rows total; this PRD owns the §3C #1a + #1b buckets — core mods + renderer-only — and the four "missing" engine-side Q3 items: aspectRatio, page-export flag, page-bg-vis, scale tool)
- §3C #1a — core mods (SLICE NodeType, MEASUREMENT NodeType, aspectRatio, page-export flag, page-bg-vis, scale tool, OpenType per-text-run wiring, list/link per-text-run attrs, tool registration in `tools/`)
- §3C #1b — renderer-only (mask compositing in `renderer/scene.ts`)

Note: §3C #1c (Inspector wiring) and §3C #1d (App-level overlays) belong to 07b.

### 13.2 Q-decisions baked in

- **Q1** — SLICE = first-class 17th (literal 18th) NodeType in `scene-graph.ts`. Lift core lock per CLAUDE.md amendment ratified 2026-05-14.
- **Q2** — Mask compositing in `renderer/scene.ts`. Data model `isMask` + `maskType` already in `scene-graph.ts:298–299`. All 3 maskTypes ship MVP.
- **Q3** — 9 features engine-ready (vertical text align, all 4 gradient types, POLYGON/STAR/LINE, stroke align, all 5 effect types, boolean operations, vector network field). 1 partial (OpenType — needs SceneNode wiring — this PRD ships the wiring). 4 missing — this PRD ships 3: aspectRatio, page-export flag, page-bg-vis. Scale tool ships as an engine-side modify operation here; the K-tool UX wires in 07b.
- **Q4** — Engine has zero extension hooks. Canvas-extensions (product-variant) work via external Pinia + public FigmaAPI only. **Lift the lock per CLAUDE.md amendment for foundational primitives matching Figma's data model** — this PRD's mandate.
- **Q11** — MEASUREMENT = first-class 18th (literal 19th) NodeType in `scene-graph.ts`. Path 1 (lift core lock). New `packages/core/src/renderer/measurements.ts` is **owned by 07b** for the dashed-line + auto-distance label rendering (overlay); this PRD's engine surface stores the geometry only.

### 13.3 Hi-fi files referenced

- `main-main-kova-scope/batch-b/Kova Canvas - Final.html` (canonical canvas chrome source-of-truth; engine integration point reference)
- `main-main-kova-scope/batch-b/Kova Hi-Fi 09 Canvas Overlays - Dark.html` (10 scenes B8.1–B8.10 — visual reference for what 07b will render on top of this engine surface; mask outlines B8.4 + measurement annotation B8.9 are the two scenes where 07a's data model becomes visible)

### 13.4 Design system

Engine surface in this PRD is theme-agnostic — no CSS, no Tailwind classes, no design-token reads. The visible rendering surface in 07b consumes:

- `main-main-kova-scope/design-system/design.md` (spec — overlay specs)
- `main-main-kova-scope/design-system/kova-hifi.css` (canonical dark CSS — overlay token references)
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` (vocabulary cheat-sheet)

Light CSS not referenced — canvas is always dark per `feedback_app_dark_website_light`.

### 13.5 Audit + verification inputs

- `kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` (master plan; §3 Cluster 07; §5.6 item 10 split-commit; §6 cross-cuts; §8 done definition)
- `kova-open-pencil-1/docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md` (operator manual followed for this draft)
- `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md` (§2.A Cluster 07 lines 1614–1683 — items 1–8 lifted; items 9–11 re-scoped to 07a per §12.1; §895 core-lock amendment ratification)
- `kova-open-pencil-1/docs/kova-final-prds/00d-EXTERNAL_VERIFICATION_HANDOFF.md` (D-10 PRD 07 split ratification)
- `kova-open-pencil-1/docs/kova-final-prds/00e-EXTERNAL_VERIFICATION_VERDICT.md` (Figma SLICE / MEASUREMENT / mask verification log; §6 PRD-hygiene rules)
- `kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/q1-5-answers-03-implied-surfaces-and-backend.md` (Q1, Q2)
- `kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/q6-25-answers-03-implied-surfaces-and-backend.md` (Q3, Q4, Q11)

### 13.6 External sources cited (verified 2026-05-15 per `feedback_verify_with_docs`)

| Claim | URL | Verification |
|---|---|---|
| SliceNode interface (type, name, exportSettings, geometry, methods) | `https://developers.figma.com/docs/plugins/api/SliceNode/` | Confirms — `type: 'SLICE'` readonly; `name`; `exportSettings: ReadonlyArray<ExportSettings>`; geometry fields; `clone()`, `exportAsync()`, `remove()`; "An invisible object with a bounding box, represented as dashed lines in the editor" |
| Measurement tool keyboard + persistence + selectability + edit | `https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotate-designs` | Confirms — "Shift+M"; "click and drag from your starting point to the layer where you want the measurement to end"; persisted ("visible measurements for others to view"); "to delete a measurement, click it and press the Delete or Backspace key"; "double-click on the measurement to customize its text" |
| Mask types (3 — Alpha/Vector/Luminance), propagation rule, default, shortcut, mask-object not rendered | `https://help.figma.com/hc/en-us/articles/360040450253-Masks` | Confirms — "All masks in Figma support alpha channels"; "Vector — ignore the translucency—or opacity value of more than zero percent"; "Luminance — the brighter the area of a mask, the more that is revealed"; "to all siblings above it until it reaches: Another mask or mask object, The mask's parent frame or group, A frame or component with clip content on"; "By default, the mask type is set to Alpha"; shortcut Control+Command+M (Mac) / Ctrl+Alt+M (Win); "doesn't render as a separate visible element—it functions structurally to control what displays beneath it" |
| Slice = invisible export region; drag-on-canvas to create; content within bounds is what exports | `https://help.figma.com/hc/en-us/articles/360040028114-Export-from-Figma` | Confirms — "Slice tool located under the Region tools dropdown"; "To create a slice, click and drag the Slice tool around the region you want to export"; "only content within the slice's boundaries will be exported"; padding control on slices |

### 13.7 Memory pointers consulted

- `feedback_app_dark_website_light` — engine surface is dark theme; no theme toggle.
- `feedback_figma_ui_theme` — Figma as visual reference; data model matches `developers.figma.com`.
- `feedback_browser_smoke_test_before_done` — §9.4 manual QA gate (engineer-facing only for 07a; founder-facing for 07b).
- `feedback_verify_with_docs` — every Figma claim re-verified via `developers.figma.com` / `help.figma.com` (§13.6 log).
- `feedback_build_better_not_easier` — chose to ship all 3 mask types in MVP rather than ALPHA-only; chose to refactor `createSlice` from stub-Frame to real SLICE NodeType rather than leaving the stub.
- `feedback_explain_for_nontechnical_founder` — §1.1 plain language + §1.2 caveman both included; §12 each risk + open Q stated in plain language.
- `project_kova_avatar` — slices serve the freelance email marketer's "design once → export many" workflow; measurements serve the same persona documenting spec for engineering handoff.
- `project_design_system_master` — canonical paths cited.
- `project_pre_prd_audit_ratified` — D-10 split confirmed; engine work clear to begin Wave 5.

### 13.8 What is NOT in this PRD (handed elsewhere)

- All inspector wiring (vertical text align, stroke align, multiple fills, image fill picker, gradient editor, Effects, Boolean ops) — **07b**
- All app-level overlays (B8.1–B8.10) — **07b**
- All interactive tool modes (S/⇧M/^C/K drag-on-canvas UX) — **07b**
- Export pipeline + Slice-batch ZIP + JPG quality dropdown (Q22) — **07b**
- Keyboard shortcut bindings (`e.code` strings) — **08**
- Snapshot store + `canvas_snapshots.format_version` column — **09**
- AI tool registration (consumes the EXTENDED_TOOLS registry this PRD extends) — **10**
- Toast variant taxonomy + `useToast()` consumer for engine errors — **11**
- Canvas chrome + bottom toolbar + tool button mounts — **06**
- Pinia `useEditorStore.activeTool` extension to new tool names — **06 / 07b** (engine has no opinion on UI state)
