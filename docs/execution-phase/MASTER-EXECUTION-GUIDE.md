# Kova App-Build Master Execution Guide

**Status:** active. Created 2026-05-19 after CONSOLIDATED-TRIAGE closure + W5a polish pass.
**Purpose:** Single source of truth for executing the app-build phase. Defines wave order, per-cluster pipeline, design-system discipline, quality gates, and founder/agent responsibilities.
**Audience:** Jiho (founder), every execution-phase Claude Code agent.

---

## 0. What this phase is

Kova has 13 PRDs + 13 implementation plans, all founder-locked + audit-passed. App-build phase = execute the plans, task-by-task, cluster-by-cluster, until the app exists.

This is NOT design work. NOT scope work. NOT plan work. Pure execution.

**Out of scope for execution phase:**
- New features beyond MVP scope (see PRD scope plan)
- Re-litigating founder-locked decisions
- Inventing new design tokens / components / colors
- Refactoring `packages/core/` (read-only per CLAUDE.md)
- Re-implementing OpenPencil's canvas / renderer / scene graph

**In scope:**
- Translating hi-fi HTML into idiomatic Vue 3 per the **3-rule visual-fidelity contract** (see `claude-design-files/IMPLEMENTATION_PROMPT.md` §0):
  1. **Visual values are copied** — every color, spacing, type, radius, shadow, gap, padding, line-height, tracking, proportion MUST match the mockup pixel-for-pixel.
  2. **DOM structure is translated** — compose markup via Vue 3 SFCs + Reka UI primitives + `K*` component layer from `design.md` §3. Do NOT copy the mockup's hand-rolled HTML structure.
  3. **Behavior is engineered** — state lives in Pinia / refs / composables. Hover/focus/active/selected/disabled states are dynamic bindings, NEVER hardcoded classes.
- Wiring backend (Supabase migrations + Edge Functions + RPCs)
- Building Pinia stores per cluster
- TDD discipline (RED → GREEN → REFACTOR) per Plan task
- Per-screen written diff + Playwright visual-diff gates per cluster (thresholds: 0.1% component / 0.5% screen per IMPLEMENTATION_PROMPT.md §6)

**Trap phrase to avoid in agent instructions:** "copy DOM verbatim" is forbidden. It sounds like fidelity insurance and is actually the opposite — it pulls hand-rolled HTML, inline `<style>` blocks, CDN scripts, and hardcoded states into the codebase, defeating the component layer. Use the 3-rule formulation above.

---

## 1. Inputs (read before launching any agent)

| Input | Path | Used for |
|---|---|---|
| PRD (per cluster) | `docs/kova-final-prds/NN-<name>.md` | WHY + acceptance criteria |
| Implementation Plan (per cluster) | `docs/kova-final-impl-plans/NN-<name>-plan.md` | HOW + task-by-task TDD. **The plan IS the README** (supersedes any auto-generated bundle README per IMPLEMENTATION_PROMPT.md §11) |
| Design system canonical | `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md` | Source-of-truth for tokens, fonts, colors, bans |
| Hi-fi HTML (in-repo, version-controlled, CI-deterministic) | `kova-open-pencil-1/design-system/hifi/<cluster>/*.html` | Pixel-exact visual target. Playwright visual-diff baseline. |
| Hi-fi HTML (outer-repo originals, reference only) | `/Users/jihoyang/kova-main/main-main-kova-scope/batch-{a,a-additions,b}/...*.html` | Historical originals. Diff against in-repo copy. |
| Hi-fi tokens (dark) | `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/kova-hifi.css` | CSS custom properties + component primitives |
| Hi-fi tokens (light, auth only) | `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/kova-hifi-light.css` | Auth pages only |
| Figma canvas reference (PNGs) | `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/*.png` | Visual reference for canvas surfaces (07a/07b/08) |
| Design-system compliance rider | `docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md` | Hard rules every cluster agent must follow |
| Hi-fi handoff bundle overview | `docs/execution-phase/claude-design-files/README.md` | Bundle description. **Inverted — plan supersedes; this file is reference only.** |
| **Hi-fi translation method (CANONICAL)** | `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` | Authoritative HTML → Vue contract. 3-rule formulation. Phase 1 audit gate (`KOVA_AUDIT.md` + `tokens-used.md`). Per-screen written diff + Playwright visual-diff (0.1% component / 0.5% screen). 3-screenshot PR artifact. |

