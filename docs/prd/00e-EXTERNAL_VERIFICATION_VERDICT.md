# External Verification Verdict — Kova Pre-PRD Decisions

> **Verifier:** Claude (Opus 4.7) — independent external soundness verification
> **Date:** 2026-05-14
> **Scope:** The ~45 pre-PRD decisions recorded in `00d-EXTERNAL_VERIFICATION_HANDOFF.md` §3 + §4, evaluated against the audit (`00c`), the scope plan (`00`), the Shopify redesign spec, the Q1–Q25 answer docs, `CLAUDE.md`, and official primary sources.
> **Inputs read in full:** `00d` handoff, `00c` audit (2,585 lines), `00` scope plan, `2026-05-14-shopify-product-reference-design.md`, `q1-5-answers-*.md`, `q6-25-answers-*.md`, `CLAUDE.md`, project memory index.
> **Mandate:** reasoning audit, not code audit. Re-verify external claims against official sources. Be direct.

---

## 1. Overall verdict

# ⚠️ SOUND WITH CONCERNS

**Proceed to PRD authoring** — but two decisions should be revisited or re-justified first (**D-5C** and **D-6**), and one (**D-3**) needs a specific UX guardrail written into its owning PRD.

The foundation is genuinely strong. Q1–Q25, the design system, the 12-cluster plan, and the Shopify product-reference redesign are well-reasoned, internally consistent, and — where they claim to "match Figma" / "match Stripe" / "be GDPR-compliant" — **the claims hold up**. I independently re-verified Figma's version-history cadence, mask types, measurement tool, eyedropper scope, SliceNode model, trash retention, and image-fill modes against `help.figma.com` / `developers.figma.com`; Stripe's Customer model and webhook/signature patterns against `docs.stripe.com`; Shopify's OAuth revoke and mandatory compliance webhooks against `shopify.dev`; Supabase Storage path-prefix RLS and local-dev parity against `supabase.com/docs`; GDPR Art. 17 against `gdpr-info.eu`; Vercel Logs/Cron against `vercel.com/docs`; Anthropic SDKs against `platform.claude.com`. **Every materially load-bearing external claim confirmed.** Two minor Figma claims (the 13-category keyboard taxonomy, Figma's modal-vs-page account UI) could not be re-confirmed from the cited pages — both immaterial (see §4).

What stops this from being ✅ **SOUND**:

- **D-5C (add Nuxt/SSR now)** is premature infrastructure built on a faulty premise. The founder's stated reason — "avoid migrating later" — describes a migration that does not exist. It is SOFT-reversible, so it is not *unsound*, but the auditor was right and it should not be done now. Dedicated paragraph in §3.
- **D-6 (defer 18 failing tests to Wave 6)** rests on a root-cause claim the audit never verified — `00c` Check 7 explicitly says it "did NOT re-run tests" and categorized "best-effort from memory," including an "Other: Unknown" bucket. Deferring the *fix* is fine; deferring the *triage* is not.
- **D-3 (auto-extract brand voice via LLM)** is sound in direction but must be specced as a confirm-before-write draft, not a silent write.

Nothing is ❌ **UNSOUND** — nothing is fragile, unrecoverable, or wrong in a way that breaks downstream PRDs. The hard-to-reverse decisions (D-2, D-5 storage layout, D-9, the `HARD*` items) are all correctly grounded and internally consistent.

---

## 2. Per-decision assessment

### 2.1 — Top 10 priority items (handoff §3.A)

