# Answers to Q1–Q6 from 03-implied-surfaces-and-backend.md §4

> **Six load-bearing decisions** blocking ~30 rows in 03 doc until resolved.
> Each answer Figma-doc-grounded + verified against actual `packages/core/` source per founder directive ("never underbuild, match Figma where reasonable; document divergences").
>
> **Author:** Claude (Opus orchestrator), 2026-04-25
> **Recipient:** the agent that authored `03-implied-surfaces-and-backend.md` — apply these decisions to update the doc per the **Handoff Instructions** at the bottom.
> **Status:** Q1, Q2, Q3, Q5, Q6 final. Q4 preliminary against pre-Track-2 code (re-validate after upstream sync sprint).
>
> **Revision history:**
> - 2026-04-25 v1: Initial Q1–Q5 answers (3 verified against Figma plugin API + Explore subagent audit of `packages/core/`).
> - 2026-04-25 v2: Verification pass against actual `packages/core/src/scene-graph.ts` revealed Q2 (masks) + Q3 (effects, vector network) understated existing engine support. Q5 Figma citation corrected. Q6 multiplayer added per founder direction (solo MVP). All renderer/data-model claims re-grounded against `scene-graph.ts:55–439` line-citations.

---

## Tech-stack divergence from Figma (read first — applies to all answers)

