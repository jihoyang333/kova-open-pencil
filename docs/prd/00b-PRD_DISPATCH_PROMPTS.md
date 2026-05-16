# Kova PRD Dispatch Prompts

> **Purpose.** Paste-ready prompts to dispatch one agent per cluster. Each agent reads context → drafts PRD → runs `superpowers:writing-plans` → STOPS. Founder reviews PRD + plan; on approval the parent agent (Claude) reviews and dispatches execution.
>
> **Pairs with** `00-PRD_SCOPE_PLAN.md` (cluster definitions) + `00a-PRD_AUTHORING_GUIDE.md` (how-to) + `01-auth-and-identity.md` (canonical reference PRD).
>
> **Status:** READY. Last updated 2026-05-15.

---

## 0. Caveman TL;DR (for founder)

Twelve clusters, each get own agent. Agent read 4 sources. Agent write PRD + impl plan. Agent STOP. You + Claude review batch. You approve. Claude dispatch execution. Code ships.

Parallel PRD writing = safe (just docs). Parallel CODE execution = **risk**; only safe wave-by-wave with file-scope check. See §2.

---

## 1. Workflow

```
[founder dispatches N agents in parallel — each = one cluster]
              │
              ▼
   ┌──────────────────────────┐
   │ Agent N reads context    │
   │ Agent N drafts PRD       │
   │ Agent N runs writing-    │
   │   plans skill → makes    │
   │   docs/superpowers/plans/NN-      │
   │   slug-plan.md           │
   │ Agent N STOPS            │
   └──────────────────────────┘
              │
              ▼
[founder + Claude review every PRD + plan (this is the audit step)]
              │
              ▼
[founder approves]
              │
              ▼
[Claude dispatches execution per wave]
   Wave 1 → Wave 2 → … → Wave 6
              │
              ▼
[done]
```

### Why this works

- **No code touched** during dispatch phase — only `docs/prd/*.md` + `docs/superpowers/plans/*.md`.
- **Each agent is isolated** — different files, no shared writes.
- **STOP rule** prevents agents from running plans before review.
- **Review batch** catches drift early (one agent might invent infra not in 03 doc).

### What the agent does NOT do

- Does NOT commit code.
- Does NOT execute the implementation plan.
- Does NOT push to remote.
- Does NOT modify any file outside `docs/prd/NN-slug.md` and `docs/superpowers/plans/NN-slug-plan.md`.
- Does NOT touch `packages/core/`, `src/`, `api/`, `supabase/migrations/`, or any test file.

---

## 2. Parallel execution — risk analysis + recommendation

The user's plan: dispatch agents in parallel, then **execute in parallel**. Let's split this into two questions.

### 2.1 Parallel PRD authoring? → ✅ SAFE

12 agents writing 12 distinct doc files + 12 distinct plan files in parallel. Zero shared writes. No code. No state. **Recommended: dispatch all 12 at once.**

### 2.2 Parallel code execution? → ⚠️ RISKY — only safe wave-by-wave, with caveats

Waves are sequential because of dependency order. Within a wave, file-scope overlap determines whether the two PRDs in that wave can run truly simultaneously.

| Wave | PRDs | Parallel-safe? | Reason |
|---|---|---|---|
| **1** | 01 (Auth) + 11 (Shared UI) | ✅ **YES** | Wholly different domains. 01 = `api/account/*`, `api/auth/*`, `api/cron/*`, `src/views/auth/*`, `src/components/auth/*`, `users` table extension. 11 = `useToast()`, `<KovaModal>`, error pages, Command-K, skeletons, `idempotency_keys` table. Zero file overlap. |
| **2** | 02 (Onboarding/Dashboard) + 03 (Brand Mgmt) | ⚠️ **MIXED** | Both touch `useBrandsStore`, both touch `brands` table, both touch dashboard sidebar. Recommend: 02 first, then 03. Or run in parallel but allocate `useBrandsStore` ownership to ONE PRD (probably 03 since Brand Management = brand record CRUD primary). |
| **3** | 04 (Account+Stripe) + 12 (Settings/Prefs) | ⚠️ **MIXED** | 04 mounts `<DangerZoneCard>` shipped by Cluster 01; 12 reads `users.preferences` shipped by Cluster 01. Both touch the Account page (12 may embed Accessibility prefs in Profile section). Cross-coordination needed. Recommend: 04 first, 12 second within the wave. |
| **4** | 05 (Brand Kit) + 06 (Canvas Chrome) | ❌ **NO** | 05 wires drag-drop receivers into canvas; 06 owns canvas chrome that hosts those receivers. Shared file: `use-canvas-drop.ts`. Conflict-prone. Sequential. |
| **5** | 07a + 07b + 08 (engine + chrome over engine) | ❌ **NO** | 07a = core mods + renderer; 07b = inspector wiring + overlays; 08 = menus over engine. Tight coupling. Sequential. |
| **6** | 09 (Version History) + 10 (AI Chat) | ✅ **YES** (probably) | 09 = `canvas_snapshots`, snapshot store, version history UI. 10 = chat panel, brand memory, AI tool layer. Different surface zones. Light coupling (10 may reference snapshot state via canvas). Verify at review. |

### 2.3 Recommendation

- **Phase 1 (now):** Dispatch all 12 PRD-authoring agents in parallel. Review batch. Approve.
- **Phase 2 (execution):** Wave 1 in parallel (01 + 11) → Wave 2 sequential (02 then 03) → Wave 3 sequential (04 then 12) → Wave 4 sequential (05 then 06) → Wave 5 sequential (07a then 07b then 08) → Wave 6 parallel-pending-review (09 + 10).
- **Don't try Wave-2-through-5 in true parallel.** Merge conflicts on shared stores/migrations will burn more time than parallelism saves.
- **Wave-by-wave is non-negotiable.** Cluster 11 ships `useToast`/`<KovaModal>`/`useConfirm` that every downstream PRD imports — if 11 isn't done, downstream agents have nothing to consume.

---

## 3. Common preamble (every dispatch prompt embeds this)

Every cluster's dispatch prompt below uses the same boilerplate for context-loading and STOP-rule. Reproduced once here for clarity; embedded into each cluster's prompt for paste-and-go.

### 3.1 Required reading order (every agent)

1. `kova-open-pencil-1/docs/prd/00a-PRD_AUTHORING_GUIDE.md` — operator manual
2. `kova-open-pencil-1/docs/prd/00-PRD_SCOPE_PLAN.md` — full doc (focus your §3 Cluster NN subsection)
3. `kova-open-pencil-1/docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md` — focus your §2.A Cluster NN block (line range cited per cluster below)
4. `kova-open-pencil-1/docs/prd/01-auth-and-identity.md` — **canonical reference PRD**. Match this depth, structure, and tone.
5. `kova-open-pencil-1/docs/prd/00d-EXTERNAL_VERIFICATION_HANDOFF.md` + `00e-EXTERNAL_VERIFICATION_VERDICT.md` — for cross-cuts + hygiene rules
6. All four source artifacts per cluster (hi-fi files, design system, 03 doc, Q&A) — paths listed per cluster

### 3.2 PRD template

`00-PRD_SCOPE_PLAN.md §5`. Every section. No skipping.

### 3.3 Decision protocol

- Use **founder-locked > Q&A > 03 doc > hi-fi > design system** precedence (00a §2.6).
- For ambiguous items: **recommend default inline + mark RESOLVED in §12 with rationale.** Do NOT halt waiting for founder — founder reviews everything at the end.
- ONLY halt and surface as ESCALATE if (a) a hard-to-reverse decision touches scope (`00c §1.E` watchlist) or (b) two source artifacts directly contradict and no rule resolves it.

### 3.4 Output paths

- PRD: `kova-open-pencil-1/docs/prd/NN-slug.md` (status `DRAFT`)
- Plan: `kova-open-pencil-1/docs/superpowers/plans/NN-slug-plan.md` (output of `superpowers:writing-plans` skill consuming the PRD)

### 3.5 STOP rule

After writing the plan, **STOP**. Do not:
- Execute the plan
- Run `superpowers:test-driven-development`
- Commit anything
- Push to remote
- Modify any file outside `docs/prd/NN-slug.md` and `docs/superpowers/plans/NN-slug-plan.md`

Final message to the parent agent must include:
1. Path to PRD
2. Path to plan
3. Word count or line count of each
4. List of §12 RESOLVED items + any open ESCALATE items
5. List of cross-cuts to other clusters that need verification

### 3.6 Hygiene rules to enforce

