# Kova modifications to `packages/core/`

Kova maintains a fork of OpenPencil's `packages/core/`. The hard-lock policy
in CLAUDE.md prohibits modifying core; the lift-the-lock amendment ratified
in `docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md §895` permits
Kova-side mods provided they are listed here and prepped for upstream PR
contribution to OpenPencil.

Each entry: date, change summary, affected file(s), upstream-PR status.

**Statuses**

- `drafted` — Kova-side branch ready; PR not yet submitted upstream.
- `submitted` — PR open against `open-pencil/main`; reviewer feedback pending.
- `merged` — accepted into upstream main.
- `declined` — upstream rejected; Kova-side stays as a permanent fork delta.
- `held` — drafted but submission gated on a Kova-internal dependency.

---

## 2026-05-21 — Cluster 07a Canvas Engine Core + Renderer (PRD 07a)

**Author:** Kova engineering · **Reviewer:** Jiho Yang
**Branch:** `app/cluster-07a-engine`

| Change | File(s) | Upstream-PR |
|---|---|---|
| Add SLICE NodeType to `NodeType` union; default factory; leaf-node reparent rejection; `isContainerType` helper exposes existing `CONTAINER_TYPES` set | `src/scene-graph.ts` | drafted |
| Add page-level Measurement system on CANVAS — new types (`Measurement`, `MeasurementSide`, `MeasurementOffset`, `MeasurementAnchor`); `SceneNode.measurements?` field; 5 `SceneGraph` methods matching Figma's `PageNode` API (`addMeasurement`, `getMeasurements`, `getMeasurementsForNode`, `editMeasurement`, `deleteMeasurement`); orphan-on-anchor-delete + drop-on-cross-canvas-move lifecycle (`measurement:created` / `:updated` / `:deleted` / `:broken` / `:dropped`) | `src/scene-graph.ts` | drafted (separate PR — verbatim port of Figma's PageNode measurement API; high upstream value because it implements an existing Figma standard) |
| Add `aspectRatio` (number \| null), `includeInExports` (boolean), `pageBackgroundVisible` (boolean) fields on `SceneNode`; default `null` / `true` / `true` | `src/scene-graph.ts` | drafted (single PR — small change set) |
| Extend `CharacterStyleOverride` with `openTypeFeatures` + `linkHref` + `listType` + `listIndent`; export `ListType` | `src/scene-graph.ts` | drafted (single PR) |
| Add `scaleNode` modify tool — recursive geometry scale matching Figma's K-tool semantics; scales width, height, font-size, corner radii, per-side stroke weights, effect radius/offset/spread; preserves position + rotation | `src/tools/modify.ts`, `src/tools/registry.ts` | drafted |
| Refactor `createSlice` from Frame-stub fabrication to a true SLICE NodeType creator via `figma.createSlice()` | `src/tools/create.ts`, `src/tools/registry.ts` | drafted |
| Add `addMeasurement` ToolDef (page-level wrapper — calls `figma.graph.addMeasurement`; NOT a NodeType creator per the 2026-05-17 Figma-aligned data-model ratification) | `src/tools/measurement.ts` (NEW), `src/tools/registry.ts` | drafted |
| Add `arrowStub` export (Phase-2-deferred no-op; not registered in `EXTENDED_TOOLS` until the arrow primitive ships, so the AI never picks it; export re-emitted from registry for the future activation path) | `src/tools/create.ts`, `src/tools/registry.ts` | held — submit after arrow primitive ships |
| Sibling-traversal mask compositing in `renderChildren` — all 3 maskType branches (ALPHA, VECTOR, LUMINANCE); each mask sibling opens a `saveLayer` pair with `BlendMode.SrcIn` / `BlendMode.Luminosity`; scope closes at next mask sibling, end of `childIds`, or container edge (when nested inside `clipsContent`); reuses existing `CanvasKit.Paint` initialisation pattern | `src/renderer/scene.ts`, `src/renderer/renderer.ts` | drafted (highest-value upstream contribution — data model was already in place) |
| Expose `FORMAT_VERSION = '2.0.0'` + `KIWI_SCHEMA_VERSION = '2.0.0'` lockstep constants; `mapToFigmaType` maps SLICE explicitly | `src/kiwi/protocol.ts`, `src/kiwi-serialize.ts` | drafted |
| `figma-api-proxy` exposure — `figma.createSlice()` factory; 5 page-level measurement methods on the current-page proxy (`addMeasurement` / `getMeasurements` / `getMeasurementsForNode` / `editMeasurement` / `deleteMeasurement`); `aspectRatio` / `includeInExports` / `pageBackgroundVisible` getter+setter; `FigmaNodeProxy.scale(factor)` delegating to the shared `scaleNodeRecursive` helper | `src/figma-api.ts`, `src/figma-api-proxy.ts`, `src/tools/modify.ts` | drafted |