**Every execution-prompt loads PRD + Plan + Design Rider + IMPLEMENTATION_PROMPT.md (5 docs). IMPLEMENTATION_PROMPT.md is the canonical contract for visual fidelity — its 3-rule formulation overrides any conflicting wording elsewhere.**

---

## 2. Dependency graph (forced by Wave 0 cross-cluster contracts)

```
                  ┌─────────────────────────────────┐
                  │  W6 — Cluster 11 (foundation)   │   ← MUST ship first
                  │  audit_log, KovaIcon, RequireEnv │
                  │  EmailShell, idempotency        │
                  │  Reka wrappers, design tokens   │
                  └────────────────┬────────────────┘
                                   │
                  ┌────────────────▼────────────────┐
                  │  W7 — Cluster 07a (engine)      │   ← canvas baseline
                  │  Slice/Measurement NodeTypes    │
                  │  scene-graph extensions         │
                  └────────────────┬────────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
            ┌───▼───┐         ┌────▼────┐        ┌────▼────┐
            │W8 — 01│         │W8 — 04  │        │W8 — 12  │
            │auth + │         │stripe + │        │settings │
            │shopify│         │GDPR     │        │prefs    │
            └───┬───┘         └────┬────┘        └─────────┘
                │                  │
            ┌───▼───┐         ┌────▼────┐
            │W9 — 02│ ──────► │W9 — 03  │   ← 03 needs 02 routing canonical
            │dashbd │         │brand mgmt│
            └───┬───┘         └────┬────┘
                │                  │
                └──────────────────┼─────────────┐
                                   │             │
                ┌──────────────────▼────────┐    │
                │  W10 — Cluster 06         │    │
                │  canvas shell + chrome    │    │
                └─────────────┬─────────────┘    │
                              │                  │
        ┌────────┬────────────┼──────────┐       │
        │        │            │          │       │
    ┌───▼──┐ ┌───▼──┐    ┌────▼───┐ ┌────▼──┐ ┌─▼────┐
    │W11-05│ │W11-07b│   │W11-08  │ │W12-09│ │W12-10│
    │brand │ │inspec │   │menus + │ │vers  │ │AI    │
    │kit   │ │+overly│   │shortcuts│ │hist  │ │chat  │
    └──────┘ └───────┘    └────────┘ └──────┘ └──────┘
```

Critical path: **11 → 07a → 06 → all canvas surfaces**.
Parallelization opportunities: W8 (3-way), W11 (3-way), W12 (2-way).

---

## 3. Wave order + timeline

| Wave | Cluster(s) | Parallel? | Wall-clock est. (Opus) | Tokens est. |
|---|---|---|---|---|
| W6 | 11 | sequential | 6-10h | $200-400 |
| W7 | 07a | sequential | 4-6h | $150-300 |
| W8 | 01, 04, 12 | parallel (3 worktrees) | 8-12h max-of-three | $400-800 total |
| W9 | 02, 03 | sequential | 6-10h | $300-600 |
| W10 | 06 | sequential | 8-12h | $400-700 |
| W11 | 05, 07b, 08 | parallel (3 worktrees) | 8-12h max-of-three | $500-900 total |
| W12 | 09, 10 | parallel (2 worktrees) | 6-8h max-of-two | $400-700 total |
| Pre-launch | env wiring, Sentry/Resend/Cron, prod deploy | sequential | 2-4h | $50-100 |

**Wall-clock total estimate: 48-74h with full parallelism. ~$2.5k-4.5k token spend on Opus 4.7.**

Compare: contractor build = $50-150k, 8-16 weeks.

---

## 4. Per-cluster pipeline (5 stages — every cluster runs this exact flow)

