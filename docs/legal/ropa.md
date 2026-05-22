# Record of Processing Activities (RoPA)

**Last updated:** 2026-05-21
**Owner:** Privacy & Compliance (privacy@kova.io)
**Internal document — not user-facing.** This is the GDPR Art. 30 record required of every controller.

## Controller

- **Name:** Kova
- **Contact:** privacy@kova.io
- **EU Representative:** [TODO(legal): designate if Kova has EU users — required per Art. 27 if no EU establishment]
- **DPO:** [TODO(legal): designate if required — not mandatory at MVP scale per Art. 37 unless processing involves regular and systematic monitoring of data subjects on a large scale]

## Processing purposes

| Purpose | Lawful basis | Categories of data | Categories of recipients | Retention | Cross-border transfers |
|---|---|---|---|---|---|
| User account management | Art. 6(1)(b) contract performance | Email, name, hashed password (none — passwordless), timezone | Supabase Auth (US) | Lifetime of account + 30-day soft-delete window | US (Supabase) under SCCs |
| Subscription billing | Art. 6(1)(b) contract performance | Email, name, billing address, card last-4 (held by Stripe), plan tier | Stripe (US) | Stripe-side: per Stripe retention policy. Kova-side: until account deletion. | US (Stripe) under SCCs |
| Brand + canvas design workspace | Art. 6(1)(b) contract performance | User-uploaded designs, brand kits, fonts, color palettes, image assets | Supabase (DB + Storage, US) | Lifetime of account + 30-day soft-delete | US (Supabase) under SCCs |
| Shopify storefront integration | Art. 6(1)(a) explicit consent via OAuth | OAuth access token, shop domain, product/collection/inventory metadata | Shopify (US), Supabase (storage of OAuth token in encrypted Vault) | Until user disconnects shop OR account deleted | US (Shopify, Supabase) under SCCs |
| AI generation + brand-voice inference | Art. 6(1)(b) contract performance | Chat prompts, model outputs, storefront content snippets | Anthropic (US) | Anthropic-side: 30 days per default policy; Kova-side: until account deletion | US (Anthropic) under SCCs. Pre-launch goal: migrate to Anthropic ZDR (Zero Data Retention). |
| Transactional email (account events) | Art. 6(1)(b) contract performance + Art. 6(1)(f) legitimate interest (security notifications) | Email address, account event metadata | Resend (US) | Resend-side: 90 days per default; Kova-side: not retained beyond send | US (Resend) under SCCs |
| Operational telemetry (error reports) | Art. 6(1)(f) legitimate interest (service stability) | Stack traces, request IDs (no PII by design) | Sentry (US, when wired pre-launch) | Sentry-side: 90 days | US (Sentry) under SCCs |

## GDPR deletion cascade

When a user requests account deletion (Art. 17 right to erasure), the following cascade runs:

1. **Soft-delete (immediate)** — `users.deleted_at = now()`; user signed out; cascade queue enqueues 5 step rows
2. **Restore window (days 0–30)** — user can re-activate by signing in; cancellation reversible
3. **Hard-delete (day 30)** — daily cron at 03:00 UTC walks pending queue rows in fixed order:
   1. **stripe** — cancel subscription + delete Stripe Customer
   2. **shopify** — per-brand OAuth token revoke via Shopify Admin API
   3. **anthropic** — DB delete of chat history; queue manual deletion request to Anthropic privacy@
   4. **storage** — purge user-scoped objects across media-assets / canvas-snapshots / thumbnails / brand-fonts buckets
   5. **db** — `DELETE FROM users` (cascades brands, canvases, media, etc.)
4. **Final confirmation email** to the saved email address

Retry policy: per-step idempotent retry up to 5 attempts; terminal failure pages Sentry and pauses the cascade for operator intervention. Concurrent cron isolates collapse safely via `SELECT FOR UPDATE SKIP LOCKED`.

## Anthropic — manual deletion follow-up

Anthropic does not yet offer programmatic data deletion. The cron step inserts a row into `anthropic_deletion_log` with `status = 'queued_for_manual_request'`. Operator (Jiho or designated SRE) drains weekly per `docs/operations/anthropic-manual-deletion-runbook.md`. Anthropic ZDR onboarding planned post-launch to eliminate this manual step.

## Security controls

- TLS 1.2+ for every data flow
- AES-256 encryption at rest (Supabase Postgres + Storage)
- OAuth tokens stored in Supabase Vault (pgsodium-encrypted)
- Service-role secrets server-only (never in browser bundle — CI grep gate)
- Row-Level Security (RLS) on every public table
- Constant-time secret compare on cron-secret verification

## Breach notification

In the event of a personal data breach: notify the supervisory authority within **72 hours** (Art. 33) and affected data subjects without undue delay if high risk (Art. 34). Internal escalation runbook: [TODO(legal): create].

---

<!-- TODO(legal): assess Art. 35 DPIA (Data Protection Impact Assessment)
     requirement for the brand-voice inference flow. Anthropic processing
     of storefront content + AI-derived brand voice MAY qualify as
     "innovative use" requiring a DPIA. Recommend lawyer review pre-launch. -->
