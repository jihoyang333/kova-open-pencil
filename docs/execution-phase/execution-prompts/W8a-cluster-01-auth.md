# W8a — Cluster 01 (Auth + Identity + Shopify OAuth) Execution Prompt

**Wave:** W8 (parallel-3: 01, 04, 12)
**Cluster:** 01 — Auth + Identity + Shopify OAuth + GDPR cron foundation
**Status:** ready after W7 merged
**Prerequisites:** W6 + W7 merged into `feat/m9-shopify`
**Worktree:** YES — parallel wave (W8a/b/c run simultaneously)

---

## Founder pre-flight

1. W6 + W7 merged
2. Stripe test account exists (Cluster 04 needs; Cluster 01 doesn't directly but Edge Fns will reference)
3. Shopify dev partner account exists; Shopify app credentials in `.env.local`
4. Resend STUB still in place (Cluster 04 will wire later)

Set up W8 worktrees once:

```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1
git checkout feat/m9-shopify
git pull origin feat/m9-shopify
git branch app/cluster-01-auth feat/m9-shopify
git branch app/cluster-04-stripe feat/m9-shopify
git branch app/cluster-12-settings feat/m9-shopify

git worktree add ../kova-build-c01 app/cluster-01-auth
git worktree add ../kova-build-c04 app/cluster-04-stripe
git worktree add ../kova-build-c12 app/cluster-12-settings

git worktree list   # verify all 3 attached
```

Launch 3 fresh Claude Code sessions, one per worktree directory. Paste the per-cluster prompt in each.

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-main/kova-build-c01` (W8a worktree). Opus 4.7.

---

## PROMPT (paste verbatim)

```
You are the W8a execution-phase agent for Kova. Build Cluster 01 —
auth + identity + Shopify OAuth + GDPR foundation.

You are running in a parallel-3 wave. Two sibling agents are
simultaneously building Clusters 04 (Stripe) and 12 (Settings) in
their own worktrees. You must not push to or read from their branches.

## Worktree discipline

You are in a git worktree at /Users/jihoyang/kova-build-c01.
Your branch is app/cluster-01-auth — already checked out.

DO NOT:
- Run `git worktree add` (founder already set up worktrees)
- Run `git checkout <other branch>` (would detach this worktree)
- Push other branches (only push app/cluster-01-auth)

DO:
- `git status` to confirm clean
- `git branch --show-current` → must print app/cluster-01-auth
- Commit per Plan task on app/cluster-01-auth
- Push every 5-8 commits

If confused about which branch you're on or which directory you're in,
STOP and ask founder via AskUserQuestion.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/kova-final-prds/01-auth-and-identity.md
4. docs/kova-final-impl-plans/01-auth-and-identity-plan.md
5. docs/execution-phase/claude-design-files/README.md  (REFERENCE ONLY — plan supersedes per Mandate 8; ignore conflicts between this README and the plan)
6. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md  (CANONICAL FIDELITY CONTRACT — read end-to-end. §0 is the 3-rule formulation: (1) visual values are copied, (2) DOM structure is translated, (3) behavior is engineered. "Copy DOM verbatim" is FORBIDDEN. Phase 1 gate = KOVA_AUDIT.md + tokens-used.md before any Vue. Visual-diff thresholds 0.1% component / 0.5% screen. 3-screenshot PR artifact per surface.)
7. CLAUDE.md
8. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
7. Hi-fi: /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A1 Onboarding - Dark.html
8. Auth pages use LIGHT theme: kova-hifi-light.css

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:executing-plans
3. superpowers:test-driven-development
4. superpowers:code-reviewer (at cluster end)

## Conditional subagents

- database-reviewer — Plan 01 has heavy SQL (rate_limits table, users
  table, audit_log inserts, GDPR cron RPCs)
- security-auditor — MANDATORY at cluster end (auth/OAuth/JWT —
  founder lock)
- vue-expert — auth pages are Vue Composition API + Reka Dialog +
  light theme
- e2e-runner — Shopify OAuth round-trip + signup → signin → signout

## Cluster 01 scope (per Plan §6 phases)

- Migration: rate_limits table + bump_rate_limit RPC
- Migration: users table additions (deleted_at, restored_at, etc.)
- Migration: audit_log inserts wired in 4 Edge Fns
- Edge Fns (api/auth/):
  - signup
  - signin (signInWithPassword per B-CRIT13 fix)
  - signInAs (admin impersonation, signInWithPassword)
  - email-change-requested
  - account-deletion-requested
  - account-restored
  - account-hard-deleted (cron triggered)
- Shopify OAuth flow:
  - /api/auth/shopify/install
  - /api/auth/shopify/callback
  - /api/auth/shopify/revoke (DELETE /admin/api_permissions/current.json
    per B-CRIT7 fix)
- GDPR cron stub: claim_pending_deletion_users RPC + Vercel cron handler
  (env-guarded)
- Vue auth pages:
  - SignupView + SigninView + PasswordResetView (LIGHT theme)
  - OnboardingShopifyView (DARK theme — first authenticated page)
  - DangerZoneCard (Account page surface — composes KovaModal from
    Cluster 11)
- Privacy + Terms pages (verbatim lift of docs/legal/
  anthropic-subprocessor-disclosure.md per CT-019 follow-up)
- 1 Resend template wired (account-deletion-confirmation)

## Hi-fi references

- Auth pages: kova-hifi-light.css + the light onboarding HTML
- Onboarding Shopify step: batch-a/dark/Kova Hi-Fi A1 Onboarding - Dark.html
- DangerZoneCard: batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html
  (look for "Danger zone" section)
- Account deletion modal: batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html

## Branch + commits

Branch: app/cluster-01-auth (already checked out)
Worktree path: /Users/jihoyang/kova-build-c01

Pre-flight (run inside worktree):
  pwd                                      # /Users/jihoyang/kova-build-c01
  git status
  git branch --show-current                # must be app/cluster-01-auth

Commit format:
  feat(c01-tNN): <task>
  test(c01): <test>
  fix(c01-review): <issue>

ONE COMMIT PER PLAN TASK. Push every 5-8 commits:
  git push origin app/cluster-01-auth

## Per-task flow

Per task in Plan 01 §6:
1. RED: write test → run → fail
2. GREEN: minimal impl → run → pass
3. REFACTOR
4. bun run check / format / test:unit / test:dupes
5. Commit

For Edge Fns: integration test against local Supabase (supabase start).
For Shopify OAuth: mock Shopify endpoints in tests; only real round-trip
in e2e-runner at cluster end.

## Design-system compliance

Light theme for auth pages (kova-hifi-light.css).
Dark theme for onboarding + account surfaces (kova-hifi.css).
Every Vue component uses the Reka UI wrappers from Cluster 11
(KovaModal, KovaPopover, etc.).
Every icon = <KovaIcon name="...">.
Zero <style> blocks. Zero new tokens. Zero hex literals.

## Cluster-end gates (mandatory)

1. All Plan tasks committed
2. bun run build succeeds
3. bun run test:unit — all green
4. supabase migration up succeeds locally; RLS verified
5. bun run check — zero violations
6. security-auditor agent — PASS (no CRITICAL/HIGH)
7. database-reviewer agent — PASS on migrations + RPCs
8. superpowers:code-reviewer — PASS
9. e2e-runner agent — Shopify OAuth round-trip; signup → onboarding →
   dashboard redirect
10. Playwright visual diff on auth pages + DangerZoneCard — ≤ 2%

## Done report

Path: docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md
Founder reviews + merges into feat/m9-shopify (sequential merges
across W8 cluster branches).

## Print when done

  W8a CLUSTER 01 DONE. <N> commits pushed to app/cluster-01-auth.
  Sibling clusters 04 + 12 may still be running.

Begin.
```

---

**Estimated wall-clock: 6-10h (Opus). Token spend: $200-400.**