```
STAGE 1 — SCAFFOLD (~30min)
├── Read PRD + Plan + Design Rider front-to-back
├── Invoke `superpowers:using-superpowers` skill
├── Invoke `superpowers:executing-plans` skill
├── Write execution-doc at docs/superpowers/plans/<date>-<cluster>-execution.md
├── Pre-flight: branch, worktree, dependencies verify
└── Commit: docs(exec-cN): cluster N execution plan

STAGE 2 — TDD LOOP (~60-70% of cluster time)
├── For each Plan task in order:
│   ├── Invoke `superpowers:test-driven-development` skill
│   ├── RED: write test file, run, confirm fail
│   ├── GREEN: write minimal impl, run, confirm pass
│   ├── REFACTOR: clean up, re-run, still pass
│   └── Commit: feat(cN-tT): <task name>
├── Backend tasks: write migration, run `supabase migration up`, verify
└── Frontend tasks: write Vue component, mount in /dev/cluster-N showcase route

STAGE 3 — HI-FI TRANSLATION (~10-15% — UI clusters only)
│
│ Follow `claude-design-files/IMPLEMENTATION_PROMPT.md` Phase 4 (per-screen loop).
│ Apply the 3-rule formulation:
│   (1) Visual values are copied — every color/spacing/type/radius/shadow/gap/
│       padding/proportion pixel-for-pixel from the mockup.
│   (2) DOM structure is translated — Vue 3 SFCs + Reka UI primitives + the K*
│       component layer from design.md §3. The mockup's hand-rolled HTML is NOT
│       transcribed; it is REBUILT in Vue idioms.
│   (3) Behavior is engineered — state in Pinia / refs / composables. Hover /
│       focus / active / selected states are dynamic bindings, never static
│       classes copied from the mockup.
│ Class names from kova-hifi.css are preserved where they aid clarity (.btn,
│ .input, .dlg, .pill, etc.) — they document the component vocabulary.
│
├── Phase 1 gate: produce KOVA_AUDIT.md + tokens-used.md BEFORE any Vue.
│   ├── tokens-used.md enumerates every visual value in this cluster's surfaces
│   │     mapped to either an existing token or ⚠️ MISSING for founder.
│   ├── No Vue code until both docs are founder-approved.
│   └── See IMPLEMENTATION_PROMPT.md §3.
│
├── For each PRD §3 surface row that has hi-fi reference:
│   ├── Open the IN-REPO hi-fi HTML at design-system/hifi/<cluster>/<file>.html
│   │     (NOT the outer main-main-kova-scope/ originals — those are reference)
│   ├── Implement the Vue route at /dev/cluster-N/<surface>
│   ├── Open Vue route at the same 1440px viewport as the mockup
│   ├── Screenshot both. Walk IMPLEMENTATION_PROMPT.md Appendix A per property.
│   │     List every discrepancy in writing → tests/snapshots/cluster-N/<surface>-diff.md
│   ├── Fix every discrepancy. Re-screenshot. Re-diff. Repeat until empty.
│   ├── Drift protocol: kova-hifi.css :root is canonical. If hi-fi uses a value
│   │     not in :root, flag it ⚠️ MISSING in tokens-used.md + ask founder via
│   │     AskUserQuestion. Three options: (a) extend the system, (b) update the
│   │     hi-fi, (c) keep literal with /* token-exempt */ comment. Never silently
│   │     round to nearest existing token.
│   ├── Playwright visual-diff gate: 0.1% component / 0.5% screen (with masking
│   │     for volatile regions per IMPLEMENTATION_PROMPT.md §6).
│   └── Only move to next surface when written diff empty AND visual-diff green.
└── Commit: feat(cN-ui): translate <surface> from design-system/hifi/<cluster>/<file>.html
    (per-screen diff + visual-diff green)

NEVER USE THE PHRASE "copy DOM verbatim" IN AGENT INSTRUCTIONS. It is forbidden.
It is a trap phrase that destroys fidelity by pulling hand-rolled HTML + inline
<style> blocks + CDN scripts + hardcoded states into the codebase. Use the
3-rule formulation above.

STAGE 4 — SELF-REVIEW (~5-10%)
├── Invoke `superpowers:code-reviewer` agent
├── Check vs CLAUDE.md hard rules
├── Check vs PRD acceptance criteria
├── Check vs Design Rider hard rules
├── Fix CRITICAL/HIGH; defer MEDIUM if non-blocking
└── Commit fixes: fix(cN-review): <issue>

STAGE 5 — PLAYWRIGHT QUALITY GATE (~10%)
├── For each UI surface in cluster:
│   ├── Render Vue version at /dev/cluster-N/<surface>
│   ├── Render hi-fi HTML at batch-a/dark/<file>.html (static serve)
│   ├── Playwright screenshot both at same viewport
│   ├── Visual diff via `expect.toMatchSnapshot()` or pixelmatch
│   └── Pass threshold: ≤ 2% pixel diff (anti-aliasing tolerance)
├── For backend clusters: run integration test suite + verify all green
├── For full clusters: invoke `e2e-runner` agent for golden-path flow
└── Commit: test(cN): playwright visual diff + e2e golden path
```

