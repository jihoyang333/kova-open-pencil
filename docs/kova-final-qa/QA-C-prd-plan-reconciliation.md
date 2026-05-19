# QA-C — PRD↔Plan Reconciliation Auditor

**Role:** Pairwise auditor. For each of 12 PRD+plan pairs, verifies every PRD spec surface has a corresponding plan task; every plan task traces back to a PRD spec; deferred Phase-2 items don't leak into the plan; acceptance criteria are covered by tests.

**Output:** `docs/kova-final-qa/findings/QA-C-findings.md` — severity-tagged gap matrix per pair + cross-cluster reconciliation findings.

**Mode:** READ-ONLY. No edits to PRDs, plans, or any other file. No commits. Report only.

---

## Prompt — paste into fresh Claude Code session

```
ROLE: You are the PRD↔Plan Reconciliation Auditor for Kova MVP. You are the third of three quality-gate auditors running before app build begins. Your axis is the pairwise relationship between each PRD and its implementation plan — does the plan implement what the PRD specifies, no more, no less?

WORKING DIRECTORY: /Users/jihoyang/kova-main/kova-open-pencil-1

OUTPUT FILE (CREATE, do not edit anything else): docs/kova-final-qa/findings/QA-C-findings.md

MODE: READ-ONLY. Do NOT modify PRDs, plans, code, or any other file outside your single output report. Do NOT commit. Do NOT spawn sub-agents — read directly with Read + Grep.

WHY YOU MATTER: PRD and plan are written by different agents. They drift. A surface in the PRD §3 with no plan task means engineers won't build it. A plan task without a PRD spec means engineers build the wrong thing. You are the bridge.

---

CORPUS TO AUDIT (12 PRD+plan pairs):

| # | PRD | Plan |
|---|---|---|
| 01 | docs/kova-final-prds/01-auth-and-identity.md | docs/kova-final-impl-plans/01-auth-and-identity-plan.md |
| 02 | docs/kova-final-prds/02-onboarding-and-dashboard.md | docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md |
| 03 | docs/kova-final-prds/03-brand-management.md | docs/kova-final-impl-plans/03-brand-management-plan.md |
| 04 | docs/kova-final-prds/04-account-and-stripe-billing.md | docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md |
| 05 | docs/kova-final-prds/05-brand-kit-and-drag-drop.md | docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md |
| 06 | docs/kova-final-prds/06-canvas-editor-core-chrome.md | docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md |
| 07a | docs/kova-final-prds/07a-canvas-engine-core-renderer.md | docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md |
| 07b | docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md | docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md |
| 08 | docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md | docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md |
| 09 | docs/kova-final-prds/09-version-history-and-trash.md | docs/kova-final-impl-plans/09-version-history-and-trash-plan.md |
| 10 | docs/kova-final-prds/10-ai-chat-and-memory.md | docs/kova-final-impl-plans/10-ai-chat-and-memory-plan.md |
| 11 | docs/kova-final-prds/11-shared-ui-infrastructure.md | docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md |
| 12 | docs/kova-final-prds/12-settings-and-user-preferences.md | docs/kova-final-impl-plans/12-settings-and-user-preferences-plan.md |

Context docs (read once, don't audit):
- CLAUDE.md (root)
- docs/kova-final-prds/00-PRD_SCOPE_PLAN.md
- docs/kova-final-prds/00f-B12_REVERSAL_DISPATCH.md
- docs/kova-final-prds/00g-CMDK_KILL_DISPATCH.md

---

FROZEN FOUNDER DECISIONS — OUT OF SCOPE, DO NOT CHALLENGE:

Same as QA-A and QA-B. Highlights:
- B12 Brands page → MVP scope; restore_brand REAL; segmented filter; Import dropped (00f)
- Cmd+K palette → DROPPED entirely; per-surface shortcuts survive (00g)
- All §12 RESOLVED entries inside each PRD are locked
- Sentry / Resend / Vercel Cron deferred to pre-launch (stub-guard OK)
- 07a Measurement = page-level anchored (NOT a NodeType)
- audit_log + idempotency_keys owned by Cluster 11
- Vite SPA only — no Nuxt
- Image export only — no HTML export
- User → Brand (1:1 Shopify shop) → Canvases; no workspace layer

If finding contradicts a lock, tag NOTE (locked) not BUG.

---

YOUR MISSION

For each of the 12 pairs, build a coverage matrix showing every PRD specification item ↔ matching plan task. Flag every gap, mismatch, scope creep, or contradictory acceptance criterion.

Think in first principles: would an engineer reading only the plan build the product the PRD specifies? If no, where does it drift?

Think in systems: cross-cluster dependencies must reconcile across pairs. If PRD 04 says "depends on Cluster 11 EmailShell" and PRD 11 doesn't ship EmailShell in its plan, that's a gap.

---

AUDIT LENSES (apply each pair-wise across all 12 pairs, then cross-cluster lens)

PAIRWISE LENS 1 — Every PRD §2 in-scope item has a plan task
- For each bullet in the PRD's §2 (In scope) section, find the corresponding plan task(s). If no task exists → gap.
- Exception: shared-infra items the PRD explicitly defers to another cluster are OK if the cross-cluster handoff is documented.

PAIRWISE LENS 2 — Every PRD §3 surface has plan implementation + test
- For each surface row in PRD §3 (Visual spec hi-fi tables), find the plan task that builds it. Find the test that covers it.
- Surfaces without impl task → HIGH (missing component).
- Surfaces with impl but no test → MEDIUM (test gap).

PAIRWISE LENS 3 — Every PRD §6 component / composable / store has a build task
- For each entry in PRD §6 (Components / Composables / Stores), find the plan task that creates the file.
- Verify path matches: PRD §6 says `src/components/account/BrandPicker.vue` → plan task should create exactly that path, not `src/components/BrandPicker.vue` or similar.

PAIRWISE LENS 4 — Every PRD §9 RPC / Edge Function has SQL DDL + Edge Function task + tests
- For each RPC in PRD §9, find: the SQL DDL task, the SECURITY DEFINER body, the test, and the consumer integration.
- For each Edge Function, find: the file creation task, the env var declaration, the test (mock or real).

PAIRWISE LENS 5 — Every PRD §8 acceptance criterion has a test
- For each checklist item in PRD §8 (Acceptance / Spec coverage), find the test in the plan that asserts it.
- Acceptance criteria with no corresponding test → HIGH.

PAIRWISE LENS 6 — Deferred-Phase-2 items NOT in plan
- Anything in PRD §2.3 (Deferred to Phase 2) should NOT have a plan task. If a Phase-2 item has tasks, flag — scope creep.
- Exception: tasks that prepare for Phase 2 (e.g. schema column that's nullable now, used later) are OK if explicitly labeled "Phase-2-ready stub."

PAIRWISE LENS 7 — Plan tasks trace back to PRD
- For each plan task, find the PRD section that motivated it. Tasks with no PRD anchor → MEDIUM or HIGH (depending on whether it's foundational infra or scope creep).
- Exception: integration tasks, test fixtures, CI wiring — these may be implicit.

PAIRWISE LENS 8 — Cross-cluster dependency reconciliation (PAIR-vs-PAIR)
- Each PRD has §10 / §11 / "Cross-cluster" section. For each claimed dependency on another cluster, verify:
  - The owner cluster's PRD claims to ship that thing.
  - The owner cluster's PLAN has tasks to build it.
  - The naming matches (composable name, RPC name, route path).
- Flag broken cross-cluster links: A claims B ships X, B doesn't.

PAIRWISE LENS 9 — Section 12 (Open Q / Resolved) reconciled to plan
- Every §12 RESOLVED entry should be reflected in the plan if it affects implementation.
- E.g. PRD 03 §12.10 "B12 archive inclusion 2026-05-17" should map to plan tasks for B12 page + restore RPC + filter.
- Flag §12 resolutions that the plan doesn't reflect (PRD says yes, plan doesn't build).

PAIRWISE LENS 10 — Hi-fi citation reconciliation
- For each `main-main-kova-scope/...` hi-fi referenced in PRD §3, plan tasks that build that surface should cite the same hi-fi path. Flag drift.

PAIRWISE LENS 11 — Status / version sync
- PRD §0 Status and plan §0 / changelog should reflect the same edit dates and major decisions (B12 reversal, Cmd+K kill applied where relevant).
- Flag stale plan changelog vs newer PRD status.

PAIRWISE LENS 12 — Feature-flag wiring
- Feature flags declared in PRD (BRANDS_RESTORE_ENABLED, ONBOARDING_REQUIRED_FOR_FIRST_BRAND, etc.) must have plan tasks that:
  - Add the flag to config / env var schema.
  - Wire UI gating to read the flag.
  - Test both flag-on and flag-off paths.

PAIRWISE LENS 13 — Test taxonomy
- PRD claims "X tests for Y feature" (or implicit via acceptance criteria count). Plan delivers test files matching the claim.
- Flag plan with fewer test files than the PRD acceptance count implies, or test names that don't match acceptance phrasing.

---

CROSS-CLUSTER LENS (run after all pairs done)

CROSS-CLUSTER LENS A — Dependency graph integrity
- Build a directed graph: each PRD/plan as node, cross-cluster deps as edges. Verify no cycles. Verify Wave-1 dependencies build before Wave-2 (per scope plan §1 Waves table).
- Flag plans that depend on a cluster that hasn't shipped its dependency in its own plan.

CROSS-CLUSTER LENS B — Shared resource ownership
- For shared tables / RPCs / composables, exactly ONE plan owns the build task. Flag if two plans both ship a task for the same resource (or zero plans).
- audit_log owned by Cluster 11. idempotency_keys owned by Cluster 11. Resend client owned by Cluster 01. EmailShell owned by Cluster 11. Confirm each appears in its owner's plan, and NO other plan also tries to ship it.

CROSS-CLUSTER LENS C — Env var consistency
- Same env var must appear with same name + same scope (server-only vs `VITE_`) across all plans that reference it. Flag drift.

CROSS-CLUSTER LENS D — RLS policy stack consistency
- Same table referenced by multiple plans → policies must be consistent (no two plans both adding overlapping RLS policies for the same operation).

---

WHAT TO DO

1. Read CLAUDE.md, 00-PRD_SCOPE_PLAN.md, 00f, 00g for context (don't audit these).
2. For each pair, read PRD then matching plan back-to-back.
3. Run all 13 pairwise lenses for the pair.
4. After all 12 pairs done, run 4 cross-cluster lenses.
5. Write findings to `docs/kova-final-qa/findings/QA-C-findings.md` using the format below.

OUTPUT FORMAT

```markdown
# QA-C — PRD↔Plan Reconciliation Findings

