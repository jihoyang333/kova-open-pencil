# W7 — Cluster 07a Canvas Engine Core + Renderer — DONE

**Status:** ✅ Engine surface shipped
**Wave:** W7
**Branch:** `app/cluster-07a-engine`
**Merge base:** `feat/m9-shopify` @ `2dab4469`
**Date:** 2026-05-21
**Agent:** Claude Opus 4.7

---

## Summary

Cluster 07a lifts the `packages/core/` lock and adds the engine-side
foundation for the canvas inspector + overlays Cluster 07b will ship.
Engine surface is invisible to end users per PRD 07a §3; visual evidence
renders in 07b.

13 commits on `app/cluster-07a-engine`. All Plan tasks (1, 1b, 2-13, F)
have a one-per-task commit. Two follow-ups deferred (mask-compositing perf
benchmark + `node:errored` event surface) — tracked in CHANGELOG-KOVA.md.

---

## What shipped

### Plan tasks completed

| Task | Commit | Tests |
|---|---|---|
| 1 — SLICE NodeType | `f152f79a` | 5 |
| 1b — Page-level Measurement system | `c21b873e` | 17 |
| 2 — aspectRatio + includeInExports + pageBackgroundVisible | `b3efa4a8` | 5 |
| 3 — CharacterStyleOverride extensions | `ae3d0c59` | 5 |
| 4 — scaleNode modify tool | `8e4be90f` | 11 |
| 7 — figma-api-proxy exposure (run before Task 5) | `b2a2954d` | 13 |
| 5 — createSlice refactor + addMeasurement tool + arrowStub | `4d3e4300` | 8 |
| 6 — Tool registry extensions | `fecea162` | 6 |
| 8 — FORMAT_VERSION 2.0.0 + KIWI_SCHEMA_VERSION lockstep | `5d59018f` | 3 |
| 9 — Sibling-traversal mask compositing | `b58291cd` | 5 |
| 10 — CLAUDE.md lift-the-lock amendment | outer-repo `719e7ac` | n/a |
| 11 — CHANGELOG-KOVA.md initial entry | `56c91677` | 4 |
| 12 — Engine-host integration tests | `441d6de5` | 7 |
| 13 — Programmatic engine smoke | `448d069e` | 1 |

Total new tests: **90 across 12 files** (all green).
Full suite: **1669 pass / 99 skip / 0 fail / 1768 tests across 129 files**.

### Engine surface changes (`packages/core/src/`)

- `scene-graph.ts` — SLICE NodeType added; new types
  `MeasurementSide` / `MeasurementOffset` / `MeasurementAnchor` / `Measurement`
  + lifecycle event payload types; new SceneNode fields `aspectRatio` /
  `includeInExports` / `pageBackgroundVisible` / `measurements?`;
  CharacterStyleOverride `openTypeFeatures` + `linkHref` + `listType` +
  `listIndent`; `ListType` exported; 5 SceneGraph measurement methods
  matching Figma's PageNode API verbatim; `isContainerType(type)` helper;
  SLICE leaf-node reparent rejection in `reparentNode`; orphan-on-anchor-delete
  + drop-on-cross-canvas-move semantics with `measurement:broken` /
  `measurement:dropped` events.
- `figma-api.ts` — `FigmaAPI.createSlice()` factory.
- `figma-api-proxy.ts` — `FigmaNodeProxy` extended with `aspectRatio` /
  `includeInExports` / `pageBackgroundVisible` getter+setter, `scale(factor)`
  delegating to `scaleNodeRecursive`, and 5 measurement methods that
  bridge the proxy ↔ SceneGraph API.
- `tools/modify.ts` — `scaleNode` ToolDef + exported `scaleNodeRecursive`.
- `tools/create.ts` — `createSlice` refactored from FRAME stub to SLICE
  NodeType creator; `arrowStub` Phase-2 no-op added.