**Per-cluster output (push to origin):**
- Branch: `app/cluster-NN` (e.g., `app/cluster-11`)
- All commits per Plan task (~30-100 commits typical)
- Cluster-done report: per-task closure + screenshots + Playwright diffs + token spend

---

## 5. Branch + worktree strategy

**Branch naming:** `app/cluster-NN-<short-name>` (e.g., `app/cluster-11-foundation`, `app/cluster-07a-engine`)

**Worktree (for parallel waves):**

```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1
git branch app/cluster-NN-<name> feat/m9-shopify
git worktree add ../kova-build-cNN app/cluster-NN-<name>
```

**Sequential waves (W6, W7, W9-02→03, W10):** Work directly in inner repo on the cluster branch.

**Parallel waves (W8 = 3-way, W11 = 3-way, W12 = 2-way):** Each cluster gets its own worktree at `/Users/jihoyang/kova-build-c<NN>`.

**Merge cadence:** Founder merges each cluster branch into `feat/m9-shopify` (or fresh `feat/app-build` if you want clean separation) with `--no-ff` after Playwright gate green. Same pattern that worked for fix dispatch.

---

## 6. Skills + MCP servers (executive summary — full list in rider)

### Skills (every cluster agent invokes these)

**Mandatory per cluster:**
- `superpowers:using-superpowers` — orientation (always invoke first)
- `superpowers:executing-plans` — drives the plan-task loop
- `superpowers:test-driven-development` — TDD discipline (RED → GREEN → REFACTOR)
- `superpowers:code-reviewer` — self-review before declaring done

**Mandatory at cluster end:**
- `e2e-runner` (subagent) — Playwright/Vercel Agent Browser golden-path test

**Conditional (cluster-specific):**
- `database-reviewer` (subagent) — Clusters 01, 03, 04, 05, 09 (schema + RLS work)
- `security-auditor` (subagent) — Clusters 01, 04 (auth + Stripe)
- `typescript-pro` (subagent) — Clusters 06, 07a, 07b (complex types)
- `vue-expert` (subagent) — Clusters 02, 03, 05, 06 (reactivity-heavy UI)
- `refactoring-specialist` (subagent) — only if a Plan task explicitly requires restructuring

**Optional:**
- `superpowers:brainstorming` — only if scoped task is ambiguous + no founder available
- `superpowers:writing-plans` — sub-task plan if implementation diverges from Plan

### MCP servers (installed; agents should use when relevant)

| MCP | When useful | Cluster examples |
|---|---|---|
| `context7` | Library/framework docs (Vue 3, Pinia, Reka UI, Supabase JS, valibot, etc.) | All UI clusters |
| `supabase` | Schema introspection, migrations, RLS testing | 01, 03, 04, 05, 09 |
| `vercel` | Deployment status, env vars, function logs | Pre-launch + debugging |

**Do NOT use:**
- `figma` MCP — Kova's hi-fi is HTML/CSS, not Figma. Useless for our pipeline.
- `Google Drive` MCP — no project assets there.

---

## 7. Founder responsibilities (Jiho)

Per-wave:
- Approve cluster-done report before merge
- Browser smoke-verify cluster output (the "feedback_browser_smoke_test_before_done" rule)
- Answer AskUserQuestion when scope is genuinely ambiguous
- Block on UX/product calls; never block on technical execution

Pre-launch (after W12):
- Create Supabase production project + set env vars
- Create Stripe production account + products + webhook
- Provision Resend, Sentry, Vercel Cron accounts
- Set Vercel production env vars
- Approve final E2E + hi-fi diff pass
- Press "deploy" button on Vercel

Agents do all the typing. Founder makes decisions + presses buttons.

---

## 8. Quality gates (mandatory, in order)

