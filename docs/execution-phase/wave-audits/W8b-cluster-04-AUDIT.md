# W8b — Cluster 04 (Stripe + Account Billing) AUDIT Prompt

**Wave:** W8b
**Cluster:** 04 — Stripe checkout/portal/webhooks, account page, GDPR cascade cron, 4 Resend templates
**Audit type:** Security-critical (Stripe webhook signature, GDPR cascade, raw-body reader). Compliance-critical (subscription lifecycle audit_log).
**Status:** ready after W8b execution agent prints DONE
**Prerequisites:** Branch `app/cluster-04-stripe` exists (worktree `/Users/jihoyang/kova-build-c04`). DONE report at `docs/execution-phase/cluster-reports/W8b-cluster-04-DONE.md`. NOT yet merged.

---

## Founder pre-flight

1. W8b execution agent has printed DONE
2. `app/cluster-04-stripe` pushed
3. Sibling W8 clusters (01, 12) may still be in flight
4. Stripe test-mode keys available locally for replay (founder-only)

---

## Launch

Fresh Claude Code session. Opus 4.7. Paste prompt verbatim.

---

## PROMPT (paste verbatim)

```
You are the W8b AUDIT agent for Kova. Independent reviewer for
Cluster 04 — Stripe billing + GDPR cascade. You did NOT write the
W8b code.

Cluster 04 is security AND compliance critical. Stripe webhook
signature bypass = financial fraud risk. GDPR cascade gap = legal
liability. Raw-body reader corruption = silent signature mismatch
in production with no error surfaced. Be paranoid.

You are READ-ONLY. Run gates + write report only. Surface CRITICAL
findings mid-audit via AskUserQuestion.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
4. docs/execution-phase/execution-prompts/W8b-cluster-04-stripe.md
   (the ORIGINAL execution prompt — your scope boundary)
5. docs/kova-final-prds/04-account-and-stripe-billing.md (WHY)
6. docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md
   (HOW)
7. docs/execution-phase/cluster-reports/W8b-cluster-04-DONE.md
   (verify, don't trust)
8. CLAUDE.md root + outer
9. ~/.claude/rules/common/security.md

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:verification-before-completion
3. security-review
4. superpowers:receiving-code-review

## Mandatory subagents

1. security-auditor — Stripe webhook signature handling (B-CRIT12
   lock), raw-body reader pattern, GDPR cascade integrity, secret
   isolation
2. database-reviewer — users table Stripe columns (stripe_customer_id,
   plan_status with 'trialing' in CHECK per B-CRIT15), GDPR cron
   RPCs (FOR UPDATE SKIP LOCKED, search_path lock), RLS
3. superpowers:code-reviewer — full diff sweep
4. context7 MCP — verify Stripe SDK current best practice for
   webhook construction + Customer Portal session

## Conditional subagents

- vue-expert — Account page Vue surfaces (5 sub-routes)
- e2e-runner — re-run Stripe test-mode Checkout + Portal + webhook
  delivery (Stripe CLI listen) if execution agent's artifacts stale

## Cluster 04 expected scope

ALLOWED:
- supabase/migrations/*.sql — users table Stripe columns
- supabase/functions/stripe/* — Checkout, Customer Portal, webhook
  handler
- supabase/functions/cron/delete-account-cron.ts (or equivalent)
- supabase/functions/_shared/stripe.ts, _shared/resend.ts
- 4 Resend templates: subscription-new, subscription-upgraded,
  subscription-cancelled, payment-failed (each composes
  <EmailShell> per W5a C-MED13)
- src/views/account/* — full-page Account route + 5 sub-routes
  (/account, /account/billing, /account/brand-kit (cross-link),
  /account/integrations, /account/danger-zone)
- src/components/account/* — Avatar uploader/cropper, BrandPicker
  3-mode
- src/router/* — /account routes
- src/stores/account.ts, stripe.ts (or equivalent)
- tests/*

FORBIDDEN:
- packages/core/** — CRITICAL scope violation
- Auth Edge Fns (Cluster 01's scope)
- Canvas surfaces

## Audit dimensions

### A. Branch + diff baseline

  cd /Users/jihoyang/kova-build-c04  # or main worktree
  git fetch origin
  git log --oneline feat/m9-shopify..app/cluster-04-stripe
  git diff --stat feat/m9-shopify...app/cluster-04-stripe

Verify one-per-task commit discipline; conventional commits; no
files outside ALLOWED.

### B. SECRETS handling

  # Critical secrets exposed
  git diff feat/m9-shopify...app/cluster-04-stripe | grep -E \
    'VITE_STRIPE_SECRET|VITE_STRIPE_WEBHOOK|sk_live|sk_test|whsec_|rk_live'

  # Server-only keys leaking into src/
  git grep -nE 'STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET' src/ 2>/dev/null
  git grep -nE 'RESEND_API_KEY' src/ 2>/dev/null

Browser bundle MUST only see VITE_STRIPE_PUBLISHABLE_KEY (or
equivalent publishable key). Any secret-key leak = CRITICAL.

### C. Stripe webhook signature handling (B-CRIT12)

Open the webhook handler Edge Fn. Verify EXACTLY:
1. Raw body reader uses Buffer.from(req.body) or Deno raw bytes —
   NOT JSON.parse first, NOT text() first then re-stringify
2. stripe.webhooks.constructEvent(rawBody, signature, secret) is
   called with all three args
3. signature header is read from 'stripe-signature' (case-sensitive
   per Stripe spec)
4. Failure case throws / returns 400 BEFORE any DB write
5. Idempotency: event.id deduplicated via Cluster 11
   idempotency-key primitive (verify the cluster-11 idempotency
   helper is imported)
6. No try/catch swallowing signature errors

Any deviation = CRITICAL.

### D. plan_status CHECK constraint (B-CRIT15)

Open the migration adding plan_status:
- 'trialing' is in the CHECK constraint
- Other valid states cover Stripe subscription statuses (active,
  past_due, canceled, incomplete, incomplete_expired, paused, etc.)
- Default value matches PRD 04

Missing 'trialing' = CRITICAL (subscription writes will fail in
prod).

### E. GDPR delete-account-cron Edge Fn

Verify:
- SECURITY DEFINER scope minimized; search_path explicitly LOCKED
- FOR UPDATE SKIP LOCKED in the claim RPC (no double-processing)
- Cascade order: Stripe customer delete → Shopify token revoke →
  Anthropic memory delete (Cluster 10 contract) → Storage purge →
  DB row hard-delete (in that order — Stripe last = retry-safe;
  actually reverse: DB row last = idempotent retries)
- audit_log entry per cascade step with action + entity + outcome
- Grace period matches founder lock value
- Cron handler env-guarded (no manual browser trigger)
- Stripe customer delete uses stripe.customers.del(customer_id) and
  handles 404 gracefully (already deleted = success)

Each missing step = HIGH. Cascade-order bug = CRITICAL.

### F. Account page UI (5 sub-routes)

Verify the routes exist + render:
- /account (profile default)
- /account/billing
- /account/brand-kit (cross-link to Cluster 03 — must NOT
  re-implement Brand Kit; just navigate)
- /account/integrations
- /account/danger-zone

Each sub-route consumes:
- Cluster 11 primitives (KovaModal, KovaPopover, KovaInput,
  KovaButton, KovaTabs etc.)
- Dark theme (kova-hifi.css)
- KovaIcon for all icons
- No <style> / no hex / no raw <svg> / no Lucide direct import

Avatar uploader/cropper:
- PNG/JPG ONLY (per founder lock) — verify file-type check on
  client AND server (Edge Fn for upload)
- 5MB cap enforced client AND server
- Storage bucket has RLS limiting writes to owner only
- Cropper modal matches A7 hi-fi cropper pattern

BrandPicker 3-mode (per PRD 04 founder lock):
- Verify all 3 modes implemented (per PRD spec — likely
  switch / picker / quick-create per [project_prd04_decisions])
- Component is exported for reuse by Cluster 03

### G. Resend templates (4 total)

Each of subscription-new / subscription-upgraded /
subscription-cancelled / payment-failed:
- Composes <EmailShell> from Cluster 11 (W5a C-MED13 refactor)
- Uses buildEmail() helper if defined
- Light theme (email standard)
- No inline hex / no raw <style> blocks (email-safe inline styles
  are an exception but per Kova convention should still be tokens
  applied via the EmailShell wrapper)
- Wired to the correct Stripe event (subscription.created etc.)
- Resend SDK called from Edge Fn only, never browser

### H. Cross-cluster contracts

- Cluster 01: account-deletion-requested handoff → Cluster 04 cron
  cascade. Verify the contract is bidirectional (Cluster 01's cron
  signals or the Cluster 04 cron polls users.deleted_at correctly,
  per project memory entry)
- Cluster 03: BrandPicker exposed for /brands page reuse
- Cluster 10: Anthropic memory delete step in cascade (verify the
  contract is referenced even if implementation lands in Cluster 10)
- Cluster 11: <EmailShell>, idempotency, KovaModal, KovaInput

### I. Hard-constraint grep sweep

  git diff feat/m9-shopify...app/cluster-04-stripe -- 'src/**' \
    | grep -E 'Math\.random|: any|!\.[a-zA-Z]|<style|style scoped|<svg'

Any hit = CRITICAL.

  git diff feat/m9-shopify...app/cluster-04-stripe -- 'src/ai/**' \
    | grep -E "from 'zod'"

Any hit = CRITICAL.

### J. Quality gates (re-run)

  bun install
  bun run build
  bun run check
  bun run test:unit
  bun run test:dupes
  supabase migration up --local

Compare to DONE-report claims.

### K. Code-review sweep

Spawn superpowers:code-reviewer with brief:
  "Audit feat/m9-shopify...app/cluster-04-stripe. Focus: Stripe
  webhook signature handling (raw-body reader integrity per
  B-CRIT12), plan_status CHECK constraint (B-CRIT15), GDPR cascade
  ordering + idempotency, Resend EmailShell composition, Account
  Vue surfaces for Cluster 11 primitive reuse, CLAUDE.md hard
  constraints. Return CRITICAL/HIGH/MEDIUM/LOW."

### L. Plan task completion matrix + Done-report accuracy

Walk Plan 04 §6 task-by-task. Each task → commit → verified.
Spot-check 5 DONE-report claims.

## Output

  docs/execution-phase/wave-audits/reports/W8b-cluster-04-AUDIT-REPORT.md

Format same as W8a. Include separate "Security findings" + "Stripe
webhook handling" + "GDPR cascade" top-level sections.

Print:
  "W8b AUDIT COMPLETE. Verdict: <V>. <N> findings.
  Report: docs/execution-phase/wave-audits/reports/W8b-cluster-04-AUDIT-REPORT.md"

Begin. Mandatory docs first.
```

---

**Estimated wall-clock: 75-120 min. Token spend: $100-180.**
