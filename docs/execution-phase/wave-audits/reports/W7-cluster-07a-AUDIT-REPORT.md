# W7 — Cluster 07a AUDIT REPORT

**Date:** 2026-05-21
**Auditor:** Claude Opus 4.7 (independent reviewer)
**Branch under audit:** `app/cluster-07a-engine` @ `688aac07`
**Effective base (W6 merge above feat/m9-shopify):** `2dab4469`
**`origin/feat/m9-shopify` head:** `4befc25b` (W6 not yet merged into the remote feat/m9-shopify; the audit uses the W6 merge commit `2dab4469` as the effective 07a baseline because the cluster branch was cut from there)
**Verdict:** ⚠️ PASS WITH WARNINGS

## Summary

Cluster 07a ships the canvas engine extensions required by PRD 07a — SLICE NodeType, page-level Measurement system, three new SceneNode fields, CharacterStyleOverride extensions, `scaleNode` modify tool, sibling-traversal mask compositing for ALPHA + VECTOR + LUMINANCE, FORMAT_VERSION + KIWI_SCHEMA_VERSION lockstep at 2.0.0, and figma-api-proxy exposure. 14 commits, one per Plan task, no merge commits. All declared file changes fall inside the audit-allowed scope; no forbidden directories touched. Quality gates re-run green: 1669 pass / 99 skip / 0 fail, `bun run check` clean, dupes 1.18%, `bun run build` exit 0. 90/90 cluster tests pass. CHANGELOG-KOVA.md is exemplary — every change row carries an upstream-PR status, deferred items are tracked with reasons, and the 14-day post-SHIPPED submission cadence is documented.

Three HIGH findings concern Figma API parity / data-integrity gaps that should be patched before this branch merges into feat/m9-shopify: cross-canvas reparent does not drop measurements anchored to **descendants** of the moved node (only the moved node itself); `addMeasurement` does not enforce Figma's same-axis pair constraint; SLICE leaf-parent guard exists on `reparentNode` but not on `createNode`. None require rebuild — small targeted patches. Cluster is otherwise spec-clean and ships its declared surface.

## Findings

### CRITICAL
- none

### HIGH

1. **Cross-canvas REPARENT does not drop measurements anchored to descendants of the moved node** — `packages/core/src/scene-graph.ts:962-983`. Inline comment says "or any of its descendants" but the filter `m.start.nodeId === nodeId || m.end.nodeId === nodeId` only matches the moved node itself. Reparenting a GROUP / FRAME / SECTION cross-canvas leaves measurements on the source canvas anchored to nodes that have physically moved to a different canvas — exactly the dangling-reference state the orphan-on-anchor-delete semantic was designed to prevent. The `deleteNode` path (`:1041-1089`) handles this correctly via recursive `deleteNode(childId)` (each frame in the recursion emits its own `measurement:broken`), so reparent should follow the same recursive-descent pattern or collect a `Set` of descendant IDs once and `filter` on `Set.has`. Test coverage gap: `tests/engine/cluster-07a/measurement-system.test.ts` only covers direct-anchor cross-canvas reparent; no test moves a parent whose child is the measurement anchor.

2. **`addMeasurement` does not enforce Figma's same-axis pair constraint** — `packages/core/src/scene-graph.ts:773-799`. Per `developers.figma.com/docs/plugins/api/Measurement/`: "A Measurement only adds annotation to one axis. So make sure `start.side` and `end.side` are either both `LEFT`/`RIGHT` or both `TOP`/`BOTTOM`." Kova accepts `start='RIGHT', end='TOP'` (mixed-axis) without validation. The CHANGELOG-KOVA notes this method ships as "verbatim port of Figma's PageNode measurement API" — the same-axis check is part of that verbatim contract. Upstream PR will be declined for spec divergence if the gap remains. Add a guard: if `(start.side === 'LEFT' || start.side === 'RIGHT') !== (end.side === 'LEFT' || end.side === 'RIGHT')` then throw.