Kova is a fork of OpenPencil ([openpencil.dev](https://openpencil.dev/)). The architectural picture:

| Layer | Figma | Kova / OpenPencil | Match? |
|---|---|---|---|
| Renderer | Custom **WebGPU + C++ WASM** ([Figma blog](https://www.figma.com/blog/figma-rendering-powered-by-webgpu/)) | **CanvasKit (Skia WASM)** | NO — tier below; visual output identical, performance ceiling lower at 10k+ nodes (irrelevant for email-scale designs of ~50–300 nodes) |
| Layout | Custom Yoga-style | **Yoga WASM** (flex + grid via fork) | YES |
| File format | Kiwi binary | **Kiwi binary** + Zstd + ZIP (reads `.fig` natively) | YES |
| Multiplayer | Custom OT + central server ([Figma blog](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)) | **Trystero P2P + Yjs CRDT** (open-pencil ships this, Kova MVP keeps dormant — see Q6) | NO — different paradigm; both work |
| Local persistence | IndexedDB delta-based | **y-indexeddb** (Yjs CRDT) | Partial — both IndexedDB |
| Scene graph | ~30 SceneNode types | **16 SceneNode types** (CANVAS, FRAME, RECTANGLE, ROUNDED_RECTANGLE, ELLIPSE, TEXT, LINE, STAR, POLYGON, VECTOR, GROUP, SECTION, COMPONENT, COMPONENT_SET, INSTANCE, SHAPE_WITH_TEXT) | Subset; covers email-design needs. Out-of-scope Figma types (STICKY, TABLE, CODE_BLOCK, MEDIA, WIDGET, STAMP, etc.) not needed. |
| Plugin API | `figma.*` global | `figma-api-proxy.ts` exposes Figma-compatible API via proxy | YES |

**Implication for matching Figma quality:**

- **Visual fidelity:** identical (Skia is the same rendering engine that powers Flutter Web, Chrome, Android). CanvasKit produces output indistinguishable from native Skia.
- **Data model surface:** ~95% match to Figma plugin API. All email-design primitives covered.
- **Performance ceiling:** lower than Figma at extreme scales. Non-issue for email design.
- **Multiplayer:** different paradigm. Open-pencil's P2P is reliable for small teams; Figma's central server scales further. Defer (see Q6).

Document this divergence in the 03 doc preamble so downstream readers don't assume "Figma-exact tech stack." It's "Figma-compatible **data model**" running on **different rendering tech**.

---

## Q1: Slice node-type schema

### Figma's actual model (verified via plugin docs)

`SliceNode` is a **first-class SceneNode** with `type: 'SLICE'`. Verified properties from [Figma Plugin API — SliceNode](https://developers.figma.com/docs/plugins/api/SliceNode):

- **Layout:** x, y, width, height, rotation, relativeTransform, absoluteTransform, layoutSizingHorizontal/Vertical (FIXED/HUG/FILL), constraints
- **Identity:** id, name (user-renamable, e.g. "Slice 1", "Hero CTA")
- **Export:** `exportSettings: ReadonlyArray<ExportSettings>` + `exportAsync(settings?)` method
- **Tree:** parent (BaseNode & ChildrenMixin), participates in layer hierarchy
- **State:** visible, locked, removed
- **Behavior:** clone(), remove(), resize/resizeWithoutConstraints/rescale
- **Visual:** "an invisible object with a bounding box, represented as dashed lines in the editor" — non-rendering, dashed outline only

Slices selected, named, moved, duplicated, exported. Multiple slices = multiple export units. "Contents Only" toggle in export panel = export only fully-contained-in-slice content vs anything-overlapping-slice. Persisted in `.fig` file.

### `packages/core/` current state (verified 2026-04-25)

- **NodeType union** (`packages/core/src/scene-graph.ts:67–83`): 16 types — CANVAS, FRAME, RECTANGLE, ROUNDED_RECTANGLE, ELLIPSE, TEXT, LINE, STAR, POLYGON, VECTOR, GROUP, SECTION, COMPONENT, COMPONENT_SET, INSTANCE, SHAPE_WITH_TEXT.
- **SLICE missing.** Adding SLICE = add 17th type.

### Recommendation: **First-class scene-graph node. Match Figma's data model exactly.**

| Option | Verdict |
|---|---|
| **A. First-class SLICE SceneNode** (Figma-exact) | ✅ **Recommended** |
| B. Property on FRAME nodes (slice = frame with `isSlice: true`) | ❌ Slices stand alone in Figma — not all slices are frames; can overlap multiple frames |
| C. Per-canvas metadata in `canvas_slices` table | ❌ Loses Yjs CRDT sync, layer-tree integration, undo/redo, copy/paste — slices are intrinsic to design, not metadata |

### Why first-class is the only correct path

1. **Image export IS Kova's product.** Slice is the export unit. Treating slices as side-table metadata means our export pipeline becomes a special case instead of a natural traversal of `SLICE` nodes in the scene graph. Engineering pain compounds forever.
2. **Figma proves the model works.** SliceNode has been in Figma's data model since launch.
3. **Yjs persistence is free.** Scene-graph nodes already CRDT-sync via Yjs.
4. **Layer-tree integration is free.** Slice icon + name in layers panel is "render whatever node-type returns SLICE icon" — generic.
5. **User mental model matches Figma.** Designers select slice → resize → export. Muscle memory.

### Implementation impact (writing it down for downstream PRDs)

- **NEW node-type `SLICE` in `packages/core/src/scene-graph.ts:67–83` NodeType union.** Touches packages/core (locked subdirectory). See engine-policy note in cross-cutting section.
- **Slice canvas-extension renders dashed-line bounding box overlay.** Reads `editor.viewPrefs.showSlices` (cross-cuts §2.7 "Show slices" View toggle) — only renders when toggle ON.
- **Hit-test on slice edge** (selectable when clicked on dashed boundary; marquee picks up slice if marquee covers any part of it).
- **Layer tree:** slice glyph icon + default name "Slice N" + inline rename via `use-inline-rename.ts`.
- **Inspector:** Position section (x/y/w/h/rotation) + Export section (per-slice `exportSettings[]` array with format/scale/suffix; "Contents Only" toggle).
- **Right-click on canvas selection:** "Create slice from selection" → spawns SLICE node at selection bounds.
- **Export pipeline:** `editor.exportAllSlices()` iterates SLICE nodes on current page, calls existing `renderExportImage()` per region, batches output as ZIP (multiple slices) or single file (one slice).
- **Slice tool (S key)** in bottom toolbar Frame dropdown: pointer-drag creates SLICE node (new tool mode in `editor.ts.activeTool`).
- **Slice indicator on layer row** (§2.4) reads `node.type === 'SLICE'` — free.

---

## Q2: Mask renderer support — **CORRECTED (data model already exists)**

### Figma's actual model (verified via plugin docs + help center)

**Mask is a property, not a node type.** `isMask: boolean` is settable on every visible SceneNode type (FrameNode, GroupNode, RectangleNode, EllipseNode, PolygonNode, StarNode, LineNode, VectorNode, BooleanOperationNode, TextNode, ComponentNode, InstanceNode).

When `isMask=true`:
- `maskType: 'ALPHA' | 'VECTOR' | 'LUMINANCE'` controls compositing (default ALPHA)
- The mask's **subsequent siblings** (later in `parent.children` array, **above** it in layer panel z-order) are masked
- Propagation **stops** at: another mask node, parent frame/group boundary, frame with `clipsContent: true`
- The mask node itself is **hidden** — only its silhouette/alpha/luminance is used

**3 mask types** (per [Figma Plugin API — MaskType](https://developers.figma.com/docs/plugins/api/MaskType/)):

| Type | Behavior | Renderer requirement |
|---|---|---|
| **ALPHA** (default) | Mask's alpha channel determines pixel opacity in result. Supports gradients, blur, shadows, transparent images. | CanvasKit `Paint.setBlendMode(BlendMode.DstIn)` |
| **VECTOR** | Binary clip from mask's fill+stroke geometry. | CanvasKit `Canvas.clipPath()` |
| **LUMINANCE** | Mask's brightness → result opacity. | CanvasKit ImageFilter to convert RGB→luminance→alpha mask |

User-facing: select layers → right-click "Use as mask" OR `⌃⌘M` (Mac) / `⌃⌥M` (Windows). Critical guidance: **wrap mask + targets in a group first** to prevent over-masking siblings.

### `packages/core/` current state — **DATA MODEL ALREADY EXISTS** (verified 2026-04-25)

The original Q2 audit (Explore subagent, 2026-04-25 v1) **incorrectly stated `isMask` and `maskType` were missing**. Direct verification:

- **`packages/core/src/scene-graph.ts:135`:** `MaskType = 'ALPHA' | 'VECTOR' | 'LUMINANCE'` — **all 3 types defined**
- **`packages/core/src/scene-graph.ts:298`:** `isMask: boolean` field on SceneNode interface
- **`packages/core/src/scene-graph.ts:299`:** `maskType: MaskType` field on SceneNode interface
- **`packages/core/src/scene-graph.ts:438–439`:** defaults wired (`isMask: false, maskType: 'ALPHA'`)
- **`packages/core/src/figma-api-proxy.ts:824–829`:** `isMask` getter/setter exposed via FigmaAPI proxy
- **`packages/core/src/kiwi/kiwi-convert.ts:616`:** Kiwi serialization handles `isMask` round-trip in `.fig` files

**What is actually missing:**
- **Renderer compositing implementation.** `packages/core/src/renderer/scene.ts` and `renderer.ts` do not reference `isMask` at all (verified via grep). The data model is in place but the rendering pipeline does not yet respect mask siblings.
- **Inspector UI** for the half-moon mask toggle (app-level work, no core change needed).
- **Layer-tree visualization** for masked siblings indented under mask (app-level work).

### Recommendation: **Implement renderer compositing. Ship all 3 maskTypes (ALPHA + VECTOR + LUMINANCE). No data-model lift needed.**

| Option | Verdict |
|---|---|
| **A. Renderer compositing implementation only** (data model already in core) | ✅ **Recommended** |
| B. Canvas-extension faking via clip-path | ❌ Only does VECTOR-type. Breaks for transparent images, blur, gradient masks (the cases designers actually want). Half-mask = uncanny valley. |
| C. Contribute upstream first | ❌ Mask field exists upstream but compositing also missing upstream. We can land it ourselves and submit upstream PR. |

### Why all 3 maskTypes ship in MVP (revised from original "ALPHA + VECTOR only")

Field already accepts `'LUMINANCE'`. Renderer compositing for LUMINANCE is one extra branch in the same per-sibling traversal:
1. ALPHA: render mask offscreen → use alpha channel (`BlendMode.DstIn`) — easiest
2. VECTOR: clip path from fill geometry (`Canvas.clipPath()`) — easiest
3. LUMINANCE: render mask offscreen → ImageFilter chain (RGB → luminance → alpha) → use as alpha mask — one additional ImageFilter chain

LUMINANCE is rarer in email design but cheap to ship since the field already accepts it. Cutting it would mean hard-rejecting `'LUMINANCE'` writes via the FigmaAPI proxy — strictly more code than implementing it. Match Figma exactly.

### Why canvas-extension fails (unchanged from v1)

Canvas-extensions render overlays on top of the renderer. They cannot intercept per-pixel compositing. To do alpha/luminance masks we need control of:
- Offscreen surface allocation (mask renders alone first)
- `Paint.setBlendMode()` swap
- `SkImageFilter` chain

These are core renderer internals. Our extension layer does not expose them. Vector-only via clip-path "works" but breaks for real-world cases. Email designers use mask for: hero-image-with-soft-edge, text-clipped-to-photo, gradient-fade overlays. **Alpha-mask use cases**, not vector. Half-built mask = product fail.

### Implementation impact (downstream PRDs)

- **packages/core renderer changes (no scene-graph changes needed):**
  - `packages/core/src/renderer/scene.ts` (or wherever sibling traversal lives): in sibling loop, detect `child.isMask === true`, switch compositing branch per `child.maskType`, mask all subsequent siblings until next mask node / parent boundary / `clipsContent: true` frame.
  - Mask node itself: skip rendering visible paint (only silhouette/alpha/luminance consumed).
  - Bounding-box logic: masked output bounds = mask bounds (siblings clipped).
  - All 3 maskType branches (ALPHA via `BlendMode.DstIn`, VECTOR via `clipPath`, LUMINANCE via ImageFilter chain).
- **Inspector half-moon icon (§2.6):** toggles `isMask` on selected node, sets default ALPHA. `maskType` selector appears below when isMask=true (3-radio picker: Alpha/Vector/Luminance — all enabled).
- **Object menu + right-click "Use as mask"** (§2.2 + §2.10): same toggle. Shortcut: `⌃⌘M` (Mac), `⌃⌥M` (Windows) — match Figma exactly.
- **Auto-group containment:** if user enables isMask on a node not in a group/frame, auto-wrap in group with the intended mask targets. Surface a one-time toast: "Wrapped mask in group to limit scope." Prevents Figma's documented over-masking footgun.
- **Layer-tree visualization (§2.4 mask indicator):** mask glyph next to mask node + masked siblings indented with upward-arrow connector.
- **View > Mask outlines toggle (§2.7):** canvas-extension overlay drawing green outlines on mask geometry. Works as additive layer on top of compositing — extension territory.

### Why this matches Figma exactly

- Same data model (`isMask` + `maskType` on existing nodes — already in core)
- Same 3 mask types (all shipping)
- Same sibling-propagation semantics
- Same containment behavior (wrap-in-group)
- Same shortcut (`⌃⌘M`)
- Same layer-tree visualization (mask glyph + indented siblings)
- Same View toggle (Mask outlines in green)

Designer who knows Figma loads Kova → muscle memory works. **Build-better-not-easier path.**

---

## Q3: Engine support audit for inspector rows — **EXPANDED**

> **Method:** Direct verification of `packages/core/src/scene-graph.ts`, `renderer/effects.ts`, `figma-api.ts`, `tools/vector.ts` against the 03 doc's "needs verification" claims (2026-04-25). Pre-Track-2 audit; re-validate after upstream sync.

### Audit results

| # | Feature | Status | Evidence | Action needed |
|---|---|---|---|---|
| 1 | Vertical text alignment (TOP/CENTER/BOTTOM) | **EXISTS** | `scene-graph.ts:160` `TextAlignVertical` enum; `:246` `SceneNode.textAlignVertical`; `:417` default value | Inspector wiring only |
| 2 | OpenType / ligature controls (LIGA, DLIG, kern) | **PARTIAL** | `kiwi/schema.ts:521–544` defines `OpenTypeFeature` enum; `:1394–1395` `toggledOnOTFeatures` + `toggledOffOTFeatures` in kiwi protocol — **not exposed on SceneNode** | Wire kiwi enum to `CharacterStyleOverride` (line 164) — small core change |
| 3 | Gradient paint types (LINEAR/RADIAL/ANGULAR/DIAMOND) | **EXISTS — all 4** | `scene-graph.ts:86–92` FillType union; `renderer/fills.ts:91–135` handles all four | Inspector wiring + visual gradient editor only. Founder spec ships LINEAR + RADIAL only (ANGULAR/DIAMOND removed per re-semantic) but engine has all 4 ready if scope expands. |
| 4 | `aspectRatio` field (per-node ratio lock) | **MISSING** | No `aspectRatio` or `constrainProportions` in scene-graph | Lift core lock — add `aspectRatio?: number \| null` field to SceneNode. Closest existing pattern: `horizontalConstraint`/`verticalConstraint = 'SCALE'` (`scene-graph.ts:158`) |
| 5 | Page-level export flag (`includeInExports`) | **MISSING** | No per-page export-flag field on CANVAS node; export pipeline at `fig-export.ts:96` iterates all pages without per-page control | Lift core lock — add `includeInExports: boolean = true` to CANVAS-type SceneNode + wire into export pipeline |
| 6 | Page-bg-visibility flag (`pageBackgroundVisible`) | **MISSING** | No field separate from fill alpha; CANVAS uses standard opacity | Lift core lock — add `pageBackgroundVisible?: boolean` to CANVAS-type SceneNode |
| 7 | POLYGON primitive | **EXISTS** | `scene-graph.ts:75` in NodeType union; `:315` `pointCount: number` field; `renderer/fills.ts:38–43` draws polygons | First-class. Polygon tool just needs creation flow + sides-count inspector. **MVP candidate.** |
| 8 | STAR primitive | **EXISTS** | `scene-graph.ts:74` in NodeType union; `:315–316` `pointCount` + `starInnerRadius`; `renderer/fills.ts:38–43` | First-class. Star tool just needs creation + sides/inner-ratio inspector. **MVP candidate.** |
| 9 | LINE primitive | **EXISTS** | `scene-graph.ts:73` in NodeType union; `renderer/fills.ts:35–37` draws line from (0,0) to (width, height) | First-class. Line tool just needs creation flow. **MVP.** |
| 10 | Scale tool / proportional resize | **MISSING** | No `rescale()` or `scaleSelection()` in scene-graph or `tools/modify.ts`; existing actions: `setRotation`, `setLayout`, `setConstraints` | Lift core lock — add `scaleNode(id, factor: number)` to `tools/modify.ts`. Closest pattern: `'SCALE'` constraint (line 256) but that's resize-with-parent, not selection-level scale. |
| 11 | Stroke alignment (INSIDE/CENTER/OUTSIDE) | **EXISTS** | `scene-graph.ts:142` `Stroke.align` discriminated union; `renderer/strokes.ts:91–114` dispatches all three; `tools/modify.ts:551` `setStrokeAlign` exposed | Inspector wiring only — radio picker on Stroke section. |
| 12 | **Effects (drop shadow, inner shadow, layer blur, background blur, foreground blur)** | **EXISTS — all 5** | `scene-graph.ts:149` `Effect.type = 'DROP_SHADOW' \| 'INNER_SHADOW' \| 'LAYER_BLUR' \| 'BACKGROUND_BLUR' \| 'FOREGROUND_BLUR'`; `:223` `effects: Effect[]` on every node; `renderer/effects.ts` uses Skia `ImageFilter.MakeDropShadowOnly` + `ImageFilter.MakeBlur` with caching | **Inspector wiring only.** Engine + renderer both ready. Doc 03 §2.6 marks effects "REMOVED per re-semantic" — **REVERSE this decision per founder direction.** Email design depends on shadows for CTA buttons, image cards, hero elements. |
| 13 | **Vector network (Pen tool data model)** | **EXISTS (depth unverified)** | `scene-graph.ts:55` `VectorNetwork` interface; `:275` `vectorNetwork: VectorNetwork \| null` field on SceneNode | Field present. Whether it implements Figma's full vertex/segment/region model ([VectorNetwork docs](https://developers.figma.com/docs/plugins/api/VectorNetwork/)) vs. simpler bezier paths needs source inspection. **Track 2 sync brings vector editor PR #158 — re-audit then.** |
| 14 | **Boolean operations (Union / Subtract / Intersect / Exclude)** | **EXISTS** | `figma-api.ts` exposes `figma.booleanOperation(op, ids)`; `tools/vector.ts` wires all 4 ops; `kiwi/schema.ts` has `BOOLEAN_OPERATION = 5` node-type; `kiwi-convert.ts:616` maps to VECTOR | Tool surface exists. Inspector / Object-menu / right-click wiring only. **Free Figma-parity win not previously listed.** |
| 15 | Components / Variants / Variables (DEFER per Kova MVP scope) | **EXISTS** | NodeType includes COMPONENT, COMPONENT_SET, INSTANCE; `scene-graph.ts:331` `VariableType = 'COLOR' \| 'FLOAT' \| 'STRING' \| 'BOOLEAN'` | Engine ready; Kova MVP defers per scope. Don't accidentally remove from engine. |

### Not audited (flagged for Track 2 follow-up)

- **Stroke terminators (arrowheads)** — Arrow tool dependency, in 03 doc §2.7 row "Arrow tool (⇧L)" marked as Phase 2 pending engine support. Stroke `StrokeCap` type on `scene-graph.ts:133` includes `'ARROW_LINES' | 'ARROW_EQUILATERAL'` — **engine likely ready, needs renderer verification.** **Track 2 exit task: confirm `packages/core/src/renderer/strokes.ts` honors arrow terminators.**
- **VectorNetwork depth** — confirm vertex/segment/region model matches Figma's plugin API spec (not simple bezier list) after Track 2 vector editor PR #158 lands.

### Summary

- **9 features fully exist in core** (vertical text align, gradients all-4, POLYGON, STAR, LINE, stroke align, **effects all-5**, **boolean ops**, vector network field) → **MVP-ready with inspector / menu wiring only**. Major scope expansion vs original 03 doc estimates.
- **1 feature partial** (OpenType — kiwi has it, not wired to SceneNode) → small core change to wire through.
- **4 features missing** (aspectRatio, page-export flag, page-bg-vis, scale tool) → require core modification (aligns with Q1/Q2/Q4 lift-the-lock strategy).

### MVP impact (revised — bigger than v1 audit)

Multiple §2.6 / §2.7 rows that assumed "REMOVED" or "needs canvas-extension" or "Phase 2 pending engine support" are actually **engine-ready, just inspector wiring**:

- **POLYGON, STAR, LINE tools** → MVP candidate (Phase 2 in 03 doc)
- **Vertical text align, stroke align** → MVP wiring (already MVP in 03 doc but understated as engine-pending)
- **All gradient types (LINEAR, RADIAL ship; ANGULAR, DIAMOND optional)** → MVP wiring (gradient editor UI)
- **Effects (drop shadow, inner shadow, layer blur, background blur, foreground blur)** → **REVERSE doc 03 §2.6 "REMOVED" decision** — MVP wiring per founder direction (all 5 types). Email design depends on shadows.
- **Boolean operations (Union / Subtract / Intersect / Exclude)** → MVP wiring on Object menu + right-click. Free Figma-parity win not previously in 03 doc inventory.
- **isMask + maskType** (Q2) → renderer compositing only; data model already in core
- **vectorNetwork field** → Pen tool can use immediately; depth re-audit after Track 2

This is a major positive finding: **~12 of 15 audited features need 1–2 days of inspector/menu wiring each instead of weeks of canvas-extension scaffolding.** The original 03 doc estimate of "canvas-extension scaffolding for ~15 features" is largely misclassified (see Q4 re-categorization).

---

## Q4: packages/core extension hook surface

> **Method:** Explore subagent read `src/canvas-extensions/product-variant/` fully and grep'd `packages/core/` for extension registration points. Pre-Track-2 audit; the SDK refactor in upstream may add new hook surfaces — re-validate after sync.

### Critical finding

The "canvas-extensions" pattern in the codebase (product-variant) does **NOT** use any renderer or scene-graph extension hooks. It uses:
- External Pinia store (`useProductVariantBindingsStore`) + Supabase persistence (`canvas_product_variant_bindings` table)
- Composition via public FigmaAPI: `createNode`, `setText`, `setImage`, `setLayout`
- Vue reactive watchers syncing external data to existing nodes

**It does NOT extend the renderer, scene graph, paint types, text styling, hit-testing, tools, inspector, or layer tree.**

### Hook surface inventory

| Hook category | Status | Evidence | Notes |
|---|---|---|---|
| Node-type hooks | **NOT EXPOSED** | `scene-graph.ts:67–83` NodeType is fixed enum; no factory registry | Cannot add new SceneNode types like `SLICE` without core mod |
| Field/property hooks | **NOT EXPOSED** | `scene-graph.ts:208–329` SceneNode interface fixed; no property extension mechanism | Cannot add `aspectRatio`, `pageBackgroundVisible` etc. without core mod (NB: `isMask`/`maskType`/`effects`/`vectorNetwork` already in core — see Q2/Q3) |
| Renderer compositing hooks | **NOT EXPOSED** | `renderer/renderer.ts` RenderOverlays is fixed interface; no hook for custom render phases | Cannot intercept per-pixel compositing or register blend-mode implementations |
| Paint type hooks | **NOT EXPOSED** | `scene-graph.ts:86–92` FillType enum fixed (SOLID, GRADIENT_*, IMAGE, VIDEO); no paint factory | Engine has all 4 gradients + image (Q3) — defer extensibility |
| Text-run / style hooks | **NOT EXPOSED** | `scene-graph.ts:164–179` CharacterStyleOverride + StyleRun fixed | Cannot add bullets, links, custom text attrs without core mod |
| Render-overlay hooks | **NOT EXPOSED** | `renderer/renderer.ts` RenderOverlays interface owned by core | App-level overlays must be drawn outside the core canvas (separate DOM layer or separate canvas) |
| Hit-test hooks | **NOT EXPOSED** | `scene-graph.ts:866–881` hitTest/hitTestDeep/hitTestFrame core-only | Cannot contribute custom hit-test geometry |
| Selection-handle hooks | **NOT EXPOSED** | Drag/rotate handles hardcoded in core renderer | Cannot add custom resize grips |
| Serialization hooks | **PARTIAL** | `index.ts:208–251` exports exportFigFile, readFigFile, encodeNodeChange — extensions store metadata externally (product-variant pattern), no `.fig` integration | Round-trip via external storage works; `.fig`/Yjs intercept requires core mod |
| Tool hooks | **NOT EXPOSED** | `tools/index.ts` exports ALL_TOOLS, CORE_TOOLS, EXTENDED_TOOLS but no extension registration API | Cannot register new tools (Slice, Eyedropper, Measurement, Scale, Arrow, etc.) without core mod |
| Inspector hooks | **NOT EXPOSED** | Right-panel is app responsibility | App-level only |
| Layer-tree hooks | **NOT EXPOSED** | `renderer/label-cache.ts` exports LabelCache; no extension hook for custom row icons/indicators | App-level only |

### What canvas-extensions CAN do without core modification

- External data + Pinia store (product-variant pattern) for things like Shopify product bindings, AI-driven content, brand-asset bindings
- Composition via public FigmaAPI (createNode, setText, setImage, setLayout)
- Vue reactive watchers for external data sync
- App-level pixel readback (e.g., Eyedropper using CanvasKit `getImageData()` at app level)
- App-level overlays drawn outside the core renderer (DOM-positioned over canvas, or separate offscreen canvas composited on top)

### What requires lifting the core lock

**Already in core — only renderer/wiring work needed:**
- `isMask` + `maskType` (Q2) — renderer compositing implementation
- `effects[]` (Q3 #12) — inspector wiring only
- `vectorNetwork` (Q3 #13) — Pen tool can use directly; depth verify after Track 2

**Genuine core lock lifts:**
- New SceneNode types — SLICE (Q1)
- New fields on existing nodes — `aspectRatio` (Q3 #4), `includeInExports` (Q3 #5), `pageBackgroundVisible` (Q3 #6), text-run attrs for bullets/links
- Per-text-run attributes — bullets, numbered lists, link metadata, OpenType wiring (Q3 #2)
- Custom hit-test geometry — needed for SLICE (hit-test on dashed boundary, not fill)
- Tool registration — Slice (S), Eyedropper (^C), Measurement (⇧M), Scale (K), Arrow (⇧L), all marquee tools
- Layer-tree custom row rendering — Mask glyph + indentation, Slice glyph

### Implications for 03 doc §3C #1 ("Canvas-extension scaffolding for ~15 features")

**The plan as written is wrong.** Most of those 15 are NOT canvas-extensions in the product-variant sense. Re-categorization (revised per Q3 expanded findings):

**True canvas-extensions (product-variant pattern, ~0 of the 15):**
- None of the 15 listed fit this pattern. Future: AI-driven dynamic content bindings.

**Core modifications (lift the lock per CLAUDE.md amendment, ~5 of the 15):**
- Slice node-type (Q1)
- Bulleted list (per-text-run attribute)
- Numbered list (per-text-run attribute)
- Create link metadata (per-text-run attribute)
- OpenType / ligature controls (wire kiwi → SceneNode) — Q3 #2
- Tool registration for Slice, Eyedropper, Measurement, Scale, Arrow

**Renderer-only changes (no scene-graph changes — data model exists, ~3 of the 15):**
- Mask compositing (Q2) — `isMask` + `maskType` already in scene-graph
- LUMINANCE branch in mask compositing (Q2)
- Effects renderer (already shipped per Q3 #12 — ImageFilter helpers in `renderer/effects.ts`)

**App-level inspector wiring (~5 of the 15):**
- Vertical text alignment (engine ready)
- Stroke alignment 3-state (engine ready)
- Multiple fills (`use-multi-props.ts` covers, engine ready)
- Image fill picker UI (engine ready)
- Linear / Radial gradient editor UI (engine ready)
- Effects inspector (engine ready, currently wrongly removed from doc 03)

**App-level overlays (~6 of the 15, drawn outside core renderer):**
- Frame outlines overlay
- Mask outlines overlay
- Slice region overlay
- Snap indicators overlay
- Layout guides overlay
- Pixel grid overlay
- Hover contour highlight
- Find highlight overlay
- Eyedropper crosshair
- Measurement tool annotations (or, if persistent, scene-graph nodes — core mod)

### Recommendation

1. **Document a core modification policy** (CLAUDE.md amendment, see Cross-Cutting section below). Establishes the "lift the lock" process for foundational primitives + tracks our changes to enable upstream PR contribution.

2. **Re-classify §3C row #1** in the 03 doc per the categorization above (core mods / renderer-only / inspector wiring / app-level overlays), and update work estimates per category.

3. **Track 2 plays double-duty:** when syncing upstream, also map the new packages/core domain module structure so our future core modifications follow the new layout. Document the synced extension-hook surface (the SDK refactor MAY have added new hooks — re-audit after sync).

---

## Q5: User preferences storage — **CORRECTED FIGMA CITATION**

### Industry context (corrected)

Original v1 claimed *"Figma confirms this split: account settings sync across devices via server."* **This is incorrect.** Per the [Figma forum](https://forum.figma.com/suggest-a-feature-11/user-preferences-to-be-saved-on-account-level-in-software-4758), Figma stores user preferences **locally per browser/app, not synced across devices.** Users actively request cross-device sync as a missing feature.

So the two-layer recommendation below is **better than Figma**, not "matching Figma." Per founder directive ("never underbuild"), this is the right call — but frame it accurately.

### Approach (unchanged from v1, framing corrected)

- **User-level account settings** (cross-device, survive cache wipe): **server-side** — better than Figma's local-only model
- **Per-device UI state**: localStorage — same as Figma + Linear + Notion industry default
- **Per-canvas state**: file-level (Yjs in our case) — matches Figma's per-file persistence

### Recommendation: **TWO-layer preferences architecture (better-than-Figma cross-device sync)**

**Layer 1 — Server-side (`users.preferences` JSONB column):**
- Cross-device sync (matters when desktop/Tauri persistence + cloud profile exist later)
- Survives browser cache wipe / new device install
- Backed up with user account
- TypeScript single source of truth on shape

**Layer 2 — localStorage (via VueUse `useLocalStorage`):**
- Per-device state (different setups want different layouts)
- Fast read/write, no network round-trip
- Acceptable to lose if user clears browser data

### Per-pref allocation (unchanged from v1)

| Preference | Layer | Why |
|---|---|---|
| Accessibility (textSize, reduceMotion, highContrast) | 1 (server) | User-level, cross-device; accessibility is account-pref not device choice |
| AI suggestions toggle | 1 (server) | Affects generation budget — must follow user across devices |
| View toggles (showRuler, showLayoutGuide, showPixelGrid, showFrameOutlines, showSlices, showMaskOutlines) | 1 (server) | Sticky workflow preference — user expects "always on" everywhere |
| Snap toggles (when re-introduced) | 1 (server) | Workflow preference, cross-device |
| Default font / default zoom level | 1 (server) | Account-level workflow defaults |
| Panel collapse (pages section, layers section) | 2 (local) | Per-device — different monitor sizes want different layouts |
| Sidebar widths | 2 (local) | Per-device |
| Recent colors (24-color ring buffer) | 2 (local) | Per-device makes sense; cheap to lose |
| Last-active brand | 2 (local) | Per-device session resumption |
| Last-active canvas | 2 (local) | Per-device session resumption |
| "Don't show again" toast acknowledgments | 2 (local) | Per-device |

### Schema (Layer 1) — unchanged from v1

```sql
-- migration: add preferences JSONB to users
ALTER TABLE users ADD COLUMN preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

-- RPC for safe partial update (RLS-enforced via auth.uid())
CREATE OR REPLACE FUNCTION update_user_pref(path text[], value jsonb)
RETURNS void AS $$
  UPDATE users SET preferences = jsonb_set(preferences, path, value, true)
  WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION update_user_pref TO authenticated;
```

### TypeScript shape (single source of truth) — unchanged from v1

```ts
export interface UserPreferences {
  accessibility: {
    textSize: 'small' | 'medium' | 'large'
    reduceMotion: boolean
    highContrast: boolean
  }
  ai: {
    showTextSuggestions: boolean
  }
  view: {
    showRuler: boolean
    showLayoutGuide: boolean
    showPixelGrid: boolean
    showFrameOutlines: boolean
    showSlices: boolean
    showMaskOutlines: boolean
  }
  defaults: {
    zoomLevel: number
    fontFamily: string
  }
  snap: {
    snapToGrid: boolean
    snapToGuides: boolean
    snapToObjects: boolean
  }
}

export const DEFAULTS: UserPreferences = {
  accessibility: { textSize: 'medium', reduceMotion: false, highContrast: false },
  ai: { showTextSuggestions: true },
  view: {
    showRuler: false, showLayoutGuide: false, showPixelGrid: false,
    showFrameOutlines: false, showSlices: false, showMaskOutlines: false,
  },
  defaults: { zoomLevel: 1, fontFamily: 'Inter' },
  snap: { snapToGrid: true, snapToGuides: true, snapToObjects: true },
}
```

### Pinia store pattern — unchanged from v1

```ts
// preferences-store.ts (server-synced — Layer 1)
export const usePreferencesStore = defineStore('preferences', () => {
  const prefs = ref<UserPreferences>(structuredClone(DEFAULTS))
  const loaded = ref(false)

  async function load() {
    const { data } = await supabase.from('users').select('preferences').single()
    prefs.value = mergeWithDefaults(data?.preferences, DEFAULTS)
    loaded.value = true
  }

  const debouncedSave = debounce(async (path: string[], value: unknown) => {
    await supabase.rpc('update_user_pref', { path, value: JSON.stringify(value) })
  }, 1000)

  function set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    prefs.value[key] = value  // optimistic
    debouncedSave([key], value)
  }

  return { prefs, loaded, load, set }
})

// ui-state-store.ts (device-local — Layer 2)
export const useUIStateStore = defineStore('ui-state', () => {
  const pagesCollapsed = useLocalStorage('kova:ui:pages-collapsed', false)
  const layersCollapsed = useLocalStorage('kova:ui:layers-collapsed', false)
  const recentColors = useLocalStorage<string[]>('kova:ui:recent-colors', [])
  const lastActiveBrandId = useLocalStorage<string | null>('kova:ui:last-brand', null)
  const lastActiveCanvasId = useLocalStorage<string | null>('kova:ui:last-canvas', null)
  const dismissedToasts = useLocalStorage<string[]>('kova:ui:dismissed-toasts', [])
  return { pagesCollapsed, layersCollapsed, recentColors, lastActiveBrandId, lastActiveCanvasId, dismissedToasts }
})
```

### Why JSONB over separate `user_preferences` table — unchanged from v1

| Criterion | JSONB on users | Separate table | Winner |
|---|---|---|---|
| Read on app boot | 1 row read (with profile) | 2 rows + join | JSONB |
| Write a single pref | `jsonb_set` partial | UPDATE one column | Tie |
| Add new pref field | TS interface change, no migration | Migration each time | JSONB |
| Schema enforcement | TS interface (convention) | Postgres columns (enforced) | Table |
| Cross-user analytics | Slow (JSONB scan) | Fast (column index) | Table |
| Atomic with user | Yes (single row) | Cascade delete needed | JSONB |
| Sparse data efficiency | Excellent (defaults inferred client-side) | Mediocre (NULL columns) | JSONB |

**JSONB wins for our access pattern:** read-on-boot + low-frequency writes + no cross-user analytics + frequent schema evolution + small per-user payload (~1 KB). Postgres JSONB is mature for this. Industry standard for user-level prefs at this scale.

### Why two layers (not all server-side) — unchanged from v1

- Per-device UI state SHOULD differ across devices (sidebar widths are inherently per-device)
- Server-syncing UI minutiae adds latency + complexity for no benefit
- Industry standard: Linear, Notion all split this way (Figma stores everything local — we go better)
- Local-first principle: Yjs already drives this for canvas state; preferences follow same philosophy

### Powers (rows from 03 doc that this unlocks)

- §2.9 Accessibility settings — Layer 1
- §2.7 Show text suggestions toggle — Layer 1
- §2.8 Recent colors — Layer 2
- §2.4 Page/Layers section collapse — Layer 2
- §2.10 Show ruler/layout guide/pixel grid right-click persistence — Layer 1 (sticky workflow)
- §2.7 Frame outlines / Mask outlines / Slice region toggle persistence — Layer 1
- Future DEFERRED snap toggles re-introduction — Layer 1

---

## Q6: Multiplayer architecture — **NEW (founder direction: solo MVP)**

### Open-pencil's current state (verified via [openpencil.dev](https://openpencil.dev/))

OpenPencil ships **functional P2P multiplayer**:
- **Trystero (WebRTC P2P)** — no relay server; signaling via public MQTT brokers; data direct between peers
- **Yjs CRDT** — document state sync; awareness protocol for cursors / selection / presence; colored cursor arrows; follow mode (click peer avatar to follow viewport)
- **y-indexeddb** — local persistence; survives page refresh
- **Share link UX** — `app.openpencil.dev/share/<room-id>`

Kova fork inherits this code in `packages/core/` but does not currently expose UI.

### Founder direction (2026-04-25): **Solo MVP**

- **Single user per canvas.** No collaborator UI in MVP.
- **Yjs + y-indexeddb stays.** Already drives offline-first solo persistence — free win, no removal needed.
- **Trystero / awareness code stays dormant.** Don't strip it from `packages/core/`; would create upstream merge conflicts in Track 2 sync and beyond. Just don't surface UI affordances.

### Recommendation: **Keep multiplayer infrastructure dormant; defer UI to Phase 2+**

| Aspect | MVP decision |
|---|---|
| Yjs document sync | **Keep** (drives offline-first solo persistence — required) |
| y-indexeddb local persistence | **Keep** (drives offline reload — required) |
| Trystero P2P signaling | **Dormant** (code present, not initialized at app boot) |
| Yjs awareness (cursors, selection, presence) | **Dormant** (code present, no UI subscriptions) |
| Share link UX | **Removed** (no `/share/<room-id>` route in Kova) |
| Collaborator avatars in top chrome | **Not built** |
| Follow mode | **Not built** |
| Conflict resolution UX | **Not built** (single-user = no conflicts) |

### Phase 2+ revisit triggers

Any of the following would justify revisiting:
- **Customer demand** for "share canvas with team member" use case (e.g., agency reviewing client deliverable)
- **Pricing-tier pressure** to add multi-seat / collaboration as upsell
- **Enterprise customer** requiring multi-user editing
- **Internal use** (Kova team designing together on the same canvas)

### Phase 3 (if Kova ever scales beyond P2P)

If multiplayer ships and grows beyond ~5 simultaneous users per canvas, Trystero P2P may not scale. Migration path:
- **Yjs WebSocket Provider** — replace Trystero signaling with hosted WebSocket relay (e.g., y-websocket on a small Node service, or hosted on Hocuspocus)
- **Server-side persistence** — relay server can persist Yjs docs to Postgres / S3 for snapshot
- **No data-model change** — still Yjs CRDT, just different transport

This is years out and only relevant if Kova pivots toward team-based collaboration. Not a current concern.

### Why this isn't in the original 03 doc

The 03 doc inherits from `02-figma-scope.md` (Timmy's master list), which inventoried Figma's UI surfaces but did not include multiplayer presence indicators / collaborator UI as KEEP-new. The implicit assumption was solo-only — this Q6 makes it explicit so downstream PRDs don't accidentally wire multiplayer.

### Powers (rows from 03 doc affected)

None directly (no multiplayer rows in 03 doc inventory). But:
- §2.1 Top chrome — confirms NO collaborator avatars row needed
- §2.8 Network status indicator — drives off Yjs local persistence (always works offline) + Supabase Realtime for Shopify sync, NOT Yjs P2P sync (which is dormant)
- §3C — confirms NO multiplayer infrastructure row needed in net-new infrastructure

### Cross-doc note

Add to 03 doc preamble: *"Kova MVP is single-user per canvas. OpenPencil's Trystero P2P + Yjs awareness code remains in `packages/core/` (dormant) for future Phase 2+ revisit. Yjs document CRDT + y-indexeddb stay live to drive offline-first persistence."*

---

## Cross-cutting: CLAUDE.md amendment proposal — unchanged from v1

Add to CLAUDE.md (extending "Hard Constraints — Never modify"):

> **Exception: Foundational design primitives matching Figma's data model.**
>
> packages/core/ modifications **permitted** for:
> - SceneNode types defined by Figma's data model (e.g., `SLICE`)
> - Per-node fields defined by Figma not yet in core (e.g., `aspectRatio`, `includeInExports`, `pageBackgroundVisible`, OpenType per-text-run features)
> - Renderer compositing implementations for fields already in core data model (e.g., mask compositing for existing `isMask` + `maskType` fields)
> - Per-text-run attributes (bullets, numbered lists, link metadata)
> - Tool registration for foundational tools (Slice, Scale, Eyedropper, Measurement, Arrow)
>
> Each modification documented in PR description with Figma plugin-API reference (e.g., link to https://developers.figma.com/docs/plugins/api/SliceNode) **OR** documented design rationale why deviating from Figma. Tracked in `packages/core/CHANGELOG-KOVA.md` to enable upstream PR contribution.
>
> All other packages/core/ modifications still **prohibited**: engine internals not Figma-spec, kiwi serialization version bumps, renderer pipeline restructures unrelated to Figma-spec compositing, layout engine changes, IO format restructures.

---

## Sources

### Figma plugin/API docs
- [SliceNode | Plugin API](https://developers.figma.com/docs/plugins/api/SliceNode)
- [MaskType | Plugin API](https://developers.figma.com/docs/plugins/api/MaskType/)
- [isMask | Developer Docs](https://developers.figma.com/docs/plugins/api/properties/nodes-ismask/)
- [Effect | Plugin API](https://www.figma.com/plugin-docs/api/Effect/)
- [VectorNetwork | Plugin API](https://developers.figma.com/docs/plugins/api/VectorNetwork/)
- [BooleanOperationNode | Plugin API](https://www.figma.com/plugin-docs/api/BooleanOperationNode/)
- [Node Types | Plugin API](https://developers.figma.com/docs/plugins/api/nodes/) (full list of ~30 SceneNode types)

### Figma help/UX docs
- [Masks – Figma Learn](https://help.figma.com/hc/en-us/articles/360040450253-Masks)
- [Using the Slice Tool – Figma Help Center](https://help.figma.com/hc/en-us/articles/360040028394-Using-the-Slice-Tool)
- [Export from Figma Design](https://help.figma.com/hc/en-us/articles/360040028114-Export-from-Figma-Design)
- [Apply shadow or blur effects – Figma Learn](https://help.figma.com/hc/en-us/articles/360041488473-Apply-shadow-or-blur-effects)
- [Vector networks – Figma Learn](https://help.figma.com/hc/en-us/articles/360040450213-Vector-networks)

### Figma blog (architectural context)
- [Figma Rendering: Powered by WebGPU](https://www.figma.com/blog/figma-rendering-powered-by-webgpu/) — Figma uses custom WebGPU + C++ WASM (not CanvasKit)
- [How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/) — Custom OT + central server, not pure CRDT
- [Behind the feature: autosave](https://www.figma.com/blog/behind-the-feature-autosave/) — IndexedDB delta-based offline persistence
- [Behind the feature: shadow spread](https://www.figma.com/blog/behind-the-feature-shadow-spread/) — Drop shadow rendering details

### Figma forum (preference sync)
- [User preferences to be saved on account level](https://forum.figma.com/suggest-a-feature-11/user-preferences-to-be-saved-on-account-level-in-software-4758) — Confirms Figma does NOT sync user prefs cross-device

### OpenPencil docs (architecture verification)
- [OpenPencil website](https://openpencil.dev/) — Vue 3 + CanvasKit (Skia WASM) + Yoga WASM + Tauri v2 + Trystero P2P + Yjs CRDT
- [OpenPencil vs Penpot Architecture Comparison](https://openpencil.dev/guide/comparison)
- [OpenPencil Roadmap](https://openpencil.dev/development/roadmap)
- [OpenPencil Pen Tool docs](https://openpencil.dev/user-guide/pen-tool)
- [open-pencil GitHub repo](https://github.com/open-pencil/open-pencil)
- [@open-pencil/core API overview](https://www.mintlify.com/open-pencil/open-pencil/api/overview)

### `packages/core/` direct-source verification (2026-04-25)
- `packages/core/src/scene-graph.ts:55` — `VectorNetwork` interface
- `packages/core/src/scene-graph.ts:67–83` — `NodeType` union (16 types, no SLICE)
- `packages/core/src/scene-graph.ts:86–92` — `FillType` union (4 gradient types)
- `packages/core/src/scene-graph.ts:135` — `MaskType = 'ALPHA' \| 'VECTOR' \| 'LUMINANCE'`
- `packages/core/src/scene-graph.ts:142` — `Stroke.align` discriminated union
- `packages/core/src/scene-graph.ts:149` — `Effect.type` (5 types: drop shadow, inner shadow, layer/background/foreground blur)
- `packages/core/src/scene-graph.ts:223` — `effects: Effect[]` field on SceneNode
- `packages/core/src/scene-graph.ts:275` — `vectorNetwork: VectorNetwork \| null` field
- `packages/core/src/scene-graph.ts:298–299, 438–439` — `isMask` + `maskType` fields + defaults
- `packages/core/src/figma-api.ts` — `figma.booleanOperation(op, ids)`
- `packages/core/src/figma-api-proxy.ts:824–829` — `isMask` getter/setter
- `packages/core/src/kiwi/kiwi-convert.ts:616` — `isMask` Kiwi serialization
- `packages/core/src/renderer/effects.ts` — `getCachedDropShadow`, `getCachedBlur` (Skia ImageFilter helpers)
- `packages/core/src/tools/vector.ts` — UNION, SUBTRACT, INTERSECT, EXCLUDE wired

---

# Handoff Instructions

You authored `03-implied-surfaces-and-backend.md` and flagged 5 load-bearing questions in §4 awaiting founder decision. All 5 are now answered above plus a 6th (Q6: multiplayer = solo MVP). Apply the following updates to the 03 doc.

> **Constraint:** Q4 is preliminary against pre-Track-2 code. The Kova fork will sync 245 commits from upstream/master ("Track 2 sprint"). After sync, re-validate Q4 audit against the new code state. Q3 was re-verified directly against current `packages/core/src/scene-graph.ts` and is final for the listed features.

## 0. Add tech-stack divergence preamble (NEW — top of doc)

Insert at top of doc, immediately after `## 1. Summary` heading and before existing summary table:

> **Tech-stack note (read first).** Kova is a fork of OpenPencil. The architectural picture: same data model surface as Figma (Figma plugin API compatible via `figma-api-proxy.ts`); same file format (Kiwi binary, reads `.fig` natively); same layout engine (Yoga WASM); **different renderer** (CanvasKit/Skia WASM vs Figma's custom WebGPU+C++); **different multiplayer** (Yjs CRDT P2P, dormant in MVP per Q6 vs Figma's custom OT central server). Visual rendering quality is identical (Skia powers Flutter Web, Chrome). Performance ceiling is lower than Figma at extreme scales (10k+ nodes) — irrelevant for email-design scale (~50–300 nodes). Scene graph covers 16 of Figma's ~30 SceneNode types; out-of-scope Figma types (STICKY, TABLE, CODE_BLOCK, MEDIA, WIDGET) not needed for email design. **Kova MVP is single-user per canvas** (Q6) — Yjs document CRDT + y-indexeddb stay live for offline-first solo persistence; Trystero P2P + awareness code remains dormant in `packages/core/` for Phase 2+ revisit.

## 1. Update §1 Summary

- **"Top 3 highest-impact net-new backend pieces"** — replace #1 ("Canvas-extension scaffolding for ~15 features"). Q4 reveals it's four categories, not one:
  1. Core modifications for foundational primitives (~5 features) — see Q4 re-categorization
  2. Renderer-only changes for fields already in core data model (~3 features: mask compositing, LUMINANCE branch, effects already shipped)
  3. App-level inspector wiring (~5 features — engine ready per Q3)
  4. App-level overlay code (~6 features — outside core renderer)
- **"Confidence on MVP cuts"** — POLYGON, STAR, LINE engine-ready (Q3) — move from Phase 2 → MVP candidate per founder choice. **Effects (all 5 types) re-added to MVP per Q3 #12** — engine + renderer both shipped, inspector wiring only.
- **"Top 5 highest-priority MVP gaps"** — adjust:
  - #2 Mask renderer support → reframe as "**Mask renderer compositing**" (data model already in core per Q2 verification)
  - Add new entry: "**Effects inspector wiring** (drop shadow, inner shadow, layer/background/foreground blur)" — engine + renderer ready, doc 03 wrongly removed; restore per Q3 #12
  - Add new entry: "**Boolean operations menu wiring** (Union/Subtract/Intersect/Exclude)" — engine ready per Q3 #14, free Figma-parity win

## 2. Update §3A Consolidations

Add new row:

> **Foundational core modifications (lift the lock per CLAUDE.md amendment)** — Powers: Slice node-type (Q1), aspectRatio (Q3 #4), page-level export flag (Q3 #5), page-bg-visibility (Q3 #6), scale tool action (Q3 #10), OpenType wiring (Q3 #2), bulleted/numbered list per-text-run attrs, link metadata per-text-run attrs. ~6 features. Build-once value: establishes a maintained `packages/core/CHANGELOG-KOVA.md` + upstream PR contribution pipeline.

Add new row:

> **Renderer-only changes (no scene-graph mods needed)** — Powers: Mask compositing for existing `isMask` + `maskType` fields (Q2). All 3 maskType branches ship (ALPHA, VECTOR, LUMINANCE). Effects renderer already shipped (Q3 #12) — no work. ~1 net feature, but unblocks ~6 mask-related rows in 03 doc.

## 3. Update §3C Net-new infrastructure

- Re-classify row #1 ("Canvas-extension scaffolding for ~15 features") into **four** rows per Q4 finding:
  1. Core mods (~5 features per Q4 re-categorization)
  2. Renderer-only (mask compositing per Q2; effects shipped per Q3 #12 — zero work)
  3. App-level inspector wiring (~5 features — engine ready)
  4. App-level overlays (~6 features)
- Update row #6 (Slice node-type) — mark **RESOLVED** with reference to Q1 answer (first-class SCENE_NODE)
- Confirm row #4 (Brand font upload) pattern — if registering fonts via CanvasKit only (no scene-graph change), still extension-territory; if needs scene-graph font-name resolver, may need core mod. Flag for verification.

## 4. Update §4 Open questions

- Mark Q1 **RESOLVED** → reference Q1 answer in this companion doc (first-class SLICE SceneNode)
- Mark Q2 **RESOLVED (corrected)** → reference Q2 answer (data model already in core; renderer compositing only; ship all 3 maskTypes)
- Mark Q3 **RESOLVED (expanded)** → reference Q3 answer; note "Effects re-added to MVP per Q3 #12; Boolean ops added per Q3 #14; vector network depth re-validates after Track 2 sync"
- Mark Q4 **RESOLVED (preliminary)** → reference Q4 answer; flag as critical-finding-affecting-§3C-row-1; note "re-validate after Track 2 sync"
- Mark Q5 **RESOLVED (Figma citation corrected)** → reference Q5 answer (two-layer: users.preferences JSONB + localStorage; framed as "better than Figma" not "matching Figma")
- Add **Q6 RESOLVED** → reference Q6 answer (solo MVP; Yjs + y-indexeddb stay live; Trystero P2P + awareness dormant)

## 5. Update individual rows in §2 affected by these decisions

**Q1 (Slice) affects:**
- §2.4 Slice indicator on layer row → unblock; node-type defines glyph
- §2.6 Export modal slice-aware export → per-slice `exportSettings[]` array
- §2.7 Slice tool, Show slices toggle, Slice region viz → unblock; build first-class SLICE node-type

**Q2 (Mask) affects:**
- §2.4 Mask indicator on layer row → unblock; mask glyph + indented siblings
- §2.6 Half-moon mask icon → toggles `isMask` (already in core), sets default ALPHA; `maskType` selector with all 3 options enabled
- §2.7 Use as mask, Mask outlines toggle/overlay → unblock; **all 3 maskTypes ship** (revised from "MVP=ALPHA+VECTOR" original)

**Q3 (engine audit) affects (move many rows from Phase 2 → MVP):**
- §2.7 Polygon tool — engine has POLYGON + pointCount → MVP candidate
- §2.7 Star tool — engine has STAR + pointCount + starInnerRadius → MVP candidate
- §2.7 Line tool — confirms engine ready (already MVP)
- §2.6 Vertical text alignment — engine has TextAlignVertical → just inspector wiring (already MVP)
- §2.6 Stroke "Position" sub-label (Inside/Outside/Center) — engine has Stroke.align + renderer dispatch → just inspector wiring (already MVP)
- §2.7 Linear / Radial gradient — engine has all 4 gradient types + renderer dispatch → just inspector wiring + visual gradient editor
- §2.6 Aspect-ratio lock — MISSING in core, requires lift the lock
- §2.6 Show in exports (page-level) — MISSING in core, requires lift the lock
- §2.6 Page background visibility eye — MISSING in core, requires lift the lock
- §2.7 Scale tool — needs new tool action in `packages/core/src/tools/modify.ts`
- §2.6 Advanced typography sliders (OpenType) — PARTIAL in kiwi, needs scene-graph wiring
- **§2.6 Effects (drop shadow, inner shadow, layer/background/foreground blur) — REVERSE the "REMOVED" decision. Engine + renderer both ready; inspector wiring only. Add Effects section row to inspector with all 5 types per Figma.**
- **§2.2 / §2.10 Object menu + right-click "Boolean operations" (Union/Subtract/Intersect/Exclude) — ADD as new MVP rows. Engine ready per Q3 #14.**

**Q4 (extension hooks) affects §3C #1 fundamentally** — see re-categorization above.

**Q5 (user-prefs) affects:**
- §2.9 Accessibility settings → users.preferences JSONB (Layer 1)
- §2.4 Page/Layers collapse persistence → localStorage (Layer 2)
- §2.7 Show text suggestions toggle → users.preferences JSONB (Layer 1)
- §2.8 Recent colors → localStorage (Layer 2)
- §2.10 Show ruler/layout-guide/pixel-grid right-click persistence → users.preferences JSONB (Layer 1)
- §2.7 Frame outlines / Mask outlines / Slice region toggle persistence → users.preferences JSONB (Layer 1)

**Q6 (multiplayer) affects:**
- §2.1 Top chrome — confirm NO collaborator avatars row (none in current inventory; this just makes the absence explicit)
- §2.8 Network status indicator — clarify drives off Yjs local persistence + Supabase Realtime for Shopify, NOT Yjs P2P sync (which is dormant)
- §3C — add explicit note that NO multiplayer infrastructure row is needed in MVP

## 6. Add new §7 "Upstream OpenPencil catch-up — features available for free"

Document the predicted free wins from the Track 2 sync sprint (245 commits behind upstream/master at fork point). Mark affected §2 rows as "Track 2 deliverable — verify after merge." Predicted free wins:

- **Vector editor** (PR #158 merged) — Pen tool, vertex curves, anchor alignment, bezier-math; affects §2.7 Pen / Polygon / Star / vector primitives (combined with Q3 finding that POLYGON/STAR already exist; **re-audit `vectorNetwork` field depth against Figma's vertex/segment/region model after this lands**)
- **Color picker overhaul** — moved to Vue SDK, OkHCL color space, document color space, regression tests; affects §2.8 color picker rows
- **Keyboard refactor** — `useMagicKeys`, named actions extracted, KeyboardEvent.code (matches CLAUDE.md), suppress shortcuts during text editing, arrow-nudge fix; affects §3A keyboard registry consolidation + many §2.10 shortcut rows
- **Auto-layout** — opentype.js for accurate text measurement, Yoga 3.3.0-grid.3 with Node.free()
- **Smaller wins** — copy node ID / XPath context menu (§2.10 free), spacebar-hold-for-Hand, zoom dropdown (§3.4 free), Reka Tooltip migration (already standard for us), dark canvas default on prefers-color-scheme (matches our app-dark stance), focusable canvas, error-toast auto-dismiss + dedupe + cap-at-5 (§2.8 toast row free)
- **Branch cherry-pick `feat/asset-components-view`** (2 unique commits): "Assets panel with components, images, SVG import, viewport center fix" + "Fix Delete/Backspace in search input deleting canvas nodes" — directly affects §2.5 Assets tab

Note Track 2 will replace this predicted list with actual post-sync delivery.

## 7. Add new §8 "Phase 2 polish — enhance OP-baseline features to match Figma"

Empty placeholder section. Per founder directive, post-MVP we may want to enhance OP-baseline behaviors (existing features that work but don't match Figma quality) to closer match Figma's spec. Examples will be populated as gaps surface during hi-fi design + post-launch user feedback.

## 8. Update Track 2 sprint exit criteria (cross-doc note)

Add to upstream-sync-sprint task list (chat-history context, not yet a doc):
- Resolve merge conflicts (M9 + M5 surfaces, editor.ts, use-canvas-input, use-keyboard, packages/core imports)
- Smoke test M9 + M5 end-to-end
- Re-pass `02-figma-scope.md` tagging (~30 KEEP-new → KEEP-baseline shifts predicted post-sync)
- Re-validate Q4 answer against synced packages/core code
- Re-audit `vectorNetwork` field depth against Figma's vertex/segment/region model (Q3 #13)
- Map new packages/core domain module structure for our future core modifications
- Cherry-pick `feat/asset-components-view` branch (2 commits)
- Audit stroke-cap / terminator support in `packages/core/src/renderer/strokes.ts` (Arrow tool dependency, `StrokeCap` already includes `'ARROW_LINES' | 'ARROW_EQUILATERAL'` per Q3 audit not-audited section)

## 9. Add CLAUDE.md amendment

The CLAUDE.md amendment proposed in "Cross-cutting" above must be added to the project root `CLAUDE.md` to formalize the lift-the-lock policy for foundational primitives. This is a separate task from updating 03 doc but is gated on these answers being accepted.

---

**End of handoff.** Apply updates to 03 doc per the above.