From `00a §6` + `00e §6`:
- No HTML export. Image slices only.
- No Nuxt / SSR / Next.js. Single Vite SPA.
- No `SYSTEM_PROMPT` modification in `use-chat.ts`.
- No `access_token` in URL query strings.
- No live multi-device canvas sync promises (Trystero dormant per Q6 — server-side last-snapshot-wins).
- No marketing-site spec (separate Astro project, out of MVP).
- No re-spec of M9 from scratch (REUSE/REFACTOR/RE-SPEC dispositions per scope plan §5.5).
- Theme: dark inside app, light only on auth + marketing + mobile fallback.
- Use Reka UI primitives where they fit. Tailwind 4 utility classes only — no inline CSS, no `<style>` blocks.
- Valibot in tool layer, never Zod.
- `crypto.getRandomValues()`, never `Math.random()`.
- No `any`, no `!` non-null assertions, no Math.random.

---

## 4. Cluster dispatch prompts

> One prompt per cluster. Paste the prompt-block (between the `BEGIN PROMPT` / `END PROMPT` markers) into a fresh agent dispatch. Cluster 01 is already APPROVED — do not redispatch.

---

### 4.1 Cluster 01 — Auth & Identity → ✅ APPROVED 2026-05-15

Do not redispatch. PRD at `docs/prd/01-auth-and-identity.md`. Plan generation pending (next step: founder runs `superpowers:writing-plans` against the PRD).

---

### 4.2 Cluster 02 — Onboarding & Dashboard

**Filename:** `02-onboarding-and-dashboard.md`
**00c §2.A line range:** 1105–1182
**Wave:** 2 (after Cluster 01 + 11 land)
**Dependencies:** Cluster 01 (Auth). Blocks: Cluster 03, 06.
**M9 reuse:** YES — `StoreTypeStep.vue` (REFACTOR light→dark per §5.6 item 1)

```
BEGIN PROMPT ────────────────────────────────────────────────────────

You are dispatched to author PRD 02 — Onboarding & Dashboard — for the Kova project.

REQUIRED READING (read in order, full files):
1. /Users/jihoyang/kova-main/kova-open-pencil-1/docs/prd/00a-PRD_AUTHORING_GUIDE.md
2. /Users/jihoyang/kova-main/kova-open-pencil-1/docs/prd/00-PRD_SCOPE_PLAN.md (focus §3 Cluster 02)
3. /Users/jihoyang/kova-main/kova-open-pencil-1/docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md (focus lines 1105–1182 = §2.A Cluster 02)
4. /Users/jihoyang/kova-main/kova-open-pencil-1/docs/prd/01-auth-and-identity.md (canonical reference — match depth and structure)
5. /Users/jihoyang/kova-main/kova-open-pencil-1/docs/prd/00d-EXTERNAL_VERIFICATION_HANDOFF.md
6. /Users/jihoyang/kova-main/kova-open-pencil-1/docs/prd/00e-EXTERNAL_VERIFICATION_VERDICT.md

SOURCE ARTIFACTS (read all when authoring):
- Hi-fi files:
  - main-main-kova-scope/batch-a/dark/Kova Hi-Fi A1 Onboarding - Dark.html (first-brand walkthrough, 4 scenes)
  - main-main-kova-scope/batch-a/dark/Kova Hi-Fi 03 Brand Dashboard - Dark.html (5 scenes: home, sidebar, file grid, brand switcher, empty)
  - main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B11 Canvas Creation Transition - Dark.html
  - main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B7 Loading Skeletons - Dark.html (dashboard skeleton scenes)
  - main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B9 List Search Empty - Dark.html (file-list empty)
  - main-main-kova-scope/batch-a/dark/Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html (empty states + offline pill)
  - main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B12 Brands page - Dark.html
- 03 doc rows: Implicit from CLAUDE.md MVP scope; cross-cuts §2.1 top chrome, §2.5 file picker, §2.12 trash entry.
- Q-decisions: Q17 (brand-switching only via dashboard sidebar — REVERSED 2026-04-25; no in-canvas picker).
- Design system: main-main-kova-scope/design-system/{design.md, kova-hifi.css, TOKEN_CANONICAL.md} (all DARK)
- M9 reuse: src/components/onboarding/StoreTypeStep.vue — REFACTOR light→dark theme (§5.6 item 1)

INFRA SCOPE (per scope plan §3 Cluster 02):
- `brands` table queries (list active, sort by recent)
- `canvases` table queries per-brand (sort by recent, search)
- `useBrandsStore` (active brand selection persists across sessions via Q5 Layer 2 localStorage)
- `useDashboardStore` (file grid state, search, filters)
- First-brand onboarding wizard composable (use-onboarding.ts)
- Brand-creation hook → opens new canvas → triggers B11 transition

CROSS-CUTS TO HONOR:
- Cluster 11 provides: useToast, <KovaModal>, skeletons (B7), empty-state patterns (B9), Command-K palette (A5 — wire to dashboard navigation).
- Cluster 01 provides: auth guard (post-callback redirect logic — first-time / returning-multi / returning-one routing per A15.06 annotation).
- Cluster 03 provides: brand record CRUD (this PRD calls useBrandsStore.createBrand from onboarding step 1).
- LAUNCH-BLOCKING SECURITY: access_token MUST NOT land in URL during onboarding Shopify connect (recategorized per 00d access_token security item). Use httpOnly cookie or session storage.

KEY DECISIONS TO RECOMMEND (mark RESOLVED in §12):
- Onboarding required vs skippable (recommend: required for first brand; skippable for subsequent — matches Figma)
- Empty-state copy + illustrations (recommend: match A11/A12/A13 hi-fi exactly)
- File-grid sort default (recommend: most-recent-first)
- Search debounce (recommend: 200ms)

OUTPUT:
1. PRD at /Users/jihoyang/kova-main/kova-open-pencil-1/docs/prd/02-onboarding-and-dashboard.md (status DRAFT, per template at 00-PRD_SCOPE_PLAN.md §5)
2. Implementation plan via superpowers:writing-plans skill — output to /Users/jihoyang/kova-main/kova-open-pencil-1/docs/superpowers/plans/02-onboarding-and-dashboard-plan.md

STOP after both files written. DO NOT execute the plan. DO NOT commit. DO NOT touch any other file. Report back: PRD path + plan path + line counts + RESOLVED-item list + open ESCALATE items + cross-cuts list.

END PROMPT ──────────────────────────────────────────────────────────
```

---

### 4.3 Cluster 03 — Brand Management

**Filename:** `03-brand-management.md`
**00c §2.A line range:** 1183–1271
**Wave:** 2 (after Cluster 02 lands `useBrandsStore` shape — coordinate ownership)
**Dependencies:** Cluster 01, 02, 11 (`useConfirm` for typed-confirm delete). Blocks: 04, 05.

```
BEGIN PROMPT ────────────────────────────────────────────────────────

You are dispatched to author PRD 03 — Brand Management — for the Kova project.

REQUIRED READING:
1. docs/prd/00a-PRD_AUTHORING_GUIDE.md
2. docs/prd/00-PRD_SCOPE_PLAN.md (focus §3 Cluster 03)
3. docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md (focus lines 1183–1271 = §2.A Cluster 03)
4. docs/prd/01-auth-and-identity.md (canonical reference)
5. docs/prd/00d + 00e (verification context)

SOURCE ARTIFACTS:
- Hi-fi files:
  - main-main-kova-scope/batch-a/dark/Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html (picker + new-brand form)
  - main-main-kova-scope/batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html (archive A4.2, delete typed-confirm A9, copy-brand A10)
  - main-main-kova-scope/batch-a/dark/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html (modal shell reference)
  - main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B12 Brands page - Dark.html
- 03 doc rows: §2.1 brand-label row + cross-cuts to §2.12 trash for archive.
- Q-decisions: A4.2 archive flow (founder confirmed 2026-05-13 — action exists, no archived-list page MVP); Q17 brand label = navigate to brand dashboard (REVERSED — no popover).
- Design system: dark stylesheets.

INFRA SCOPE:
- brands table CRUD: create_brand, archive_brand (sets archived_at), restore_brand (Phase 2), delete_brand (cascades canvases, media, fonts via FK)
- useBrandsStore brand-creation flow (coordinate with Cluster 02 author for store-shape ownership — Cluster 03 OWNS the CRUD primitives, Cluster 02 CONSUMES the read APIs)
- Typed-confirm modal pattern via useConfirm composable (Cluster 11 ships)
- Per-brand color palette auto-assign from Kova brand-color set (coral/violet/sage/sand/graphite per A2 pattern)

CROSS-CUTS:
- Cluster 02 reads useBrandsStore.brands[] for sidebar
- Cluster 04 reads useBrandsStore.brands[] for Brand Kit brand-picker (per-brand sections)
- Cluster 11 provides useConfirm for typed-DELETE modal
- Cluster 09 owns trash purge cron — delete_brand cascade integrates with trash flow

KEY DECISIONS TO RECOMMEND:
- Typed-confirm string: recommend "DELETE" matching A9 hi-fi (consistent with account-deletion pattern in Cluster 01)
- Archive vs delete UX clarity: recommend explicit two-button choice in brand-row right-click (matches A4 modals)
- Brand color auto-assign algorithm: recommend hash-of-brand-name modulo color-set-size (deterministic, no DB column)

OUTPUT:
1. PRD at docs/prd/03-brand-management.md (status DRAFT)
2. Plan via superpowers:writing-plans → docs/superpowers/plans/03-brand-management-plan.md

STOP. Same rules. Report back.

END PROMPT ──────────────────────────────────────────────────────────
```

