# Handoff: External Soundness Verification of Pre-PRD Decisions

> **You are the independent verifier.** Your job is to evaluate whether the decisions recorded
> below are **sound, internally consistent, and the best choices for the long-term health of the
> product and its customers**. This is the FINAL gate before Kova begins authoring its 12 feature
> PRDs. If our reasoning is weak, short-sighted, or wrong, say so now — it is far cheaper to fix a
> decision here than after PRDs and code are built on top of it.
>
> This is **not** a code audit. It is a **reasoning audit**. Do we have the right answers, for the
> right reasons, for the long term?

---

## 0. How to use this document

1. Read §1 (context) so you understand what Kova is and where we are.
2. Read §2 — **the verification mandate**. It tells you what "sound" means here and, critically,
   **which official sources you must check claims against.**
3. Work through §3 — every decision, grouped, each with: what the audit flagged, what we decided,
   our reasoning, reversibility, and **what you specifically should scrutinize**.
4. Read §4 (the Shopify architecture redesign — a major change worth its own scrutiny).
5. Read §5 (the six non-decision follow-ups we caught).
6. Produce your output per §6.

**Required reading before you start:**
- `docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md` — the comprehensive audit this handoff responds to (2,585 lines).
- `docs/prd/00-PRD_SCOPE_PLAN.md` — the 12-cluster / 6-wave PRD plan (see esp. §5.5 + §5.6 ratification log).
- `docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md` — the Shopify redesign (§4 below).
- `CLAUDE.md` — Kova's hard constraints, conventions, and founder communication directives.
- `docs/superpowers/handoffs/design-overhaul/q1-5-answers-*.md` and `q6-25-answers-*.md` — the founder's original Q1–Q25 decisions, with their Figma citations.

---

## 1. Context — what Kova is, and where we are

**Kova** is an AI-powered email-design SaaS built as a layer on top of **OpenPencil**, an
open-source, Figma-compatible design editor. Kova adds authentication, onboarding, a brand-profile
dashboard, campaign-specific AI generation, image-slice export, and a Shopify integration on top of
OpenPencil's existing canvas editor, renderer, and scene graph.

**The customer (the "avatar"):** a **freelance email marketer who manages campaigns for multiple
client brands**. The data model is `User → Brand (1:1 with a Shopify shop) → Canvases`. There is no
"workspace" or "team" layer. This avatar drives many decisions below — when in doubt, ask "is this
the best choice for a solo freelancer juggling many client brands?"

**Where we are:** Six months of product decisions (captured as Q1–Q25, plus hi-fi mockups and a
design system) were stress-tested by a comprehensive pre-PRD audit (`00c`). That audit returned
**⚠️ REQUIRES FOUNDER RATIFICATION** — the foundation was judged strong (all 25 Q-decisions PASS),
but ~40 open items needed a founder yes/no before PRD authoring could safely begin. The founder has
now ratified every one of them. **This handoff records every ratification with its reasoning, and
asks you to confirm the reasoning is sound before we proceed.**

**The founder is non-technical.** They rely on the soundness of recommendations. A conservative or
short-sighted recommendation that a non-technical founder cannot independently sanity-check is
dangerous. Hold every decision below to the standard: *"would a staff engineer who deeply
understands this product approve this, for the long term?"*

**Kova's stated bias:** *build for the best product, not the easiest build.* Overbuilding a bit now
is acceptable; underbuilding creates refactoring debt and a worse customer experience. If a decision
below looks like it cut a corner, flag it.

---

## 2. The verification mandate

### 2.1 What "sound" means here

For **every** decision in §3 and §4, evaluate it on four axes:

1. **Internally consistent** — does it contradict another decision, a Q1–Q25 answer, the design
   system, or a founder-locked constraint in `CLAUDE.md`?
2. **Best for the long term** — in 6–24 months, with thousands of users and many client brands per
   user, does this hold up? Or does it create a refactor cliff?
3. **Best for the customer** — does it serve the freelance-email-marketer avatar, or does it
   optimize for our build convenience at their expense?
4. **Correctly grounded** — where a decision claims to "match Figma" / "match Stripe" / "be
   GDPR-compliant" / etc., **is that claim actually true?** See §2.2.

### 2.2 🔍 CRITICAL — verify claims against official primary sources. Do this often.

Many decisions below rest on a claim like *"this matches how Figma does it"* or *"this is the Stripe
best practice."* **You must not take those claims on trust. Re-verify them against the official
primary source.** The audit (`00c`) did this via WebFetch; you must independently re-confirm,
because a wrong "Figma-exact" claim that ships into a PRD becomes wrong code.

**For anything touching Figma — and many decisions do — go to Figma's official sites:**
- **`https://developers.figma.com/`** — the Figma Plugin/API docs. Use for data-model claims
  (node types, fields, scene-graph shape).