### Cluster 07a deferred follow-ups (tracked, not blockers)

| Item | Notes |
|---|---|
| Mask-compositing perf benchmark (C-LOW07a.2) | Plan §Step 9.13. 100/200/300 masked nodes < 16ms budget. Add `tests/bench/mask-compositing.bench.ts` + wire into `bun run test:bench`. |
| `node:errored` event surface (C-LOW07a.4) | Plan §Step 9.14. Renderer-side catch-and-emit; subscriber in Cluster 11 `<ToastStack>`. Engine emit + invariant-guard tests. |
| Full Kova-side Kiwi struct rewrite for Measurement records | Plan §Task 8 Step 8.6. Snapshot snapshots currently travel via Yjs CRDT, not raw kiwi bytes; struct expansion lands when Cluster 09 ships its snapshot codec. |
| `getMeasurementsForNode` anchor-node index (W7 audit MED-6) | Current implementation iterates `this.nodes.values()` per call (O(canvases × measurements)). MVP scale is fine; flag for a `measurementsByAnchorNode: Map<string, Set<string>>` lookup index when measurement counts grow. Maintenance points: `addMeasurement` / `editMeasurement` (no-op — anchor ids immutable) / `deleteMeasurement` / canvas delete / cross-canvas-reparent drop / node delete. |

### Upstream-PR submission cadence

PRs are drafted on a Kova-internal fork branch during implementation. After
PRD 07a's status flips to `SHIPPED` (Cluster 07a ships into production),
each `drafted` row is submitted upstream within 14 days. The CHANGELOG row
status flips as upstream review progresses. Submission posture: small,
focused PRs — one PR per change row above, sequenced to avoid merge
conflicts.

If upstream declines any PR, Kova-side stays as a permanent fork delta. No
engineering blocker — the lock is already lifted on the Kova side; the
divergence becomes permanent.

### Post-audit hardening (2026-05-21, W7 audit follow-up)

Cluster 07a passed the W7 audit (verdict: PASS WITH WARNINGS) with 3 HIGH
findings + 3 MEDIUM + 5 LOW. All 11 findings were patched on
`app/cluster-07a-engine` before merging into `feat/m9-shopify`. Summary:

| Finding | Fix |
|---|---|
| HIGH-1 — cross-canvas reparent missed descendants | `reparentNode` now collects the full subtree (DFS into a `Set<string>` via `collectSubtreeIds`) and filters source-canvas measurements on `Set.has`. 2 new tests in `tests/engine/cluster-07a/measurement-system.test.ts` cover direct + deep descendant drops. |
| HIGH-2 — `addMeasurement` missing Figma same-axis pair guard | `addMeasurement` throws when `start.side` and `end.side` straddle horizontal vs vertical. 4 new tests cover both mixed-axis rejection and same-axis acceptance. |
| HIGH-3 — SLICE leaf invariant missing from `createNode` | Symmetric SLICE-parent guard added at the top of `createNode`; matches the existing reparent-side rejection. 1 new test in `tests/engine/cluster-07a/node-types.test.ts`. |
| MED-4 — definite-assignment `!:` on new Paint fields | Stripped `!:` from `maskOuterPaint` + `maskCompositePaint` declarations; they are initialised in the constructor alongside every other Paint field, matching the file's existing pattern. |
| MED-5 — `FigmaNodeProxy.scale` double `as unknown as` cast | Refactored `scaleNodeRecursive` to accept `SceneGraph` directly. Proxy passes `this[INTERNAL_GRAPH]` with no cast; tool wrapper passes `figma.graph`. |
| MED-6 — O(n) `getMeasurementsForNode` | Acknowledged + tracked above ("Deferred follow-ups"). Audit-classified as not a ship blocker at MVP measurement scale. |
| LOW-7 — postfix `!` on `canvas.measurements[idx]` | Removed; indexed access into `Measurement[]` without `noUncheckedIndexedAccess` is already typed `Measurement`. |
| LOW-8 — `as MeasurementSide` cast in tools/measurement.ts | Boundary documented inline (AI-adapter enum enforcement). |
| LOW-9 — `arrowStub` registered in EXTENDED_TOOLS | Removed from `EXTENDED_TOOLS`; re-exported separately so it stays reachable for tests + Phase-2 activation. The AI never sees a held tool. |
| LOW-10 — `generateMeasurementId` ID format vs node-id convention | Distinct namespace documented inline (measurement records are CANVAS-scoped, not nodes; 16-hex ID intentionally avoids node-id `^\d+:\d+$` regex matchers). |
| LOW-11 — DONE report file count | Fixed in `docs/execution-phase/cluster-reports/W7-cluster-07a-DONE.md` (12 → 13). |

Net test delta from hardening: +8 cluster tests (`bun test tests/engine/cluster-07a` → 98 pass / 0 fail across 13 files; full suite 1677 pass / 99 skip / 0 fail).