### 8.1 Per-task gates (during TDD loop)
- `bun run test:unit` green for the new tests
- `bun run check` (oxlint type-aware) — zero new violations
- `bun run format` — clean diff (no rogue formatting)
- `bun run test:dupes` — `jscpd` ≤ 3% per CLAUDE.md hard rule

### 8.2 Per-cluster gates (before declaring cluster done)
- All Plan tasks have commits (one per task)
- `bun run build` succeeds
- `superpowers:code-reviewer` agent gives PASS (no CRITICAL/HIGH)
- **Phase 1 gate green**: `KOVA_AUDIT.md` + `tokens-used.md` exist with zero ⚠️ MISSING rows
- **Per-screen written diff** at `tests/snapshots/cluster-NN/<surface>-diff.md` is empty for every UI surface
- **Per-component visual diff ≤ 0.1%** for every primitive used (against `/dev/components` gallery)
- **Per-screen visual diff ≤ 0.5%** on every UI surface in cluster (UI clusters only) — Playwright with `maxDiffPixelRatio: 0.005, threshold: 0.2`, masking volatile regions
- **No raw hex / raw px** in any Vue file touched (lint per IMPLEMENTATION_PROMPT.md §9)
- `e2e-runner` agent golden-path test green
- Hi-fi parity verified — PR description includes 3-screenshot row (mockup / impl / diff) per surface

### 8.3 Pre-merge gate (founder + agent)
- Founder browser smoke-test of `/dev/cluster-NN` route
- Founder approves merge
- Squash NOT permitted — preserve per-task commits (audit log + bisect-friendly)

---

## 9. Backend infra rollout

### W6 prep (founder, before Cluster 11 agent launches)
- Create Supabase project (dev environment)
- Set `.env.local` in `kova-open-pencil-1/`:
  ```
  VITE_SUPABASE_URL=...
  VITE_SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=...    # server-only, never VITE_ prefix
  ANTHROPIC_API_KEY=...            # server-only
  ```
- Install Supabase CLI + run `supabase init` if not already

### W6 (Cluster 11 agent)
- Migrations runner + initial `audit_log` DDL
- Vercel Functions `api/` directory + edge runtime config
- `requireEnv()` helper with CI gate
- Sentry STUB + Resend STUB + Vercel Cron STUB (env-guarded; real wiring deferred)

### W8 (Cluster 01 + 04)
- Stripe test mode + test products + webhook endpoint
- Edge functions: signup, signin, email-change, account-deletion-request
- GDPR cron stub

### Pre-launch (founder, after W12)
- Rotate env vars from dev → prod
- Wire Sentry (replace STUB)
- Wire Resend (replace STUB)
- Wire Vercel Cron (replace STUB)
- Vercel production deployment

Per memory `project_external_accounts_deferred`: stub-guard pattern is documented in scope plan §11.

---

## 10. Cost + time optimization rules

1. **Always parallelize within a wave.** Wall-clock matters more than token efficiency at this stage.
2. **Opus 4.7 default for execution-phase agents** (founder preference — quality > token cost).
3. **Sonnet 4.6 for subagent calls** (code-reviewer, database-reviewer, e2e-runner) — they're tactical, not strategic.
4. **Don't re-plan. Plans are written.** Execute, don't redesign.
5. **Browser-smoke at cluster boundary, not per-task.** Per-task = wasteful; cluster = catches integration bugs.
6. **code-reviewer mandatory after every cluster.** Catches drift early. $5 spend prevents $100 rework.
7. **One commit per Plan task.** Same discipline as fix-dispatch. Bisect-friendly + revert-safe.
8. **Playwright visual diff at end, not during.** Test isn't useful until UI exists. Don't pre-snapshot.

---

## 11. Pre-launch checklist (after W12 merged)

- [ ] All 13 cluster branches merged into `feat/m9-shopify`
- [ ] `bun run build` succeeds on integrated branch
- [ ] Full E2E pass on integrated branch (signup → onboard → brand-kit → canvas → AI → export → image push)
- [ ] Hi-fi diff pass on every UI surface (per-component ≤ 0.1%, per-screen ≤ 0.5%; lint hex/px clean)
- [ ] CLAUDE.md hard-rule sweep: zero violations of stated bans
- [ ] Supabase production project provisioned + RLS verified
- [ ] Stripe production account + products + webhook
- [ ] Sentry, Resend, Vercel Cron wired (stubs removed)
- [ ] Vercel production env vars set
- [ ] Privacy policy + Terms pages content reviewed (Cluster 01 lifted from `docs/legal/anthropic-subprocessor-disclosure.md`)
- [ ] Custom domain configured
- [ ] First production deploy succeeds
- [ ] Founder smoke-tests deployed app on real domain
- [ ] LAUNCH