- **`https://help.figma.com/`** — the Figma Help Center. Use for UX/behavior claims (shortcuts,
  version history cadence, mask types, export settings, eyedropper scope, trash retention,
  keyboard-shortcut taxonomy, copy/paste-properties behavior, drag-drop behavior).

When a decision says "Figma-exact" or "matches Figma" or "better than Figma," **open the relevant
Figma page and confirm.** If Figma has changed since the audit (the audit is dated 2026-05-13), or
if the original claim was imprecise, flag it. **Cite the exact Figma URL and the exact quote in
your output.** Err on the side of checking too much rather than too little — the founder has
explicitly asked that Figma's official sources be consulted *explicitly and often*.

**Other official sources you must use the same way:**
- Stripe — `https://docs.stripe.com/` (webhook events, Customer model, idempotency, Customer Portal)
- Shopify — `https://shopify.dev/` (OAuth, token revocation, mandatory compliance webhooks, bulk operations)
- Supabase — `https://supabase.com/docs/` (RLS, Realtime, pg_cron, CLI migrations, PITR)
- Vercel — `https://vercel.com/docs/` (Cron, Logs, Analytics, Edge/Fluid Compute, deployment/rollback)
- Anthropic — `https://docs.anthropic.com/` (AI SDK usage, streaming, tool use)
- Nuxt — `https://nuxt.com/docs/` (SSR, deployment) — relevant to a founder-override decision below
- GDPR — `https://gdpr-info.eu/` (Art. 17 erasure, Art. 19 notification)

If you cannot verify a claim, say so explicitly — "unverified" is a valid and important finding.

### 2.3 What to scrutinize hardest

- **The one founder override** — decision **D-5C (SSR / add Nuxt now)**. The auditor recommended
  *against* it; the founder chose it anyway. Give this your most honest, most direct evaluation.
- **HARD-to-reverse decisions** — these cost the most if wrong. They are tagged `HARD` below.
- **Any "matches Figma" claim** — per §2.2.
- **Anything that looks like it serves build-convenience over the customer.**
- **The Shopify architecture redesign (§4)** — it replaces a substantial chunk of already-built M9
  code. Is the replacement model genuinely better, and is the migration plan complete?

---

## 3. The decisions — every audit point, addressed and justified

The comprehensive audit surfaced its founder-facing items as a **Top 10 Priority list** plus a
**Part 2 gap-fill** (cross-cutting infrastructure, architecture, and tooling decisions). Below is
every one, with our reasoning.

### 3.A — The Top 10 Priority Items (audit items #1–#10)

#### D-1 · M9 Shopify surfaces are light-themed — **DECISION: fix pre-launch**
- **Audit flag:** Three M9 Shopify surfaces (`StoreTypeStep.vue`, `IntegrationsCard.vue`,
  `SettingsBrandIntegrationsView.vue`) use light-theme Tailwind utilities (`bg-white`,
  `text-gray-900`, `border-gray-200`). This violates Kova's locked design rule: **dark inside the
  authenticated app, light only on marketing + auth.** Onboarding and settings are inside the
  authenticated app.
- **Decision:** Refactor all three to Kova dark tokens **before launch** (not deferred to Phase 2).
  Estimated ~6–12 hours total.
- **Reasoning:** The dark-app / light-marketing+auth split is a founder-locked design rule modeled
  on Figma's own app. Shipping three light-themed surfaces inside a dark app is a visible
  inconsistency a customer notices immediately. The drift exists only because M9 was built by an
  autonomous agent that was never given the design-system constraint — it is not a deep problem,
  just unfinished theming. 6–12 hours pre-launch is cheap insurance against a first-impression
  quality hit.
- **Reversibility:** TRIVIAL (template / class edits).
- **🔍 Verifier scrutiny:** Confirm the dark-app rule is genuinely a locked constraint (see
  `CLAUDE.md` and the design system). Is "fix pre-launch" right, or is there a credible argument to
  defer? We believe consistency at launch outweighs 6–12 hours.

#### D-2 · Stripe Customer scope — **DECISION: one Stripe Customer per user, forever**
- **Audit flag:** Q13 ("user-level Plan & Billing scope") implies one Stripe Customer per user, but
  this was never *explicitly* ratified. Reversal is HARD.
- **Decision:** **One Stripe Customer per User, all brands billed under it, forever.** Per-brand
  billing (agency-style client pass-through billing) is explicitly out of scope.
- **Reasoning:** Kova's avatar is a freelance email marketer who pays for Kova as *their* design
  tool and manages many client brands inside it. They are not re-billing their clients through
  Kova; Kova is not a billing platform. One subscription, one Customer, many brands under it
  matches the avatar exactly. Leaving this implicit risks a future PRD assuming per-brand billing
  and creating an unrecoverable split.