3. **SLICE leaf invariant not enforced on `createNode`** — `packages/core/src/scene-graph.ts:895-916`. `reparentNode` rejects reparent into SLICE (`:955-957`), but `createNode('RECTANGLE', sliceId)` succeeds silently and appends to `slice.childIds` (`:902`). Any tool that bypasses the reparent path — including `figma.createRectangle()` proxies that pass `parentId` directly — can corrupt the leaf invariant. Defense-in-depth fix: add the same `SLICE` parent-type guard at the top of `createNode`. Tests only cover the `reparent` path, not `createNode`.

### MEDIUM

4. **Definite-assignment `!:` on new Paint fields inconsistent with sibling pattern** — `packages/core/src/renderer/renderer.ts:179-180`. `maskOuterPaint!: Paint` and `maskCompositePaint!: Paint` use TS definite-assignment `!:` while every other Paint field on the same class declares `Paint` without `!` (`:169-177`, `:204-212`). Both new paints are initialised in the `init()` block alongside the others, so the bare `Paint` declaration would compile. CLAUDE.md bans the `!` non-null operator; the field-declaration `!:` is a related TS construct that this codebase otherwise avoids. Remove both `!` postfixes to stay consistent with the rest of the file.

5. **`FigmaNodeProxy.scale` double `as unknown as` cast** — `packages/core/src/figma-api-proxy.ts` `scale` method. Casts via two consecutive `as unknown as` to thread `scaleNodeRecursive`'s parameter. The proxy holds `INTERNAL_API: NodeProxyHost` (which does not declare `.graph`), but the only concrete implementation is `FigmaAPI` (which does). Either narrow the proxy host type, or pass `SceneGraph` directly. Current form silently erases the structural mismatch and will rot if `scaleNodeRecursive`'s signature changes.

6. **`getMeasurementsForNode` is O(canvases × measurements)** — `packages/core/src/scene-graph.ts:807-818`. Loops every node in `this.nodes` for each call. Fine at MVP scale; flag for a `measurementsByAnchorNode: Map<string, Measurement[]>` index when measurement counts grow. Not a ship blocker.

### LOW

7. **`canvas.measurements[idx]!` postfix non-null assertion** — `packages/core/src/scene-graph.ts:831`. Bracketed-index access on a defined array followed by `!`. Index is guaranteed non-negative by the preceding `if (idx < 0) throw`. The `!` is harmless but technically a non-null assertion. Without `noUncheckedIndexedAccess` enabled in tsconfig the `!` is removable; with it enabled, prefer `canvas.measurements.at(idx) ?? throwInvariant()`.

8. **`as MeasurementSide` cast in `tools/measurement.ts`** — `packages/core/src/tools/measurement.ts:56-57`. `args.start_side` / `args.end_side` typed `string` from the tool-param inference are cast to the `MeasurementSide` literal union. Runtime safety relies on the AI-adapter layer enforcing the declared `enum: ['TOP','RIGHT','BOTTOM','LEFT']` constraint. Acceptable trust boundary — same pattern as every other string-enum tool param — but the boundary should be documented inline.

9. **`arrowStub` registered in `EXTENDED_TOOLS` while non-functional** — `packages/core/src/tools/create.ts:219-226` + `packages/core/src/tools/registry.ts:179`. Execute returns `{ error: 'Arrow primitive deferred to Phase 2' }`. AI may pick it and surface the error to the user. Either gate behind a feature flag, or filter `held` tools out of EXTENDED_TOOLS until Phase 2 ships. CHANGELOG correctly marks status `held`.

10. **`generateMeasurementId` uses 8 random bytes (16 hex chars)** — `packages/core/src/scene-graph.ts:758-762`. Collision probability fine for in-canvas use. Verify the format matches the rest of the system's node-id convention so Cluster 09 snapshot codec doesn't surprise on length-comparison or regex-matching paths.

11. **DONE report file-count off by one** — `docs/execution-phase/cluster-reports/W7-cluster-07a-DONE.md:46`. Claims "90 across 12 files." Actual: 90 across **13 files** (verified via `bun test tests/engine/cluster-07a`). Test count exact; file count one off. Trivial fix.

## Quality gates (re-run results)

