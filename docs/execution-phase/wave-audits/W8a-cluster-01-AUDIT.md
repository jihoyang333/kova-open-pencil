# W8a — Cluster 01 (Auth + Identity) AUDIT Prompt

**Wave:** W8a
**Cluster:** 01 — Auth, identity, Shopify OAuth, GDPR cron stub
**Audit type:** Security-critical. Auth flows, secret handling, RLS, OAuth, GDPR.
**Status:** ready after W8a execution agent prints DONE banner
**Prerequisites:** Branch `app/cluster-01-auth` exists in worktree `/Users/jihoyang/kova-build-c01`. DONE report at `docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md`. NOT yet merged.

---

## Founder pre-flight

1. W8a execution agent has printed DONE
2. `app/cluster-01-auth` pushed to origin
3. W8a sibling clusters (04, 12) may still be running — that's fine, audit each independently
4. Local Supabase available for migration replay (`supabase start`)

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-build-c01` (the worktree) OR `/Users/jihoyang/kova-main/kova-open-pencil-1` with `app/cluster-01-auth` checked out. Opus 4.7. Paste prompt below verbatim.

---

## PROMPT (paste verbatim)

```
You are the W8a AUDIT agent for Kova. Independent reviewer. You did
NOT write the W8a code. Verify Cluster 01 (auth + identity) shipped
correctly, completely, and SECURELY before merge into feat/m9-shopify.

Cluster 01 is security-critical. Be paranoid. Auth flows leak data
loudly when they fail. Shopify OAuth bypass = customer-data
exfiltration. Service-role-key in browser = full-database
compromise. Treat every finding as if it shipped to production
tomorrow.

You are READ-ONLY. No pushing, amending, rebasing. May run local
gates + write report. Surface CRITICAL findings mid-audit via
AskUserQuestion.

## Mandatory reading (in this order)

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
4. docs/execution-phase/execution-prompts/W8a-cluster-01-auth.md
   (the ORIGINAL execution prompt — your scope boundary)
