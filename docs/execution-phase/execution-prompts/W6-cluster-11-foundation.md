# W6 — Cluster 11 (Foundation) Execution Prompt

**Wave:** W6
**Cluster:** 11 — Shared UI Infrastructure
**Status:** ready to dispatch
**Prerequisites:** W5a polish-pass merged into `feat/m9-shopify`; re-audit green
**Dependencies (must exist):** Supabase project provisioned + `.env.local` populated; `bun install` succeeds in `kova-open-pencil-1/`

---

## Founder pre-flight (do this BEFORE launching the agent)

1. Ensure Supabase project exists for dev environment
2. `.env.local` in `kova-open-pencil-1/` has these populated:
   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<public anon key>
   SUPABASE_SERVICE_ROLE_KEY=<server-only role key>
   ANTHROPIC_API_KEY=<server-only — for AI features but read by edge fns only>
   ```
3. Supabase CLI installed: `supabase --version` → returns a version
4. `cd kova-open-pencil-1 && bun install` succeeds
5. `bun run dev` starts dev server at localhost:1420
6. `feat/m9-shopify` is the current HEAD of `origin` and includes W5a polish-pass merge

---

## Launch the agent

Open a fresh Claude Code session. Set working directory to `/Users/jihoyang/kova-main/kova-open-pencil-1`. Use Opus 4.7 model. Paste the prompt below verbatim.

---

## PROMPT (paste verbatim — agent reads this fresh, no prior context)

```
You are the W6 execution-phase agent for Kova. Your job: build Cluster 11
(Shared UI Infrastructure) — the foundation layer that every other cluster
depends on.

This is execution, not planning. Plans are written, audit-passed, and
founder-locked. You execute.

## Mandatory reading (in this order)

1. Master execution guide:
   docs/execution-phase/MASTER-EXECUTION-GUIDE.md
   → understand the wave order, per-cluster pipeline, branch strategy,
     quality gates, founder responsibilities

2. Design-system compliance rider (HARD-RULE — every UI line you write
   must comply):
   docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
   → memorize §2 hard rules; never invent tokens, components, colors

3. Cluster 11 PRD (the WHY + acceptance criteria):
   docs/kova-final-prds/11-shared-ui-infrastructure.md

4. Cluster 11 implementation plan (the HOW + task-by-task TDD):
   docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md

5. Hi-fi handoff bundle overview (authority chain + fidelity rule +
   screen inventory + hard bans):
   docs/execution-phase/claude-design-files/README.md

6. Hi-fi → Vue translation method (Audit → Tokens → Components →
   Screens; per-screen diff loop; failure modes; Appendix A per-property
   extraction checklist):
   docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
   → Cluster 11 IS Phases 2+3 (token bridge + component layer) of this
     method. Every downstream cluster (01-10, 12) is Phase 4 (screens).

7. Project-wide rules:
   CLAUDE.md (root of kova-open-pencil-1/) — hard constraints, code
   conventions, Supabase env discipline

8. Design system canonical (read design.md cover-to-cover):
   /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md

DO NOT skim these. READ them.

## Mandatory skill invocations

Invoke in this order before any code:

1. superpowers:using-superpowers — orient to the skill system
2. superpowers:executing-plans — drive the cluster's plan-task loop
3. superpowers:test-driven-development — TDD discipline per task

After scaffolding, optionally invoke:
- superpowers:writing-plans — if you need to author a brief execution
  plan doc at docs/superpowers/plans/<date>-cluster-11-execution.md

After EVERY Plan task commit:
- The next task starts a fresh TDD cycle (do not batch)

At cluster end (mandatory):
- superpowers:code-reviewer (subagent) — self-review the entire cluster
- e2e-runner (subagent) — Playwright golden-path test

