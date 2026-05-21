# W6 — Cluster 11 (Foundation) Execution Prompt — REDO

**Wave:** W6
**Cluster:** 11 — Shared UI Infrastructure
**Status:** REDO required (2026-05-20). Prior W6 freestyled UI primitives — output looked nothing like the hi-fi. Fidelity contract has been inverted. Re-dispatch with new contract.
**Prerequisites:** W5a polish-pass merged into `feat/m9-shopify`. Founder reads + agrees with the redo scope below before launching.

---

## Why a redo (read this first)

The previous W6 agent (commit range on `app/cluster-11-foundation`) built the backend / infra correctly:
- `audit_log` migration runner + DDL
- `requireEnv()` helper + CI gate
- Idempotency keys
- Sentry / Resend / Vercel Cron stub guards
- EmailShell primitive

**But the UI primitives + `/dev/cluster-11` showcase route freestyled the visuals.** Buttons, modals, popovers, toasts all looked like generic Tailwind defaults — not the dense, refined Figma-modeled Kova aesthetic from the hi-fi mockups.

Root cause: the default claude.ai/design handoff README told the agent "don't render 1:1, compose from existing components." Agent took that as license to freestyle visual VALUES, not just markup. The contract has been inverted per `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` (rewritten 2026-05-20). The 3-rule formulation is now:

> 1. **Visual values are copied** — pixel-for-pixel from the mockup.
> 2. **DOM structure is translated** — Vue 3 + Reka UI + `K*` component layer. NOT mockup HTML.
> 3. **Behavior is engineered** — Pinia / refs / composables. NOT static classes.

The trap phrase "copy DOM verbatim" is forbidden.

## Two redo paths (founder picks)

**Path A (recommended) — Full reset + redo:**
```sh
git checkout app/cluster-11-foundation
git reset --hard feat/m9-shopify   # discards 20 commits
git push --force-with-lease origin app/cluster-11-foundation
```
Pros: clean git history. The new agent doesn't inherit any freestyle code. Phase 1 audit gate works as designed.
Cons: re-does the backend / infra work (~30% of prior W6 time).

**Path B — Keep infra, redo UI:**
```sh
git checkout app/cluster-11-foundation
# Inspect commits, cherry-pick infra-only commits onto a fresh branch
git log --oneline feat/m9-shopify..HEAD
# Identify which commits are UI primitives + showcase, revert those
git revert <ui-primitive-commits>
```
Pros: preserves working backend / infra.
Cons: messy git history. Cherry-pick risks missing dependencies. Slower to set up.

**Founder must pick BEFORE launching the agent below.** Default = Path A.

---

## Founder pre-flight (do this BEFORE launching the agent)

1. Pick redo path (A or B above). For Path A, run the reset commands.
2. Ensure Supabase project exists for dev environment.
3. `.env.local` in `kova-open-pencil-1/` has these populated:
   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<public anon key>
   SUPABASE_SERVICE_ROLE_KEY=<server-only role key>
   ANTHROPIC_API_KEY=<server-only — for AI features but read by edge fns only>
   ```
4. Supabase CLI installed: `supabase --version` → returns a version.
5. `cd kova-open-pencil-1 && bun install` succeeds.
6. `bun run dev` starts dev server at localhost:1420.
7. Verify in-repo hi-fi mockups are present: `ls design-system/hifi/` shows 13 cluster subdirs + index-batch-a.html.
8. Verify Playwright visual-diff infra is present: `ls tests/visual-diff/` shows `fixtures/`, `playwright.config.ts`, `example.visual.spec.ts`.
9. Verify `bun run test:visual` is a defined script in `package.json` (it should be, set 2026-05-20).
10. `feat/m9-shopify` is the current HEAD of `origin`.

---

## Launch the agent

Open a fresh Claude Code session. Set working directory to `/Users/jihoyang/kova-main/kova-open-pencil-1`. Use **Opus 4.7** model. Paste the prompt below VERBATIM.

---

## PROMPT (paste verbatim — agent reads this fresh, no prior context)

```
You are the W6 REDO execution-phase agent for Kova. Your job: build Cluster 11
(Shared UI Infrastructure) — the foundation layer every other cluster depends on.

PREVIOUS W6 ATTEMPT FAILED. The prior agent freestyled the UI primitives —
buttons, modals, popovers, toasts looked like generic Tailwind defaults, not
the dense Figma-modeled Kova aesthetic from the hi-fi mockups. The fidelity
contract has been INVERTED. Read it before doing ANYTHING.

## Canonical fidelity contract (read end-to-end first)

docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md

