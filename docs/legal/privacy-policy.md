# Privacy Policy

**Effective date:** 2026-05-21
**Last updated:** 2026-05-21

> **Engineering draft — legal review required pre-launch.** Required text marked with TODO(legal) comments.

## 1. Who we are

Kova ("Kova", "we", "us", "our") is a design tool for freelance email marketers and the brands they manage. This policy explains what personal data we collect, why, and how to exercise your rights.

If you have questions about this policy or your data, contact us at **privacy@kova.io**.

## 2. What we collect

| Category | Examples | Source |
|---|---|---|
| Account data | email address, name | You, at signup |
| User preferences | accessibility (text size, motion, contrast), view, notification opt-ins | You, in `/account` settings |
| Brand data | brand name, logo, brand kit (fonts, colors, voice snippets) | You, in the app |
| Canvas data | email designs, layout, copy, image assets you upload | You, in the canvas editor |
| Shopify store data | OAuth token, shop domain, product/collection/inventory metadata | Shopify (via OAuth, with your authorization) |
| AI generation content | chat prompts, model outputs, storefront content analyzed for brand-voice inference | Generated when you use Kova's AI features |
| Operational telemetry | error reports, crash diagnostics (no PII) | Automatic |

> Preferences (accessibility, view, notifications) are stored on your account row and synced across your devices when you sign in. They contain no third-party data.

## 3. Why we collect it (lawful basis under GDPR Art. 6)

- **Contract performance (Art. 6(1)(b))** — to provide the Kova service you signed up for
- **Legitimate interest (Art. 6(1)(f))** — diagnostics, abuse prevention, service security
- **Consent (Art. 6(1)(a))** — Shopify storefront data access (granted via OAuth consent screen)

## 4. Who we share with (sub-processors)

We share data ONLY with the following sub-processors. Each is contractually bound to handle your data per this policy.

| Sub-processor | Purpose | Data shared |
|---|---|---|
| **Stripe, Inc.** | Subscription billing | Email, name, billing address, card last-4, plan tier |
| **Shopify, Inc.** | Storefront data integration (only for brands you connect via OAuth) | OAuth token, shop domain |
| **Anthropic PBC** | AI generation + brand-voice inference | Chat prompts, brand voice descriptions, **storefront content (e.g. product titles, descriptions, collection names) analyzed for brand-voice inference** |
| **Resend, Inc.** | Transactional email delivery | Email address, send metadata |
| **Supabase Inc.** | Database + auth + file storage hosting | All user data (encrypted at rest) |

> **D-3 disclosure:** Storefront content is sent to Anthropic to infer your brand voice when you generate AI content for a connected Shopify brand. This is the most data-sensitive flow in Kova. If you disconnect Shopify from a brand, no new storefront content is sent.

## 5. Data retention

| Event | Retention |
|---|---|
| Active account | Data retained while your account is open |
| Account deletion request | **30-day soft-delete window** — you can restore by signing in within 30 days |
| After 30 days | Data permanently deleted: Stripe Customer canceled, Shopify OAuth revoked, AI conversation history erased, Supabase Storage purged, database row deleted |
| Supabase backups | **7-day point-in-time recovery (PITR)** — backups expire 7 days after deletion, then the data is fully irrecoverable |
| Anthropic data | Inference data retained by Anthropic for **30 days** per their default retention. Kova queues deletion requests to Anthropic for manual processing weekly (full programmatic deletion not yet available; we are migrating to Anthropic Zero Data Retention post-launch). |

## 6. Your rights under GDPR

| Right | How to exercise |
|---|---|
| **Art. 15 — Access** | Email privacy@kova.io with subject "GDPR Access Request" |
| **Art. 16 — Rectification** | Update your profile in `/account` |
| **Art. 17 — Erasure** | Go to `/account` → Danger zone → Delete account |
| **Art. 20 — Portability** | Email privacy@kova.io with subject "GDPR Portability Request" |
| **Art. 21 — Objection** | Email privacy@kova.io |
| **Right to lodge a complaint** | Contact your local data protection authority |

We respond to verified rights requests within **30 days**.

## 7. International transfers

Data is processed in the United States (Supabase, Stripe, Anthropic, Resend) and may be transferred to other jurisdictions where our sub-processors operate. Transfers are governed by Standard Contractual Clauses (SCCs) per GDPR Art. 46.

## 8. Cookies and tracking

Kova uses Supabase Auth cookies (session, refresh token) only. We do not use third-party analytics, advertising, or cross-site tracking cookies.

## 9. Security

- Data encrypted at rest (Supabase Postgres + Storage)
- Data encrypted in transit (TLS 1.2+)
- Service-role secrets never exposed to the browser
- OAuth tokens stored encrypted in Supabase Vault
- Row-Level Security (RLS) on every database table

## 10. Children's privacy

Kova is not directed to children under 16. If you believe a child has provided us with personal data, contact privacy@kova.io.

## 11. Changes to this policy

Material changes will be announced via email and via an in-app notice 30 days before they take effect.

---

<!-- TODO(legal): pre-launch attorney review.
     Specific items needing legal sign-off:
     - DPO requirement (likely not required at MVP scale; reassess at scale-up)
     - SCC clause specifics (Stripe + Anthropic + Resend agreements)
     - Local data protection authority pointer (jurisdiction-dependent)
     - California CCPA addendum
     - Brexit / UK GDPR addendum
-->
