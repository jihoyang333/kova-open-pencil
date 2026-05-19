# Kova Final QA — Pre-Build Quality Gate

**Date:** 2026-05-17
**Purpose:** Three-axis audit of all 12 PRDs + 12 implementation plans + scope plan + dispatch docs before app build begins. Founder ordered final quality gate.

---

## Why three agents

Each agent sees **full corpus along one axis**. Axis-based slicing > cluster-based slicing — cluster-based loses cross-PRD inconsistency catch.

| Agent | Axis | What they read | What they look for |
|---|---|---|---|
| **A — PRD Consistency Auditor** | All 12 PRDs + scope plan + 00f + 00g | Whole PRD corpus | Cross-PRD drift, ownership boundaries, naming collisions, schema/RPC conflicts, hi-fi citation rot, deferred-item leaks, §12 closure |
| **B — Plan Code + TDD Auditor** | All 12 implementation plans | Whole plan corpus | TS/Vue/SQL code-block syntax + correctness, valibot conformance (no Zod), Vue 3 Composition API discipline, TDD RED→GREEN→COMMIT preserved, magic strings, task numbering, test naming |
| **C — PRD↔Plan Reconciliation Auditor** | All 12 PRD+plan pairs | Pairwise corpus | Every PRD §3 surface has plan task; every §6 component has impl + test task; every §9 RPC has SQL DDL + test; every §11 cross-cluster dep wired; acceptance criteria covered; deferred-Phase-2 not leaked |

---

## Dispatch instructions

1. Open three fresh Claude Code sessions in separate terminals.
2. Paste the prompt from each file:
   - `QA-A-prd-consistency.md` → terminal 1
   - `QA-B-plan-code-tdd.md` → terminal 2
   - `QA-C-prd-plan-reconciliation.md` → terminal 3
3. Each agent writes findings to `docs/kova-final-qa/findings/QA-{A,B,C}-findings.md`.
4. Each agent runs READ-ONLY. No commits. No code changes. Reports only.
5. Parent agent (Claude in main session) reviews all three reports as batch + produces consolidated triage list.

Parallel-safe — different output files, zero conflict.

---

## Severity scale (consistent across all three)

| Tag | Meaning | Action |
|---|---|---|
| **CRITICAL** | App breaks at build / runtime if not fixed. Schema conflict, security hole, data-loss risk, missing required RPC, broken type. | Fix before any Wave 1 work. |
| **HIGH** | Spec ↔ plan drift that will cause rework in Wave 1. Wrong component name, missing test, contradictory acceptance criterion, ownership ambiguity. | Fix before that PRD's plan executes. |
| **MEDIUM** | Inconsistency or unclear spec that will slow eng or invite questions. Naming inconsistency across PRDs, missing cross-ref, weak edge-case coverage. | Fix in batch cleanup pass before Wave 1 commit. |
| **LOW** | Typo, formatting, polish. Doesn't affect build. | Optional cleanup. |

---

## Frozen founder decisions (out of scope — DO NOT CHALLENGE)

Each prompt file embeds this list explicitly. Auditors must NOT re-litigate. If a finding appears to contradict a frozen decision, surface as **NOTE (locked)** rather than **BUG**.

- All 7 decisions in `00f-B12_REVERSAL_DISPATCH.md` (B12 archived Brands page → MVP, restore_brand REAL, segmented filter, Import CTA dropped, BRANDS_RESTORE_ENABLED flag kept, /account/brands route)
- All 9 decisions in `00g-CMDK_KILL_DISPATCH.md` (Cmd+K palette dropped entirely, A5 hi-fi retired, KD-3 + RISK 12.8 deleted)
- All §12 RESOLVED entries inside each PRD (founder-locked per PRD)
- 03-doc audit ratified verdict (`00e-EXTERNAL_VERIFICATION_VERDICT.md`)
- Sentry / Resend / Vercel Cron deferred to pre-launch (stub-guard pattern, see scope plan §11)
- Last-page delete = Figma-style disabled item + tooltip (founder lock 2026-05-17, PRD 08)
- Empty-canvas right-click = Figma full 12-item menu (founder lock 2026-05-17, PRD 08)
- Outlines = 3 separate toggles + global Outlines submenu (founder verified vs live Figma, PRD 08)
- Vite SPA only (D-5C reversed — no Nuxt anywhere)
- Image export only (no HTML export — founder lock)
- audit_log table owned by Cluster 11 (shared infra; do NOT redistribute)
- Per-user idempotency keys table owned by Cluster 11
- Email notifications: Cluster 12 ships minimal wiring reusing Cluster 01 Resend client + Cluster 11 EmailShell
- 07a Measurement = page-level anchored (Figma-exact, NOT a NodeType)
- All decisions in `project_kova_mvp_decisions.md` + `project_prd04_decisions.md` + `project_prd07a_measurement_model.md` + `project_prd07b_decisions.md` + `project_prd10_decisions.md` + `project_prd12_decisions.md` + `project_pre_prd_audit_ratified.md` (read these files if available — see `~/.claude/projects/-Users-jihoyang-kova-main/memory/` index; if inaccessible, rely on §12 RESOLVED entries inside each PRD which mirror the locks)

---

## Founder framing (first principles + systems thinking)

Every auditor must:

1. **Think first-principles.** Don't pattern-match to "this looks like a typical PRD." Ask: does this specification actually produce the user-facing outcome? Is the data model correct given the use case (freelance email marketer juggling multi-brand clients)?
2. **Think in systems.** PRDs interlock. A composable named `useBrandsStore` in PRD 02 must be the same one in PRD 03. A route `/account/brands` registered in PRD 04 must mount the component PRD 03 ships. The store of truth for `archived_at` must be one place. Drift between docs = bug in production.
3. **Be holistic.** Read the whole corpus before reporting. A finding in PRD 02 might already be answered in PRD 11. Cross-ref before flagging.
4. **Be meticulous with code.** Implementation plans contain real code that engineers will copy. Every TypeScript snippet, every SQL DDL, every Vue template, every test scaffold must be correct. Catch broken imports, mis-typed signatures, magic strings, missing await, race conditions, wrong API surface.
5. **Respect founder locks.** See freeze list above. If a finding contradicts a lock, tag NOTE (locked) and move on.

---

## After dispatch

When all three agents return, parent agent will:

1. Read all three `findings/QA-{A,B,C}-findings.md` files.
2. Deduplicate cross-axis overlaps (same bug surfaced by two agents).
3. Produce `docs/kova-final-qa/CONSOLIDATED-TRIAGE.md` — single severity-sorted list with owner per finding.
4. Present triage to founder for approval before fixes dispatch.