The 3-rule formulation in §0 is the most important paragraph in this codebase:
  1. Visual values are copied — pixel-for-pixel from the mockup.
  2. DOM structure is translated — Vue 3 + Reka UI + K* component layer. NOT mockup HTML.
  3. Behavior is engineered — Pinia / refs / composables. NOT static classes.

"Copy DOM verbatim" is FORBIDDEN. It is a trap phrase that destroys fidelity.

## Mandatory reading (in this order)

1. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
   → THE canonical fidelity contract. Read §0–§16 + Appendix A. Memorize §0
     (3-rule formulation) + §6 (per-screen diff loop + thresholds) + §7 (drift
     protocol) + §9 (lint rule) + §10 (CI-determinism prereq) + §12 (DoD).

2. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
   → wave order, per-cluster pipeline, quality gates.

3. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
   → hard rules + drift protocol + 3-rule contract restated.

4. docs/kova-final-prds/11-shared-ui-infrastructure.md
   → Cluster 11 WHY + acceptance criteria.

5. docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md
   → Cluster 11 HOW + task-by-task TDD. THIS PLAN IS THE README (Mandate 8) —
     it supersedes any auto-generated bundle README. Ignore conflicts with
     docs/execution-phase/claude-design-files/README.md (reference only).

6. design-system/canonical/design.md (in-repo canonical, cover-to-cover)
   → spec doc. Token rules + bans + extension protocol.

7. design-system/canonical/TOKEN_CANONICAL.md
   → three token vocabularies + positional offsets section (added 2026-05-20).

8. design-system/canonical/kova-hifi.css
   → :root token block + component primitive class definitions.

9. design-system/hifi/README.md
   → cluster → file mapping + PRIMITIVE-SPEC-EXTRACTION map for Cluster 11.

10. CLAUDE.md (root of kova-open-pencil-1/) — hard constraints, code
    conventions, Supabase env discipline.

## CRITICAL — Cluster 11 has NO own hi-fi mockup

Cluster 11 ships PRIMITIVES (KovaIcon, KovaToast, KovaModal, KovaPopover,
KovaMenu, KovaTooltip, KovaSkeleton, KovaSelect, EmailShell). No dedicated
hi-fi shows them as a "primitives gallery."

INSTEAD: every primitive's pixel-exact spec must be EXTRACTED from the screen
hi-fi mockups that USE that primitive. The PRIOR agent skipped this step and
freestyled. YOU MUST NOT.

Per design-system/hifi/README.md primitive-spec map:

| Primitive | Extract spec from |
|---|---|
| KovaIcon | every hi-fi (Lucide icons used throughout) |
| KovaToast | states/Kova Hi-Fi 16 Toasts + Missing Fonts - Dark.html + states/Kova Hi-Fi B1 Toasts - Dark.html + onboarding/Kova Hi-Fi B11 Canvas Creation Transition - Dark.html (toast row) |
| KovaModal | brand-kit/Kova Hi-Fi A4+A9+A10 Modals - Dark.html (typed-confirm patterns) + auth/Kova Hi-Fi B4 Session Expired - Dark.html (sm dialog) + brand-mgmt/Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html (md modal) |
| KovaPopover | canvas-menus/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html + canvas-menus/Kova Hi-Fi 13 Canvas Popovers - Dark.html |
| KovaMenu | canvas-menus/Kova Hi-Fi A5 Command-K - Dark.html + dashboard/Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html (brand switcher dropdown) |
| KovaTooltip | canvas-chrome/Kova Canvas - Final.html (toolbar tool tooltips) |
| KovaSkeleton | states/Kova Hi-Fi B7 Loading Skeletons - Dark.html |
| KovaSelect | brand-kit/Kova Hi-Fi A4+A9+A10 Modals - Dark.html (form selects) |
| EmailShell | (no hi-fi — Plan 11 already defined; verify against the spec doc) |

For each primitive, walk Appendix A of IMPLEMENTATION_PROMPT.md per the
referenced screen hi-fi(s). Record extracted values in
docs/execution-phase/cluster-audits/cluster-11-tokens-used.md.

## Phase 1 audit gate (MANDATORY — no Vue code until this is green)

Produce two markdown documents BEFORE writing any Vue / TypeScript code:

