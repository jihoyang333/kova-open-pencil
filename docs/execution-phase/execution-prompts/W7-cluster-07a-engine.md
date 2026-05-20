# W7 — Cluster 07a (Canvas Engine Core + Renderer) Execution Prompt

**Wave:** W7
**Cluster:** 07a — Canvas Engine Core + Renderer
**Status:** ready after W6 merged
**Prerequisites:** W6 (Cluster 11) merged into `feat/m9-shopify`; design tokens + KovaIcon + EmailShell + audit_log + idempotency primitives shipped
**Dependencies:** packages/core/ READ-ONLY exception granted (per founder lock #16) — this cluster extends scene graph with Slice (17th NodeType) + Measurement (page-level per PRD 07a §7.1b)

---

## Founder pre-flight

1. W6 merged + `feat/m9-shopify` pushed with Cluster 11 commits
2. `bun run build` succeeds on integrated branch
3. `/dev/cluster-11` showcase route renders all Cluster 11 primitives
4. No regressions in OpenPencil canvas baseline

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-main/kova-open-pencil-1`. Opus 4.7. Paste prompt below verbatim.

---

## PROMPT (paste verbatim)

```
You are the W7 execution-phase agent for Kova. Build Cluster 07a — the
canvas engine extensions that add Slice (17th NodeType) and Measurement
(page-level, per founder lock).

## Mandatory reading (in this order, before any code)

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/kova-final-prds/07a-canvas-engine-core-renderer.md  (the WHY)
4. docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md  (the HOW)
5. docs/execution-phase/claude-design-files/README.md  (REFERENCE ONLY — plan supersedes per Mandate 8; ignore conflicts between this README and the plan)
6. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md  (CANONICAL FIDELITY CONTRACT — read end-to-end. §0 is the 3-rule formulation: (1) visual values are copied, (2) DOM structure is translated, (3) behavior is engineered. "Copy DOM verbatim" is FORBIDDEN. Phase 1 gate = KOVA_AUDIT.md + tokens-used.md before any Vue. Visual-diff thresholds 0.1% component / 0.5% screen. 3-screenshot PR artifact per surface.)
7. CLAUDE.md
8. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
7. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/ — Figma canvas UI screenshots for visual reference

CRITICAL: This cluster extends packages/core/ (normally READ-ONLY).
Founder lock #16 grants explicit exception for Slice + Measurement
NodeType extensions ONLY. Touching anything else in packages/core/
(renderer internals, codec, scene-graph base) is forbidden.

## Mandatory skills (invoke in order)

1. superpowers:using-superpowers
2. superpowers:executing-plans
3. superpowers:test-driven-development

## Conditional subagents

- typescript-pro — scene-graph type extensions (complex generics expected)
- context7 MCP — verify Figma plugin API parity if any signature is unclear
- e2e-runner — at cluster end

## Cluster 07a scope (per Plan §6 phases)

- 17th NodeType: SLICE — for image-export region selection
  - SceneNode base extension
  - Hit-testing + selection
  - Render-to-canvas-image pipeline
  - figma.createSlice() factory
- Page-level Measurement (NOT a NodeType per founder lock §7.1b)
  - figma.currentPage.addMeasurement(start, end, options?)
  - Anchor model: { nodeId, side } with side ∈ {TOP, RIGHT, BOTTOM, LEFT}
  - Optional offset_type {INNER, OUTER}, offset_value, free_text
- Mask compositing perf benchmark (per W3 C-LOW07a.2)
- format_version coordination task (per W3 C-LOW07a.3)
- node:errored event surface (per W3 C-LOW07a.4)
- Migration registry for format_version (per W4 C-LOW09.11)

## Branch + commits

Branch: app/cluster-07a-engine
No worktree (sequential wave).

Pre-flight:
  cd /Users/jihoyang/kova-main/kova-open-pencil-1
  git checkout feat/m9-shopify
  git pull origin feat/m9-shopify
  git status                                  # clean
  git branch app/cluster-07a-engine feat/m9-shopify
  git checkout app/cluster-07a-engine

Commit format:
  feat(c07a-tNN): <task>
  test(c07a): <test>
  fix(c07a-review): <issue>

ONE COMMIT PER PLAN TASK. No squashing. Push every 5-8 commits.

## Per-task flow (TDD)

For each Plan task in §6 order:

1. RED: write test, run, fail
2. GREEN: minimal impl, run, pass
3. REFACTOR: clean up
4. Quality gates: bun run check / format / test:unit / test:dupes
5. Commit

For NodeType extensions specifically:
- Test must exercise: factory call, hit-test, serialization round-trip,
  render output
- Use existing packages/core/ test scaffolding (read the tests under
  packages/core/tests/ for patterns)
- DO NOT add tests to packages/core/tests/ — add to tests/engine/ in
  outer kova-open-pencil-1/ tests directory

## Design-system compliance

Cluster 07a has minimal UI surface (no Vue components in scope).
Engine work only. Design Rider applies for any internal debug UI you
add to /dev/cluster-07a route (visualizers for Slice + Measurement
node states).

## Cluster-end gates

1. All Plan tasks committed (one per task)
2. bun run build succeeds
3. bun run test:unit — all green (including new tests/engine/ tests)
4. bun run check — zero violations
5. /dev/cluster-07a showcase route demonstrates:
   - Create slice, see it in scene tree
   - Add measurement to currentPage, see it overlay
6. superpowers:code-reviewer agent — PASS
7. e2e-runner agent — Slice creation + Measurement add via canvas API
8. packages/core/ scope discipline: git diff packages/core/ shows ONLY
   additions inside scene-graph node-type-registry + Slice / Measurement
   files — zero changes to renderer / codec / tools / figma-api

## Done report

Path: docs/execution-phase/cluster-reports/W7-cluster-07a-DONE.md
Format per W6 template.

## When done

Print: "W7 CLUSTER 07a DONE. <N> commits to app/cluster-07a-engine.
Founder: review report + merge --no-ff into feat/m9-shopify."

Begin. Mandatory docs first.
```

---

**Estimated wall-clock: 4-6h (Opus). Token spend: $150-300.**