---

### 4.4 Cluster 04 — Account Page + Stripe Billing

**Filename:** `04-account-and-stripe-billing.md`
**00c §2.A line range:** 1272–1403
**Wave:** 3
**Dependencies:** Cluster 01 (auth + Danger zone modal), 03 (brand picker for per-brand sections), 11. Blocks: 05.
**M9 reuse:** YES — `IntegrationsCard.vue` + `SettingsBrandIntegrationsView.vue` (REFACTOR light→dark + route IA per §5.6 items 1 + 4)

```
BEGIN PROMPT ────────────────────────────────────────────────────────

You are dispatched to author PRD 04 — Account Page + Stripe Billing — for the Kova project.

REQUIRED READING:
1. docs/prd/00a-PRD_AUTHORING_GUIDE.md
2. docs/prd/00-PRD_SCOPE_PLAN.md (focus §3 Cluster 04 + §5.5 M9 cross-cut)
3. docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md (focus lines 1272–1403 = §2.A Cluster 04 + §1.E.1 Shopify M9 audit)
4. docs/prd/01-auth-and-identity.md (canonical reference; this PRD CONSUMES <DangerZoneCard> shipped by 01)
5. docs/prd/00d + 00e

SOURCE ARTIFACTS:
- Hi-fi files:
  - main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html (12 scenes covering 5 sidebar sections)
  - main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B10 Stripe Returns - Dark.html (success/cancel/payment-failed)
  - main-main-kova-scope/batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html (delete-account typed-confirm — owned by Cluster 01 but rendered inside /account here)
  - main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B5 Email Change Landing - Light.html (cross-cut with Cluster 01 — link target is /account/profile)
- 03 doc rows: §2.14 Account/billing (full row); §3C #5 Account-Stripe wiring; §3C #5b GDPR cascade (consumed from Cluster 01)
- Q-decisions: Q12 (full-page route + sidebar 5 sections), Q13 (user-level scope; Brand Kit + Integrations per-brand with picker), Q14 (Stripe foundation: Checkout + Customer Portal + webhooks; launch strategy out of scope).
- Design system: dark.
- M9 reuse: IntegrationsCard, SettingsBrandIntegrationsView — REFACTOR light→dark (§5.6 item 1) + route from /dashboard/:brandId/settings/integrations → /account/integrations + brand-dropdown per Q12/Q13 (§5.6 item 4) + wire NEW shopify_connection_history table (§5.6 item 6 — schema below).

INFRA SCOPE:
- Vue Router: /account/:section? (sections: profile, billing, brand-kit, integrations, danger)
- users table extension: stripe_customer_id UNIQUE, stripe_subscription_id, plan CHECK in ('free','solo','agency'), plan_status CHECK in ('active','past_due','cancelled','incomplete'), current_period_end timestamptz
- NEW table shopify_connection_history (per §5.6 item 6 — wires the M9 empty sync-history accordion)
- Edge Functions: stripe-checkout-session, stripe-portal-session, stripe-webhook (subscription.created/updated/deleted, invoice.payment_succeeded/failed)
- Cron `stripe-cron` for past_due reconciliation (verify against Cluster 11 cross-cuts table — idempotency-key on webhook handler)
- usePlanGate composable (plan-based feature gate)
- Profile section: avatar, name, email change (calls useEmailChange shipped by Cluster 01), timezone
- Plan & Billing: current plan card, upgrade CTA → Checkout, Manage subscription → Customer Portal (new tab — embedded iframe NOT recommended per Stripe security guidance; verify before authoring)
- Integrations: per-brand Shopify connect/disconnect (M9 logic reused; UI refactored to dark + brand-dropdown)
- Danger zone: mounts <DangerZoneCard> from Cluster 01

CROSS-CUTS:
- Cluster 01 ships <DangerZoneCard>, useAccountDeletion, useEmailChange, users.deleted_at column
- Cluster 11 ships useToast, <KovaModal>, skeletons, idempotency_keys table + helper
- Cluster 03 ships useBrandsStore.brands[] for brand-picker dropdown
- LAUNCH-BLOCKING: Stripe webhook handler MUST verify signature; idempotency-key on every webhook event (Cluster 11 pattern); 20-second ack window
- Cluster 01 GDPR cron 'stripe' step calls Stripe SDK — this PRD must ensure the SDK + env vars are in place BEFORE Phase B cron activation (per Cluster 01 PRD §12.1 mitigation)

KEY DECISIONS TO RECOMMEND:
- Stripe Customer Portal embed: recommend NEW TAB (Stripe blocks iframe via X-Frame-Options; documented in Stripe docs)
- Plan structure: per Q14 + 00e §6, intentionally not specified in this PRD; Stripe data model supports any. Recommend ship with 'free' as user.plan default; no upgrade gate at MVP unless founder activates pricing post-launch.
- Email change flow ownership split: Cluster 01 owns the API + landing pages; Cluster 04 owns the Profile-section input + trigger button (composable boundary).
- Stripe-webhook errors: log to Sentry; do NOT silently retry (Stripe handles retries); idempotency-key prevents double-process.

OUTPUT:
1. PRD at docs/prd/04-account-and-stripe-billing.md
2. Plan via superpowers:writing-plans → docs/superpowers/plans/04-account-and-stripe-billing-plan.md

STOP. Same rules. Report back.

END PROMPT ──────────────────────────────────────────────────────────
```

---

### 4.5 Cluster 05 — Brand Kit Settings & Drag-Drop

**Filename:** `05-brand-kit-and-drag-drop.md`
**00c §2.A line range:** 1404–1550
**Wave:** 4
**Dependencies:** Cluster 01, 03, 04, 11. Blocks: 06 (drop receivers), 10 (AI tone-snippet injection).
**M9 reuse:** YES — `api/shopify/brand-kit-extract.ts` (RE-SPEC: extend to scrape brand voice + tone snippets via Anthropic on Shopify connect per §5.6 item 3).

