# Stripe setup runbook — Cluster 04

> Operator checklist for wiring Stripe Test mode (Phase A staging) and Live
> mode (Phase B production) per PRD 04 §5.5.

## Phase A — Test mode (staging)

1. **Create Stripe account** at <https://dashboard.stripe.com/register>. Use the org email; enable test mode.
2. **Create products + prices**:
   - Product: `Kova Solo` — recurring monthly. Note the `price_…` id.
   - Product: `Kova Agency` — recurring monthly. Note the `price_…` id.
3. **Configure Customer Portal** at <https://dashboard.stripe.com/test/settings/billing/portal>:
   - Cancellations: enable, mode = `at_period_end` (founder D-8 lock).
   - Subscription updates: enable plan switching between Solo and Agency.
   - Invoice history: enable.
   - Promotion codes: enable.
4. **Create webhook endpoint** at <https://dashboard.stripe.com/test/webhooks>:
   - URL: `https://<staging-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
   - Copy the signing secret (starts with `whsec_…`).
5. **Set Vercel staging env vars**:
   ```
   STRIPE_SECRET_KEY=sk_test_…
   STRIPE_WEBHOOK_SECRET=whsec_…
   STRIPE_PRICE_ID_SOLO=price_…
   STRIPE_PRICE_ID_AGENCY=price_…
   ```
6. **Test the round-trip**:
   - Browse to `/account/billing` and click "Upgrade to Solo".
   - Complete Checkout with test card `4242 4242 4242 4242`, any future date, any CVC.
   - Confirm `/account/billing/success` landing renders + the PlanCard now shows "Active" + Solo.
   - Verify `users.plan_status='active'`, `users.stripe_subscription_id` set, `audit_log` has stripe.subscription.created row.
7. **Test Customer Portal**:
   - Click "Manage billing" — opens Stripe Portal in a new tab.
   - Cancel subscription (at_period_end). Confirm webhook fires + `cancel_at_period_end=true`.
8. **Test webhook locally with Stripe CLI**:
   ```
   stripe listen --forward-to localhost:1420/api/stripe/webhook
   stripe trigger invoice.payment_failed
   ```
   Confirm Kova handler marks `plan_status='past_due'` + sends dunning email (stub-logged if RESEND_API_KEY unset).

## Phase B — Live mode (production)

1. Complete Stripe identity verification (business details, bank account).
2. Activate Live mode.
3. Duplicate products + prices in Live mode (Stripe doesn't copy from Test).
4. Re-configure Customer Portal in Live mode (mirror Phase A settings).
5. Create Live webhook endpoint at production URL.
6. Set Vercel Production env vars:
   ```
   STRIPE_SECRET_KEY=sk_live_…
   STRIPE_WEBHOOK_SECRET=whsec_…  (DIFFERENT from test mode)
   STRIPE_PRICE_ID_SOLO=price_…   (Live ids)
   STRIPE_PRICE_ID_AGENCY=price_…
   ```
7. Run smoke checklist:
   - Real customer (founder card) upgrades, downgrades, cancels.
   - Verify dunning email lands (RESEND_API_KEY must be set by Phase B).
   - Verify reconcile cron runs Monday 05:00 UTC.

## GDPR cascade verification

Cluster 01's `gdpr_deletion_queue` worker calls `stripe.customers.del(stripe_customer_id)` for users whose `deleted_at` passes the 30-day grace window. Smoke this once in staging by:
1. Soft-delete a test user (`users.deleted_at = now() - interval '31 days'`).
2. Trigger the GDPR cron manually.
3. Confirm the Stripe Customer is deleted via dashboard.

## Reconcile cron

Weekly Mon 05:00 UTC (configured in `vercel.json`). Walks `users` where `plan_status='past_due'`, retrieves Stripe subscription, heals to `active` on match. Logs each heal via `writeAudit` with `eventType='stripe.reconcile.heal'`.

## Operator alerts

- Webhook failure rate > 5% in any 15-min window → Sentry alert (deferred to Phase B per memory `project_external_accounts_deferred`).
- Reconcile cron returns 5xx → Vercel cron alert.

Last updated: 2026-05-22 (Cluster 04 W8b).
