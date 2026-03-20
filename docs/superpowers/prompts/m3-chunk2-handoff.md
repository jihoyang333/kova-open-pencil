# M3 Onboarding Wizard — Chunk 2 Handoff

Paste this into a fresh Claude Code session from the `kova-main/` directory.

---

## Prompt

We're building Kova, an AI-powered email design SaaS. M1 (auth) and M2 (dashboard) are complete on `prdv4execution`. Branch `m3-onboarding-wizard` is created off `prdv4execution`.

### Step 1: Review the plan document

Before executing, dispatch a plan-document-reviewer subagent:

```
Agent tool (general-purpose):
  description: "Review M3 plan document"
  prompt: |
    You are a plan document reviewer. Verify this plan is complete and ready for implementation.

    **Plan to review:** `kova-open-pencil-1/docs/superpowers/plans/2026-03-20-m3-onboarding-wizard.md`
    **Spec for reference:** `kova-open-pencil-1/docs/superpowers/specs/2026-03-20-m3-onboarding-wizard-design.md`

    ## What to Check

    | Category | What to Look For |
    |----------|------------------|
    | Completeness | TODOs, placeholders, incomplete tasks, missing steps |
    | Spec Alignment | Plan covers all spec requirements, no scope creep |
    | Task Decomposition | Tasks atomic, clear boundaries, steps actionable |
    | File Structure | Files have clear single responsibilities |
    | Task Syntax | Checkbox syntax (`- [ ]`) on steps for tracking |

    ## CRITICAL

    Look especially hard for:
    - Any TODO markers or placeholder text
    - Steps that say "similar to X" without actual content
    - Missing verification steps or expected outputs
    - Spec requirements not covered by any task
    - Type issues (e.g. inject() typing patterns for Vue 3)

    ## Output Format

    ## Plan Review

    **Status:** Approved | Issues Found

    **Issues (if any):**
    - [Task X, Step Y]: [specific issue] - [why it matters]

    **Recommendations (advisory):**
    - [suggestions that don't block approval]
```

Fix any issues the reviewer finds, then proceed to Step 2.

### Step 2: Execute Chunk 2 (Phase 3.1 — Onboarding UI)

Execute Tasks 1–13 from the plan using `superpowers:executing-plans`.

**Plan location:** `kova-open-pencil-1/docs/superpowers/plans/2026-03-20-m3-onboarding-wizard.md`
**Section:** "Chunk 2: Phase 3.1 — Onboarding UI" (Tasks 1–13)
**Branch:** `m3-onboarding-wizard` in `kova-open-pencil-1/`

### Sources of truth

- **Plan:** `kova-open-pencil-1/docs/superpowers/plans/2026-03-20-m3-onboarding-wizard.md`
- **Design spec:** `kova-open-pencil-1/docs/superpowers/specs/2026-03-20-m3-onboarding-wizard-design.md`
- **CLAUDE.md** — architecture, constraints, code conventions

### Parallelism

Tasks 2, 3, 4 can run in parallel (no dependencies).
Tasks 6, 7, 8, 9, 10, 11 can run in parallel (all depend only on Task 5).
Task 12 depends on Tasks 9 + 11.
Task 13 depends on Tasks 1, 4, 5, 12.

Use `superpowers:dispatching-parallel-agents` for independent tasks.

### Skills & subagents

| When | Use |
|------|-----|
| Executing the plan | `superpowers:executing-plans` skill |
| Independent tasks | `superpowers:dispatching-parallel-agents` skill |
| After writing code | `superpowers:requesting-code-review` skill |
| Before claiming done | `superpowers:verification-before-completion` skill |
| Vue 3 questions | `vue-expert` subagent |
| shadcn-vue components | shadcn-vue MCP |

### Chunk 2 deliverable

Working wizard with mock extraction data:
- All 7 screens render and navigate
- Split-screen layout with email wireframe (1-4) and brand card (5-6)
- Click-to-edit on review screen
- "Enter manually" skip path
- Completion flow creates brand + canvas + redirects
- All unit tests pass
- Lint passes

### End of chunk

After all tasks pass: commit, run `bun run test:unit && bun run check`, write a handoff summary for Chunk 3 (API endpoints).