| Gate | Re-run result | DONE report claim | Match? |
|---|---|---|---|
| `bun run test:unit` | 1669 pass / 99 skip / 0 fail / 1768 across 129 files | 1669 / 99 / 0 / 1768 | ✅ exact |
| `bun run check` | 0 warnings / 0 errors (exit 0) | 0 warnings / 0 errors | ✅ |
| `bun run test:dupes` | 1.18% (44 clones, threshold < 3%) | 1.18% | ✅ exact |
| `bun run build` | exit 0 | not asserted | ✅ |
| Math.random in core diff | 0 hits | none | ✅ |
| console.log in core diff | 0 hits | none | ✅ |
| `: any` in core diff | 0 hits | none | ✅ |
| `obj!.field` patterns in core diff | 0 hits (`a!.b` form); 1 postfix `]!` (L7) | none | ⚠️ partial |
| Engine cluster tests (90 across N files) | 90 pass / 0 fail / 13 files | 90 / 12 files | ⚠️ file count off by 1 |

## Plan task completion matrix

| Task | Plan §ref | Commit SHA | Status | Notes |
|---|---|---|---|---|
| 1 — SLICE NodeType | §Task 1 | `f152f79a` | ✅ | append-only, 5 tests |
| 1b — Measurement system | §Task 1b | `c21b873e` | ✅ | 17 tests, all 5 PageNode methods + 5 lifecycle events; HIGH-2 axis-pair gap |
| 2 — aspectRatio + includeInExports + pageBackgroundVisible | §Task 2 | `b3efa4a8` | ✅ | defaults verified |
| 3 — CharacterStyleOverride extensions | §Task 3 | `ae3d0c59` | ✅ | ListType exported |
| 4 — scaleNode modify tool | §Task 4 | `8e4be90f` | ✅ | 11 tests cover recursive geometry scale |
| 5 — createSlice refactor + addMeasurement + arrowStub | §Task 5 | `4d3e4300` | ✅ | createSlice now backed by SLICE NodeType (was Frame stub) |
| 6 — Tool registry extensions | §Task 6 | `fecea162` | ✅ | EXTENDED_TOOLS additions verified |
| 7 — figma-api-proxy exposure | §Task 7 | `b2a2954d` | ✅ | committed BEFORE t5 per Plan ordering rationale (chronological 13:04 vs 13:05) |
| 8 — FORMAT_VERSION 2.0.0 + KIWI_SCHEMA_VERSION lockstep | §Task 8 | `5d59018f` | ✅ | both constants land at same SHA |
| 9 — sibling-traversal mask compositing | §Task 9 | `b58291cd` | ✅ | `blendModeForMaskType` helper covers ALPHA / VECTOR / LUMINANCE |
| 10 — CLAUDE.md amendment | §Task 10 | outer-repo `719e7ac` | ✅ | verified via outer-repo `git log` |
| 11 — CHANGELOG-KOVA.md | §Task 11 | `56c91677` | ✅ | per-change upstream-PR status + cadence |
| 12 — engine-host integration tests | §Task 12 | `441d6de5` | ✅ | 7 tests |
| 13 — programmatic engine smoke | §Task 13 | `448d069e` | ✅ | 1 test |
| F — closeout | §Task F | (rolled into 688aac07) | ✅ | DONE report |

Commit format conforms to `feat(c07a-tNN: ...)` / `test(c07a: ...)` throughout. No merge commits inside the branch.

## Scope discipline

`git diff --name-only 2dab4469..app/cluster-07a-engine -- 'packages/core/'`:

```
packages/core/CHANGELOG-KOVA.md
packages/core/src/figma-api-proxy.ts
packages/core/src/figma-api.ts
packages/core/src/kiwi-serialize.ts
packages/core/src/kiwi/protocol.ts
packages/core/src/renderer/renderer.ts
packages/core/src/renderer/scene.ts
packages/core/src/scene-graph.ts
packages/core/src/tools/create.ts
packages/core/src/tools/measurement.ts
packages/core/src/tools/modify.ts
packages/core/src/tools/registry.ts
```

Every file matches the audit ALLOWED list. None of the FORBIDDEN paths appear:

- `packages/core/src/tools/figma-api/` — not in diff (directory does not exist in repo)
- `packages/core/src/codec/` — not in diff (directory does not exist in repo)
- `packages/core/src/renderer/` outside `scene.ts` + `renderer.ts` mask paths — only those two touched
- `packages/core/tests/` — not in diff (directory does not exist; tests live in outer `tests/engine/cluster-07a/`)