- `tools/measurement.ts` (NEW) — `addMeasurement` ToolDef (page-level
  wrapper; calls `figma.graph.addMeasurement` — NOT a NodeType creator).
- `tools/registry.ts` — `scaleNode` + `addMeasurement` + `arrowStub`
  registered in `EXTENDED_TOOLS`.
- `renderer/scene.ts` — `renderChildren` refactored for sibling-traversal
  mask compositing for ALPHA + VECTOR + LUMINANCE; `blendModeForMaskType`
  helper.
- `renderer/renderer.ts` — `maskOuterPaint` + `maskCompositePaint`
  Paint objects + delete cleanup.
- `kiwi/protocol.ts` — `FORMAT_VERSION` + `KIWI_SCHEMA_VERSION` constants
  at `2.0.0` (lockstep coordination for Cluster 09 snapshot migrations
  per C-LOW07a.3).
- `kiwi-serialize.ts` — `mapToFigmaType` handles SLICE explicitly.

### Docs

- `packages/core/CHANGELOG-KOVA.md` (NEW) — Cluster 07a lift-the-lock
  entry with per-change upstream-PR status.
- Outer-repo `/Users/jihoyang/kova-main/CLAUDE.md` — Lift-the-lock policy
  paragraph appended to the `### Never modify` subsection (commit
  `719e7ac` on outer branch `app/cluster-11-redo`).

---

## Quality gates (Task F)

| Gate | Result |
|---|---|
| `bun run test:unit` | ✅ 1669 pass / 99 skip / 0 fail / 1768 tests |
| `bun run check` | ✅ 0 warnings, 0 errors |
| `bun run test:dupes` | ✅ 1.18% (threshold < 3%) |
| Grep guard: `console.log` in core diff | ✅ none |
| Grep guard: `Math.random` in diff | ✅ none |
| Grep guard: `: any` introduced in core diff | ✅ none |
| `packages/core/` scope discipline | ✅ changes only in declared files |

---

## Deferred (tracked in CHANGELOG-KOVA.md)

| Item | Why |
|---|---|
| Mask-compositing perf benchmark (Plan §9.13, C-LOW07a.2) | Requires `bun run test:bench` script + bun:test benchmark API + browser-like canvas instantiation; out-of-scope for engine surface shipping |
| `node:errored` renderer event surface (Plan §9.14, C-LOW07a.4) | Subscriber lives in Cluster 11 `<ToastStack>`; requires renderer-side try/catch in `renderNode` + invariant guards in `appendChild` / `reparentNode` / leaf checks. Best paired with 07b's overlay error paths. |
| Full Kova-side Kiwi struct rewrite for Measurement records (Plan §Task 8 Step 8.6) | Kova snapshots travel via Yjs CRDT, not raw kiwi bytes. Struct expansion lands when Cluster 09 ships its snapshot codec. |
| Playwright E2E spec (Plan §Task 13) | Requires `/dev/cluster-07a` fixture route + Yjs-seeded scene-graph payload that lands in Cluster 09's snapshot codec. Engine smoke runs programmatically in the interim. |

---

## Follow-up handoffs

- **Cluster 09 (W12a):** Plan 09 must add a `snapshot-migration-registry.ts`
  task with a `'1.0.0' → '2.0.0'` entry. PR title SHOULD include
  `(coord: Cluster 07a FORMAT_VERSION 2.0.0)` per C-LOW07a.3 contract.
- **Cluster 11 hardening:** Subscribe `<ToastStack>` to engine
  `measurement:broken` / `measurement:dropped` events once a UI surface
  for surfacing them is decided in 07b.
- **Cluster 07b:** Inspector wiring consumes all new fields + 5
  measurement methods + KovaIcon-rendered mask outline corner glyphs.

---

## Founder hand-off

Founder: review report + merge `app/cluster-07a-engine` into
`feat/m9-shopify` with `--no-ff` after browser smoke-test of the dev
canvas (verify no regressions in existing OpenPencil canvas baseline).