| ID | Decision | Assessment | Notes |
|----|----------|------------|-------|
| **D-1** | M9 light-theme: fix pre-launch | ✅ SOUND | Confirmed against founder-locked `feedback_app_dark_website_light` ("Dark inside authenticated app… Light only on marketing + auth"). Onboarding + settings are inside the authed app, so the drift is real. Fix-pre-launch is correct; TRIVIAL. One nuance: the M9 surfaces use raw Tailwind utilities (`bg-white`), so this is a token rewrite, not a theme-switch — the ~6–12 hr estimate correctly reflects that. |
| **D-2** | One Stripe Customer per user, forever | ✅ SOUND | HARD, correctly grounded. Stripe's Customer object has **no "brands" concept** — brands are Kova's abstraction — so one-Customer-many-brands is clean at the Stripe layer (verified, §4). Locking it *explicitly* now is exactly right; leaving it implicit invited a future per-brand-billing assumption. **Clarifying note:** "one Customer per user" does *not* foreclose per-brand *pricing* later — Stripe supports multiple subscriptions/items under one Customer. Only per-brand *billing entities* (agency pass-through) are foreclosed, and that genuinely is a different product. The decision is even safer than the handoff frames it. |
| **D-3** | Extend `brand-kit-extract` to voice + tone snippets | ✅ SOUND (with required PRD guardrail) | Direction is correct — closes a real Q8 gap, serves the onboarding "magic moment." **But:** an LLM-inferred brand voice written silently into `brands.voice` / `brands.tone_snippets` means the AI then generates copy from possibly-wrong voice the user never reviewed. Cluster 05 PRD **must** spec this as a suggested draft the user confirms/edits. Shopify-terms check: reading the merchant's own theme `settings_data.json` (Asset/Theme API, `read_themes`) and their own public storefront for *their own* brand kit is legitimate minimal-scope use (verified, §4). The Claude API call sends storefront content to Anthropic — already a documented Q15 sub-processor, but Cluster 05 should make the RoPA disclosure explicit. |
| **D-4** | M9 Integrations IA → Q12/Q13 (`/account/integrations` + brand dropdown) | ✅ SOUND | Reconciles M9 drift to the audited spec. For a multi-brand freelancer, one Account page with a consistent brand-dropdown (same pattern as Brand Kit) beats per-brand URL routes. Deep-linking is preserved via `?brand=:brandId`. SOFT. |
| **D-5** | Eight cross-cutting infra picks | ✅ SOUND (all 8) | Rate limiting, job queue, email (Resend), upload caps, **storage bucket layout**, feature flags, error tracking (Sentry), migration runner — all MVP-appropriate, low-dependency-count. The HARD one — `{brand_id}/…` path-prefix Storage RLS — is a **documented, supported Supabase pattern** (`storage.foldername()`, verified §4). Feature-flags-as-constants has a clean upgrade path (flag *names* stay stable). Job queue correctly hedges with `pg_cron` alongside Vercel Cron. |
| **D-6** | 18 failing tests → test-debt, triage Wave 6 | ⚠️ CONCERN | The *disposition* (defer fixes, `.skip` with FIXME, E2E backstops the flows) is probably fine. The *problem*: it rests on an unverified root-cause claim. `00c` Check 7 states it "did NOT re-run tests" and its own categorization includes "**Other: Unknown without running tests**." Declaring all 18 "mock rot, not regressions" without having looked is not a finding — it is a guess. **Recommendation:** actually run `bun run test:unit` and categorize the 18 *before* Wave 1 (a <1 hr task). Defer the *fixes* to Wave 6 if they're confirmed mock-rot; do not defer the *triage*. |
| **D-7** | 20 uncommitted files → committed | ✅ SOUND | TRIVIAL; done (3-commit split, branch state confirms). Not git-verified per guardrails, but memory + branch state corroborate. |
| **D-8** | Build `shopify_connection_history` table | ✅ SOUND | A per-shop sync audit trail is genuinely useful for a freelancer juggling many client shops; small table; Cluster 04 needs the schema regardless. Building beats ripping the UI. SOFT. |
| **D-9** | Cluster 01 builds `delete-account-cron` + `gdpr_deletion_queue` | ✅ SOUND | Always Cluster 01's scope; surfacing it as a launch blocker is correct. GDPR cascade verified compliant against Art. 17 (§4): "without undue delay" + one-month norm → 30-day window is compliant; backups handled by documenting PITR retention in the RoPA (Q15 risk analysis already does this); Art. 19 satisfied by the cascade firing real deletes/revokes to sub-processors. HARD, correctly flagged. |
| **D-10** | Split PRD 07 into 07a + 07b | ✅ SOUND | TRIVIAL planning choice; the engine-internals-vs-UI-wiring seam is the natural one and keeps each PRD reviewable by a non-technical founder. (Scope plan also flags PRD 06 as a split candidate "at draft time" — fine.) |

### 2.2 — Five genuinely-open Part 2 decisions (handoff §3.B)

| ID | Decision | Assessment | Notes |
|----|----------|------------|-------|
| **D-5B-i** | Logging: Vercel Logs (structured JSON to stdout) | ✅ SOUND (surface one fact) | Verified: Vercel runtime logs are searchable/inspectable, and a Log Drain is an explicitly clean later add. **But retention is only 3 days.** A bug report that arrives 5 days late finds the raw logs gone. Sentry (D-5) preserves the *error* trail far longer, which mostly covers it — but the founder should know "raw logs >3 days old are gone unless we add a drain." Accepted tradeoff; just surface it. |
| **D-5B-ii** | Pre-commit hooks: lefthook | ✅ SOUND | TRIVIAL. lefthook is a runtime-agnostic Go binary; it shells out to `format`/`check`, so Bun compatibility is a non-issue. |
| **D-5C** | **Add Nuxt / SSR now — FOUNDER OVERRIDE** | ⚠️ CONCERN | Premature infrastructure on a faulty premise. SOFT-reversible, so not *unsound* — but the auditor was right. **See dedicated paragraph below.** |
| **D-5D** | Browser-first, Tauri secondary | ✅ SOUND | Matches Figma's zero-install model. Verified nothing MVP-critical is stranded behind Tauri — per Q20 the only Tauri-only feature (screen-wide eyedropper) is already Phase-2; canvas-only eyedropper works in-browser. `window.__TAURI__` feature-detection is the right gate. SOFT. |
| **D-5E** | Local Supabase + CI ephemeral Postgres now; persistent staging deferred | ✅ SOUND (sharpen the trigger) | Verified: Supabase CLI runs a real local Postgres; RLS is a core Postgres feature enforced identically anywhere; migrations are the same timestamped `.sql` files. So local + CI ephemeral genuinely exercise RLS correctness and migration ordering. **The bug class only a persistent staging project catches:** behavior against production-like data volume/accumulated state and real third-party integration state — e.g. a migration that's instant on an empty local DB but locks a large production table, or Stripe/Shopify webhook round-trips against persistent test-mode accounts. The decision *defers* (not cancels) staging, which is the right solo-founder call — but "until closer to launch" should be a **firm pre-launch gate**, not an open-ended deferral, because those bug classes must be exercised before real customers arrive. |

### 2.3 — 29 batch-ratified items (handoff §3.C)

