# Privacy Policy — Stripe + Cluster 04 amendment

> Stripe sub-processor disclosure added per PRD 04 §5.5. This file extends the
> main privacy policy with the categories required when Stripe Checkout +
> Customer Portal go live (Cluster 04 Phase B).

## Sub-processors

We use **Stripe, Inc.** as a sub-processor to process payments for subscriptions.

Stripe collects and stores the following categories of personal data on our behalf:

- Cardholder name and billing address
- Payment card number, expiration date, and CVV (held by Stripe — never reaches Kova servers)
- Subscription status, billing cycle dates, and invoice history
- Email address (passed from Kova as the Stripe Customer's email)

Stripe processes payment data under PCI-DSS Level 1 compliance. Kova never sees, stores, or transmits raw card numbers.

Stripe data retention: Stripe retains payment and invoice records for 7 years per applicable financial regulations, **independent of Kova's own data retention policy**. Deletion of a Kova account triggers a `customer.delete` call to Stripe (Cluster 01 GDPR cron, D-2 amendment 2026-05-17), removing the Stripe Customer object — but invoice history persists in Stripe per their statutory retention.

## Data categories collected by Cluster 04

| Category | Purpose | Retention |
|---|---|---|
| Stripe Customer ID (`stripe_customer_id`) | Link Kova user to Stripe account | Deleted on account-deletion |
| Subscription metadata (`plan`, `plan_status`, `current_period_end`, `cancel_at_period_end`) | Plan-gate features, dunning UX | Cleared on subscription-deleted |
| Avatar image (256×256 PNG) | Profile display | Removed on account-deletion |
| Webhook idempotency log (`stripe_webhook_events`) | Prevent double-processing | 90-day rolling window (manual prune Phase B) |
| Shopify connection audit (`shopify_connection_history`) | Per-brand connection / sync audit trail | Cascades on brand deletion |

## User preferences (Cluster 12 disclosure)

We store cross-device user preferences (accessibility settings — text size, reduce motion, high contrast; notification opt-ins — product updates, Shopify sync alerts; last-active brand selection) in the `users.preferences` JSONB column. Preferences are read on app load, written atomically on each toggle, and removed with the user account on hard-deletion via the Cluster 01 GDPR cascade.

## Your rights

You can:
- View your subscription state in `/account/billing`
- Cancel via Stripe Customer Portal (opened from Account → Plan & billing → Manage billing)
- Request account deletion from Account → Danger zone (Cluster 01 owns the flow)

For full details, see the main privacy policy + Stripe's privacy notice at <https://stripe.com/privacy>.