```
BEGIN PROMPT ────────────────────────────────────────────────────────

You are dispatched to author PRD 05 — Brand Kit Settings & Drag-Drop — for the Kova project.

REQUIRED READING:
1. docs/prd/00a-PRD_AUTHORING_GUIDE.md
2. docs/prd/00-PRD_SCOPE_PLAN.md (focus §3 Cluster 05)
3. docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md (focus lines 1404–1550 = §2.A Cluster 05 + §1.E.1 brand-kit-extract analysis)
4. docs/prd/01-auth-and-identity.md (canonical reference)
5. docs/prd/00d + 00e (PARTICULARLY 00e §6 #5 — voice-draft guardrail)
6. docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md (D-3 voice guardrail)

SOURCE ARTIFACTS:
- Hi-fi files:
  - main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html (Brand Kit sub-tabs — 7 scenes)
  - main-main-kova-scope/batch-a-additions/dark/batch-0/Kova Hi-Fi B3 Brand Kit CRUD Modals - Dark.html (tone-snippet + saved-block add/edit/delete — 7 scenes)
  - main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B8 Upload States - Dark.html (logo/font/KB upload UI states)
- 03 doc rows: §2.5 Left panel Assets/Brand kit (16 rows); Q9 media consolidation row.
- Q-decisions: Q6 (brand_fonts NEW table — verified missing via Supabase MCP), Q8 (tone_snippets + saved_blocks JSONB on brands — INCLUDED MVP), Q9 (single media table with brand_id FK), Q24 (drag-drop semantics + MIME types).
- Design system: dark.
- M9 reuse: api/shopify/brand-kit-extract.ts + api/_shared/shopify-brand-kit.ts — RE-SPEC: extend to scrape brand voice + tone snippets via Anthropic API on Shopify connect (§5.6 item 3). HARD REQUIREMENT (per 00e §6 #5): voice/tone scraped from storefront is a USER-CONFIRMED DRAFT, never a silent write. UI must show "Confirm brand voice draft" step before persisting to brands.voice / brands.tone_snippets.

INFRA SCOPE:
- Schema migrations: brands.tone_snippets JSONB + brands.saved_blocks JSONB (single migration); NEW brand_fonts table (id, brand_id FK, family_name, file_path, file_size_bytes, mime_type CHECK in ('font/woff2','font/ttf','font/otf'), uploaded_at, uploaded_by, license_attested); public.media with brand_id FK + idx_media_brand_id
- Storage bucket brand-fonts (private, signed-URL fetch)
- Brand-font upload Edge Function (file → Storage → DB → canvas-engine font-registration hook)
- Anthropic-call upgrade in brand-kit-extract for voice/tone scraping (with user-confirmation gate)
- useBrandKitStore (reactive read of selected brand's kit fields)
- use-canvas-drop.ts payload handlers for color/font/logo/saved-block MIME types (per Q24)
- AI chat system-prompt builder extension (tone snippets injected as exemplars — Cluster 10 consumes)
- Brand Kit settings UI sub-tabs (Visuals, Fonts, Tone snippets, Saved blocks, Memory, KB sources)
- CRUD modals for tone snippets + saved blocks (B3 patterns)
- File-upload UI states (B8 patterns)

CROSS-CUTS:
- Cluster 04 owns /account/brand-kit route shell; this PRD owns the section content
- Cluster 06 owns canvas drop receivers; this PRD owns drag SOURCES + MIME payloads
- Cluster 10 reads tone_snippets for AI chat prompt
- Cluster 11 ships skeletons + <KovaModal> + useConfirm + idempotency-key helper
- HARD REQUIREMENT: 00e §6 #4 D-3 disclosure — Anthropic data flow named in privacy policy (Cluster 01 PRD §13.6 owns; this PRD references)

KEY DECISIONS TO RECOMMEND:
- Voice-draft confirmation UX: recommend modal post-Shopify-connect showing scraped voice + tone snippet candidates with edit fields + "Confirm" / "Discard" buttons. NEVER write to DB before user confirms.
- Font upload max size: recommend 5 MB per file (covers woff2/ttf/otf with margin)
- Tone snippets per brand cap: recommend 50 (UI scrollable; DB no hard cap)
- Saved blocks per brand cap: recommend 100
- License attestation: required checkbox per font upload — "I confirm I have rights to use this font commercially" → license_attested column

OUTPUT:
1. PRD at docs/prd/05-brand-kit-and-drag-drop.md
2. Plan via superpowers:writing-plans → docs/superpowers/plans/05-brand-kit-and-drag-drop-plan.md

STOP. Same rules. Report back.

END PROMPT ──────────────────────────────────────────────────────────
```

---

### 4.6 Cluster 06 — Canvas Editor Core Chrome

**Filename:** `06-canvas-editor-core-chrome.md`
**00c §2.A line range:** 1551–1613
**Wave:** 4
**Dependencies:** Cluster 02, 03, 11. Blocks: 07, 08, 09, 10. **LARGEST PRD — ~45-55 sections. May warrant authoring-time split.**
**M9 reuse:** YES — `src/canvas-extensions/product-variant/` Shop panel (REUSE — verify Shop panel docks correctly + Q24 drag-drop integration).

```
BEGIN PROMPT ────────────────────────────────────────────────────────

You are dispatched to author PRD 06 — Canvas Editor Core Chrome — for the Kova project.

This is one of the largest PRDs. If you encounter authoring fatigue or the doc grows past ~1500 lines, raise an ESCALATE to split into 06a (Top chrome + Bottom toolbar) + 06b (Left + Right panels). Default: ship as one PRD.

REQUIRED READING:
1. docs/prd/00a-PRD_AUTHORING_GUIDE.md
2. docs/prd/00-PRD_SCOPE_PLAN.md (focus §3 Cluster 06)
3. docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md (focus lines 1551–1613 = §2.A Cluster 06)
4. docs/prd/01-auth-and-identity.md (canonical reference)
5. docs/prd/00d + 00e

SOURCE ARTIFACTS:
- Hi-fi files:
  - main-main-kova-scope/batch-b/Kova Canvas - Final.html (CANONICAL CHROME SOURCE-OF-TRUTH — lines 75-1008. .kc {} block IS the spec for canvas chrome.)
  - main-main-kova-scope/batch-b/chunk-b3/Kova Hi-Fi 10 Left Panel - Dark.html (4 scenes)
  - main-main-kova-scope/batch-b/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html (7 scenes — properties, fills, text, layout, dims, transforms)
  - main-main-kova-scope/batch-b/chunk-b5/Kova Hi-Fi 12 Color Picker - Dark.html (8 scenes — popover)
  - main-main-kova-scope/batch-b/Kova Hi-Fi 08 Top Chrome Menus - Dark.html (topbar dropdowns)
  - main-main-kova-scope/batch-b/chunk-b2/Kova Hi-Fi 16 Toasts + Missing Fonts - Dark.html (canvas-toast variant)
- 03 doc rows: §2.1 top chrome (7 rows) + §2.3 bottom toolbar (3 rows) + §2.4 left panel pages/layers (12 rows) + §2.6 inspector (26 rows) = 48 rows.
- Q-decisions: Q3 (inspector engine readiness — wire what's ready, defer what's not), Q4 (zero engine extension hooks), Q16 (avatar dropdown items REVISED 2026-04-25), Q17 (brand label = navigate not popover), Q18 (right-click overflow vs canvas right-click via useObjectActions).
- Design system: dark. CANVAS chrome lives at the heart of the dark theme — every token here is canonical.
- M9 reuse: canvas-extensions/product-variant/ Shop panel docks in right panel.

INFRA SCOPE:
- Vue route /canvas/:canvasId
- Top chrome: topbar layout, file menu, logo dropdown ("Back to dashboard"), brand label (click = navigate per Q17), avatar dropdown (Q16 items: User name + plan badge, Account, Help, Keyboard shortcuts (⇧⌘?), What's new (Phase 2), Sign out)
- Bottom toolbar: 9 tools (Move/Frame/Rectangle/Ellipse/Pen/Text/Comment/AI/Components) + tool registration system (Slice + Measurement registered in Cluster 07)
- Left panel: Pages section + Layers tree (useLayerTree, virtual scrolling, expand/collapse, drag-reorder)
- Right panel / Inspector: tab routing (Design only — Prototype DEFERRED); properties section component (when no selection — §3C #13); per-section panels (Position/Layout/Fill/Stroke/Text/Effects/Export)
- Color picker popover (file 12) — picker logic, gradient editor, eyedropper trigger (canvas-only Q20)
- useNodeProps + useMultiProps consumer extension (existing in core)

CROSS-CUTS:
- Cluster 07 ships engine extensions (Slice, Measurement, Effects renderer, Boolean ops, image fill modes); 06 wires the UI for them
- Cluster 08 ships menus + popovers + shortcuts shells; 06 mounts them
- Cluster 11 ships <KovaModal>, useToast, skeletons
- Cluster 10 ships AI chat panel — mounts somewhere in this chrome (right panel? floating? — RECOMMEND right panel dock OR canvas-floating; ESCALATE if not clear)
- Cluster 12 ships usePreferencesStore — Layers/Pages collapse state, etc. consume

KEY DECISIONS TO RECOMMEND:
- Tab routing (Design only): hide Prototype tab entirely (do not show as disabled)
- Avatar dropdown sign-out: calls useAuthStore.signOut() then routes to /login (Cluster 01 owns the flow)
- AI chat dock location: recommend right panel as a third tab (after Design) — pending Cluster 10 PRD which may override
- Color-picker eyedropper: canvas-only MVP per Q20

OUTPUT:
1. PRD at docs/prd/06-canvas-editor-core-chrome.md
2. Plan via superpowers:writing-plans → docs/superpowers/plans/06-canvas-editor-core-chrome-plan.md

STOP. Same rules. Report back. Flag if you needed to split into 06a/06b.

END PROMPT ──────────────────────────────────────────────────────────
```