All 29 are **✅ SOUND** — MVP-standard practice, several forced by `CLAUDE.md` or the existing codebase. Scanned specifically for short-sightedness; none found. Notes on the items the handoff flagged:

| # | Item | Assessment | Notes |
|---|------|------------|-------|
| 2.B.5 | MIME magic-number sniff + extension + header agree | ✅ SOUND | Correct security posture; defeats polyglot/extension-spoof uploads. |
| 2.B.7 | Webhook signature verification (Stripe + Shopify HMAC-SHA256; idempotency via stored event IDs) | ✅ SOUND | Verified both: Stripe `Webhook.constructEvent(payload, sig, secret)` and Shopify HMAC-SHA256 + `X-Shopify-Hmac-Sha256` are exactly the documented patterns; idempotency via stored `event.id` / `X-Shopify-Webhook-Id` is correct. HARD is the right class for a security pattern. |
| 2.B.9 | Caching (Realtime + SWR Pinia + Vercel edge; SW → Phase 2) | ✅ SOUND | MVP-appropriate; no external library. |
| 2.B.12 | Monitoring (Vercel Analytics + Speed Insights + Supabase Dashboard) | ✅ SOUND | Free, native, sufficient at MVP. |
| 2.B.13 | Anthropic key: one per env, server-only, 429 backoff max 3 | ✅ SOUND | Matches `CLAUDE.md` (never `VITE_`-prefix `ANTHROPIC_API_KEY`). |
| 2.C.3 | Yjs + y-indexeddb runtime truth; snapshot store syncs to Supabase | ✅ SOUND (`HARD*` confirmed forced) | `CLAUDE.md` "Never modify: Yjs / y-indexeddb local persistence layer" — the `HARD*` "forced" classification is accurate. |
| 2.C.4 | Optimistic for cheap-rollback; pessimistic for side-effect mutations | ✅ SOUND | Standard, correct split. |
| 2.C.5 | Offline→online: Yjs persists, resume Realtime + flush queued writes | ✅ SOUND | Consistent with no-anonymous-state. |
| 2.C.6 | No anonymous state in MVP | ✅ SOUND | Consistent with "must be authenticated to reach the editor." |
| 2.C.7 | Multi-device: Yjs CRDT handles concurrent edits; no locking/indicator | ✅ SOUND (wording overstates) | Consistent with Q6 Solo MVP. **Minor:** CRDT *merge* needs a live transport; with Trystero/awareness dormant and no WebSocket provider, two devices editing the *same* canvas don't truly sync live — it's last-snapshot-wins on the server. "handles concurrent edits transparently" overstates the MVP reality. Edge case for a solo freelancer; SOFT; just don't let a PRD promise live multi-device sync. |
| 2.C.8 | Autosnapshot pauses on blur; `beforeunload` final snapshot | ✅ SOUND | — |
| 2.C.9 | Global offline banner + per-action retry toasts | ✅ SOUND | — |
| 2.C.10 | No ORM — `@supabase/supabase-js` + RLS + RPC; generated types | ✅ SOUND (`HARD*` confirmed forced) | Sufficient at this scale: relational-but-not-complex data model, RLS-enforced, heavier/transactional logic already pushed into `SECURITY DEFINER` RPCs (the cluster specs do this consistently — `create_snapshot`, `restore_snapshot`, `request_account_deletion`). Migrations covered by Supabase CLI, type-safety by `supabase gen types`. supabase-js is already used throughout — ratifying the existing reality is correct; adding an ORM mid-build *would be* the refactor. Discipline needed: keep multi-statement logic in RPCs (the specs already do). |
| 2.C.11 | Realtime channels per-canvas/brand/user, ~4–6 concurrent | ✅ SOUND | Well under Supabase limits. |
| 2.C.12 | Image export: CanvasKit encode + `toBlob` fallback, sRGB | ✅ SOUND | Consistent with the image-export-only lock. |
| 2.C.13 | Image-fill caching: `public.media` + bucket + 15-min signed URLs | ✅ SOUND | — |
| 2.C.14 | AI streaming: `@ai-sdk/anthropic` + ToolLoopAgent + valibot | ✅ SOUND (`HARD*` confirmed forced) | `CLAUDE.md` mandates all three. **Note:** Anthropic's official docs list official SDKs (`@anthropic-ai/sdk`, etc.) and do *not* mention the Vercel AI SDK — `@ai-sdk/anthropic` is a legitimate Vercel-ecosystem wrapper around the Anthropic API. This is a `CLAUDE.md` product choice, not a correctness issue; internally consistent. |
| 2.C.15 | Fonts: Inter self-hosted + `font-display: swap`; brand fonts → CanvasKit at runtime | ✅ SOUND | — |
| 2.D.1 | CI/CD: Vercel for SPA **+ Nuxt**; GitHub Actions for Tauri | ✅ SOUND (depends on D-5C) | The "+ Nuxt" clause inherits D-5C. If D-5C is reversed, this line simplifies to "Vercel for the SPA." Flagged as a dependency, not a flaw. |
| 2.D.2 | Per-PR Vercel Preview, password-protected | ✅ SOUND | Password Protection is a Vercel Pro feature — consistent with Kova being Pro-tier. |
| 2.D.3 | Auto-deploy on `main`; `vercel rollback`; migrations pre-deploy blocking | ✅ SOUND | — |
| 2.D.6 | Separate Supabase + separate Stripe (test-mode) + separate Anthropic key per env | ✅ SOUND (reconcile wording with D-5E) | Describes the eventual end-state. D-5E defers the persistent staging Supabase project. Not contradictory if read as "at-launch vs now," but the docs should state explicitly that 2.D.6's "separate staging Supabase" *is* the D-5E deferred item. |
| 2.D.7 | Vercel env vars per env; server-only never `VITE_`; `.env.local` gitignored | ✅ SOUND | Matches `CLAUDE.md`. |
| 2.D.8 | Supabase PITR 7-day free → 14-day Pro + daily logical backups | ✅ SOUND | Consistent with the Q15 backup assumption. |
| 2.D.9 | DR: RTO 4 hr / RPO 1 hr | ✅ SOUND | Appropriate for a pre-launch MVP, *not* lax. Canvases are local-first (Yjs + y-indexeddb) so real canvas-data loss is far better than 1 hr — the RPO mostly bounds server-side relational data, and PITR is finer-grained than 1 hr anyway. Tightening post-launch with paying customers is expected evolution, not a flaw now. |
| 2.D.10 | Perf budgets (marketing LCP<2.5s; editor >30fps @ 50–300 nodes, cold-start <3s) | ✅ SOUND | Reasonable; matches email-design scale. |
| 2.D.11 | axe-core in E2E + manual VoiceOver pre-launch; P0 violations block launch | ✅ SOUND | Responsible. |
| 2.D.12 | GDPR RoPA → Cluster 01; no cookie banner (Vercel Analytics cookieless) | ✅ SOUND | Vercel Analytics is genuinely cookieless — accurate. |
| 2.D.13 | Email-only support at MVP; Intercom deferred until DAU>1000 | ✅ SOUND | Appropriate for MVP. |