1. docs/execution-phase/cluster-audits/cluster-11-audit.md
   - §1.1 Token map (every short token in kova-hifi.css :root mapped to
     src/app.css @theme).
   - §1.2 Existing-component inventory (src/components/ui/* — there are
     EXISTING files: KovaIcon.vue, button.ts, input.ts, menu.ts, select.ts,
     surface.ts, toast.ts. Document what each does + whether it matches the
     hi-fi spec OR needs rebuilding.).
   - §1.3 Reuse decisions per primitive.
   - §1.4 New tokens needed (route via drift protocol §7).
   - §1.5 New components needed.
   - §1.6 Open questions for founder (route via AskUserQuestion).

2. docs/execution-phase/cluster-audits/cluster-11-tokens-used.md
   - For every primitive Cluster 11 ships, enumerate every visual value
     extracted from the referenced screen hi-fi(s). Categories: colors,
     spacing, typography, radii, shadows, motion, z-index, sizing, density.
   - Map each value to either an existing token OR ⚠️ MISSING with proposed
     resolution.
   - Route every ⚠️ MISSING row to founder via AskUserQuestion before Phase 2.

STOP after these two docs. Wait for founder approval before Phase 2.

## Phase 2 — Token + foundation setup

Per IMPLEMENTATION_PROMPT.md §4. Most of this is already done in src/app.css
(positional-offset tokens added 2026-05-20). Verify + extend per Phase 1
output.

## Phase 3 — Component layer (the primitives)

Build each primitive in src/components/ui/ as a Vue SFC. Per IMPLEMENTATION_PROMPT.md §5.

**EACH primitive must pass:**
1. Per-property extraction walk (Appendix A) against the referenced screen hi-fi.
2. Visual-diff in /dev/components gallery ≤ 0.1% against an isolated screenshot
   of the primitive as it appears in the screen hi-fi.
3. Per-property written diff at tests/snapshots/cluster-11/<primitive>-diff.md
   showing zero discrepancies.

NEVER skip this loop. NEVER freestyle. If the primitive doesn't match, fix it
before moving to the next.

## Phase 4 — Showcase route

Build /dev/cluster-11 that renders every primitive in every variant + state.
This route is FOR FOUNDER SMOKE TEST. It must look as polished as a real
product surface — not a generic Storybook gallery. Use the dense Figma
aesthetic from design.md §4 (density rhythm) and §3 (component patterns).

## Quality gates (per IMPLEMENTATION_PROMPT.md §12 + MASTER §8.2)

For every primitive shipped:
- [ ] Per-property written diff is empty.
- [ ] Per-component visual-diff ≤ 0.1% (Playwright `bun run test:visual`).
- [ ] No raw hex / raw px (lint per `bun run check`).
- [ ] All tokens used exist in kova-hifi.css :root + TOKEN_CANONICAL.md.
- [ ] bun run check green.
- [ ] bun run test:unit green for new tests.
- [ ] bun run build succeeds.

PR description includes 3-screenshot row (mockup region / primitive impl / diff)
per primitive.

## What to do FIRST

1. Read IMPLEMENTATION_PROMPT.md end-to-end. Memorize §0 (3-rule formulation).
2. Invoke superpowers:using-superpowers.
3. Invoke superpowers:executing-plans with plan = docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md.
4. Read design-system/canonical/design.md cover-to-cover.
5. Read design-system/hifi/README.md (primitive-spec extraction map).
6. Audit src/components/ui/* — what exists, what's salvageable, what needs
   rebuilding per the hi-fi specs.
7. Open EACH referenced screen hi-fi at /dev/hifi/<cluster>/<file>.html?ci=1 in
   a browser (dev server must be running). Screenshot the primitive region.
8. Build docs/execution-phase/cluster-audits/cluster-11-audit.md +
   docs/execution-phase/cluster-audits/cluster-11-tokens-used.md.
9. STOP. Use AskUserQuestion to surface every ⚠️ MISSING + every open decision.

DO NOT write any Vue / TS code until both audit docs exist + founder has
approved.

DO NOT use the phrase "copy DOM verbatim" anywhere. Trap phrase. Forbidden.

DO NOT silently round any mockup value to the nearest existing token. Drift
protocol §7 is the only way to resolve a missing value.

DO NOT skip the per-component visual-diff. 0.1% threshold. If it fails,
investigate the 0.1% drift, do NOT loosen the gate.

## Branch + worktree

Continue on app/cluster-11-foundation (after the redo reset per founder's
choice of Path A or B above). One commit per primitive task per the executing-plans
discipline. NO squashing. Per-task atomic commits.

## When done

Produce docs/execution-phase/cluster-reports/W6-cluster-11-REDO-DONE.md with:
- Per-primitive closure table (primitive name | spec source | visual-diff %).
- 3-screenshot artifact per primitive (committed under
  tests/snapshots/cluster-11/<primitive>-{mockup,impl,diff}.png).
- Token diff: every new token added (with hex + mockup origin).
- Component diff: every new variant or new component built.
- Open issues (if any) for founder review.
- Founder checklist: routes to smoke-test at /dev/cluster-11.

Then notify founder. DO NOT merge — founder merges with --no-ff after browser
smoke + code-reviewer agent pass + e2e-runner golden-path.

Go.
```
