# W7 — Cluster 07a (Canvas Engine Core + Renderer) AUDIT Prompt

**Wave:** W7
**Cluster:** 07a — Canvas Engine Core + Renderer
**Audit type:** Engine + scene-graph + renderer. Lift-the-lock cluster (touches `packages/core/`).
**Status:** ready after W7 execution agent prints "W7 CLUSTER 07a DONE."
**Prerequisites:** Branch `app/cluster-07a-engine` exists with the execution agent's commits. DONE report exists at `docs/execution-phase/cluster-reports/W7-cluster-07a-DONE.md`. NOT yet merged into `feat/m9-shopify`.

---

## Founder pre-flight

1. W7 execution agent has printed its final DONE banner
2. `app/cluster-07a-engine` is pushed to origin (or available locally)
3. `docs/execution-phase/cluster-reports/W7-cluster-07a-DONE.md` exists
4. `packages/core/CHANGELOG-KOVA.md` has been added/updated with the lift-the-lock entry

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-main/kova-open-pencil-1`. Opus 4.7. Paste prompt below verbatim.

---

## PROMPT (paste verbatim)

```
You are the W7 AUDIT agent for Kova. You are an independent reviewer.
You did NOT write the W7 code. Your job is to verify that the W7
execution agent shipped Cluster 07a correctly, completely, and
safely — and to flag every gap, regression, or scope violation
BEFORE this branch is allowed to merge into feat/m9-shopify.

You are READ-ONLY. Do not push, amend, rebase, or modify code on the
branch under audit. You MAY run local quality-gate commands and write
your audit report. If you find a CRITICAL issue mid-audit, stop and
surface immediately via AskUserQuestion before continuing.

## Mandatory reading (in this order, before any analysis)

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
   (the 3-rule fidelity contract — Audit Dimension 5 uses this)
4. docs/execution-phase/claude-design-files/README.md (reference only)
5. docs/execution-phase/execution-prompts/W7-cluster-07a-engine.md
   (the ORIGINAL execution prompt — defines what the W7 agent was
   supposed to do. THIS IS YOUR SCOPE OF WORK BOUNDARY.)
6. docs/kova-final-prds/07a-canvas-engine-core-renderer.md (WHY)
7. docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md
   (HOW — task-by-task. Every numbered task here must have a commit.)