### 2.4 — Shopify product-reference architecture redesign (handoff §4)

| ID | Decision | Assessment | Notes |
|----|----------|------------|-------|
| **D1** | Rip the whole `product-variant` extension; AI inserts **static** content | ✅ SOUND | Correct *and* more `CLAUDE.md`-consistent than what it replaces. An email is exported as a static image (founder-locked `feedback_image_export_locked`) — live price/inventory binding to a frame that becomes a flat image has no post-export value. The founder's rejection of M9's drag-to-place model is well-founded. |
| **D2** | Hybrid import payload (inline summary + tool-calls for depth) | ✅ SOUND | Balances token cost against the AI immediately knowing *which* products are referenced. |
| **D3** | Reference persists across turns until changed | ✅ SOUND | A design session is multi-turn around the same featured products; re-importing each turn is friction. |
| **D4** | Products only in panel; sort/filter by collection; no collections tab; discounts not panel-selectable | ✅ SOUND | Collections are just product groups; `get_collection` handles collection-level requests via chat. Reasonable scope cut. |
| **D5** | Product-level granularity; variants on demand via tool-calls | ✅ SOUND | Consistent with D2. |
| **D6** | Cut all sales analytics (rip `orders-agg` + `inventory-delta` crons + `bestsellers` sort) | ✅ SOUND | Brands keep their own "bestsellers" collection in Shopify. Bonus: this is good **data minimization** (less commercial data collected for a design tool) and removes two cron jobs. |
| **D7** | Composer chips (Approach A) above the chat input | ✅ SOUND | Familiar pattern; compact. |
| **D8** | Each chip individually removable; removing the last empties the reference | ✅ SOUND | Founder-explicit; it's the mechanism behind D3. |
| **D9** | Keep `get_active_discounts` AI tool, chat-driven only | ✅ SOUND | Harmless; marketers do ask about active codes. |
| **§5** | Migration plan (RIP / REWORK / KEEP) | ✅ SOUND | Honest, not hand-wavy. KEEP preserves the load-bearing, production-verified parts (OAuth, sync infra, 5 AI tools, compliance handlers). The §9 risk table flags the two real risks at MEDIUM — exclusive DB tables (`canvas_product_variant_bindings`, `shopify_orders_agg` do exist per the migration trail) and dead tests referencing ripped artifacts — and routes them to implementation planning rather than pretending they're free. The "zero `packages/core/` changes" claim is **plausible**: static insertion needs only frames + text + image-fill, which `CORE_TOOLS` + `placeMediaImage` already provide; the custom `product-variant` NodeType existed only for *live binding*, which is being removed. Respects every `CLAUDE.md` hard constraint (image-export-only, valibot, dark-app theme, no React/Next/PixiJS, `packages/core/` untouched). |

---

## 3. The founder override — D-5C (SSR / add Nuxt now)

**This decision is not sound as reasoned, and it should be reversed. The auditor was right.**

The founder's stated reason for overriding the audit is: *"want the SSR foundation in place from day one… would rather not migrate later."* That reasoning rests on a premise that is false. There is no "migrate later" scenario to avoid. Nobody — not the audit, not the handoff, not the founder — is proposing that the Vite SPA editor *becomes* a Nuxt app. It cannot: a CanvasKit/Skia canvas editor is inherently client-rendered and the dashboard is an authenticated app shell with no SEO need. Nuxt's own documentation confirms that moving an existing app *into* Nuxt is "significant changes" with a different directory structure and a Nitro server entry point — but that is irrelevant here, because the plan (per the handoff itself) is "the SPA stays; Nuxt is added alongside." Nuxt would be a **separate project** for a marketing site that does not yet exist.

