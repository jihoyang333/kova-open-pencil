# W8b — Cluster 04 (Stripe + GDPR Cascade) Execution Prompt

**Wave:** W8 (parallel-3: 01, 04, 12)
**Cluster:** 04 — Account + Stripe Billing + GDPR cascade
**Status:** ready after W7 merged
**Prerequisites:** W6 + W7 merged; W8 worktrees set up (see W8a doc)
**Worktree:** YES — `/Users/jihoyang/kova-build-c04`

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-build-c04`. Opus 4.7.

---

## PROMPT (paste verbatim)

```
You are the W8b execution-phase agent for Kova. Build Cluster 04 —
Account page + Stripe billing + GDPR cascade.

You are running in a parallel-3 wave. Siblings building Clusters 01
and 12. Do not push to / read from their branches.

## Worktree discipline

Worktree at /Users/jihoyang/kova-build-c04. Branch app/cluster-04-stripe.

DO NOT run `git worktree add`, `git checkout <other>`, push other
branches.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/kova-final-prds/04-account-and-stripe-billing.md
4. docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md
5. docs/execution-phase/claude-design-files/README.md  (hi-fi bundle overview, authority chain, fidelity rule, screen inventory)
6. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md  (authoritative HTML → Vue translation method + Appendix A per-property extraction checklist; mockup wins; per-screen diff loop)
7. CLAUDE.md
8. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
9. Hi-fi: /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html (+ Plan 04 §Hi-fi Visual Reference table for full inventory)
10. Stripe SaaS guide (use context7 MCP for current docs):
    - Checkout Session + Customer Portal + webhook patterns

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:executing-plans
3. superpowers:test-driven-development
4. superpowers:code-reviewer (at end)

## Conditional subagents

- database-reviewer — billing schema + GDPR cascade RPCs
- security-auditor — MANDATORY at cluster end (payments + webhook
  signature verification + raw-body reader)
- vue-expert — Account page sub-tabs (Profile / Plan & Billing / Brand
  Kit / Integrations / Danger zone)
- context7 MCP — verify current Stripe + Resend APIs

## Cluster 04 scope

- Stripe Checkout Session Edge Fn
- Stripe Customer Portal Session Edge Fn
- Stripe webhook handler (raw-body reader + signature verify per
  B-CRIT12 lock)
- users table Stripe-tied columns (stripe_customer_id, plan_status with
  'trialing' in CHECK per B-CRIT15, plan_tier, etc.)
- plan_status CHECK includes 'trialing' (per CT-008)
- 4 Resend templates (per Plan 04 §6, refactored to <EmailShell> per
  W5a C-MED13):
  - subscription-new
  - subscription-upgraded
  - subscription-cancelled
  - payment-failed
- Account page full-page route /account with sub-routes:
  - /account (profile default)
  - /account/billing
  - /account/brand-kit (cross-link to Cluster 03)
  - /account/integrations
  - /account/danger-zone
- BrandPicker 3-mode (per PRD 04 founder lock)
- Avatar upload (PNG/JPG, 5MB max per founder lock)
- GDPR cascade: users.deleted_at + Stripe customer delete via cron
  (cross-cluster contract per project_pre_prd_audit_ratified memory)
- delete-account-cron Edge Fn (cascades Stripe + Shopify + Anthropic +
  Storage + DB)

## Hi-fi references

- Account page chrome: batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html
- Account modals (delete confirmation, etc.): batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html
- Account popovers: batch-a/dark/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html

## Branch + commits

Branch: app/cluster-04-stripe
Path: /Users/jihoyang/kova-build-c04

Commit format:
  feat(c04-tNN): <task>
  test(c04): <test>
  fix(c04-review): <issue>

ONE COMMIT PER PLAN TASK. Push every 5-8 commits.

## Per-task flow

Per Plan 04 §6:
1. RED → GREEN → REFACTOR
2. For Stripe Edge Fns: mock Stripe SDK in unit tests; real Stripe test
   mode in e2e-runner at end
3. For webhook handler: verify raw-body reader uses Buffer.from(req.body)
   per B-CRIT12; signature verify uses stripe.webhooks.constructEvent
   with rawBody + signature header + secret
4. For Resend templates: each composes <EmailShell> from Cluster 11 +
   buildEmail() helper

## Design-system compliance

Account page = dark theme.
4 Resend templates use <EmailShell> (Cluster 11) — light theme for
emails per design system.
Avatar upload UI matches A7 hi-fi (cropper modal pattern).
Every form input = .input + variants.
Every CTA = .btn + variants.
Modal chrome = .dlg + .dlg-head/body/foot.
Zero new tokens. Zero hex literals.

## Cluster-end gates

1. All Plan tasks committed
2. bun run build / check / test:unit / test:dupes — all green
3. supabase migration up — RLS verified
4. security-auditor — PASS (CRITICAL focus on Stripe webhook + GDPR
   cascade)
5. database-reviewer — PASS on GDPR cron RPCs (FOR UPDATE SKIP LOCKED,
   search_path lock)
6. superpowers:code-reviewer — PASS
7. e2e-runner — Checkout session round-trip (Stripe test mode), Customer
   Portal redirect, webhook delivery (use Stripe CLI listen)
8. Playwright visual diff Account page sub-tabs — ≤ 2%

## Done report

Path: docs/execution-phase/cluster-reports/W8b-cluster-04-DONE.md

## Print when done

  W8b CLUSTER 04 DONE. <N> commits pushed to app/cluster-04-stripe.

Begin.
```

---

**Estimated wall-clock: 6-10h (Opus). Token spend: $200-400.**
