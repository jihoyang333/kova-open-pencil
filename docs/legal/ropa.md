# Record of Processing Activities (RoPA) — Cluster 04 amendment

> Adds the Stripe row required for GDPR Article 30 documentation per PRD 04 §5.5.

| Activity | Data category | Source | Recipients | Legal basis | Retention |
|---|---|---|---|---|---|
| **Payment processing (Stripe)** | Cardholder identity, billing address, card token (Stripe-held), subscription state | User input via Stripe Checkout / Customer Portal | Stripe, Inc. (sub-processor) | Performance of contract (Art. 6(1)(b)) | 7 years per Stripe (statutory financial-records retention) |
| Webhook ledger | Stripe event ID, type, payload hash, optional `user_id` | Stripe → /api/stripe/webhook | None (internal) | Legitimate interest — fraud prevention + idempotency | 90 days (manual prune) |
| Subscription mirror (`users` columns) | `stripe_customer_id`, `stripe_subscription_id`, `plan`, `plan_status`, `current_period_end`, `cancel_at_period_end` | Stripe webhooks | None (internal) | Performance of contract | Until account deletion (Stripe Customer also deleted via Cluster 01 cron — D-2 amendment 2026-05-17) |
| Avatar storage | 256×256 PNG image (server-normalized via sharp) | User upload via `/api/account/avatar-upload` | None (Supabase Storage media-assets bucket, public-read) | Consent (user chose to upload) | Until removal or account deletion |
| Shopify connection audit | brand_id, event_type, source, metadata (shop_domain, scopes, sync stats) | Shopify OAuth + sync handlers | None (internal) | Legitimate interest — audit + sync debugging | Cascade-deleted on brand removal |

## Cross-cluster contracts

- **Cluster 01 GDPR cron** ([gdpr_deletion_queue](../../supabase/migrations/20260423_m9_*.sql) workers) calls `stripe.customers.del(stripe_customer_id)` as part of the account-deletion cascade. Stripe invoice history persists per Stripe's statutory retention.
- **Cluster 11 audit_log** receives every Stripe state-change event via `writeAudit(supabase, { eventType, user_id, payload, clusterOwner: '04' })`.

Last updated: 2026-05-22 (Cluster 04 W8b).