5. docs/kova-final-prds/01-auth-and-identity.md (WHY)
6. docs/kova-final-impl-plans/01-auth-and-identity-plan.md (HOW)
7. docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md
   (self-report — verify, don't trust)
8. CLAUDE.md root + outer-repo CLAUDE.md
9. ~/.claude/rules/common/security.md
10. ~/.claude/rules/common/coding-style.md
11. ~/.claude/rules/common/testing.md

## Mandatory skills (invoke in order)

1. superpowers:using-superpowers
2. superpowers:verification-before-completion
3. security-review (skill)
4. superpowers:receiving-code-review

## Mandatory subagents

1. security-auditor — full security audit on auth surfaces. Target:
   Edge Functions (signup, signin, signInAs, email-change-requested,
   account-deletion-requested, account-restored,
   account-hard-deleted, shopify/install, shopify/callback,
   shopify/revoke), migrations (rate_limits, users table additions,
   audit_log inserts), Vue auth views, Resend template wiring.
   Demand CRITICAL / HIGH / MEDIUM / LOW findings.
2. database-reviewer — review migrations + RPCs (bump_rate_limit,
   claim_pending_deletion_users). Verify RLS, parameterized SQL,
   index sufficiency, no SECURITY DEFINER abuse.
3. superpowers:code-reviewer — full diff sweep against
   feat/m9-shopify.

## Conditional subagents

- e2e-runner — re-run Shopify OAuth round-trip + signup→signin
  smoke if W8a execution agent's e2e-runner artifacts are stale.
- vue-expert — auth Vue pages (light theme + dark onboarding).
- typescript-pro — only if generic-heavy code in diff.

## Cluster 01 expected scope (from PRD + Plan)

ALLOWED files in diff:
- supabase/migrations/*.sql — rate_limits, users-table additions,
  audit_log inserts wiring
- supabase/functions/auth/* — Edge Functions per execution prompt
  scope list
- supabase/functions/cron/claim_pending_deletion_users.ts (or
  similar Vercel cron handler)
- src/views/auth/* — SignupView, SigninView, PasswordResetView,
  OnboardingShopifyView
- src/components/account/DangerZoneCard.vue
- src/views/legal/PrivacyView.vue, TermsView.vue
- src/router/* — auth route guards + redirects
- src/stores/auth.ts — Pinia auth store
- src/composables/useAuth.ts (or equivalent)
- supabase/functions/_shared/resend.ts (or equivalent) + 1 Resend
  template (account-deletion-confirmation)
- tests/* — unit + integration + e2e

FORBIDDEN files in diff:
- packages/core/** — ANY change is a CRITICAL scope violation
  (Cluster 01 lock NOT lifted)
- src/views/canvas/** — Cluster 06+ scope
- src/stores/canvas.ts or any canvas state
- Any change to existing OpenPencil editor surfaces

## Audit dimensions

### A. Branch + diff baseline

  cd /Users/jihoyang/kova-build-c01  # or main worktree
  git fetch origin
  git log --oneline feat/m9-shopify..app/cluster-01-auth
  git diff --stat feat/m9-shopify...app/cluster-01-auth

Verify:
- Branch off feat/m9-shopify
- One commit per Plan task (~15-25 expected for c01)
- Conventional commit format (feat(c01-tNN), test(c01), fix(c01-review))
- No --no-verify usage (check for hook bypasses)
- No files touched outside ALLOWED list above

### B. SECRET handling — CRITICAL category

Grep diff exhaustively. Any hit = CRITICAL:

  # Server-only secrets MUST NOT have VITE_ prefix
  git diff feat/m9-shopify...app/cluster-01-auth | grep -E \
    'VITE_SUPABASE_SERVICE_ROLE_KEY|VITE_ANTHROPIC_API_KEY|VITE_STRIPE_SECRET|VITE_STRIPE_WEBHOOK|VITE_SHOPIFY_API_SECRET'

  # Hardcoded secrets / keys / tokens
  git diff feat/m9-shopify...app/cluster-01-auth | grep -iE \
    'sk_live|sk_test|whsec_|shpat_|shpss_|password\s*=\s*["'"'"'][^"'"'"']{4,}'

  # Service role key referenced in src/ (browser code)
  git grep -nE 'SUPABASE_SERVICE_ROLE_KEY' src/ 2>/dev/null

  # ANTHROPIC_API_KEY in src/
  git grep -nE 'ANTHROPIC_API_KEY' src/ 2>/dev/null

  # Shopify api secret in src/
  git grep -nE 'SHOPIFY_API_SECRET' src/ 2>/dev/null

Each hit = CRITICAL. STOP audit and surface immediately via
AskUserQuestion before continuing.

### C. RLS + migration safety

Open every new .sql migration. Verify per file:
- ALTER TABLE … ENABLE ROW LEVEL SECURITY present where appropriate
- Every new table has explicit policy CREATE POLICY statements
- Policies reference auth.uid() correctly, NOT bypassed
- No SECURITY DEFINER without explicit justification + audit_log
  insertion
- bump_rate_limit RPC is parameterized; no SQL string concatenation
- audit_log inserts wired into all 4 Edge Fns (signup,
  account-deletion-requested, account-restored,
  account-hard-deleted)

Run migration locally:

  supabase db reset --local        # if clean local DB available
  # OR
  supabase migration up --local

Verify no errors. Use database-reviewer agent for deeper sweep.

### D. Edge Function security (per file)

For each Edge Fn under supabase/functions/auth/:
- Auth gate: verify the caller (auth.uid() or admin token where
  appropriate)
- Input validation: every body field validated (valibot per Kova
  convention) before use
- Rate limit: bump_rate_limit invoked at entry
- audit_log insert before returning (where the action mutates user
  state)
- Error responses do NOT leak DB column names, stack traces, or
  PII (verify error.message is generic)
- CORS configured correctly (no wildcard for credentialed routes)
- No use of supabase admin client beyond what is necessary

Specific checks:
- signup: signs in via supabase.auth.signUp; password complexity
  enforced; email confirmation flow correct
- signin: uses signInWithPassword per B-CRIT13 fix (NOT signIn or
  signInWithOAuth without password)
- signInAs (admin impersonation): admin-role check via auth_metadata
  + audit_log insert; service role key used server-side ONLY
- email-change-requested: token-based confirmation flow; old email
  notified
- account-deletion-requested: soft delete (deleted_at set), grace
  period before hard delete; immediate Stripe customer cancellation
  flag (verify Stripe handoff to Cluster 04 cron)
- account-restored: clears deleted_at + restored_at set; resumes
  Stripe customer
- account-hard-deleted: cron-triggered; verifies grace-period
  elapsed; cascades correctly; audit_log entry

### E. Shopify OAuth flow security

- /api/auth/shopify/install: builds OAuth URL with state param
  (CSRF protection); state stored server-side (DB or signed cookie);
  scopes match PRD spec
- /api/auth/shopify/callback: verifies HMAC signature; validates
  state param matches stored; exchanges code for access token over
  HTTPS; stores access_token encrypted at rest (verify column
  encryption or pgsodium / pgcrypto usage)
- /api/auth/shopify/revoke: calls DELETE
  /admin/api_permissions/current.json per B-CRIT7 fix; verifies
  caller owns the shop; deletes local token only on revoke success
- access_token NEVER returned to browser
- Shopify API secret NEVER in src/ or browser bundle

### F. GDPR cron stub

- claim_pending_deletion_users RPC: SECURITY DEFINER allowed for
  cron use case but MUST verify caller is service role
- Vercel cron handler: env-guarded (skip if cron env var not set);
  no manual trigger from browser; audit_log insert per claim
- Soft-delete grace period matches PRD value (verify against PRD
  01 §"GDPR / account deletion")

### G. Vue auth pages

- Light theme: SignupView / SigninView / PasswordResetView use
  kova-hifi-light.css; no dark theme leakage
- Dark theme: OnboardingShopifyView uses kova-hifi.css
- Reka primitives: KovaModal / KovaPopover / KovaInput from
  Cluster 11 (no raw <dialog>, <input type=text>, etc. without
  the K* wrapper)
- KovaIcon used everywhere (no raw <svg>, no Unicode glyphs, no
  Lucide direct imports)
- No <style> blocks in any .vue file in diff
- No hardcoded hex / px outside class names / @apply
- DangerZoneCard composes KovaModal (cluster 11 primitive)
- Privacy + Terms pages: verbatim lift of
  docs/legal/anthropic-subprocessor-disclosure.md per CT-019

### H. Resend template wiring

- 1 template wired (account-deletion-confirmation per Plan)
- Template uses Resend SDK from server only (Edge Fn)
- Resend API key from env, never browser
- Per [project_external_accounts_deferred.md] memory: Resend may
  be MOCKED during dev; verify mock interface matches real SDK
  signature

### I. Founder-locked decisions (PRD 01 §"Founder locks")

From [project_prd04_decisions.md] memory cross-reference:
- D-2 AMENDED: Stripe Customer deleted on account-deletion via
  Cluster 01 cron — verify the cron handler signals Cluster 04's
  Stripe customer-cancellation path (or at minimum, schedules a
  downstream task; Cluster 04 implements the actual Stripe call)
- B-CRIT7 fix: shopify/revoke uses DELETE
  /admin/api_permissions/current.json
- B-CRIT13 fix: signin uses signInWithPassword

Each founder lock that isn't honored in code = HIGH.

### J. Hard-constraint grep sweep

  git diff feat/m9-shopify...app/cluster-01-auth -- 'src/**' \
    | grep -E 'Math\.random|: any|!\.[a-zA-Z]|<style|style scoped|<svg'

Any hit = CRITICAL.

  git diff feat/m9-shopify...app/cluster-01-auth -- 'src/ai/**' \
    | grep -E "from 'zod'"

Any hit = CRITICAL (Zod ban in tools layer per CLAUDE.md root).

### K. Quality gates (re-run)

  bun install
  bun run build
  bun run check
  bun run test:unit
  bun run test:dupes

Plus Supabase:
  supabase migration up --local
  # then verify with database-reviewer

Compare to DONE-report claims. Any mismatch = HIGH.

### L. Code-review sweep

Spawn superpowers:code-reviewer with brief:
  "Audit feat/m9-shopify...app/cluster-01-auth diff. Focus: auth
  Edge Functions for input validation + error-message PII leakage
  + audit_log coverage; migration RLS correctness; Shopify OAuth
  CSRF + HMAC + token-storage encryption; Vue auth pages for
  Cluster 11 primitive reuse + theme correctness; immutability per
  ~/.claude/rules/common/coding-style.md; CLAUDE.md hard
  constraints. Return CRITICAL / HIGH / MEDIUM / LOW."

### M. Plan task completion matrix

Walk Plan 01 §6 task-by-task. Each task → matching commit → diff
verifies acceptance criteria. Missing or mismatched = HIGH.

### N. Done-report accuracy + deferred items

Spot-check 5 random claims. Every deferred item must be tracked
in CHANGELOG-KOVA.md or PRD-follow-up doc.

### O. Cross-cluster handoffs

Verify the Cluster 04 + 11 + 12 handoffs are explicitly documented:
- Cluster 04: Stripe customer cancellation hook on
  account-hard-deleted
- Cluster 11: DangerZoneCard consumes KovaModal primitive
- Cluster 12: settings page composes the same DangerZoneCard
  (audit verifies the component is exported, not embedded)

## Output

Write to:
  docs/execution-phase/wave-audits/reports/W8a-cluster-01-AUDIT-REPORT.md

Format (same as W7 audit template):

  # W8a — Cluster 01 AUDIT REPORT
  **Verdict:** ✅ PASS | ⚠️ PASS WITH WARNINGS | 🛑 BLOCK

  ## Summary
  ## Findings (CRITICAL / HIGH / MEDIUM / LOW)
  ## Quality gates (re-run results)
  ## Plan task completion matrix
  ## Scope discipline
  ## Security findings (separate top-level section — auth is
  security-critical)
  ## Cross-cluster handoffs
  ## Recommended action

When done, print:
  "W8a AUDIT COMPLETE. Verdict: <PASS|PASS-WITH-WARNINGS|BLOCK>.
  <N> findings (<C> CRITICAL, <H> HIGH, <M> MEDIUM, <L> LOW).
  Report: docs/execution-phase/wave-audits/reports/W8a-cluster-01-AUDIT-REPORT.md"

Begin. Mandatory docs first.
```

---

**Estimated wall-clock: 60-90 min (Opus). Token spend: $80-150 (auth audits run deep).**