- **Reversibility:** **HARD** — reversing later requires a migration on every Stripe Customer record
  plus creating a new Customer per existing brand.
- **🔍 Verifier scrutiny:** This is HARD to reverse — scrutinize it. Is one-per-user genuinely right
  for this avatar long-term? Could a freelance marketer ever legitimately need to bill clients
  separately *through Kova*? We say no — that would make Kova a billing/agency platform, which is a
  different product. Confirm against the Stripe Customer model on `docs.stripe.com` that
  one-Customer-many-brands is clean (it is — brands are our concept, not Stripe's).

#### D-3 · M9 `brand-kit-extract` scope — **DECISION: extend to voice + tone snippets**
- **Audit flag:** `api/shopify/brand-kit-extract.ts` extracts colors/fonts/logo from the Shopify
  theme only. Q8 put **tone snippets** (and brand voice) in MVP scope. The extract does not populate
  them.
- **Decision:** Extend the `brand-kit-extract` Edge Function so that, on Shopify connect, it also
  scrapes the storefront (About page, product-description corpus) and uses a Claude API call to
  infer **brand voice** and seed **initial tone snippets** — alongside the existing colors/fonts/logo.
- **Reasoning:** "Connect Shopify → your Brand Kit fills itself" is the magic moment of onboarding.
  A thin extract (colors/fonts/logo only) undersells it and leaves the customer to hand-write voice
  and tone snippets. Voice and tone are inferable from storefront content. This is the
  "build-better, not easier" call.
- **Reversibility:** SOFT (extends an Edge Function).
- **🔍 Verifier scrutiny:** Is auto-populating voice via an LLM call sound, or should the scraped
  voice be presented as a **suggested draft the user confirms/edits** rather than written silently?
  We lean toward "suggested draft" being the safer UX — give us your view. Also: is scraping a
  Shopify storefront's About page within Shopify's API terms? Check `shopify.dev`.

#### D-4 · M9 Integrations information architecture — **DECISION: align to Q12/Q13**
- **Audit flag:** M9 built Settings → Integrations at `/dashboard/:brandId/settings/integrations`
  (a per-brand URL-param route). Q12 + Q13 ratified a single `/account` page with a per-brand
  picker **dropdown** at the section top.
- **Decision:** Reconcile M9's route to the **Q12/Q13 pattern** — `/account/integrations` with a
  brand-picker dropdown. M9's URL-param route gets refactored.
- **Reasoning:** Q12/Q13 are the audited, internally-consistent spec. M9 drifted only because the
  agent that built it never had the Q12/Q13 spec. The Account page is the canonical home for
  Profile, Plan & Billing, Brand Kit, Integrations, and Danger Zone — Integrations living somewhere
  else fragments the mental model. A brand dropdown is consistent with how Brand Kit (also
  per-brand) is specced to work on the same page.
- **Reversibility:** SOFT (URL change + Vue Router refactor).
- **🔍 Verifier scrutiny:** For a freelancer managing *many* brands, is a single Account page with a
  brand-dropdown genuinely better than per-brand routes? We say yes (one consistent home, matches
  the rest of the Account page). Consider whether deep-linking to a specific brand's integration
  state is still possible with the dropdown pattern (it should be, via a query param).

#### D-5 · Eight cross-cutting infrastructure picks — **DECISION: ratify auditor defaults**
- **Audit flag:** Eight infrastructure choices were unmade; if each PRD invents its own answer the
  system fragments.
- **Decision (all eight ratified as the auditor's recommended option):**
  | Pick | Ratified choice |
  |---|---|
  | Rate limiting | Per-endpoint + per-user via a Supabase RPC pattern (extends the existing M5 atomic rate-limit RPC), `rate_limits` table, sliding window |
  | Background job queue | Vercel Cron + Supabase Edge Functions; `pg_cron` for in-DB scheduling. No third-party queue. |
  | Email service | Resend |
  | File upload caps | Images 10 MB, fonts 10 MB, snapshot blobs 50 MB; per-brand quotas (100 MB snapshots, 500 MB media, 50 MB fonts) |
  | Storage bucket layout | `{brand_id}/...` path-prefix buckets with path-prefix RLS (**HARD** — path layout is a URL contract) |
  | Feature flags | Hard-coded constants in `@/constants.ts` + a `usePlanGate()` composable |
  | Error tracking | Sentry (`@sentry/vue` + `@sentry/node`), email alerts at MVP |
  | Migration runner | Supabase CLI (`supabase db push`), timestamped `.sql` files, `supabase db diff` drift check in CI |
- **Reasoning:** Each is an MVP-appropriate default that keeps the infrastructure count low (Vercel
  + Supabase + a couple of focused SaaS tools). The auditor's tradeoff analysis in `00c §2.B` is
  sound. Locking them now prevents per-PRD divergence.
- **Reversibility:** Mostly SOFT; **storage bucket layout is HARD.**
- **🔍 Verifier scrutiny:** Scrutinize the HARD one — the `{brand_id}/...` storage path layout.
  Confirm against `supabase.com/docs` that path-prefix RLS on Storage is a supported, robust
  pattern. Also: feature-flags-as-hard-coded-constants — fine for MVP, but confirm there is a clean
  upgrade path to a real flag service later (there is — flag *names* stay stable, only the
  mechanism changes).

#### D-6 · 18 failing unit tests — **DECISION: classify as test-debt, triage in Wave 6**
- **Audit flag:** 18 unit tests fail. The audit's best-effort root-cause: pre-existing Reka/Vue
  JSDOM mock-setup issues, **not** related to the M9 schema bug (which was fixed 2026-05-13 — 22
  tests pass post-fix).
- **Decision:** Classify the 18 as **test-debt.** Tag them `.skip` with a FIXME reference so CI is
  green; triage and fix them in the Wave 6 cleanup pass. Explicitly out of scope for Waves 1–5 PRDs.
- **Reasoning:** They are not schema-related and not M9's fault — they are JSDOM/Reka mock rot.
  E2E tests cover the underlying user flows. Blocking all PRD work on pre-existing mock rot would be
  disproportionate.
- **Reversibility:** SOFT.
- **🔍 Verifier scrutiny:** Is deferring to Wave 6 safe, or could mock-rot be masking a real
  regression? Our position: E2E coverage backstops the user flows, and the audit found zero
  schema-related failures post-fix. If you think the 18 should be triaged *before* Wave 1, say so.

#### D-7 · 20 uncommitted files — **DECISION: committed (done)**
- **Audit flag:** 20 modified files sat uncommitted on `feat/m9-shopify` — the schema-bug fix and
  the sync polling-fallback were live but uncommitted.
- **Decision / status:** **Done.** Committed in a clean 3-commit split: M9 code / docs / chore. Git
  status is clean.
- **Reasoning:** Clean git state before PRD work touches Shopify code.
- **Reversibility:** TRIVIAL.
- **🔍 Verifier scrutiny:** None needed — verify only that `git log` shows the three commits if you
  wish.

#### D-8 · M9 sync-history accordion renders empty — **DECISION: build `shopify_connection_history` table**
- **Audit flag:** `SettingsBrandIntegrationsView.vue` renders a sync-history accordion, but
  `Connection.history` is a TypeScript field with **no backing DB column** — it always resolves to
  empty.
- **Decision:** Build a `shopify_connection_history` table (Cluster 04 PRD owns it) and wire the
  accordion to it.
- **Reasoning:** A sync-history audit trail is genuinely useful for the avatar — a freelancer
  managing many client shops wants to see when each last synced and whether it succeeded. Cluster 04
  PRD needs the schema regardless. Ripping the UI would discard a real feature; building the table
  is the "build-better" call.
- **Reversibility:** SOFT.
- **🔍 Verifier scrutiny:** Is a sync-history table worth it for MVP, or is it gold-plating? We say
  keep it — multi-shop freelancers want the audit trail, and it is a small table.

#### D-9 · `delete-account-cron` GDPR cascade not built — **DECISION: Cluster 01 builds it**
- **Audit flag:** Q15 specified a `delete-account-cron` Edge Function (the GDPR account-deletion
  cascade orchestrator). M9 did not implement it.
- **Decision:** Cluster 01 (Auth & Identity) PRD builds it, plus a `gdpr_deletion_queue` retry
  table for partial-failure handling. Surfaced explicitly as a launch blocker in the Cluster 01 PRD.
- **Reasoning:** This was always Cluster 01's scope — it is not an M9 omission, it is just not built
  yet because Cluster 01 has not been authored. Surfacing it as a launch blocker ensures it is not
  forgotten.
- **Reversibility:** HARD (it is tied to the privacy policy and RoPA).
- **🔍 Verifier scrutiny:** Confirm against `gdpr-info.eu` Art. 17 + Art. 19 that the cascade design
  in Q15 (Stripe delete → Shopify disconnect/revoke → Anthropic purge → Storage purge → DB cascade,
  30-day soft-delete window, daily cron) is genuinely compliant. The audit verified this; please
  re-confirm.

#### D-10 · PRD 07 is too large — **DECISION: split into 07a + 07b**
- **Audit flag:** Cluster 07 (Canvas Engine Extensions) is estimated at 50–60 spec sections — too
  large for one reviewable PRD.
- **Decision:** Author it as **07a (Core mods + Renderer)** and **07b (Inspector wiring + Overlays)**.
- **Reasoning:** The natural seam is engine internals vs. UI wiring. Splitting keeps each PRD
  reviewable by a non-technical founder.
- **Reversibility:** TRIVIAL (it is a planning/authoring choice).
- **🔍 Verifier scrutiny:** None needed — confirm the split seam (engine vs. UI) is the right one if
  you have an opinion.

### 3.B — The five genuinely-open Part 2 decisions

These were explicitly tagged `REQUIRES FOUNDER RATIFICATION` in `00c §2.B/§2.C/§2.D` and were not
covered by the Top 10.

#### D-5B-i · Logging strategy — **DECISION: Vercel Logs (structured JSON to stdout)**
- **Reasoning:** Free, native to the Vercel platform, no additional service. Sentry was already
  chosen for error tracking (D-5), so there is no need for logging to overlap with it. A queryable
  log drain (Axiom/BetterStack) can be added post-MVP if needed.
- **Reversibility:** SOFT.
- **🔍 Verifier scrutiny:** Is plain Vercel Logs queryable enough for production debugging at MVP
  scale? We accept the tradeoff; confirm against `vercel.com/docs` that a log drain is a clean
  later add.

#### D-5B-ii · Pre-commit hooks — **DECISION: lefthook**
- **Reasoning:** Fast (Go binary), runs `format` + `check` (lint + type-check) + a commit-message
  linter. TRIVIAL to swap.
- **🔍 Verifier scrutiny:** Minimal. Confirm lefthook integrates cleanly with a Bun project.

#### D-5C · SSR vs SPA — **DECISION: add Nuxt / SSR now ⚠️ FOUNDER OVERRIDE**
- **Audit recommendation:** *Stay on the Vite SPA.* The marketing site is out of MVP scope; auth
  pages run light-theme on the same SPA; Nuxt can be added later as an additive project with no
  migration pain.
- **Founder's decision:** **Add Nuxt / SSR now anyway.**
- **Founder's reasoning:** They want the SSR foundation in place from day one — a forward-looking
  bet that a marketing site is coming and they would rather not migrate later.
- **The honest tradeoff (presented to the founder before they confirmed):** The editor and
  dashboard are inherently SPA — a canvas editor cannot be server-rendered. Auth pages do not need
  SEO. The marketing site does not exist yet. So SSR/Nuxt buys little user-facing benefit at MVP,
  while adding a second framework and a second build pipeline that every PRD wave must carry. The
  auditor rated this **SOFT/additive** — i.e. adding Nuxt *later* is clean.
- **Reversibility:** SOFT (additive — the SPA stays; Nuxt is added alongside).
- **🔍 VERIFIER — SCRUTINIZE THIS HARDEST.** This is the **one decision where the founder went
  against the audit recommendation.** Give your most direct, most honest assessment:
  - Is adding Nuxt/SSR now genuinely the best long-term call, or is it premature infrastructure
    that taxes every wave for a benefit that lands later (or never, if the marketing site is built
    differently)?
  - Check `nuxt.com/docs` — what does it actually take to add Nuxt to an existing Vite SPA
    repository later vs. now? Is "additive later" as clean as the auditor claims?
  - Is there a middle path the founder has not considered (e.g. a tiny static marketing site on
    plain HTML/Astro, decoupled from the app entirely)?
  - If you believe "stay SPA now" is clearly better, **say so plainly** — the founder explicitly
    wants to be told if a decision is short-sighted.

#### D-5D · Browser-only vs Tauri-first — **DECISION: browser-first, Tauri secondary**
- **Reasoning:** Matches Figma's model (browser-first, zero install friction). Tauri ships as a
  secondary deploy artifact. Tauri-only features (screen-wide eyedropper) are already Phase-2
  deferred per Q20. Feature-detection via `window.__TAURI__` gates native-only features.
- **Reversibility:** SOFT (both deploy together; only the priority shifts).
- **🔍 Verifier scrutiny:** Confirm browser-first does not strand any MVP-critical feature behind
  Tauri. Per Q20, screen-wide eyedropper is the only known Tauri-only feature and it is already
  Phase-2.

#### D-5E · Test environment — **DECISION (revised): local Supabase + CI ephemeral Postgres now; staging project deferred**
- **Audit recommendation:** A separate, persistent Supabase staging project (~$25/mo).
- **Revised decision:** Use **local Supabase (via the Supabase CLI — full Postgres + RLS in Docker,
  free)** plus a **CI ephemeral Postgres (a throwaway database spun up per test run, free)** now.
  **Defer** the persistent staging project until closer to launch.
- **Reasoning:** The bug classes the audit was worried about — **RLS-policy bugs** (a row-security
  rule too loose or too tight) and **migration-order bugs** (a migration that assumes a
  not-yet-created column, or is not idempotent) — are caught by *any real Postgres*. Local Supabase
  and CI ephemeral both provide a real Postgres for free. The persistent $25/mo staging project's
  distinct value is being an always-on production *mirror* for manual smoke testing, stable E2E,
  and future team QA — none of which a solo MVP founder needs yet.
- **Reversibility:** SOFT (the staging project can be added at any time).
- **🔍 Verifier scrutiny:** Confirm against `supabase.com/docs` that local Supabase via the CLI and
  a CI ephemeral Postgres genuinely exercise RLS policies and migration ordering the same way
  production does. If there is a class of bug only a persistent staging project catches, name it.

### 3.C — The 29 batch-ratified "Recommended decision" items

The audit's `§2.B/§2.C/§2.D` contained 29 further items where the auditor had already chosen a
recommended option and the choice was MVP-standard practice (several are *forced* by `CLAUDE.md`
mandates or the existing codebase). The founder reviewed the full list and **ratified all 29 as the
auditor recommended.** They are listed here so you can scan for any that are short-sighted.

**Cross-cutting infrastructure (`§2.B`, remaining 5):**
| # | Decision | Ratified choice | Rev. |
|---|---|---|---|
| 2.B.5 | MIME type validation | Server-side magic-number sniff (`file-type`) + extension + header must all agree | TRIVIAL |
| 2.B.7 | Webhook signature verification | Stripe `constructEvent` HMAC-SHA256; Shopify HMAC-SHA256; idempotency via stored event IDs | HARD |
| 2.B.9 | Caching | Supabase Realtime for live data; SWR-style Pinia wrapper; Vercel edge cache for static assets; Service Worker → Phase 2 | SOFT |
| 2.B.12 | Monitoring | Vercel Analytics (Web Vitals) + Speed Insights + Supabase Dashboard for DB | SOFT |
| 2.B.13 | Anthropic API key mgmt | One key per environment, server-only (never `VITE_`-prefixed), 429 retry with backoff (max 3) | TRIVIAL |

**Architecture (`§2.C`, 13):**
| # | Decision | Ratified choice | Rev. |
|---|---|---|---|
| 2.C.3 | Local-first persistence sync | Yjs + y-indexeddb is runtime truth (CLAUDE.md: never modify); snapshot store syncs to Supabase; Realtime for non-canvas state; CRDT + last-write-wins | HARD* |
| 2.C.4 | Optimistic UI | Optimistic for cheap-rollback mutations (rename, toggle, snapshot-create); pessimistic for side-effect mutations (Stripe, account deletion, file upload) | SOFT |
| 2.C.5 | Offline → online migration | Yjs + y-indexeddb persists offline edits; on reconnect, resume Realtime + flush queued writes; no anonymous state | SOFT |
| 2.C.6 | Anonymous → authenticated | No anonymous state in MVP — user must be authenticated to reach the editor | TRIVIAL |
| 2.C.7 | Multi-device sessions | Yjs CRDT handles same-user concurrent edits transparently; no locking, no "another device" indicator (consistent with Q6 Solo MVP) | SOFT |
| 2.C.8 | Tab focus/blur | Autosnapshot pauses on blur, resumes on focus; `beforeunload` triggers a final snapshot | SOFT |
| 2.C.9 | Network failure UX | Global offline banner + per-action retry toasts; Yjs queues writes locally | SOFT |
| 2.C.10 | Database client | `@supabase/supabase-js` throughout, **no ORM**; types via `supabase gen types typescript` | HARD* |
| 2.C.11 | Realtime channel architecture | Per-canvas (snapshots, chat), per-brand (Shopify sync, memory), per-user (billing, deletion); ~4–6 concurrent per session | SOFT |
| 2.C.12 | Image export pipeline | CanvasKit `Surface.makeImageSnapshot().encodeToBytes()`; browser `canvas.toBlob()` fallback; sRGB | SOFT |
| 2.C.13 | Image-fill caching | `public.media` table + `media-assets` bucket; signed URLs (15-min TTL); browser Cache-Control | SOFT |
| 2.C.14 | AI streaming | `@ai-sdk/anthropic` + ToolLoopAgent (CLAUDE.md mandate); SSE from `/api/ai-proxy`; valibot validation | HARD* |
| 2.C.15 | Font loading + FOUT | Inter self-hosted + `font-display: swap`; preload in `index.html`; brand fonts registered with CanvasKit at runtime | SOFT |

**Tooling + ops (`§2.D`, 11):**
| # | Decision | Ratified choice | Rev. |
|---|---|---|---|
| 2.D.1 | CI/CD pipeline | Vercel for the SPA + Nuxt (preview + production); GitHub Actions for Tauri desktop builds on release tags | SOFT |
| 2.D.2 | Preview deployments | Per-PR Vercel Preview URL, password-protected | TRIVIAL |
| 2.D.3 | Production deploy + rollback | Auto-deploy on `main`; `vercel rollback`; migrations run pre-deploy in CI, blocking the deploy on failure | SOFT |
| 2.D.6 | Staging vs production isolation | Separate Supabase + separate Stripe account (test-mode keys) + separate Anthropic key per environment | SOFT |
| 2.D.7 | Secrets management | Vercel env vars per environment; server-only secrets never `VITE_`-prefixed; `.env.local` gitignored | TRIVIAL |
| 2.D.8 | Backup strategy | Supabase PITR 7-day (free tier) → 14-day on Pro + daily logical backups; S3 archival → Phase 2 | SOFT |
| 2.D.9 | Disaster recovery | RTO 4-hour target / RPO 1-hour target (via Supabase PITR + Yjs local cache) | SOFT |
| 2.D.10 | Performance budgets | Marketing/auth: LCP < 2.5s, CLS < 0.1, FID < 100ms. Editor: > 30fps at 50–300 nodes, cold-start < 3s | TRIVIAL |
| 2.D.11 | Accessibility audit | axe-core in E2E; manual VoiceOver pass on critical flows pre-launch; P0 violations (contrast, focus-visible, aria-label) block launch | SOFT |
| 2.D.12 | Privacy compliance | GDPR RoPA owned by Cluster 01; no cookie banner (Vercel Analytics is cookieless); PostHog/Plausible deferred | SOFT |
| 2.D.13 | Customer support channel | Email-only at MVP (`support@kova.app`); in-app "Help" → mailto; Intercom/HelpScout deferred until DAU > 1000 | TRIVIAL |

\* **`HARD*`** = HARD reversibility but **not genuinely open** — these are forced by a `CLAUDE.md`
mandate (2.C.3 Yjs-never-modify; 2.C.14 `@ai-sdk/anthropic` + ToolLoopAgent) or by the established
codebase pattern (2.C.10 `@supabase/supabase-js` is already used throughout). The founder ratified
them to make the existing reality explicit, not to choose anew.

- **🔍 Verifier scrutiny for §3.C:** Scan the whole list for anything short-sighted. Pay particular
  attention to: **2.B.7** (webhook signature verification — confirm the Stripe and Shopify HMAC
  patterns against `docs.stripe.com` and `shopify.dev`); **2.C.10** (no ORM — is `supabase-js` +
  RLS + RPC genuinely sufficient at scale, or will the absence of an ORM hurt?); **2.D.9** (a 4-hour
  RTO / 1-hour RPO — appropriate for an MVP, or too lax?). For the `HARD*` items, confirm they are
  in fact forced (read `CLAUDE.md`).

---

## 4. The Shopify product-reference architecture redesign

This is **not** an audit gap-fill item — it is a **major architectural redesign** that emerged
*after* the audit, when the founder reviewed how M9 actually worked. It is large enough, and
replaces enough already-built M9 code, that you should evaluate it as carefully as anything above.

**Full spec:** `docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md` — read it in
full.

**The problem it solves:** M9 built a **drag-to-place + live-binding** product model — drag a
product from the Shop panel onto the canvas, and it binds to a frame that stays synced to live
Shopify price/inventory. The founder rejected this: users do not manually place store items onto
the canvas.

**The replacement model (founder-validated 2026-05-14 via a structured brainstorm):** select
products in the Shop panel → **import them into the AI chat as a persistent reference** (removable
"chips" above the chat input) → the **AI** pulls images/titles/copy and inserts them into the canvas
itself, as static content. Nine decisions, D1–D9, are recorded in the spec with reasoning.

**🔍 Verifier scrutiny for §4:**
- Is the replacement model genuinely better than M9's drag-to-place model for the freelance-
  email-marketer avatar? (We believe yes — the AI is the design engine; the human curates *which*
  products, not *where* pixels go.)
- Is the **migration plan** (the spec's §5 — what to RIP, REWORK, KEEP) complete and safe? Ripping
  the `product-variant` canvas extension touches stores, components, routes, tests, and DB
  migrations. A separate dedicated spec-verification prompt exists for the deep file-level check;
  if you have tool access, you may also do that check, but at minimum evaluate whether the
  *reasoning* in §5 is sound.
- The spec says the AI inserts products using **existing tools only** (`CORE_TOOLS` from the
  OpenPencil engine + `placeMediaImage`) with **zero `packages/core/` changes**. Confirm that claim
  is plausible — `packages/core/` is read-only per `CLAUDE.md`.
- Does the design respect every `CLAUDE.md` hard constraint (image-export-only, valibot-not-zod in
  the tool layer, dark-app theme, no React/Next/PixiJS)?

---

## 5. The six non-decision follow-ups we caught during verification

While verifying that every audit flag had a ratification, we caught six items that are **not
founder decisions** but must not be lost. They are recorded here so you can confirm we have not
mis-categorized any of them (i.e. that none of these is *secretly* a decision that needs founder
input).

1. **The audit's manual smoke-test recipe is now stale.** `00c` Check 11 gives a 15-step manual
   test recipe, but steps 10–15 ("drag a product onto canvas", "verify price binding", "Unavailable
   badge") describe the **drag-to-place + live-binding model that §4 rips out.** The recipe needs a
   rewrite to match the new product-reference architecture. → Will be rewritten as part of the
   Shopify-touching PRDs.
2. **Three M9 onboarding polish FLAGs** (`00c` Check 1): (a) `access_token` is passed in a URL
   query string — a JWT in a URL lands in server logs / browser history (a real, if low, security
   concern); (b) no error UX on OAuth-start failure; (c) no re-entry handling if the user returns
   to onboarding mid-flow. → Routed to the Cluster 02 PRD. **Verifier: confirm (a) is correctly
   treated as a PRD-level fix and not something needing a founder decision now.**
3. **The 5 Shopify AI tools return empty silently when no Shopify is connected** (`00c` Check 5) —
   the AI cannot tell *why* a response is empty. → Routed to the Cluster 10 PRD (spec a
   `{ error: 'No Shopify connection' }` response shape).
4. **`--fill-2` hex drift** — `kova-hifi.css` says `#2c2c30`; `design.md` + `TOKEN_CANONICAL.md`
   say `#303035`. A known-correct, single-value fix. → Will be fixed directly.
5. **Five hidden cross-cuts** the audit found are missing from the PRD scope plan's §6 cross-cut
   table: Vue Router theme detection, Supabase Realtime channel-naming convention, the
   idempotency-key pattern for write Edge Functions, the Toast variant taxonomy, and the Tauri
   command-surface naming convention. → Will be added to `00-PRD_SCOPE_PLAN.md §6`.
6. **~20 "PRD XX must spec ___" action items** scattered through `00c`'s Q1–Q25 reviews, §1.B, and
   §1.E (e.g. add `checkout.session.completed` to the Stripe webhook event list; add a
   `canvas_snapshots.format_version` column; spec the crop-position drag UI). → Each is routed to
   its owning cluster PRD so no author misses it.

**🔍 Verifier scrutiny for §5:** Confirm none of these six is mis-categorized — i.e. that none is
actually a founder decision in disguise. If you think item 2(a) (the `access_token`-in-URL security
flag) or any other deserves a founder decision *now* rather than at PRD time, say so.

---

## 6. Your output

Produce a single verdict file:

  `docs/prd/00e-EXTERNAL_VERIFICATION_VERDICT.md`

It must contain:

1. **Overall verdict** — exactly one of:
   - ✅ **SOUND** — all decisions are well-reasoned and best for the long term; proceed to PRD authoring.
   - ⚠️ **SOUND WITH CONCERNS** — proceed, but the listed decisions should be revisited or
     re-justified first.
   - ❌ **UNSOUND** — one or more decisions are short-sighted, fragile, or wrong and must be
     reconsidered before PRD authoring.
2. **Per-decision assessment** — for every decision in §3 and §4: `SOUND` / `CONCERN` / `UNSOUND`,
   with a one-to-three-sentence justification. For `CONCERN`/`UNSOUND`, give a concrete
   recommendation.
3. **The founder override (D-5C, SSR/Nuxt)** — a dedicated, direct paragraph. Do not soften it.
4. **Figma (and other official-source) verification log** — every "matches Figma" / "matches
   Stripe" / "GDPR-compliant" / etc. claim you checked, the **exact URL**, the **exact quote**, and
   whether it **confirms** or **contradicts** the claim. Per §2.2, this should be substantial.
5. **§5 categorization check** — confirm or challenge the six non-decision follow-ups.
6. **Anything the audit and this handoff both missed** — if you see a gap, name it.

### Guardrails

- **Read-only.** Do not edit any file except creating the one verdict file above. Do not run `git`.
- **No subagents.** Do the verification yourself.
- **No package installs.**
- **Use `WebFetch` / `WebSearch`** for all official-source verification (§2.2). Trust nothing —
  re-derive every external claim.
- **Skills:** only `superpowers:verification-before-completion`, if any.
- **Be direct.** The founder is non-technical and has explicitly asked to be told plainly if a
  decision is short-sighted. Performative agreement is worse than useless here. Cite `file:line` and
  exact URLs. No hedging.

When done, paste the verdict + the per-decision summary table + the path to the verdict file back
into the chat.