---

### 4.7 Cluster 07a — Canvas Engine Core + Renderer

**Filename:** `07a-canvas-engine-core-renderer.md`
**00c §2.A line range:** 1614–1683 (§2.A Cluster 07 — split at draft time per §5.6 item 10)
**Wave:** 5
**Dependencies:** Cluster 06 (chrome must host engine). Blocks: 07b, 08, 09, 10.

```
BEGIN PROMPT ────────────────────────────────────────────────────────

You are dispatched to author PRD 07a — Canvas Engine Core + Renderer — for the Kova project.

This is the SPLIT of Cluster 07 (committed per scope plan §5.6 item 10). 07a covers Core modifications + Renderer-only changes. 07b covers Inspector wiring + App-level overlays. Coordinate scope boundary with 07b author.

REQUIRED READING:
1. docs/prd/00a-PRD_AUTHORING_GUIDE.md
2. docs/prd/00-PRD_SCOPE_PLAN.md (focus §3 Cluster 07)
3. docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md (focus lines 1614–1683 = §2.A Cluster 07; lift the 1a + 1b buckets)
4. docs/prd/01-auth-and-identity.md (canonical reference)
5. CLAUDE.md (root) — sections "Never modify" + "lift the core lock per amendment"
6. docs/prd/00d + 00e

SOURCE ARTIFACTS:
- Hi-fi files:
  - main-main-kova-scope/batch-b/Kova Canvas - Final.html (overlays + slice + measurement visual reference)
  - main-main-kova-scope/batch-b/Kova Hi-Fi 09 Canvas Overlays - Dark.html (export preview, slice stack, gradient overlay panels — 10 scenes B8.1-B8.10)
- 03 doc rows: §2.7 Canvas-engine extensions (33 rows; §3C #1a + #1b only — 1c + 1d belong to 07b)
- Q-decisions: Q1 (Slice = 17th NodeType, lift core lock), Q2 (mask compositing in renderer/scene.ts), Q11 (Measurement = 18th NodeType, Path 1 lift), Q3 missing 4 (aspectRatio, page-export flag, page-bg-vis, scale tool — 3 of these in 07a, scale tool may belong to 07b inspector wiring).
- Design system: dark.

INFRA SCOPE (07a only):
- Core mods (lift the core lock per CLAUDE.md amendment):
  - SLICE NodeType (17th) in packages/core/src/scene-graph.ts
  - MEASUREMENT NodeType (18th) in same file (Path 1 per Q11)
  - aspectRatio prop
  - page-level export flag (page.shouldExport)
  - page-bg-visibility
  - scale tool action (in tools/, name TBD; verify against engine APIs)
  - OpenType per-text-run wiring (kiwi has it; needs SceneNode bridge)
  - List/link per-text-run attrs
  - Tool registration in packages/core/src/tools/
- Renderer-only changes (data model in core, only renderer work):
  - Mask compositing in packages/core/src/renderer/scene.ts (sibling traversal pattern; all 3 maskType branches: ALPHA/VECTOR/LUMINANCE per Q2)
- packages/core/CHANGELOG-KOVA.md initial entry + upstream-PR contribution pipeline notes

OUT OF SCOPE (defers to 07b):
- Vertical text align, stroke align, multiple fills, image fill picker, gradient editor UI, Effects inspector, Boolean ops menu wiring (these are inspector wiring on top of already-shipped engine APIs)
- All app-level overlays (Frame outlines, Mask outlines, Slice region, Snap indicators, Layout guides, Pixel grid, Hover contour, Find highlight, Eyedropper crosshair, Measurement annotations)
- All Phase-2-deferred items per scope plan §3 Cluster 07

CROSS-CUTS:
- 07b reads NodeType registry + tool registry to wire UI
- Cluster 08 reads tool registry for shortcuts
- Cluster 09 reads scene-graph stability guarantees for snapshots
- Cluster 10 reads NodeTypes for AI tool registration
- CLAUDE.md hard constraint: SYSTEM_PROMPT in use-chat.ts is forbidden territory; this PRD does not touch it

KEY DECISIONS TO RECOMMEND:
- Upstream contribution: recommend YES — every lift-the-lock change PRs back to open-pencil upstream when stable
- SLICE NodeType field set: recommend matching Figma's data model (verify against developers.figma.com per feedback_verify_with_docs memory)
- MEASUREMENT NodeType field set: same — verify against developers.figma.com

OUTPUT:
1. PRD at docs/prd/07a-canvas-engine-core-renderer.md
2. Plan via superpowers:writing-plans → docs/superpowers/plans/07a-canvas-engine-core-renderer-plan.md

STOP. Report back.

END PROMPT ──────────────────────────────────────────────────────────
```

---

### 4.8 Cluster 07b — Canvas Engine Inspector + Overlays

**Filename:** `07b-canvas-engine-inspector-overlays.md`
**00c §2.A line range:** 1614–1683 (same Cluster 07 block; 07b lifts 1c + 1d buckets)
**Wave:** 5
**Dependencies:** 06, 07a. Blocks: 08, 09, 10.

```
BEGIN PROMPT ────────────────────────────────────────────────────────

You are dispatched to author PRD 07b — Canvas Engine Inspector + Overlays — for the Kova project.

Companion to 07a. 07b covers Inspector wiring + App-level overlays. Coordinate scope boundary with 07a author.

REQUIRED READING:
1. docs/prd/00a-PRD_AUTHORING_GUIDE.md
2. docs/prd/00-PRD_SCOPE_PLAN.md (focus §3 Cluster 07)
3. docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md (focus lines 1614–1683 — buckets 1c + 1d)
4. docs/prd/07a-canvas-engine-core-renderer.md (sibling PRD — read after it lands to verify scope split)
5. docs/prd/01-auth-and-identity.md (canonical reference)
6. docs/prd/00d + 00e

SOURCE ARTIFACTS:
- Hi-fi files:
  - main-main-kova-scope/batch-b/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html (Effects + Boolean ops UI)
  - main-main-kova-scope/batch-b/chunk-b5/Kova Hi-Fi 12 Color Picker - Dark.html (gradient editor — Q3 #12)
  - main-main-kova-scope/batch-b/Kova Hi-Fi 09 Canvas Overlays - Dark.html (10 overlay scenes)
- 03 doc rows: §2.7 Canvas-engine extensions (33 rows; §3C #1c + #1d)
- Q-decisions: Q3 expanded (9 features engine-ready; UI wiring only); Q20 (eyedropper canvas-only); Q21 (4 image-fill modes); Q22 (JPG export 3-level dropdown); Q23 (copy/paste props full set); Q24 (drag-drop semantics — image fill picker consumes); Q3 #14 (boolean ops shortcuts ⌘⌥U/S/I/X).
- Design system: dark.

INFRA SCOPE (07b only):
- App-level inspector wiring (engine APIs already exist):
  - Vertical text alignment, stroke alignment, multiple fills, image fill picker (4 modes per Q21), gradient editor UI, Effects inspector (5 effect types: drop-shadow, inner-shadow, layer-blur, bg-blur, fg-blur), Boolean ops menu (Union/Subtract/Intersect/Exclude with Figma shortcuts)
- App-level overlays:
  - Frame outlines, Mask outlines, Slice region, Snap indicators, Layout guides (default-ON red 10% per Q24), Pixel grid, Hover contour, Find highlight, Eyedropper crosshair, Measurement annotations
- JPG export 3-level dropdown (High 0.92 default / Medium 0.80 / Low 0.65 per Q22)
- Copy/Paste properties full set (per Q23 — overrides Figma's stroke-partial)

OUT OF SCOPE (defers to 07a):
- All core NodeType additions
- All renderer mask compositing
- Tool registration in packages/core/src/tools/

CROSS-CUTS:
- 07a ships NodeTypes + renderer compositing
- Cluster 06 mounts the inspector chrome that consumes these UI components
- Cluster 08 ships keyboard shortcut registry — Boolean ops shortcuts register here
- Cluster 11 ships <KovaModal> for export preview overlay (B8.1 scene)

KEY DECISIONS TO RECOMMEND:
- Effects inspector default-collapsed vs open: recommend collapsed (Figma default)
- Boolean ops keyboard shortcuts: ship Figma-exact (⌘⌥U/S/I/X)
- Image fill picker default mode: 'Fill' (Figma default)
- JPG export default quality: 'High' (0.92 per Q22)

OUTPUT:
1. PRD at docs/prd/07b-canvas-engine-inspector-overlays.md
2. Plan via superpowers:writing-plans → docs/superpowers/plans/07b-canvas-engine-inspector-overlays-plan.md

STOP. Report back.

END PROMPT ──────────────────────────────────────────────────────────
```