And that is the whole point. If Nuxt is a separate project either way, then adding it *now* versus *later* is the **same amount of work** — there is no migration saved, because there is no migration. Adding it now is therefore strictly dominated by adding it later: identical eventual cost, **plus** the carrying cost of a second framework, a second build pipeline, and a second deploy target that every one of the 12 PRD waves has to be aware of and that a non-technical founder has to keep reviewing — all for **zero** offsetting MVP benefit, because the editor can't be SSR'd and auth pages don't need SEO. The auditor rated this SOFT/additive; that is exactly why "later" is free.

There is also a better tool for what the founder actually wants SSR *for*. The founder wants it for a future marketing site — that is *content*, not an *app*. Astro ships zero JavaScript by default, is purpose-built for content/marketing sites, beats Nuxt on Core Web Vitals and SEO for static content, hosts free on a static CDN, and is fully decoupled from the app codebase. Nuxt SSR earns its complexity when you have an *application* that needs server rendering; a marketing site does not. The right move is: **stay on the Vite SPA now; do not add Nuxt; when the marketing site is actually scoped, evaluate Astro vs Nuxt fresh** — by whoever builds the marketing site, as a decoupled project, with zero penalty for having waited.

The one thing that keeps this a ⚠️ CONCERN rather than ❌ UNSOUND: reversibility is genuinely SOFT. If Nuxt is added now and proves to be dead weight, it can simply be dropped. So this will not break the PRDs. But the founder explicitly asked to be told plainly when a decision is short-sighted, so: **this one is.** It spends real effort and ongoing complexity for a benefit that, by the founder's own logic, only arrives "when the marketing site comes" — at which point it could have been added fresh for the same price. Recommend reversing to the auditor's recommendation.

---

## 4. Official-source verification log

Per handoff §2.2 — every external claim re-checked against the primary source. **Trust nothing; re-derive.** Each row: exact URL, exact quote, verdict.

### Figma — `help.figma.com` / `developers.figma.com`