---

## 12. Execution-prompt index

Per-wave launch prompts live in `execution-prompts/`. Founder reads + pastes into fresh Claude Code session per wave.

| Wave | File | Status |
|---|---|---|
| W6 — Cluster 11 (foundation) | `execution-prompts/W6-cluster-11-foundation.md` | ready |
| W7 — Cluster 07a (engine) | `execution-prompts/W7-cluster-07a-engine.md` | ready |
| W8a — Cluster 01 (auth) | `execution-prompts/W8a-cluster-01-auth.md` | ready |
| W8b — Cluster 04 (stripe) | `execution-prompts/W8b-cluster-04-stripe.md` | ready |
| W8c — Cluster 12 (settings) | `execution-prompts/W8c-cluster-12-settings.md` | ready |
| W9a — Cluster 02 (dashboard) | `execution-prompts/W9a-cluster-02-dashboard.md` | ready |
| W9b — Cluster 03 (brand mgmt) | `execution-prompts/W9b-cluster-03-brand-mgmt.md` | ready |
| W10 — Cluster 06 (canvas chrome) | `execution-prompts/W10-cluster-06-canvas-chrome.md` | ready |
| W11a — Cluster 05 (brand kit) | `execution-prompts/W11a-cluster-05-brand-kit.md` | ready |
| W11b — Cluster 07b (inspector) | `execution-prompts/W11b-cluster-07b-inspector.md` | ready |
| W11c — Cluster 08 (menus) | `execution-prompts/W11c-cluster-08-menus.md` | ready |
| W12a — Cluster 09 (version history) | `execution-prompts/W12a-cluster-09-version-history.md` | ready |
| W12b — Cluster 10 (AI chat) | `execution-prompts/W12b-cluster-10-ai-chat.md` | ready |

**All 13 prompts pre-written 2026-05-20.** Founder launches one per wave per dispatch instructions. No need to draft per-wave — paste-and-go.

**Per-wave dispatch flow:** founder reads the wave's prompt doc, runs the founder pre-flight commands (worktree setup for parallel waves), opens fresh Claude Code session at the specified path, pastes the PROMPT block verbatim, agent executes, founder reviews done-report + merges.

---

## 13. Anti-patterns (do not do these)

- ❌ Skip TDD discipline ("I'll write tests after")
- ❌ Invent design tokens / colors / fonts
- ❌ Re-implement OpenPencil canvas / renderer / scene graph
- ❌ Use React, Next.js, or PixiJS anywhere
- ❌ Expose `ANTHROPIC_API_KEY` (or any server-only env var) to the browser
- ❌ Hardcode secrets
- ❌ Use Zod in tool layer (valibot only)
- ❌ Use `Math.random()` (use `crypto.getRandomValues()`)
- ❌ Use `e.key` for shortcut handlers (use `e.code` per Mac Option-transform constraint)
- ❌ Squash commits (preserve per-task history)
- ❌ Use `--no-verify` or `--force` without explicit founder approval
- ❌ Re-litigate founder-locked decisions
- ❌ Skip code-reviewer step
- ❌ Skip Playwright visual diff gate
- ❌ Use the phrase "copy DOM verbatim" in any agent instruction (trap phrase — destroys fidelity by pulling hand-rolled HTML into the codebase)
- ❌ Skip Phase 1 audit gate (KOVA_AUDIT.md + tokens-used.md must be founder-approved before any Vue)
- ❌ Silently round a mockup value to the nearest existing token (drift protocol §7 of IMPLEMENTATION_PROMPT.md is mandatory)
- ❌ Loosen visual-diff thresholds when a screen fails (investigate + fix, don't widen the gate)
- ❌ Skip the 3-screenshot PR artifact

---

**End of master guide. Read `DESIGN-SYSTEM-COMPLIANCE-RIDER.md` next — it codifies the hi-fi discipline every cluster agent must follow.**