**Auditor:** [your model + date]
**Pairs reviewed:** 12

## Summary
- CRITICAL: N findings
- HIGH:     N findings
- MEDIUM:   N findings
- LOW:      N findings
- NOTE (locked): N findings

## Per-pair coverage matrix

### PRD 01 ↔ Plan 01
| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §2.1 in-scope #1 | [item] | Task X.Y | ✅ covered |
| §2.1 in-scope #2 | [item] | — | ❌ MISSING |
| §3 surface 1 | [surface] | Task X.Z | ✅ covered (no test — see HIGH-N) |
| ... | ... | ... | ... |

### PRD 02 ↔ Plan 02
[same matrix format]

[... 10 more pairs ...]

## Cross-cluster matrix

### Dependency graph
[ASCII or table form — A → B → C, etc.]

### Shared-resource ownership
| Resource | Owner cluster | Plan ships it? | Conflicts? |
|---|---|---|---|
| audit_log table | 11 | ✅ Plan 11 Task X.Y | No conflicts |
| idempotency_keys | 11 | ❌ MISSING from Plan 11 | — |
| ... | ... | ... | ... |

## Findings

### CRITICAL-1: [short title]
**Lens:** [pairwise N or cross-cluster letter]
**Pair / PRDs:** [which PRD+plan, or which clusters cross-conflict]
**Files:** [PRD + plan paths + line numbers]
**Gap:** [PRD says X, plan does Y, mismatch description]
**Evidence:** [quotes from both sides]
**Why CRITICAL:** [breakage / build risk]
**Recommended fix:** [add task X to plan Y, OR remove section Z from PRD, etc.]

### CRITICAL-2: ...

### HIGH-1: ...

### MEDIUM-1: ...

### LOW-1: ...

### NOTE (locked)-1: ...

## Cross-pair observations
- Pattern observations (e.g. "all 12 plans missing the same boilerplate Phase 1 setup task — propose adding to a master plan-template")
```

REPORT QUALITY BAR

- Every finding includes BOTH PRD line+quote AND plan line+quote (or absence proof — "grep for X in plan returns zero hits").
- Every finding includes severity rationale.
- Every gap finding includes a concrete remediation (which side to fix, what to add/remove).
- Do NOT flag the same gap twice. Consolidate across lenses.
- Do NOT challenge frozen founder decisions — tag NOTE (locked) if applicable.
- Coverage matrices are mandatory — they prove you read both sides systematically.

START

Read CLAUDE.md + scope plan + dispatch docs. Then walk all 12 pairs in order. Run 13 pairwise lenses per pair + 4 cross-cluster lenses at the end. Target report length: 800-4000 lines (coverage matrices add length). Don't skip pairs to save time — the cross-cluster lenses depend on having walked all 12.
```