| Claim checked | URL | Exact quote | Verdict |
|---|---|---|---|
| Q7 — version history: 30-min autosave, 30-day free / unlimited paid, `⌥⌘S`, pre-restore checkpoint | `https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history` | "Figma records a new checkpoint every 30 minutes" · "Users working in their Drafts or in free Starter teams can only access up to 30 days of version history" · Professional/Education "can access a file's entire version history" · "⌘ Command ⌥ Option S" · on restore "Figma will add two autosave checkpoints to the file's version history" | ✅ **CONFIRMS** all four sub-claims |
| Q2 — masks: 3 types, `⌃⌘M` Mac / `Ctrl+Alt+M` Win, sibling propagation | `https://help.figma.com/hc/en-us/articles/360040450253-Masks` | "three mask types" — Alpha, Vector, Luminance · "Mac: ⌃ Control ⌘ Command M / Windows: Ctrl Alt M" · masks apply to siblings above "until reaching another mask or mask object, the mask's parent frame or group, a frame or component with clip content on" | ✅ **CONFIRMS** |
| Q11 — measurement tool: `⇧M`, persisted/selectable, distinct from ephemeral hover-distance | `https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotate-designs` | "the keyboard shortcut for the Measurement tool is Shift M" · "lets you apply visible measurements for others to view, is different than measuring by holding Alt/Option … that measure can't be saved and shared" | ✅ **CONFIRMS** |
| Q1 — SliceNode is a first-class node type | `https://developers.figma.com/docs/plugins/api/SliceNode/` | type `"SLICE"` · "A slice is an invisible object with a bounding box, represented as dashed lines in the editor" · "List of export settings stored on the node" · has `parent` + `clone()` | ✅ **CONFIRMS** |
| Q20 — eyedropper: canvas-only on web/Windows, screen-wide only on macOS Desktop | `https://help.figma.com/hc/en-us/articles/27643269375767-Sample-colors-with-the-eyedropper-tool` | "If you're using the Figma Desktop app for macOS, you can sample colors from anywhere on your screen" · "not currently supported on the Figma Desktop app for Windows or Figma on a browser" | ✅ **CONFIRMS** |
| Q19 — trash: indefinite retention, no auto-purge | `https://help.figma.com/hc/en-us/articles/360047512294-Delete-and-restore-files` | "Figma will keep files in the trash until you, or another team member with access to those files, restores or permanently deletes them" | ✅ **CONFIRMS** |
| Q21 — image-fill: 4 modes (Fill, Fit, Crop, Tile) | `https://help.figma.com/hc/en-us/articles/360041098433-Adjust-the-properties-of-an-image` | "Fill: … takes up the entire layer" · "Fit: … the entire image is visible" · "Crop: … adjust the boundary lines" · "Tile: Creates a repeated pattern" | ✅ **CONFIRMS** the 4 modes (page does not state the default; Kova's "Fill default" is a reasonable, low-risk assumption) |
| Q25 — keyboard shortcuts: 13 categories | `https://help.figma.com/hc/en-us/articles/360040328653-Use-Figma-products-with-a-keyboard` | "Use the tabs to explore shortcuts by category" — page organizes by category but **does not enumerate 13 named categories** | ⚠️ **UNVERIFIED** — the 13-category taxonomy could not be re-confirmed from the cited page. **Immaterial:** Q25 reversibility is TRIVIAL (category labels in a registry); even if Figma's exact count differs, the registry adapts in one line. |
| Q12 — Figma uses a cramped *modal* for account settings | `https://help.figma.com/hc/en-us/sections/4403936365591-Manage-your-account-settings` | Section page lists account-settings articles but **does not state modal vs. full-page** | ⚠️ **UNVERIFIED** — Figma's exact presentation not re-confirmed. **Immaterial:** Q12 *intentionally diverges* to a full-page route (Linear/Notion pattern), which is sound on its own merits regardless of Figma's choice. |

### Stripe — `docs.stripe.com`

| Claim checked | URL | Exact quote | Verdict |
|---|---|---|---|
| D-2 — one Customer can hold many brands; Stripe has no "brands" concept | `https://docs.stripe.com/api/customers` | "This object represents a customer of your business. Use it to create recurring charges, save payment and contact information, and track payments that belong to the same customer." — no "brands"/sub-account concept in the Customer object | ✅ **CONFIRMS** — brands are Kova's abstraction; one Customer cleanly holds many brands (and many subscriptions). |
| Q14 / 2.B.7 — recommended webhook events incl. `checkout.session.completed`; HMAC signature verification | `https://docs.stripe.com/billing/subscriptions/build-subscriptions` | minimum events table: `checkout.session.completed` ("sent when a customer successfully completes the Checkout session"), `invoice.paid`, `invoice.payment_failed` · `Stripe::Webhook.construct_event(payload, sig_header, webhook_secret)` with `SignatureVerificationError` handling | ✅ **CONFIRMS** — and confirms the audit's flag that Q14's q6-25 list (which omitted `checkout.session.completed`) must be corrected in PRD 04. |
| Q14 — subscription lifecycle events | `https://docs.stripe.com/billing/subscriptions/webhooks` | `customer.subscription.created` "sent when the subscription is created" · `.updated` "sent when a subscription starts or changes" · `.deleted` "sent when a customer's subscription ends" · `invoice.paid` / `invoice.payment_failed` described | ✅ **CONFIRMS** event semantics |

### Shopify — `shopify.dev`

| Claim checked | Source | Exact quote | Verdict |
|---|---|---|---|
| Q15 — Shopify OAuth token revocation cascades on uninstall / secret revoke | `shopify.dev` — Rotate/revoke client credentials; Uninstall-app docs | "Revoking any secret will also remove the access tokens associated with it" · "Uninstalling an app triggers cleanup tasks in Shopify, including deleting any registered webhooks" | ✅ **CONFIRMS** the Q15 Shopify-side cascade |
| Check 6 / 2.B.7 — mandatory compliance webhooks (`customers/redact`, `shop/redact`) | `shopify.dev` — Privacy law compliance | "When a store owner requests that data is deleted on behalf of a customer, Shopify sends a payload on the customers/redact topic" · "48 hours after a store owner uninstalls your app, Shopify sends a payload on the shop/redact topic" · "Apps must implement the mandatory compliance webhooks" · respond with 200, "Complete the action within 30 days" | ✅ **CONFIRMS** — M9's `api/shopify/compliance/*` handlers are required and correctly scoped |
| D-3 — reading the merchant's own theme/storefront for their own brand kit is within terms | `shopify.dev` — API access scopes | "request only the minimum amount of data that's necessary for an app to function" · "Shopify restricts access to scopes for apps that don't require legitimate use of the associated data" | ✅ **CONFIRMS** legitimate, minimal-scope use (merchant's own data, for the merchant's own brand kit). The public About-page fetch is an HTTP GET of public content, not a Shopify API call. |

### Supabase — `supabase.com/docs`

| Claim checked | URL | Exact quote | Verdict |
|---|---|---|---|
| D-5 — `{brand_id}/…` path-prefix Storage RLS is a supported, robust pattern | `https://supabase.com/docs/guides/storage/security/access-control` | "bucket_id = 'my_bucket_id' and (storage.foldername(name))[1] = 'private'" · "(storage.foldername(name))[1] = (select auth.jwt()->>'sub')" | ✅ **CONFIRMS** — `storage.foldername()` path-prefix policies are a documented, first-class pattern |
| D-5E — local Supabase = real Postgres; RLS + migrations exercised the same way | `https://supabase.com/docs/guides/local-development` + `.../cli/getting-started` | "access to a local Postgres database, Auth, Storage, and other Supabase features" · "The local Postgres instance can be accessed through psql" | ✅ **CONFIRMS** (with reasoning) — RLS is a core Postgres feature, enforced identically on any real Postgres; migrations are the same timestamped `.sql` files. The persistent-staging gap (production-volume / integration-state bugs) is named in §2.2 above. |

### Vercel — `vercel.com/docs`

| Claim checked | URL | Exact quote | Verdict |
|---|---|---|---|
| D-5B-i — Vercel Logs queryable; log drain a clean later add | `https://vercel.com/docs/logs` | "Runtime logs allow you to search, inspect, and share your team's runtime logs" · "Your log data is retained for 3 days. For longer log storage, you can use Log Drains" | ✅ **CONFIRMS** — and surfaces the **3-day retention** limit (noted in §2.2) |
| 2.B.2 — Vercel Cron suits daily scheduled jobs | `https://vercel.com/docs/cron-jobs` | "Cron jobs are time-based scheduling tools used to automate repetitive tasks" · use cases: "Automating backups and archiving them", "Sending email and Slack notifications" | ✅ **CONFIRMS** — fits `delete-account-cron` / `snapshot-prune`. (The decision also hedges with `pg_cron`, so it is robust regardless of Vercel Cron plan-tier job limits.) |

### Anthropic — `platform.claude.com`

| Claim checked | URL | Exact quote | Verdict |
|---|---|---|---|
| 2.C.14 — streaming + tool use supported; `@ai-sdk/anthropic` status | `https://platform.claude.com/docs/en/api/client-sdks` | "Each SDK provides idiomatic interfaces, type safety, and built-in support for features like streaming, retries, and error handling" — official SDKs listed: Python, TypeScript (`@anthropic-ai/sdk`), Java, Go, Ruby, C#, PHP, CLI. **No mention of the Vercel AI SDK.** | ✅ **CONFIRMS** streaming/tool-use support. **NOTE:** `@ai-sdk/anthropic` is a Vercel-ecosystem wrapper, not an Anthropic official SDK — the 2.C.14 mandate is grounded in `CLAUDE.md`, not Anthropic's docs. Internally consistent; just not "Anthropic-official." |

### Nuxt — `nuxt.com/docs`

| Claim checked | URL | Exact quote | Verdict |
|---|---|---|---|
| D-5C — is "additive later" clean? what does adding Nuxt take? | `https://nuxt.com/docs/getting-started/installation` + `.../3.x/migration/overview` | Installation docs cover **only new projects** · migration overview: "There are significant changes when migrating a Nuxt 2 app to Nuxt 3" · Nuxt moves to "a minimal, standalone server compiled with nitropack" | ✅ **CONFIRMS the auditor, CONTRADICTS the override's premise** — there is no clean "migrate the SPA into Nuxt" path, but none is needed: the SPA stays and Nuxt would be a *separate* project either way, so "now" buys nothing over "later." (Astro vs Nuxt for a marketing site: Astro "ships zero JavaScript by default," is "created to handle content-focused websites" — the better fit for the founder's actual goal.) |