---

### 4.9 Cluster 08 — Canvas Menus, Popovers, Context Menus & Shortcuts

**Filename:** `08-canvas-menus-popovers-shortcuts.md`
**00c §2.A line range:** 1684–1763
**Wave:** 5
**Dependencies:** 06, 11. Blocks: none (downstream PRDs reference primitives).

```
BEGIN PROMPT ────────────────────────────────────────────────────────

You are dispatched to author PRD 08 — Canvas Menus, Popovers, Context Menus & Keyboard Shortcuts — for the Kova project.

REQUIRED READING:
1. docs/prd/00a-PRD_AUTHORING_GUIDE.md
2. docs/prd/00-PRD_SCOPE_PLAN.md (focus §3 Cluster 08)
3. docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md (focus lines 1684–1763 = §2.A Cluster 08)
4. docs/prd/01-auth-and-identity.md (canonical reference)
5. docs/prd/00d + 00e

SOURCE ARTIFACTS:
- Hi-fi files:
  - main-main-kova-scope/batch-b/Kova Hi-Fi 08 Top Chrome Menus - Dark.html (top-chrome menu catalog: File/Edit/Arrange/View + search + user menu)
  - main-main-kova-scope/batch-b/chunk-b1/Kova Hi-Fi 13 Canvas Popovers - Dark.html (right-click context menus, property popovers, frame name edit — 5 scenes)
  - main-main-kova-scope/batch-b/chunk-b1/Kova Hi-Fi 14 Find Overlay - Dark.html (find dialog — 2 scenes)
  - main-main-kova-scope/batch-b/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html (trash confirm — cross-cut with Cluster 09)
- 03 doc rows: §2.2 (23) + §2.8 (10) + §2.10 (28) = 61 rows. §3C #7 right-click shell, #8 useConfirm, #9 shortcut registry, #10 main-menu composable, #11 find composable.
- Q-decisions: Q18 (right-click overflow vs canvas right-click — same useObjectActions, different subsets), Q25 (keyboard shortcuts dialog — 13 Figma-exact categories), layout guides default-ON, number-keys-for-opacity always-on, snap toggles deferred-with-default-on.
- Design system: dark.

INFRA SCOPE:
- Main-menu composable (top-chrome state for nested submenus — §3C #10): File / Edit / Arrange / View / Help (Phase 2)
- Right-click context-menu shell (§3C #7): single Reka DropdownMenu pattern, dispatch-table per surface (~12 invocation surfaces)
- useConfirm composable (§3C #8): Cluster 11 ships the PRIMITIVE; this PRD ships the canvas-side specializations (e.g., delete-page typed-confirm)
- Keyboard shortcut registry (§3C #9): declarative catalog + use-keyboard.ts consumer refactor; 13 categories per Q25 (Essentials, Tools, View, Zoom, Text, Shape, Selection, Cursor, Edit, Transform, Arrange, Components-DEFER, Prototyping-DEFER)
- Find composable + canvas-extension overlay (§3C #11): search scoped to current canvas (TEXT content + layer names + frame names + page names — recommend ALL four)
- Keyboard shortcuts dialog modal (Cmd+/) — renders registry catalog by category
- Recent colors persistence (per Q5 Layer 2 localStorage)

CROSS-CUTS:
- Cluster 11 owns useConfirm PRIMITIVE
- Cluster 06 mounts main-menu + right-click shells
- Cluster 07b registers boolean-ops shortcuts in this PRD's registry
- Cluster 12 owns persistence for Layers/Pages collapse, Recent colors

KEY DECISIONS TO RECOMMEND:
- Components / Prototyping categories: hidden in shortcuts dialog (do NOT show DEFER ghosts)
- Snap toggles: default-ON behavior ships; preference UI deferred per Q24 spec
- Number-keys-for-opacity: 1=10% / 0=100% / 00=0% / two-digit within 500ms (Figma-exact)
- Find scope: TEXT content + layer names + frame names + page names (all four)

OUTPUT:
1. PRD at docs/prd/08-canvas-menus-popovers-shortcuts.md
2. Plan via superpowers:writing-plans → docs/superpowers/plans/08-canvas-menus-popovers-shortcuts-plan.md

STOP. Report back.

END PROMPT ──────────────────────────────────────────────────────────
```

---

### 4.10 Cluster 09 — Version History + Snapshot + Trash

**Filename:** `09-version-history-and-trash.md`
**00c §2.A line range:** 1764–1945
**Wave:** 6
**Dependencies:** 06, 07a (scene-graph stability). Blocks: none.

```
BEGIN PROMPT ────────────────────────────────────────────────────────

You are dispatched to author PRD 09 — Version History + Snapshot + Trash — for the Kova project.

REQUIRED READING:
1. docs/prd/00a-PRD_AUTHORING_GUIDE.md
2. docs/prd/00-PRD_SCOPE_PLAN.md (focus §3 Cluster 09)
3. docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md (focus lines 1764–1945 = §2.A Cluster 09 — biggest single per-cluster spec; lift liberally)
4. docs/prd/01-auth-and-identity.md (canonical reference; 09 STORAGE cascade deletion paths handed to 01's cron)
5. docs/prd/00d + 00e

SOURCE ARTIFACTS:
- Hi-fi files:
  - main-main-kova-scope/batch-b/chunk-b6/Kova Hi-Fi 17 Version History - Dark.html (timeline panel, restore, compare, timestamps — 11 scenes)
  - main-main-kova-scope/batch-b/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html (trash confirm modal — 3 scenes B13.1/2/3)
- 03 doc rows: §2.11 version history (2 rows + 1 cross-cut) + §2.12 trash (1 row). §3C #2 snapshot/version-history store.
- Q-decisions: Q7 (Figma-exact snapshot model: Yjs Kiwi+Zstd bytes, per-canvas, 100MB per-brand quota MVP, 30-day free / unlimited paid retention, 30-min autosnapshot + on-disconnect + on-tab-close + on ⌥⌘S, daily prune cron, atomic restore with pre-restore snapshot); Q19 (trash indefinite retention, no auto-purge, user-initiated permanent delete only, Cluster 01 cascade purges at 30-day mark).
- Design system: dark.

INFRA SCOPE:
- Schema: NEW canvas_snapshots table (canvas_id FK, brand_id FK, kiwi_zstd_bytes BYTEA OR Storage path, created_at, trigger CHECK in ('autosnap','disconnect','tab-close','manual','pre-restore'), retention_class CHECK in ('free','paid','permanent'))
- Storage bucket canvas-snapshots/{user_id}/{brand_id}/{canvas_id}/{snapshot_id}.bin (large-blob offload if BYTEA row exceeds DB row limit)
- 3 RPCs: create_snapshot, list_snapshots, restore_snapshot (atomic with pre-restore snapshot)
- Autosnapshot heartbeat composable: 30-min interval + lifecycle events (disconnect, tab-close, ⌥⌘S)
- Daily prune cron (Vercel Cron): free-tier 30-day retention enforcement
- Trash flow: canvases.trashed_at column (already exists per 03 doc) + Recent files filter + restore action + permanent-delete action
- Version history UI panel (file 17): timeline list, restore button, compare modal (Phase 2 — verify with founder if compare ships in MVP or deferred), timestamp formatting

CROSS-CUTS:
- Cluster 01 cron 'storage' step deletes canvas-snapshots/{user_id}/** during account deletion
- Cluster 11 ships skeletons + useConfirm for trash typed-confirm modal
- Cluster 06 mounts version-history panel in canvas right side (recommend: tab-switch from Design when activated)
- Cluster 07a guarantees scene-graph stability for snapshot round-trip

KEY DECISIONS TO RECOMMEND:
- Snapshot blob storage: DB BYTEA up to 1 MB; Storage bucket above 1 MB (recommend; balance row-size + Storage object count)
- Compare modal: defer to Phase 2; ship version-history list + restore + delete only
- Autosnap throttling: skip if no changes since last snap (compare Yjs doc state vector)
- Pre-restore snapshot: ALWAYS take one before restore (Figma pattern — gives "undo restore" affordance)

OUTPUT:
1. PRD at docs/prd/09-version-history-and-trash.md
2. Plan via superpowers:writing-plans → docs/superpowers/plans/09-version-history-and-trash-plan.md

STOP. Report back.

END PROMPT ──────────────────────────────────────────────────────────
```