8. docs/execution-phase/cluster-reports/W7-cluster-07a-DONE.md
   (the execution agent's self-report. Verify, do not trust.)
9. packages/core/CHANGELOG-KOVA.md (lift-the-lock log)
10. CLAUDE.md (root) + /Users/jihoyang/kova-main/CLAUDE.md (outer)
11. ~/.claude/rules/common/coding-style.md
12. ~/.claude/rules/common/testing.md
13. ~/.claude/rules/common/security.md

## Mandatory skills (invoke in order)

1. superpowers:using-superpowers
2. superpowers:verification-before-completion
   (audit MUST run actual commands; do not trust DONE report claims)
3. superpowers:receiving-code-review
   (you ARE the code reviewer here — read this for technical rigor
   discipline)

## Mandatory subagents

1. superpowers:code-reviewer — full code-review sweep of the branch
   diff against feat/m9-shopify. Pass it: branch name, file list,
   PRD path, plan path. Demand it report CRITICAL / HIGH / MEDIUM /
   LOW findings.
2. typescript-pro — scene-graph type extensions are generic-heavy.
   Verify type soundness, no any-leak, no non-null assertions.

## Conditional subagents (use if the diff warrants)

- database-reviewer — only if migrations or Supabase SQL appear in
  the diff (Cluster 07a should NOT touch these — flag as scope
  violation if present).
- e2e-runner — if a /dev/cluster-07a Playwright spec exists, run it.
- general-purpose — for cross-file consistency checks.

## Cluster 07a expected scope (from PRD + Plan)

Cluster 07a is engine-only. EXPECTED changes:

ALLOWED inside packages/core/ (lift-the-lock per founder lock #16,
for THIS cluster only):
- scene-graph.ts: SLICE NodeType (17th); page-level Measurement
  primitives (NOT a NodeType — anchored to currentPage);
  new SceneNode fields (aspectRatio, includeInExports,
  pageBackgroundVisible, measurements?); CharacterStyleOverride
  extensions; lifecycle event payload types
- figma-api.ts: FigmaAPI.createSlice() factory
- figma-api-proxy.ts: FigmaNodeProxy extensions for new fields +
  scale() delegate + 5 measurement methods
- tools/modify.ts: scaleNode ToolDef + scaleNodeRecursive
- tools/create.ts: createSlice refactor (FRAME stub → SLICE creator);
  arrowStub Phase-2 no-op
- tools/measurement.ts (NEW): addMeasurement ToolDef
- tools/registry.ts: register scaleNode + addMeasurement + arrowStub
- renderer/scene.ts: sibling-traversal mask compositing (ALPHA +
  VECTOR + LUMINANCE)
- renderer/renderer.ts: maskOuterPaint + maskCompositePaint
- kiwi/protocol.ts: FORMAT_VERSION + KIWI_SCHEMA_VERSION → 2.0.0
- kiwi-serialize.ts: SLICE mapping

FORBIDDEN inside packages/core/ (lock NOT lifted for these):
- tools/figma-api/ (any change)
- codec/ (any change)
- renderer/ ANY change outside the named mask-compositing files above
- tests under packages/core/tests/ (tests live in outer
  tests/engine/ per execution prompt §"For NodeType extensions
  specifically")

ALLOWED outside packages/core/:
- tests/engine/*.ts — new test files for SLICE + Measurement +
  scaleNode + format_version + mask-compositing + integration
- /dev/cluster-07a showcase route (Vue) for visual evidence
- docs/execution-phase/cluster-reports/W7-cluster-07a-DONE.md

FORBIDDEN outside packages/core/:
- Any change to src/ outside the /dev/cluster-07a route
- Any UI surface for Inspector / Overlays (that is 07b's scope)
- Any Pinia store / route / migration / Edge Function

## Audit dimensions (run in order, document each)

### A. Branch + diff baseline (run first)

  cd /Users/jihoyang/kova-main/kova-open-pencil-1
  git fetch origin
  git log --oneline feat/m9-shopify..app/cluster-07a-engine
  git diff --stat feat/m9-shopify...app/cluster-07a-engine

Confirm:
- Branch exists at expected SHA chain off feat/m9-shopify
- Commit count is "non-trivial but bounded" (Plan 07a has ~13 tasks
  + Task F = ~14 commits ± minor follow-up fixes)
- No merge commits inside the branch (one-per-task discipline)
- Commit format: feat(c07a-tNN: ...) / test(c07a: ...) /
  fix(c07a-review: ...)
- Files in diff fall ONLY in the ALLOWED file lists above. Any file
  outside those lists = scope violation → CRITICAL.

### B. Plan task completion

Open the Plan. Walk every numbered task in §6 (and Task F closeout).
For each task:
- Find the matching commit (grep `git log` for the task number)
- Read the diff for that commit
- Verify the task's acceptance criteria are met IN CODE (not just
  asserted in DONE report)
- Flag any task with no matching commit → HIGH
- Flag any commit whose diff does not match its task description →
  HIGH

Specifically verify:
- Plan §6 Task 1 — SLICE NodeType: SceneNode base extended, NodeType
  enum entry added, hit-testing logic, factory tested via
  figma.createSlice(), serialization round-trip exists
- Plan §6 Task 1b — Measurement: page-level, NOT a NodeType,
  anchored to currentPage, 5 SceneGraph methods matching Figma's
  PageNode API verbatim (verify against developers.figma.com /
  help.figma.com for parity per CLAUDE.md root §"Lift-the-lock
  policy" requirement 3)
- Plan §6 Task 7 must be committed BEFORE Plan §6 Task 5 (per Plan
  ordering rationale — flag inversion as MEDIUM)
- Plan §6 Task 8 — FORMAT_VERSION 2.0.0 + KIWI_SCHEMA_VERSION
  lockstep — verify both constants land at the same SHA
- Plan §6 Task 9 — sibling-traversal mask compositing — verify
  blendModeForMaskType helper exists; verify ALPHA + VECTOR +
  LUMINANCE all covered

### C. Quality gates (re-run locally — do NOT trust DONE report)

  bun install
  bun run build         # must succeed
  bun run check         # zero warnings, zero errors
  bun run test:unit     # all pass, no skips beyond W6 baseline
  bun run test:dupes    # < 3%

Note any drift from W6 baseline (W6 was ~99 skips). New skips in
W7 = MEDIUM finding unless justified in DONE report's "Deferred"
section.

### D. Scope discipline (packages/core/ lift-the-lock)

  git diff --name-only feat/m9-shopify...app/cluster-07a-engine \
    | grep '^packages/core/'

Cross-reference every file in this list against the ALLOWED list in
"Cluster 07a expected scope" above. Any file in the diff NOT in the
ALLOWED list → CRITICAL scope violation. Flag specifically:
- Any change to packages/core/src/tools/figma-api/
- Any change to packages/core/src/codec/
- Any change to packages/core/src/renderer/ outside scene.ts +
  renderer.ts mask paths
- Any change to packages/core/tests/

Also verify packages/core/CHANGELOG-KOVA.md:
- Lists every changed file in packages/core/
- Each entry has summary + upstream-PR status (drafted / submitted
  / merged / declined)
- Conforms to CLAUDE.md root §"Lift-the-lock policy" 4-point
  requirement (CHANGELOG entry, focused PR, Figma parity, Kiwi
  append-only)

### E. Cross-cluster contracts (W3/W4 closures)

Verify the W3/W4 closure items from the execution prompt §"Cluster
07a scope":

- C-LOW07a.2 — mask-compositing perf benchmark: implemented OR
  documented as deferred in CHANGELOG-KOVA.md with reason
- C-LOW07a.3 — FORMAT_VERSION coordination: FORMAT_VERSION and
  KIWI_SCHEMA_VERSION at 2.0.0; "Follow-up handoffs" section in
  DONE report explicitly hands the migration-registry task to
  Cluster 09 with "(coord: Cluster 07a FORMAT_VERSION 2.0.0)" PR
  title format guidance
- C-LOW07a.4 — node:errored event surface: implemented OR documented
  as deferred with subscriber location (Cluster 11 ToastStack)
- C-LOW09.11 — migration registry for format_version: implemented OR
  handed to Cluster 09 explicitly

Each missing OR un-deferred = HIGH.

### F. TDD discipline

For each Plan task, verify the commit graph shows test-first
discipline. Reasonable patterns:
- test commit followed by feat commit in the same task (RED → GREEN)
- single feat commit containing both test + impl in one TDD cycle
  (acceptable if both are in the same commit)

Flag patterns indicating tests written AFTER impl as MEDIUM:
- feat commit followed by test commit days later
- "tests for c07a-tNN" commits that retro-fit coverage

Verify test count: DONE report claims 90 new tests across 12 files.
Run `bun run test:unit --reporter verbose 2>&1 | grep "tests/engine"
| wc -l` to spot-check count. ±10% drift is OK.

### G. Code-review sweep (delegate to superpowers:code-reviewer)

Spawn superpowers:code-reviewer agent with this brief:

  "Audit the diff feat/m9-shopify...app/cluster-07a-engine.
  Focus: scene-graph type soundness, renderer correctness,
  mask-compositing semantic correctness vs Figma reference,
  Measurement API parity with Figma's PageNode API (verify against
  help.figma.com / developers.figma.com), kiwi serialization
  round-trip safety, FORMAT_VERSION lockstep correctness, and
  CLAUDE.md hard constraints (no Math.random, no console.log, no
  any, no non-null !). Return CRITICAL / HIGH / MEDIUM / LOW
  findings."

Roll the code-reviewer's findings into your final report.

### H. Hard-constraint grep sweep

Run these greps on the diff. Any hit = CRITICAL:

  git diff feat/m9-shopify...app/cluster-07a-engine -- 'packages/core/**' \
    | grep -E 'Math\.random|console\.log|: any|!\.[a-zA-Z]'

  git diff feat/m9-shopify...app/cluster-07a-engine -- 'src/**' \
    | grep -E 'Math\.random|: any|!\.[a-zA-Z]|<style|style scoped'

Also verify no Zod imports introduced anywhere in src/ai/ if the
diff touches AI tools (07a should NOT but check defensively):

  git diff feat/m9-shopify...app/cluster-07a-engine -- 'src/ai/**' \
    | grep -E "from 'zod'|require\('zod'\)"

### I. Done-report accuracy

Read DONE report top-to-bottom. Spot-check 5 random claims by
running the actual command or reading the actual file:
- Test counts: re-run bun run test:unit and verify total
- Commit SHAs in the "Plan tasks completed" table: each must exist
  via `git cat-file -e <sha>`
- Quality gate results: re-run, compare
- Deferred items: each must be in CHANGELOG-KOVA.md
- Follow-up handoffs: each must be either tracked in PRD/Plan of
  the named downstream cluster OR documented in CHANGELOG-KOVA.md

Any falsified or mis-stated claim = HIGH.

### J. OpenPencil baseline regression check

Audit must verify the existing OpenPencil canvas baseline still
runs. Approach:
- `bun run dev` should start without error
- `bun run test:unit` total pass count should be W6-baseline +
  W7's new tests (no regressions in pre-existing tests)
- Spot-read packages/core/src/scene-graph.ts for any modifications
  to existing NodeType enum entries (renaming, renumbering) —
  forbidden by Kiwi append-only enum convention per CLAUDE.md root
  §"Lift-the-lock policy" requirement 4

## Output

Write your audit report to:

  docs/execution-phase/wave-audits/reports/W7-cluster-07a-AUDIT-REPORT.md

Format:

  # W7 — Cluster 07a AUDIT REPORT
  **Date:** <today>
  **Auditor:** Claude Opus 4.7 (independent reviewer)
  **Branch under audit:** app/cluster-07a-engine
  **Base:** feat/m9-shopify @ <sha>
  **Verdict:** ✅ PASS | ⚠️ PASS WITH WARNINGS | 🛑 BLOCK

  ## Summary
  <1-paragraph executive summary>

  ## Findings
  ### CRITICAL
  - <none, or numbered list>
  ### HIGH
  ### MEDIUM
  ### LOW

  ## Quality gates (re-run results)
  | Gate | Re-run result | DONE report claim | Match? |
  |---|---|---|---|

  ## Plan task completion matrix
  | Task | Plan §ref | Commit SHA | Status | Notes |
  |---|---|---|---|---|

  ## Scope discipline
  <enumerate every file in packages/core/ diff, verify ALLOWED>

  ## Cross-cluster contracts (W3/W4)
  | Contract | Status | Evidence |
  |---|---|---|

  ## Recommended action
  <one sentence — merge / fix-then-merge / revert>

When done, print:

"W7 AUDIT COMPLETE. Verdict: <PASS|PASS-WITH-WARNINGS|BLOCK>.
<N> findings (<C> CRITICAL, <H> HIGH, <M> MEDIUM, <L> LOW).
Report: docs/execution-phase/wave-audits/reports/W7-cluster-07a-AUDIT-REPORT.md"

Begin. Mandatory docs first.
```

---

**Estimated wall-clock: 45-75 min (Opus). Token spend: $60-120.**