### GDPR — `gdpr-info.eu`

| Claim checked | URL | Exact quote | Verdict |
|---|---|---|---|
| D-9 / Q15 — 30-day cascade is Art. 17 compliant; backups; Art. 19 | `https://gdpr-info.eu/art-17-gdpr/` | "the controller shall have the obligation to erase personal data without undue delay" · Art. 17 "does not explicitly address backup or archival copies" | ✅ **CONFIRMS** — "without undue delay" + the one-month industry norm → a 30-day window is compliant; backups are handled by *documenting* PITR retention in the RoPA (Q15 risk analysis already specifies this); Art. 19 notification is satisfied by the cascade firing real deletes/revokes to Stripe/Shopify/Anthropic. |

**Verification summary:** 18 official-source checks. **15 CONFIRM** the claim outright; **1 CONFIRMS the auditor and contradicts the override's premise** (Nuxt); **2 UNVERIFIED but immaterial** (Figma 13-category taxonomy, Figma modal-vs-page — both low-stakes, both for decisions that are sound independent of the unconfirmed detail). No claim was found to be *wrong*.

---

## 5. §5 categorization check — the six non-decision follow-ups

Confirming none is a founder decision in disguise.

| # | Item | Categorization correct? | Notes |
|---|------|------------------------|-------|
| 1 | Stale manual smoke-test recipe (steps 10–15 describe the ripped drag-to-place model) | ✅ Correct — non-decision | A doc-rewrite task, correctly routed to the Shopify-touching PRDs. Not a founder decision. |
| 2 | Three M9 onboarding polish FLAGs — incl. (a) `access_token` in a URL query string | ✅ Correct — non-decision, **with a sharpening** | A JWT in a URL query string is a real (if low-severity) weakness — it lands in server access logs, browser history, and Referer headers. The founder cannot meaningfully *decide* a token-transport mechanism, so it correctly is **not** a founder decision. **But** it must be tracked in the Cluster 02 PRD as a **security fix with a "must fix before launch" marker**, not filed as "polish" where it can quietly slip. Recommendation: re-label it from "polish FLAG" to "launch-blocking security item." |
| 3 | 5 Shopify AI tools return empty silently when no Shopify connected | ✅ Correct — non-decision | An error-response-shape spec detail; correctly routed to Cluster 10. |
| 4 | `--fill-2` hex drift (`#2c2c30` vs `#303035`) | ✅ Correct — non-decision | A single-value known-correct fix. **See §6 for a related foundation-integrity gap** — the canonical CSS this fix lives in is not version-controlled. |
| 5 | Five hidden cross-cuts missing from scope plan §6 | ✅ Correct — non-decision; **already done** | Confirmed present in `00-PRD_SCOPE_PLAN.md` §6 (Vue Router meta theme detection, Supabase Realtime channel naming, idempotency-key pattern, Toast variant taxonomy, Tauri command-surface naming). |
| 6 | ~20 "PRD XX must spec ___" action items | ✅ Correct — non-decision | Each routed to its owning cluster PRD. |

**Conclusion:** all six are correctly categorized as non-decisions. None is a disguised founder decision. The only one warranting a process tweak is 2(a) — keep it, but track it as a security launch-blocker, not polish.

---

## 6. What the audit and this handoff both missed