Subagent triggers during the cluster:
- vue-expert — if Reka UI integration is non-trivial
- typescript-pro — if a primitive needs advanced generics
- context7 MCP — to verify Reka UI / Pinia / Vue 3 / Supabase API usage
  per current docs (don't rely on training data; check current API)

## Cluster 11 scope (per Plan §6 phases)

Phase 1: Cross-cut backend
- Initial migration: audit_log DDL + RLS
- Sentry STUB + Resend STUB + idempotency helper + Vercel cron STUB
  (all env-guarded per `project_external_accounts_deferred` memory)

Phase 2: Composables
- theme composable
- online-status composable
- Realtime-channel composable
- idempotency-key composable

Phase 3-6: Pinia stores + Vue 3 components in Composition API
- KovaModal (Reka Dialog wrapper)
- KovaPopover (Reka Popover wrapper)
- KovaMenu (Reka DropdownMenu wrapper) — Plan T4.3a per W5a split
- KovaTooltip (Reka Tooltip wrapper) — Plan T4.3b per W5a split
- KovaIcon (Lucide via unplugin-icons)
- KovaSkeleton (shimmer loader)
- KovaToast (toast notifications)
- Other primitives per Plan §6

Phase 7: Error-page routes + Vue global errorHandler

Phase 8: <MarketingShell> + <EmailShell> for marketing + transactional
emails

Phase 9: Global app shell (<App> + main.ts) + /dev/cluster-11 showcase
route for visual smoke-testing

Phase 10: E2E + manual smoke

Phase 11: CI grep + coverage gates

Every primitive consumes kova-hifi.css tokens via Tailwind @theme
translation. No hex literals anywhere.

## Branch + commit discipline

Branch name: app/cluster-11-foundation
Base: feat/m9-shopify @ current HEAD
Worktree: NO worktree needed (W6 is sequential, no parallel cluster running)

Pre-flight commands (run exactly in this order):

  cd /Users/jihoyang/kova-main/kova-open-pencil-1
  git checkout feat/m9-shopify
  git pull origin feat/m9-shopify
  git status                                  # must be clean
  git branch app/cluster-11-foundation feat/m9-shopify
  git checkout app/cluster-11-foundation
  git branch --show-current                   # must print app/cluster-11-foundation

Commit message format:

  feat(c11-tNN): <task description>
  fix(c11-review): <issue found by code-reviewer>
  test(c11): <test addition>
  chore(c11): <housekeeping>

ONE COMMIT PER PLAN TASK. No squashing. The W2 Cluster 03 squash taught
us why. Per-task commits = bisect-friendly + revert-safe + audit-log.

Push every 5-8 commits so progress is visible:

  git push origin app/cluster-11-foundation

## Per-task execution flow (TDD discipline)

For each Plan task in §6 order:

1. Read the task's "Why" + "Step-by-step" sections in the Plan
2. RED:
   - Write the test file first (per Plan's test path)
   - Run `bun test <test-file>` — must FAIL (no impl yet)
3. GREEN:
   - Write minimal impl to make the test pass
   - Run `bun test <test-file>` — must PASS
4. REFACTOR (if needed):
   - Clean up the impl, extract helpers, etc.
   - Re-run `bun test <test-file>` — must still PASS
5. Quality gates per CLAUDE.md:
   - `bun run check` (oxlint type-aware) — zero new violations
   - `bun run format` — clean
   - `bun run test:dupes` — ≤ 3%
6. Commit:
   - `git add <files>`
   - `git commit -m "feat(c11-tNN): <description>"`
7. Push every 5-8 commits

## Design-system compliance (re-read DESIGN-SYSTEM-COMPLIANCE-RIDER.md)

Every Vue component you write MUST:
- Use kova-hifi.css class names verbatim (.btn, .input, .dlg, .pill, etc.)
- Use Tailwind utilities ONLY for layout positioning (flex, grid, gap)
- Reference design tokens via var(--accent), var(--bg), etc.
- Use <KovaIcon name="..."> for icons (NEVER raw <icon-lucide-*>)
- Use Reka UI primitive wrappers (KovaModal, KovaPopover, KovaMenu,
  KovaTooltip, KovaSelect) you yourself are building
- Have NO <style> / <style scoped> blocks
- Have NO inline hex / px values not on the canonical scale
- Have NO new tokens (use the existing token set in kova-hifi.css)
- Match the hi-fi HTML rendering for each surface (visual diff via
  Playwright at cluster end)

If a primitive needs something genuinely new (e.g., a token role not
in design.md §1) — STOP. Use AskUserQuestion to ask the founder.
DO NOT silently invent.

## Hi-fi reference

For each visual primitive, reference the corresponding hi-fi HTML at:

  /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/

For toasts, errors, modals specifically:

  /Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/dark/

Plan 11 §6.x sections cite specific hi-fi files for each primitive.

## Cluster-end gates (mandatory before declaring done)

1. All Plan tasks have commits — verify via `git log --oneline | wc -l`
2. `bun run build` succeeds (zero errors)
3. `bun run check` — zero new violations
4. `bun run test:unit` — all green
5. `bun run test:dupes` — ≤ 3%
6. /dev/cluster-11 showcase route renders every primitive
7. Founder browser smoke-test of /dev/cluster-11 (founder triggers this
   — agent posts route URL + screenshots in done report)
8. Invoke superpowers:code-reviewer agent — must report PASS (zero
   CRITICAL/HIGH design-system violations)
9. Invoke e2e-runner agent — golden path: load /dev/cluster-11, every
   primitive renders, every interaction works
10. Playwright visual-diff for each primitive vs hi-fi HTML — ≤ 2% pixel
    diff (per master guide §8.2)

## Done report (write to file before exiting)

Path: docs/execution-phase/cluster-reports/W6-cluster-11-DONE.md

Format:

```
# W6 — Cluster 11 (Foundation) — DONE

**Date:** <YYYY-MM-DD>
**Branch:** app/cluster-11-foundation @ <final commit hash>
**Commits:** <N> per-task commits + <M> review commits
**Diff:** +<add> / -<del> across <count> files
**Token spend:** ~$<amount>

## Per-task closure

| Task | Status | Commit | Notes |
|------|--------|--------|-------|
| T1.1 audit_log DDL | ✅ | abc123 | RLS verified |
| T1.2 idempotency helper | ✅ | def456 | |
| ... | ... | ... | ... |

## Quality gates

- bun run build: ✅
- bun run check: ✅ (0 new violations)
- bun run test:unit: ✅ (<N> tests pass)
- bun run test:dupes: ✅ (<x>% < 3%)
- code-reviewer: ✅ PASS (or list issues fixed)
- e2e-runner: ✅ PASS (golden path)
- Playwright visual diff: ✅ all primitives within 2% threshold

## Hi-fi parity (screenshots)

- Primitive 1 (KovaModal): /tests/snapshots/cluster-11/kova-modal-{vue,hifi}.png
  diff: 0.4%
- Primitive 2 (KovaPopover): /tests/snapshots/cluster-11/kova-popover-{vue,hifi}.png
  diff: 0.8%
- ... (one row per primitive)

## Founder review checklist

- [ ] Visit http://localhost:1420/dev/cluster-11
- [ ] Verify every primitive renders + interacts as expected
- [ ] Approve merge into feat/m9-shopify

## Blockers / open questions

- (none, or list)

## Next wave

W7 — Cluster 07a (canvas engine extensions). Founder triggers next.
```

## Discipline reminders

- READ-ONLY for packages/core/ (engine, tools, figma-api, renderer,
  scene graph, codec) per CLAUDE.md
- READ-ONLY for SYSTEM_PROMPT constant in use-chat.ts
- READ-ONLY for Yjs / y-indexeddb local persistence layer
- READ-ONLY for editor UI canvas/toolbar/layers/properties (those exist
  already; you're adding NEW primitives in src/components/ui/)
- valibot only (no Zod) per CLAUDE.md
- crypto.getRandomValues() only (no Math.random())
- e.code only (no e.key) for keyboard handlers
- No React, no Next.js, no PixiJS, no Tailwind v3 / UnoCSS
- Server-only env vars (no VITE_ prefix): SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- NEVER --force, NEVER --no-verify
- NEVER expose server-only env vars to the browser
- Use AskUserQuestion when blocked. Don't guess.

## When done

1. All gates green
2. Done report written
3. Final push to origin/app/cluster-11-foundation
4. Print to console:

    W6 CLUSTER 11 DONE. <N> commits pushed to app/cluster-11-foundation.
    Founder: review done report at docs/execution-phase/cluster-reports/W6-cluster-11-DONE.md
    Then merge into feat/m9-shopify with --no-ff.

Do NOT merge yourself. Founder does the merge.

Begin. Read the mandatory docs first.
```

---

## After agent runs

**Founder steps after agent prints "W6 CLUSTER 11 DONE":**

1. Read `docs/execution-phase/cluster-reports/W6-cluster-11-DONE.md`
2. Browser smoke-test http://localhost:1420/dev/cluster-11
3. Review Playwright diff screenshots in `tests/snapshots/cluster-11/`
4. If issues found, paste back to the agent: "Issues found: <list>. Fix and re-report."
5. If clean, merge:

   ```sh
   cd /Users/jihoyang/kova-main/kova-open-pencil-1
   git checkout feat/m9-shopify
   git pull origin feat/m9-shopify
   git merge --no-ff app/cluster-11-foundation -m "Merge W6 Cluster 11 (foundation) into feat/m9-shopify

   Cluster 11 ships:
   - audit_log DDL + RLS (cross-cluster contract per CT-001)
   - <N> Reka UI wrappers: KovaModal, KovaPopover, KovaMenu, KovaTooltip,
     KovaSelect, KovaSkeleton, KovaToast, KovaIcon
   - Theme + online-status + Realtime-channel + idempotency composables
   - requireEnv() helper + CI grep gate
   - Sentry + Resend + Vercel Cron STUBs (env-guarded)
   - <MarketingShell> + <EmailShell>
   - Global app shell + errorHandler

   Hi-fi parity verified via Playwright visual diff (all ≤ 2%).
   Code-reviewer agent: PASS.
   E2E golden path: PASS.

   See docs/execution-phase/cluster-reports/W6-cluster-11-DONE.md for full
   report."

   git push origin feat/m9-shopify
   ```

6. Tell central agent (this session) to draft W7 (Cluster 07a) prompt.

---

**Estimated wall-clock: 6-10 hours (Opus 4.7, single agent). Estimated token spend: $200-400.**