---

### 4.11 Cluster 10 — AI Chat + Memory + Tool Layer

**Filename:** `10-ai-chat-and-memory.md`
**00c §2.A line range:** 1946–2007
**Wave:** 6
**Dependencies:** 05 (Brand Kit tone snippets), 06 (chrome host), 07 (engine tools). Blocks: none.
**M9 reuse:** YES — 5 Shopify AI tools (REUSE — schema bug fixed 2026-05-13).

```
BEGIN PROMPT ────────────────────────────────────────────────────────

You are dispatched to author PRD 10 — AI Chat + Memory + Tool Layer — for the Kova project.

REQUIRED READING:
1. docs/prd/00a-PRD_AUTHORING_GUIDE.md
2. docs/prd/00-PRD_SCOPE_PLAN.md (focus §3 Cluster 10)
3. docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md (focus lines 1946–2007 = §2.A Cluster 10 + §1.E.1 Shopify M9 5-tool audit)
4. docs/prd/01-auth-and-identity.md (canonical reference)
5. docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md (D1–D9 Shopify product-reference architecture — REQUIRED CONTEXT for chat composer chip UX)
6. docs/prd/00d + 00e

SOURCE ARTIFACTS:
- Hi-fi files:
  - (No standalone chat-panel hi-fi — chat lives in canvas right-panel area)
  - Reference: main-main-kova-scope/batch-a-additions/dark/batch-0/Kova Hi-Fi B1 Toasts - Dark.html (AI generation toast variant)
  - Reference: Shopify product-reference design at docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md
- 03 doc rows: Cross-cuts §2.5 Brand Kit, §2.7 AI text suggestions DEFERRED, §2.13 brand assets.
- Q-decisions: Q8 (tone snippets injected as system-prompt exemplars).
- M5 / M5.5 prior work — see memory pointers: project_m5_task16_wired, project_m5_chat_memory_decisions, project_m5_design_approach_decisions, project_m5_chunk_b_decisions, project_m5.5_handoff. **Reference existing implementation; do NOT re-spec from scratch.**
- M9 reuse: 5 Shopify AI tools at src/ai/kova-tools.ts — REUSE (schema bug fixed 2026-05-13, 22 tests pass). Verify alignment with Q3 + Q8.

INFRA SCOPE:
- Chat panel UI (right-panel tab OR floating dock — see Cluster 06 PRD recommendation; coordinate)
- useChatStore (per-canvas chat history; independent chats per canvas per M5 decisions); Supabase persistence
- useBrandMemoryStore (flat auto-populated facts per brand per M5)
- System-prompt builder (buildSystemPrompt(brand, canvas, recentTurns)) — extends current implementation with tone-snippet exemplar injection per Q8
- Tone-snippet injection from useBrandKitStore (Cluster 05 ships)
- AI tool registration (5 existing Shopify tools + placeMediaImage + saveBrandMemory + slice tool + measurement tool from Cluster 07)
- ToolLoopAgent integration with @ai-sdk/anthropic — CLAUDE.md hard constraint: NO custom adapter
- Anthropic API key via server-only env var (NEVER browser-exposed — CLAUDE.md)
- Shopify product-reference composer chips (Approach A per spec §D7 — each chip individually removable via × per §D8)

CROSS-CUTS:
- Cluster 05 ships useBrandKitStore.toneSnippets[] read API
- Cluster 06 mounts chat in canvas chrome
- Cluster 07 ships engine tools (Slice, Measurement)
- Cluster 11 ships Realtime channel naming convention; chat streaming uses it
- HARD CONSTRAINT: SYSTEM_PROMPT in src/ai/use-chat.ts — NEVER modify per CLAUDE.md

KEY DECISIONS TO RECOMMEND:
- Chat panel placement: per Cluster 06 — right panel as third tab (after Design)
- Tone-snippet injection cap: max 10 snippets per system-prompt build (token budget; first 10 by user-defined order)
- Brand-memory injection: auto-extracted facts inserted into system prompt; user can edit per Brand Kit memory tab (Cluster 05)
- Product-reference chip max count: 20 (UI accommodates; LLM payload manageable)

OUTPUT:
1. PRD at docs/prd/10-ai-chat-and-memory.md
2. Plan via superpowers:writing-plans → docs/superpowers/plans/10-ai-chat-and-memory-plan.md

STOP. Report back.

END PROMPT ──────────────────────────────────────────────────────────
```

---

### 4.12 Cluster 11 — Shared UI Infrastructure

**Filename:** `11-shared-ui-infrastructure.md`
**00c §2.A line range:** 2008–2057
**Wave:** 1 (parallel with Cluster 01 — different domains, zero file overlap)
**Dependencies:** None. Blocks: ALL other clusters.

```
BEGIN PROMPT ────────────────────────────────────────────────────────

You are dispatched to author PRD 11 — Shared UI Infrastructure — for the Kova project.

THIS IS A FOUNDATION CLUSTER. Every other PRD depends on it. Author with extra care.

REQUIRED READING:
1. docs/prd/00a-PRD_AUTHORING_GUIDE.md
2. docs/prd/00-PRD_SCOPE_PLAN.md (focus §3 Cluster 11 + §6 cross-cuts table — every primitive listed there ships from this PRD)
3. docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md (focus lines 2008–2057 = §2.A Cluster 11)
4. docs/prd/01-auth-and-identity.md (canonical reference; 01 CONSUMES this PRD's primitives heavily — read its §11 cross-cuts table)
5. docs/prd/00d + 00e

SOURCE ARTIFACTS:
- Hi-fi files:
  - main-main-kova-scope/batch-a-additions/dark/batch-0/Kova Hi-Fi B1 Toasts - Dark.html (8 toast scenes: success/error/info/action/AI-gen/stacked/long-content/over-modal)
  - main-main-kova-scope/batch-a-additions/dark/batch-0/Kova Hi-Fi B2 Error Pages - Dark.html (404/500/network-unreachable)
  - main-main-kova-scope/batch-a/dark/Kova Hi-Fi A5 Command-K - Dark.html (3 scenes)
  - main-main-kova-scope/batch-a/dark/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html (modal .dlg shell + popover primitives)
  - main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B7 Loading Skeletons - Dark.html (5 patterns)
  - main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B9 List Search Empty - Dark.html (3 patterns)
  - main-main-kova-scope/batch-a/dark/Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html (empty states + offline pill)
- 03 doc cross-cuts: §3C #7 right-click shell, #8 useConfirm, #15 network status indicator.
- Q-decisions: none direct — these are primitives consumed by every cluster.
- Design system: dark for app surfaces; light variants for use within auth/marketing only (relevant for shared <MarketingShell> + email templates).

INFRA SCOPE:
- useToast composable + toast component + <ToastStack> container (8 variants per B1)
- Error pages: /404, /500, network-unreachable boundary
- <KovaModal> component wrapping Reka Dialog (sm/md/lg sizes per A6+A2a)
- useConfirm composable (returns Promise<boolean>; module-level pendingConfirm ref pattern; modal mounted once at app shell)
- Command-K palette composable use-command-palette.ts + search index + result renderers (A5)
- Skeleton component primitives + per-surface compositions (B7 patterns)
- Empty-state component + per-surface variants (B9 patterns)
- Offline indicator composable (navigator.onLine + Supabase channel state; §3C #15)
- Network status pill component (A13 pattern)
- <EmailShell> shared HTML email template (used by 01 + 04 + others)
- Cross-cuts (per 00c §1.D): idempotency_keys table + helper, Vue Router meta theme runtime swap, Supabase Realtime channel-naming convention (kova.channel.<domain>.<topic>), Tauri command-surface naming (kova.*)

CROSS-CUTS:
- Cluster 01 consumes: useToast, <KovaModal>, useConfirm, idempotency_keys, error pages, <EmailShell>, Sentry SDK wrapper
- Every other cluster consumes at least 3 of the above
- Sentry SDK integration: wire here (NPM package + DSN env var + error boundary)

KEY DECISIONS TO RECOMMEND:
- Toast queue max: 5 visible, infinite queued (auto-dismiss 5 s default; sticky 'error' + 'action' variants until dismissed)
- Modal stack: max 2 nested (parent + child); 3rd open closes innermost
- Command-K result categories: Files, Brands, Actions, Help (extensible via registry)
- idempotency_keys retention: 24 hours (cleanup cron — see §5.3 in your PRD)
- Realtime channel naming: kova.{user_id}.{domain}.{topic} (kova.{userId}.canvas.{canvasId}.snapshot, kova.{userId}.chat.{conversationId}.stream, kova.{userId}.shopify.{brandId}.sync) — coordinate with consuming clusters
- Network status: navigator.onLine primary, Supabase Realtime channel ping secondary (3-second ping interval when on-line; mark offline after 10s no-ack)

OUTPUT:
1. PRD at docs/prd/11-shared-ui-infrastructure.md
2. Plan via superpowers:writing-plans → docs/superpowers/plans/11-shared-ui-infrastructure-plan.md

STOP. Report back.

END PROMPT ──────────────────────────────────────────────────────────
```