1. **The canonical design-system CSS is not version-controlled.** `00-PRD_SCOPE_PLAN.md` instructs every one of the 12 PRDs to cite `main-main-kova-scope/design-system/kova-hifi.css` as "the structural + token reference." Per project memory (#3750), that directory is excluded from git in the parent repo by a blanket `*` in `.gitignore` — the `--fill-2` token fix (§5 item 4) "survives only as an on-disk edit… no git history, lost if the directory is cleaned or re-cloned." **This is a foundation-integrity gap:** 12 PRDs are about to be authored against an untracked artifact. If the canonical CSS is lost or drifts, every PRD's token references become unreliable, and there is no history to diff against. This is not a *decision* to ratify — it is a gap neither document addresses. Recommendation: get `design-system/` (at minimum the four canonical files) under version control *before* Wave 1, so the artifact the PRDs cite is durable and diffable. (I have not changed any file or run git — surfacing only, per guardrails.)

2. **D-5C's dependency threads are not tracked.** D-5C is presented as a standalone override, but it is woven into 2.D.1 ("Vercel for the SPA **+ Nuxt**") and the scope plan §2.2 lists **no marketing-site PRD at all**. If D-5C is reconsidered (as recommended), 2.D.1 changes and the question "which PRD, if any, owns the marketing site" needs an explicit answer. Right now the marketing site is simultaneously "out of MVP scope" *and* the sole justification for a framework that every wave carries — that tension should be resolved, not left implicit.

3. **2.C.7 quietly overstates multi-device behavior.** "Yjs CRDT handles same-user concurrent edits transparently" is true only with a live transport. With Trystero/awareness dormant (Q6) and no WebSocket provider in MVP, two devices editing the *same* canvas do not sync live — it is last-snapshot-wins on the server. Low-stakes for a solo freelancer and SOFT-reversible, but a downstream PRD should not promise live multi-device sync on the strength of 2.C.7's wording.

4. **D-5E vs 2.D.6 need an explicit reconciliation line.** D-5E *defers* the persistent staging Supabase project; 2.D.6 *describes* a separate staging Supabase project as the norm. They are reconcilable as "now vs at-launch," but the docs should say so explicitly, and — per §2.2 — the deferral should carry a firm pre-launch trigger rather than "closer to launch."

5. **D-3 sends merchant storefront content to Anthropic.** The voice-inference Claude API call means a merchant's storefront copy transits Anthropic. Anthropic is already a documented Q15 sub-processor, so it is covered — but the Cluster 05 PRD should make the RoPA/privacy-policy disclosure explicitly name "storefront content analyzed for brand-voice inference," rather than leaving it implied.

None of these is blocking. Items 2–5 are PRD-authoring hygiene. **Item 1 (the gitignored canonical CSS) is the one worth acting on before Wave 1** — it is cheap to fix and it underpins all 12 PRDs.

---

## 7. Bottom line

The six months of decisions hold up. The reasoning is, with the exceptions named, sound — and where it claims external grounding, the grounding is real (18 official-source checks, 15 outright confirmations, zero claims found wrong). The Shopify §4 redesign is a genuine improvement over what it replaces and is *more* `CLAUDE.md`-consistent. The hard-to-reverse decisions are correctly identified and correctly grounded.

**Before Wave 1 PRD authoring begins:**
- **Reverse or formally re-justify D-5C.** Recommended: stay on the Vite SPA; defer the marketing-site framework choice; default to Astro when it is scoped. (CONCERN)
- **Triage the 18 failing tests now** — actually run them and categorize — even if the fixes wait for Wave 6. D-6's disposition is acceptable; its unverified premise is not. (CONCERN)
- **Write the D-3 guardrail into the Cluster 05 PRD:** brand voice/tone is a suggested draft the user confirms, never a silent LLM write. (guardrail on a SOUND decision)
- **Get the canonical `design-system/` files under version control** — 12 PRDs are about to cite them. (§6 item 1)

With those addressed, the verdict moves cleanly to ✅ **SOUND** and Wave 1 (Clusters 01 + 11) can proceed.

— End of verdict —

---

## 8. Resolution (2026-05-14)

All four §7 concerns were resolved by the founder + main thread on 2026-05-14:

1. **D-5C — REVERSED.** The founder reversed the override after a plain-language walkthrough. Final: stay on the single Vite SPA; **no Nuxt in the MVP**; the marketing site is a separate, decoupled Astro project built later, blocking nothing. (`00d` §3.B D-5C updated; `00d` §3.C 2.D.1 "+ Nuxt" removed.)
2. **D-6 / 18 failing tests — TRIAGED.** The full unit suite was run 2026-05-14: **1484 pass / 99 skip / 0 fail.** The "18 failing" was a stale memory artifact — `00c` Check 7 explicitly never ran the tests. The 99 skips are 14 legitimate, pre-existing skip sites (Linux-conditional, headless-asset, known-deferred-feature). No regression, no hidden failures, nothing to carry into Wave 6.
3. **D-3 — GUARDRAIL RECORDED.** "AI-scraped voice/tone = an editable draft the user reviews and confirms, never a silent write" is written into the Shopify design spec §6; the Cluster 05 PRD owns the confirm-step UX.
4. **Canonical design-system CSS — VERSION-CONTROLLED.** The four canonical `main-main-kova-scope/design-system/` files (`design.md`, `kova-hifi.css`, `kova-hifi-light.css`, `TOKEN_CANONICAL.md`) were brought under git on 2026-05-14.

§6 items 2–5 (PRD-authoring hygiene) and the §5 item 2(a) re-label (`access_token`-in-URL → launch-blocking security) are recorded in `00-PRD_SCOPE_PLAN.md` §5.7 and `00d` §5.

**Verdict moves to ✅ SOUND. Wave 1 PRD authoring (Clusters 01 + 11) is clear to begin.**