CHANGELOG-KOVA.md conforms to the 4-point lift-the-lock policy: per-file change summary + upstream-PR status, focused per-row PR sequencing plan, Figma-parity claims (verified for SLICE + Measurement), Kiwi append-only convention satisfied (SLICE appended at index 17 of NodeType union; no existing entries renamed or reordered — confirmed via diff of pre/post union).

## Cross-cluster contracts (W3/W4)

| Contract | Status | Evidence |
|---|---|---|
| C-LOW07a.2 — mask-compositing perf benchmark | ⚠️ Deferred (justified) | `packages/core/CHANGELOG-KOVA.md:44` + DONE `:111`; reason: requires `test:bench` script + bun:test benchmark API + browser-like canvas; out-of-scope for engine surface ship |
| C-LOW07a.3 — FORMAT_VERSION coordination | ✅ Implemented | `packages/core/src/kiwi/protocol.ts` exports `FORMAT_VERSION = '2.0.0'` + `KIWI_SCHEMA_VERSION = '2.0.0'` at SHA `5d59018f`; DONE `:120-122` hands Cluster 09 the snapshot-migration-registry task with explicit `(coord: Cluster 07a FORMAT_VERSION 2.0.0)` PR-title format |
| C-LOW07a.4 — `node:errored` event surface | ⚠️ Deferred (justified) | CHANGELOG `:45` + DONE `:112`; reason: subscriber lives in Cluster 11 `<ToastStack>`, best paired with 07b's overlay error paths |
| C-LOW09.11 — migration registry for format_version | ✅ Handed to Cluster 09 | DONE `:120` explicitly states Plan 09 must add `snapshot-migration-registry.ts` with a `1.0.0` → `2.0.0` entry |

## TDD discipline

Each task commit bundles its test file with its impl in the same commit (acceptable per audit rubric "single feat commit containing both test + impl in one TDD cycle"). No retro-fitted test commits. Pattern:

```
f152f79a  test=1 src=1  feat(c07a-t1)  +5 tests
c21b873e  test=1 src=1  feat(c07a-t1b) +17 tests
b3efa4a8  test=1 src=1  feat(c07a-t2)  +5 tests
...
```

Net cluster test delta: +90 tests, 0 new skips above W6 baseline (99 → 99).

## DONE report accuracy (spot-check)

| Claim | Verification | Result |
|---|---|---|
| 13 commit SHAs in task table exist | `git cat-file -e` each | ✅ all 13 |
| Outer-repo `719e7ac` exists | `git -C /Users/jihoyang/kova-main log` | ✅ |
| 1669 pass / 99 skip / 0 fail | re-ran `bun run test:unit` | ✅ exact |
| Dupes 1.18% | re-ran `bun run test:dupes` | ✅ exact |
| Per-task test totals sum to 90 | awk on DONE table | ✅ sum = 90 |
| Total new tests across 12 files | `ls tests/engine/cluster-07a/*.test.ts` | ⚠️ 13 files, not 12 (LOW-11) |

## OpenPencil baseline regression

- NodeType union pre/post: SLICE appended at end; zero renames or reorders. Kiwi append-only convention satisfied.
- Skip count unchanged: 99 → 99 (no W6-baseline regressions).
- `bun run build` succeeds.

## Recommended action

**fix-then-merge.** Patch HIGH-1 (descendant-recursive cross-canvas reparent drop), HIGH-2 (same-axis pair guard in `addMeasurement`), and HIGH-3 (SLICE leaf-parent check in `createNode`) as three small targeted commits on `app/cluster-07a-engine` before merging into `feat/m9-shopify`. MEDIUM-4/5 can land in the same hardening pass; MEDIUM-6 + all LOWs can wait for follow-up. CHANGELOG-KOVA.md upstream-PR work proceeds in parallel — none of the HIGH fixes invalidate the drafted PR sequencing.

---

W7 AUDIT COMPLETE. Verdict: PASS-WITH-WARNINGS. 11 findings (0 CRITICAL, 3 HIGH, 3 MEDIUM, 5 LOW). Report: `docs/execution-phase/wave-audits/reports/W7-cluster-07a-AUDIT-REPORT.md`