---

### 4.13 Cluster 12 — Settings / Accessibility / User Preferences

**Filename:** `12-settings-and-user-preferences.md`
**00c §2.A line range:** 2058–2128
**Wave:** 3 (with Cluster 04)
**Dependencies:** Cluster 01 (`users.preferences` JSONB ships there). Blocks: 06 (panel collapse), 08 (recent colors).

```
BEGIN PROMPT ────────────────────────────────────────────────────────

You are dispatched to author PRD 12 — Settings / Accessibility / User Preferences — for the Kova project.

REQUIRED READING:
1. docs/prd/00a-PRD_AUTHORING_GUIDE.md
2. docs/prd/00-PRD_SCOPE_PLAN.md (focus §3 Cluster 12)
3. docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md (focus lines 2058–2128 = §2.A Cluster 12)
4. docs/prd/01-auth-and-identity.md (canonical reference; users.preferences column ships there — this PRD CONSUMES it)
5. docs/prd/00d + 00e

SOURCE ARTIFACTS:
- Hi-fi files:
  - (No dedicated Settings page hi-fi — per Q5; likely embed in Account page Profile section as preference sub-rows OR small modal)
  - Reference: main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html (Profile section host)
- 03 doc rows: §2.9 (3 rows) + §3C #3 user-preferences storage; cross-cuts §2.4 Page/Layers collapse, §2.7 text-suggestions, §2.8 recent-colors, §2.10 ruler/guide/grid persistence.
- Q-decisions: Q5 corrected (two-layer architecture — users.preferences JSONB cross-device + localStorage per-device via VueUse useLocalStorage). DEFERRED: snap toggles re-introduction, custom keybindings.
- Design system: dark.

INFRA SCOPE:
- users.preferences JSONB column — ALREADY SHIPS in Cluster 01 migration. This PRD consumes; does NOT re-add.
- usePreferencesStore (Pinia): reads users.preferences JSONB; provides reactive getters per pref; debounced server-write (recommend 1-second debounce)
- useLocalStoragePreferences (VueUse wrapper for per-device prefs)
- Per-pref allocation table (per Q5 companion doc): which prefs go to Layer 1 (cross-device) vs Layer 2 (per-device)
- Settings page UI (recommend: embedded in /account/profile as sub-section, NOT separate route)
- Accessibility section: textSize (small/normal/large), reduceMotion (defers to OS by default), highContrast (toggle), keyboard navigation enhancements, screen-reader landmarks audit pass

CROSS-CUTS:
- Cluster 01 ships users.preferences JSONB
- Cluster 04 mounts the Settings UI inside /account/profile (coordinate placement)
- Cluster 06 consumes panel-collapse prefs
- Cluster 08 consumes recent-colors, ruler/guide/grid persistence
- Cluster 11 ships useToast for "Preferences saved" feedback

KEY DECISIONS TO RECOMMEND:
- Settings location: embed in /account/profile (avoid second-route navigation friction)
- Layer 1 (cross-device) prefs: textSize, reduceMotion, highContrast, dashboardSort, editorTabsCollapsed
- Layer 2 (per-device) prefs: lastActiveBrandId, recentColors, panelCollapseStates, rulerVisibility, gridVisibility, pixelGridVisibility
- Debounce write: 1000ms (avoid hammering server on toggle-bursts)
- Custom keybindings: registry-ready in Cluster 08 but UI deferred to Phase 2

OUTPUT:
1. PRD at docs/prd/12-settings-and-user-preferences.md
2. Plan via superpowers:writing-plans → docs/superpowers/plans/12-settings-and-user-preferences-plan.md

STOP. Report back.

END PROMPT ──────────────────────────────────────────────────────────
```

---

## 5. After all PRDs + plans land — review checklist

Parent agent (Claude) runs this batch-review checklist before approving execution:

- [ ] Every PRD file exists at the expected path
- [ ] Every plan file exists at the expected path
- [ ] Every PRD's §0 status is `DRAFT`
- [ ] Every PRD's §3 surface table has hi-fi file + scene IDs cited (no "TBD")
- [ ] Every PRD's §4 has runnable SQL (no placeholders)
- [ ] Every PRD's §5 backend has Edge Function signatures + cron schedules
- [ ] Every PRD's §6 frontend has route paths + Pinia store shapes + component contracts
- [ ] Every PRD's §11 cross-cuts list matches the scope plan §6 table — no orphan dependencies
- [ ] Every PRD's §12 either RESOLVED or ESCALATE; founder resolves ESCALATE items before approval
- [ ] No PRD invents infra not in 03 doc (every Edge Function / table / store has provenance)
- [ ] No PRD touches `SYSTEM_PROMPT` in `use-chat.ts`
- [ ] No PRD references Nuxt, SSR, or `access_token=` URL pattern
- [ ] No PRD promises live multi-device canvas sync
- [ ] No PRD specs marketing site
- [ ] No PRD re-specs M9 from scratch — REUSE/REFACTOR/RE-SPEC dispositions intact
- [ ] Per-cluster theme rule: dark inside app, light only on auth + marketing + mobile fallback (verified per route)
- [ ] Every PRD's §13 references include 03-doc rows + Q-decisions + hi-fi paths + design-system 4 files
- [ ] Every PRD has both a plain-language §1.1 + caveman §1.2 summary
- [ ] Every plan output is consumable by `superpowers:test-driven-development` skill (TDD-ready structure)

If checklist passes for all 13 PRDs (01 done; 02, 03, 04, 05, 06, 07a, 07b, 08, 09, 10, 11, 12) → proceed to execution per §2.3 phasing.

If any item fails → bounce back to authoring agent OR fix inline (depending on severity).

---

## 6. Founder dispatch checklist (you can use this as your runbook)

For each cluster you want to dispatch:

1. Open this doc, find §4.X cluster prompt
2. Paste the BEGIN/END PROMPT block into a new agent dispatch
3. Confirm the agent starts reading at file #1 (00a guide)
4. Wait for agent's STOP report
5. Collect PRD path + plan path from the report
6. Add to your "ready for review" pile
7. When all desired PRDs are in the pile → ask me to run the §5 batch review

Recommended dispatch order:
- Dispatch all 12 (excluding 01 which is APPROVED) in parallel
- They run independent (no file conflicts during authoring)
- Review batch all at once

---

## 7. Notes + flags

- **Cluster 06 is the largest.** ~45-55 sections. If the agent surfaces "this is too large", let them split into 06a (top + bottom) / 06b (left + right). Default: one PRD.
- **Cluster 07 is committed to split** (07a + 07b). Both prompts above.
- **Cluster 09 has the biggest pre-baked spec** (lines 1764–1945 in 00c — ~180 lines). Lift liberally.
- **M9-touching clusters** (02, 04, 05, 10) must read §5.5 of scope plan for REUSE/REFACTOR/RE-SPEC dispositions. Their prompts above call out M9 reuse explicitly.
- **Cluster 11 is a foundation cluster.** Author with care — every downstream PRD consumes its primitives.
- **Cluster 01 PRD is the canonical reference.** Every dispatched agent reads it. Match its depth, structure, and tone.
- **If an agent encounters a hard-to-reverse decision** in the 00c §1.E watchlist, it must ESCALATE not RESOLVE. Founder decides.

---

## 8. References

- `00-PRD_SCOPE_PLAN.md` — cluster definitions, waves, template
- `00a-PRD_AUTHORING_GUIDE.md` — operator manual
- `00c-COMPREHENSIVE_AUDIT_REPORT.md` — pre-baked specs per cluster (§2.A)
- `00d-EXTERNAL_VERIFICATION_HANDOFF.md` — decision ledger
- `00e-EXTERNAL_VERIFICATION_VERDICT.md` — verification verdict + hygiene rules
- `01-auth-and-identity.md` — CANONICAL REFERENCE PRD (1228 lines, APPROVED 2026-05-15)
