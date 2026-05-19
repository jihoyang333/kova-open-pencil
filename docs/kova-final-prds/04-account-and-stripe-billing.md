# PRD 04 — Account Page + Stripe Billing

## 0. Status & ownership

| Field | Value |
|---|---|
| **Status** | `DRAFT` 2026-05-15 |
| **Wave** | 3 |
| **Author** | Claude (Opus 4.7) |
| **Reviewer** | Jiho Yang (founder) |
| **Last updated** | 2026-05-15 |
| **Depends on PRDs** | 01 (Auth & Identity — `<DangerZoneCard>`, `useAccountDeletion`, `useEmailChange`, `users.deleted_at`, `users.preferences`, RoPA disclosure), 03 (Brand Management — `useBrandsStore.brands[]` for brand picker), 11 (Shared UI Infrastructure — `useToast`, `<KovaModal>`, `useConfirm`, skeletons, `idempotency_keys` table + helper, `audit_log` table, Sentry SDK, `<EmailShell>`, Resend wrapper) |
| **Blocks PRDs** | 05 (Brand Kit & Drag-Drop — consumes Account page Brand Kit section shell + brand picker). Also unblocks production activation of PRD 01's `delete-account-cron` `stripe` step (Cluster 01 §12.1 mitigation). |
| **Source artifacts** | Hi-fi: 4 files (A7 Account Page, B10 Stripe Returns, A4+A9+A10 Modals — delete-account scene, B5 Email Change Landing — cross-cut). 03 doc: §2.14 + §3C #5 + §3C #5b. Q-decisions: Q12 (account IA), Q13 (user-level scope + per-brand picker), Q14 (Stripe foundation), Q15 (GDPR cascade — owned by 01; this PRD ships the Stripe SDK + env vars its `stripe` step needs). Audit §2.A Cluster 04 (lines 1272–1403). §5.6 items 1 (M9 light→dark refactor), 4 (M9 IA realign), 8 (`shopify_connection_history` build). |

---

## 1. Problem & outcome

### 1.1 Plain language (for founder)

A signed-in user needs one canonical place to manage everything that is "theirs at the account level" — name, email, avatar, accessibility preferences, plan, payment method, invoices, per-brand Brand Kit settings, per-brand integrations (Shopify), all brands (active + archived), and the option to delete their account. This PRD ships that place: a full-page `/account` route with a left sidebar of **six sections** (Profile, **Brands**, Plan & billing, Brand Kit, Integrations, Danger zone — Brands added per B12 reversal 2026-05-17, content owned by PRD 03). It also ships the **Stripe foundation** behind the Plan & billing section: a Checkout session creator for upgrades, a Customer Portal session creator for self-service management (cancel, update card, view invoices — opened in a **new tab** because Stripe does not support iframe embed), and a webhook handler that keeps our local `users.plan` / `users.plan_status` / `current_period_end` rows in sync with Stripe's state. The Brand Kit section ships only its **shell** + a brand-picker dropdown — the sub-tab content (Visuals/Fonts/Tone/Saved-blocks/Memory/KB) lives in Cluster 05. The Integrations section **refactors** M9's existing Shopify connect/disconnect UI from light to dark theme, re-routes it from `/dashboard/:brandId/settings/integrations` to `/account/integrations` with a brand-picker, and wires the previously-empty sync-history accordion to a NEW `shopify_connection_history` table. The Danger zone mounts the `<DangerZoneCard>` component shipped by Cluster 01 — this PRD owns the surface, but Cluster 01 owns the cascade. Toast / modal / skeleton / idempotency-key primitives all come from Cluster 11.

### 1.2 Caveman summary (per CLAUDE.md communication style)

User get one big page for everything user-scoped. Five sidebar tabs: Profile, Plan & billing, Brand Kit (per-brand), Integrations (per-brand), Danger zone. Stripe foundation goes here — Checkout new tab, Customer Portal new tab (Stripe blocks iframe), webhook syncs plan state to DB. Brand Kit + Integrations show brand-picker; pick brand, see its kit / its Shopify. M9 integrations code reused but refactored dark + re-routed + history table wired. Danger zone mounts component from Cluster 01 (Cluster 01 owns GDPR cascade — this PRD just ships the button + Stripe SDK its cron needs). Two Stripe return landings: success + cancel. Past-due banner on Plan & billing when payment fails. No iframe ever. No per-brand billing — freelancer pays one subscription, manages many client brands.

### 1.3 Outcome (acceptance gate)

User can: (1) open `/account` → see **6 sidebar sections** (Profile, Brands, Plan & billing, Brand Kit, Integrations, Danger zone — Brands added per B12 reversal 2026-05-17) + default landing on Profile; (2) edit name + upload avatar + change email (via `useEmailChange` from 01) + tune accessibility prefs + save changes with an "unsaved changes" indicator; (3) view current plan + usage + invoice history; (4) click "Manage billing" → open Stripe Customer Portal in a new tab; (5) click "Upgrade" → land in Stripe Checkout → return to `/account/billing/success` (B10.1) or `/account/billing/cancel` (B10.2); (6) pick a brand in Brand Kit section's brand-picker → see that brand's kit shell (sub-tabs populated by Cluster 05); (7) pick a brand in Integrations section → see Shopify connect/disconnect/sync UI (M9 reused) + populated sync-history accordion; (8) click "Delete account" in Danger zone → confirm via typed-DELETE modal → auth signs out → restore in 30-day grace per Cluster 01. Stripe webhook handler verifies signature, dedups by event.id, processes 6 events, returns 200 within Stripe's 20-second ack window. Weekly reconciliation cron heals drift when a `past_due` user has actually paid (Stripe says active, webhook missed). Privacy policy and RoPA carry every Stripe + Shopify cross-cut disclosure.

---

## 2. Scope

### 2.1 In scope (this PRD)

**Account page chrome + navigation:**
- `/account/:section?` route (default section: `profile`)
- 6-section sidebar (Profile, **Brands**, Plan & billing, Brand Kit, Integrations, Danger zone) — Brands added 2026-05-17 per B12 archive reversal; PRD 03 owns content, PRD 04 owns route + chrome entry
- `<AccountView>` layout (top chrome with Back-to-dashboard, left sidebar 240px, right content max-width 720px)
- `useAccountSection()` composable (active-section state, route-sync, deep-link support)
- `<BrandPicker>` component used by per-brand sections (Brand Kit + Integrations) — reads `useBrandsStore.brands[]` from Cluster 03

**Profile section (A7.1):**
- Name field (editable text input, debounced save)
- Avatar upload (PNG/JPG only — SVG rejected to eliminate XSS surface per founder decision 2026-05-17; ≥256px square recommended; ≤5MB upload max; server normalizes to PNG via `sharp` + resizes to 256×256; writes to existing `media-assets` bucket at `users/{user_id}/avatar.png` (FIXED extension); `users.avatar_storage_path` column. Fallback when unset: initials on per-user-stable hashed color tile.)
- Email field (read-only display + "Change…" button triggers `useEmailChange.requestChange()` from Cluster 01 — opens inline form + confirm modal)
- Password row (display "Last changed YYYY-MM-DD" + "Send reset link" button — only visible if `FORGOT_PASSWORD_ENABLED=true` per Cluster 01 §10; hidden at MVP)
- Accessibility preferences subsection: text size segmented control (Small/Medium/Large), reduce motion toggle, high contrast toggle (all wired to `usePreferencesStore` from Cluster 12 — this PRD just renders the UI)
- Notification preferences subsection: product updates toggle (Email monthly), sync alerts toggle (Email immediate) — wired to `users.preferences.notifications.*`
- Timezone select (IANA strings, default 'UTC', wired to `users.preferences.timezone`)
- Unsaved-changes pill with Discard / Save buttons (debounced 800ms autosave on individual field commit; explicit Save flushes)

**Plan & billing section (A7.2):**
- Current plan card: plan name (templated `{{ planName }}` from `users.plan` — defaults to "Free"), price, billing cadence, status pill (**Active / Past due / Cancelled / Incomplete / Trial** — Trial variant ships hidden, conditional on `plan_status === 'trialing'`), feature list (Free tier MVP bullets: "1 brand kit", "Unlimited canvases", "AI design assistant", "Image export (PNG slices)" — defined in `@/constants/billing-plans.ts`; Solo/Agency bullets land Phase B with pricing), `Manage billing` button (opens Stripe Customer Portal new tab), `Compare plans` button (visible button → surfaces toast "Pricing coming soon." at MVP; Phase-2 wires to plan-comparison surface)
- Usage subsection: AI generations counter (current month, X / cap based on plan; resets on `current_period_end` rollover); Storage usage (412 MB / cap)
- Invoice history table: last 12 invoices fetched via Stripe API (`/api/stripe/invoices`); columns Date, Description, Amount, Status, Download (links to `hosted_invoice_url`)
- Past-due banner: when `users.plan_status = 'past_due'`, shows warn-soft banner with copy **"Your last payment didn't go through. Update your card before {{ deadline }} to keep your subscription."** (deadline = `current_period_end + 7 days`) + single "Update payment method" CTA → Stripe Portal new tab (same flow as Manage billing)
- Stripe Checkout flow trigger: "Upgrade" CTA → `POST /api/stripe/checkout-session` → redirect to Stripe-hosted Checkout
- Stripe Customer Portal trigger: "Manage billing" → `POST /api/stripe/portal-session` → `window.open(url, '_blank')`

**Brand Kit section (A7.3) — SHELL ONLY:**
- Brand-picker dropdown at top (selects which brand's kit is shown)
- Sub-tab navigation rail (Visuals / Identity / Tone snippets / Saved blocks / Writing rules / Memories / Knowledge base) — Cluster 05 ships each sub-tab's actual content + CRUD modals; this PRD ships only the empty `<RouterView>`-style outlet + active-tab routing
- Per-brand picker default precedence (founder decision 2026-05-17): `?brand=:brandId` URL query > `usePreferencesStore.lastActiveBrandId` (Q5 Layer 2) > first brand alphabetically. Renders as **static label** when user has 1 brand (no dropdown chevron — Figma pattern); full **dropdown** when 2+; **`<EmptyState>`** when 0.

**Integrations section (A7.5) — M9 REUSE + REFACTOR:**
- Brand-picker dropdown at top (same component as Brand Kit)
- Shopify connect/disconnect/sync UI (M9 `IntegrationsCard.vue` REFACTORED — light→dark tokens; brand resolution shifted from URL param to brand-picker context; sync-history accordion wired to NEW `shopify_connection_history` table)
- Sync-history accordion: lists last 50 events per brand (`connected`, `disconnected`, `scope_changed`, `sync_started`, `sync_completed`, `sync_failed`) with timestamp + event-type + metadata
- "Coming soon" integration cards (dashed border, muted — placeholder for future Mailchimp / Klaviyo / etc.; no logic)

**Danger zone section (A7.6):**
- Mounts `<DangerZoneCard>` from Cluster 01 (this PRD does NOT re-spec the modal — Cluster 01 owns)
- Wires the section route at `/account/danger`
- Verifies the `<DangerZoneCard>` API contract matches Cluster 01's PRD §6.4.2 export

**Stripe return landings:**
- `/account/billing/success` — `<StripeReturnLanding mode="success">` per B10.1
- `/account/billing/cancel` — `<StripeReturnLanding mode="cancel">` per B10.2

**Backend (Stripe foundation):**
- `users` table extension: 5 Stripe columns + 1 avatar column
- `stripe_webhook_events` table (idempotency log, audit §2.A)
- `shopify_connection_history` table (audit D-8 fix)
- Edge Functions: `stripe-checkout-session`, `stripe-portal-session`, `stripe-webhook`, `stripe-invoices` (server-side Stripe API proxy), `shopify-history-log` (RPC-callable helper that disconnect / sync workers invoke)
- RPCs: `user_has_active_plan(p_user_id)`, `log_shopify_connection_event(p_brand_id, p_event_type, p_source, p_metadata)`
- Cron: `stripe-reconcile-cron` (weekly Sun 04:00 UTC — drift heal on `past_due` rows)
- Stripe SDK installed + 5 env vars wired (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID_SOLO`, `STRIPE_PRICE_ID_AGENCY`)

**Frontend (Pinia + composables):**
- `useBillingStore` (plan, status, period end, cancel-at-period-end; `startCheckout(priceId)`, `openPortal()`, `fetchInvoices()`, `fetchUsage()`)
- `useAccountStore` (active section, unsaved-changes flags per section; `save()`, `discard()`)
- `usePlanGate(feature)` composable (stub at MVP — returns `allowed: true` for everything; map of feature → plans-allowed lives in constants; founder activates gating post-launch when pricing locks)
- `useAccountSection()` composable (sync `:section` URL param with active sidebar item)
- `useBrandPicker(scope)` composable (selected brand id; precedence URL > Q5 Layer 2 > alphabetical; renderMode 'empty' | 'static-label' | 'dropdown')

**Compliance + cross-cuts:**
- Privacy policy update: Stripe sub-processor disclosure (already named by Cluster 01 — verify naming)
- Audit log writes on every Stripe state change (subscription created/updated/cancelled, payment succeeded/failed)
- Idempotency-key on every POST endpoint (Cluster 11 cross-cut)
- Sentry error capture on webhook failure + cron failure
- Rate-limit: 10 req/min/user on Checkout + Portal endpoints; 1 req/sec global on webhook endpoint (Stripe sends fast bursts on backfill — burst-safe)

### 2.2 Out of scope (handed to other clusters)

| Item | Owning PRD |
|---|---|
| `<DangerZoneCard>` component + `useAccountDeletion` + `useEmailChange` composables | 01 — Auth & Identity |
| `/account-pending-deletion` route + auth middleware deleted-account intercept | 01 |
| GDPR `delete-account-cron` + `gdpr_deletion_queue` table + 5 cascade-step handlers | 01 (this PRD ships the Stripe SDK + env vars its `stripe` step uses) |
| Privacy policy + Terms + RoPA documents | 01 (this PRD verifies Stripe + Shopify sub-processor mentions are present) |
| `usePreferencesStore` (Q5 Layer 1 JSONB consumer) | 12 — Settings & User Preferences (this PRD renders the prefs UI; 12 ships the storage layer; PRD 01 ships the column itself) |
| Brand Kit sub-tab content (Visuals/Fonts/Tone/Saved-blocks/Memory/KB CRUD) | 05 — Brand Kit & Drag-Drop |
| `useBrandsStore.brands[]` | 03 — Brand Management |
| Shopify OAuth start + callback + brand-kit-extract Edge Functions | M9 reuse (existing) + Cluster 02 (onboarding StoreTypeStep) + Cluster 05 (brand-kit-extract voice + tone extension) |
| Toast component, `<KovaModal>` shell, `useConfirm`, skeleton primitives | 11 — Shared UI Infrastructure |
| `idempotency_keys` table + helper, `audit_log` table, Sentry integration, Resend SDK wrapper, `<EmailShell>` | 11 |
| Avatar dropdown chrome (where "Account" item routes from) | 06 — Canvas Editor Core Chrome (topbar) + 02 — Dashboard topbar |
| Tauri `kova.*` command surface for desktop Stripe deep-links | Phase 2 (deferred) |

### 2.3 Deferred to Phase 2

- Plan-comparison page (`/pricing` or `/compare`) — Phase 2 marketing site or Phase 2 in-app dialog
- Plan-based feature gate enforcement (gate composable ships as stub; founder activates when pricing locks)
- Multi-currency billing — single USD at MVP
- Tax handling — Stripe Tax integration deferred until revenue justifies
- Team / agency billing entity — explicitly out per D-2 (one Stripe Customer per user). **D-2 AMENDMENT 2026-05-17:** Stripe Customer **deleted** on account deletion via Cluster 01 GDPR cron (was originally "kept forever"). See §13.2 D-2 amendment note. Invoice history persists in Stripe 7 yrs per their docs regardless.
- Mailchimp / Klaviyo / SendGrid integration tiles — UI placeholder only; backend Phase 2
- Mobile-responsive `/account` page — desktop-only at MVP (viewport guard from Cluster 01)
- Avatar cropping UI — upload + auto-square crop at center via canvas API; full editor Phase 2
- Invoice CSV export — link to Stripe-hosted `hosted_invoice_url` at MVP; CSV bundle Phase 2
- Trial period flow (`plan_status='trialing'`) — **DB CHECK supports it now** (§4.1 migration includes 'trialing'); UI scaffold (status pill "Trial" variant + "Trial — X days left" banner) ships hidden in code at MVP, conditional render on `plan_status === 'trialing'`. Activation deferred until founder turns on Stripe trial settings in Dashboard. Founder decision 2026-05-17 reverses §12.3 OPEN.

### 2.4 Cross-cut acknowledgments (foreign owners)

- **Cluster 01** ships `<DangerZoneCard>` + `useAccountDeletion` + `useEmailChange` — this PRD imports them by name and renders them in the right sections. No re-spec. The `users.deleted_at`, `users.preferences` columns ship in 01's migration; this PRD adds Stripe columns + `avatar_storage_path` in a separate ALTER on the same table.
- **Cluster 11** owns every primitive listed above. This PRD references them by import path only.
- **Cluster 03** ships `useBrandsStore`. This PRD's `<BrandPicker>` consumes `.brands[]` + `.activeBrandId`. If 03 isn't done at integration time (Wave 2 closes before Wave 3 opens — should be fine), this PRD has a fallback hard-coded "no brands yet" empty state in `<BrandPicker>`.
- **Cluster 05** ships per-tab Brand Kit content components. This PRD's `<BrandKitSection>` mounts a `<router-view>` that 05's sub-tabs feed.
- **Cluster 12** ships `usePreferencesStore`. This PRD reads `.textSize`, `.reduceMotion`, `.highContrast`, `.notifications`, `.timezone`, `.lastActiveBrandId` — write-through to `users.preferences` JSONB.
- **M9 existing code:** this PRD REFACTORS `IntegrationsCard.vue` + `SettingsBrandIntegrationsView.vue`. See §6.4.5 + §10 for the file-level migration list.

---

## 3. Visual spec

Every surface maps to a hi-fi file. Engineers cite the file + scene ID when implementing. Theme: **DARK** throughout (per `feedback_app_dark_website_light` — account is inside the authed app). Stripe-hosted Checkout + Portal pages are NOT in this list — those render on Stripe's domain.

### 3.1 Account chrome + sidebar

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Account page shell (sidebar visible, no section open) | `/account` (redirects to `/account/profile`) | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html` | shared chrome across A7.1–A7.6 | 240px sidebar; top chrome with "Back to dashboard" + page title "Account"; content area max-width 720px |
| Sidebar item list | same | same | A7 chrome + B12 hi-fi | **6 items** (B12 reversal 2026-05-17): Profile (user icon), **Brands (layers icon — NEW, slot 2)**, Plan & billing (credit-card icon), Brand Kit (palette icon), Integrations (plug icon), Danger zone (trash-2 icon, warn-tinted). Verified against `Kova Hi-Fi B12 Brands page - Dark.html` lines 554–560. |
| Brand picker dropdown (per-brand sections) | `/account/brand-kit` + `/account/integrations` | same + `Kova Hi-Fi A7 Account Page - Dark.html` (A2b dropdown open variant) | A7.3 (open) | Reka DropdownMenu anchored to brand-pill at top of section content; search field + active brands list + archived (muted) + "Add new brand" footer |

### 3.2 Profile section (A7.1)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Profile default | `/account/profile` | `Kova Hi-Fi A7 Account Page - Dark.html` | A7.1 | Headline "Profile" + sub-copy "Your name, email, avatar, and preferences. These are user-level — they apply across every brand you manage in Kova." |
| Avatar row | same | same | A7.1 | Current avatar (or **initials on hashed-color tile** 64×64 fallback) 64×64; "Upload image" button → file picker (PNG/JPG only ≤5MB, SVG REJECTED) → preview → confirm save. Server resizes to 256×256 PNG via `sharp` before storage. |
| Name field | same | same | A7.1 | `<AuthField>`-style input; value bound to `useAccountStore.draft.name` |
| Email row | same | same | A7.1 | Read-only display of current email; "Verified inbox" pill; "Change…" button → opens inline `useEmailChange.requestChange()` flow (Cluster 01 owns the flow; we provide the trigger) |
| Password row (HIDDEN AT MVP) | same | same | A7.1 | Shows "Last changed YYYY-MM-DD"; "Send reset link" button. Hidden via `FORGOT_PASSWORD_ENABLED=false` per Cluster 01 §10 feature flag |
| Text size segmented | same | same | A7.1 | 3-segment toggle: Small / **Medium (default)** / Large; writes `users.preferences.textSize` |
| Reduce motion toggle | same | same | A7.1 | Default Off; writes `users.preferences.reduceMotion` |
| High contrast toggle | same | same | A7.1 | Default Off; writes `users.preferences.highContrast` |
| Product updates toggle | same | same | A7.1 | Default On (frequency = "Email monthly"); writes `users.preferences.notifications.productUpdates` |
| Sync alerts toggle | same | same | A7.1 | Default On (frequency = "Email immediate"); writes `users.preferences.notifications.syncAlerts` |
| Timezone select | same | same | A7.1 (annotated, not visually drawn — added per dispatch prompt) | IANA strings (`America/Los_Angeles`, etc.); default `UTC`; uses `Intl.supportedValuesOf('timeZone')` for the list; writes `users.preferences.timezone` |
| Unsaved-changes pill | same | same | A7.1 | Top of content area; renders "N unsaved changes · field-name" + Discard / Save buttons when `useAccountStore.hasUnsaved === true` |

### 3.3 Plan & billing section (A7.2)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Plan & billing default | `/account/billing` | same | A7.2 | Headline "Plan & billing" + sub-copy "Your subscription, invoices, and monthly usage. Billing is handled by Stripe — clicking **Manage billing** opens the secure Stripe portal in a new tab." |
| Current plan card | same | same | A7.2 | Plan name `{{ planName }}` from `users.plan` (default "Free"); price line `$—/month · billed monthly`; status pill (Active / Past due / Cancelled / Incomplete / **Trial** — Trial variant ships hidden, conditional on `plan_status === 'trialing'` — founder decision 2026-05-17); feature list (Free-tier bullets: "1 brand kit" · "Unlimited canvases" · "AI design assistant" · "Image export (PNG slices)" — `@/constants/billing-plans.ts`); two buttons: `Manage billing` (Stripe Portal, new tab) + `Compare plans` (visible button → surfaces toast "Pricing coming soon." at MVP; Phase-2 wires to plan-comparison surface) |
| Past-due banner (conditional) | same | same | (not drawn — net-new) | Renders when `useBillingStore.planStatus === 'past_due'`; warn-soft surface; copy "Your last payment didn't go through. Update your card before {{ current_period_end + 7 days }} to keep your subscription."; CTA "Update payment method" → Stripe Portal |
| Usage subsection | same | same | A7.2 | AI generations: progress bar X / cap (e.g., "47 / 200 · resets May 1"); Storage: progress bar (e.g., "412 MB / 5 GB"). Cap values come from plan map in `@/constants/billing-plans.ts` |
| Invoice history table | same | same | A7.2 | Columns: Date, Description, Amount, Status (Paid / Failed pill), Download (icon link to `hosted_invoice_url`); fetched via `useBillingStore.fetchInvoices()` → `/api/stripe/invoices`; last 12 invoices |
| Empty invoice state | same | same | (not drawn — net-new; use Cluster 11 `<EmptyState>`) | Renders when `invoices.length === 0`; copy "No invoices yet. Your first invoice will appear here after your first paid period." |
| Upgrade flow trigger | same | same | A7.2 (Compare plans button) | Opens upgrade dialog (Phase 2 — at MVP, "Compare plans" surfaces a toast "Pricing coming soon"); direct "Upgrade to Solo / Agency" buttons in the plan card hidden at MVP per Q14 launch-strategy-deferred |

### 3.4 Brand Kit section shell (A7.3)

> **Cluster 05 ships the sub-tab content.** This PRD only ships the shell + brand picker + tab nav rail.

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Brand Kit default (Visuals tab) | `/account/brand-kit` (defaults to `?tab=visuals`) | `Kova Hi-Fi A7 Account Page - Dark.html` | A7.3.1 | Brand picker dropdown anchored at top (Nike example shown); sub-tab vertical rail (7 tabs); content slot fed by Cluster 05's `<BrandKitVisualsTab>` etc. |
| Sub-tab nav rail | `/account/brand-kit?tab=:tab` | same | A7.3 | 7 tabs: Visuals · Identity · Tone snippets (count badge) · Saved blocks (count badge) · Writing rules · Memories (count badge) · Knowledge base. Routes update `?tab=` query param. |
| Brand picker open | `/account/brand-kit?brand=:brandId` | same | A7.3 (open dropdown variant) | Reka DropdownMenu; selecting a brand updates `?brand=:brandId` URL param + persists to `users.preferences.lastActiveBrandId` |

### 3.5 Integrations section (A7.5) — M9 reuse + refactor

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Integrations default | `/account/integrations?brand=:brandId` | `Kova Hi-Fi A7 Account Page - Dark.html` | A7.5 | Brand picker at top; integration cards grid (2 columns); Shopify card primary; placeholder "Coming soon" cards (dashed, muted) |
| Shopify card · Connected state | same | same | A7.5 | Header (Shopify logo + "Shopify"); status pill "Connected" (ok dot); meta row "Last sync: YYYY-MM-DD"; "Sync now" button; "Disconnect" overflow menu item |
| Shopify card · Not connected | same | (no scene; net-new — refactor from M9 `IntegrationsCard.vue` connect-form UI) | n/a | Domain input field (validates via `normalizeShopDomain`); "Connect" CTA → opens OAuth popup; helper text "Enter your shop domain (e.g. mystore.myshopify.com)" |
| Shopify card · Connecting (OAuth popup open) | same | (no scene — refactor from M9) | n/a | Spinner + meta "Opening Shopify authorization…"; "Cancel" button closes popup; postMessage from popup completes flow |
| Shopify card · Re-authorize required | same | (no scene — refactor from M9) | n/a | Warn-soft surface; copy "Shopify needs reauthorization (scope expansion)"; CTA "Re-authorize" → restarts OAuth |
| Shopify card · Sync in progress | same | (no scene — refactor from M9) | n/a | Progress bar (count_done / count_total); meta "Syncing products… X of Y"; ARIA progressbar attrs |
| Sync history accordion | same | (net-new wire to NEW table) | n/a | Reka Accordion under integration card; lists last 50 events; row format: `{{ formatRelative(occurred_at) }} · {{ humanizeEventType(event_type) }} · {{ metadata.shop_domain or metadata.error }}`; empty state "No sync history yet. Events show here as you connect and sync." |
| Disconnect confirm modal | same | (reuse `useConfirm` from Cluster 11) | n/a | Headline "Disconnect Shopify from {{ brand_name }}?"; body "Your products and discount data stay until you reconnect or delete the brand. No live syncs after disconnect."; primary "Disconnect" (danger-colored) + secondary "Cancel" |
| Coming soon integration card | same | same | A7.5 | Dashed border, muted; logo + name (e.g., "Mailchimp", "Klaviyo"); meta "Coming soon"; no actions |

### 3.6 Danger zone section (A7.6) — Cluster 01 mount point

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Danger zone default | `/account/danger` | `Kova Hi-Fi A7 Account Page - Dark.html` | A7.6 | Section header "Danger zone" + warn-tinted icon; mounts `<DangerZoneCard>` from Cluster 01 |
| Delete account modal | (triggered from `/account/danger`) | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html` | A9.1 | OWNED BY CLUSTER 01 — see Cluster 01 PRD §6.4.2. Typed-confirm "DELETE" word. Sub-copy enumerates cascade (5 brands / 37 canvases / ~620 snapshots — counts fetched from `useBrandsStore` + queries). |

### 3.7 Stripe return landings

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Stripe Checkout success | `/account/billing/success` (no `:section` parent — full-page within /account view) | `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B10 Stripe Returns - Dark.html` | B10.1 | Check-circle icon (accent, 24×24 in 48×48 tile); headline "You're on **{{ planName }}**"; sub-copy "Welcome to {{ planName }}. We've unlocked unlimited brands, full version history, and priority support. Manage your plan anytime in Account → Plan & billing."; primary "Go to dashboard" + arrow-right; secondary "View plan details" → `/account/billing` |
| Stripe Checkout cancelled | `/account/billing/cancel` | same | B10.2 | Arrow-left icon (ink-3, neutral); headline "Checkout cancelled"; sub-copy "No changes were made and your card wasn't charged. You can try again anytime from Account → Plan & billing."; primary "Try again" + rotate-cw → restarts Checkout for last-known priceId; secondary "Back to dashboard" |

### 3.8 Design system references

Account page surfaces all use `main-main-kova-scope/design-system/kova-hifi.css` (dark theme; `data-theme="dark"` on `<html>` per Cluster 11 router meta convention). No light surfaces in this PRD. Component primitives reused from kova-hifi.css:

- `.acct-shell`, `.acct-sidebar`, `.acct-content`, `.acct-section`, `.acct-card`, `.acct-row` — Account-page-specific primitives lifted from A7 inline `<style>`
- `.brand-picker`, `.brand-picker-pill`, `.brand-picker-menu` — A2b dropdown primitives
- `.plan-card`, `.usage-bar`, `.invoice-table`, `.invoice-row` — A7.2-specific primitives
- `.integration-card`, `.integration-card.connected`, `.integration-card.disabled`, `.sync-history-row` — A7.5-specific primitives
- `.danger-card`, `.danger-btn` — A7.6-specific (Cluster 01 implements `<DangerZoneCard>`; we host)
- `.stripe-return-shell`, `.stripe-return-icon`, `.stripe-return-card` — B10 chrome (B2 error-card chrome lifted byte-identical per Cluster 11 cross-cut convention)

Engineers translate the A7 inline `<style>` block primitives into Vue component CSS (Tailwind 4 utility classes referencing `@theme` tokens). Translate every `:root` token to Tailwind `@theme` in `app.css`. Engineers translate each component class into a Vue component that renders the same markup contract.

---

## 4. Data model

### 4.1 Schema migrations

Single migration file: `kova-open-pencil-1/supabase/migrations/20260605_04_account_stripe_billing.sql`. Idempotent (`IF NOT EXISTS` / `CREATE OR REPLACE`).

```sql
-- ============================================================
-- Migration 20260605_04_account_stripe_billing
-- Cluster 04 Account Page + Stripe Billing
-- Pairs with: 20260520_01_users_account_lifecycle (Cluster 01)
-- Adds: users Stripe + avatar columns, stripe_webhook_events table,
--       shopify_connection_history table, plan-gate helper RPC,
--       Shopify history-log RPC, RLS, indexes.
-- ============================================================

BEGIN;

-- ---- 1. users Stripe + avatar columns ----

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan                   text NOT NULL DEFAULT 'free'
                            CHECK (plan IN ('free', 'solo', 'agency')),
  ADD COLUMN IF NOT EXISTS plan_status            text NOT NULL DEFAULT 'active'
                            CHECK (plan_status IN ('active', 'past_due', 'cancelled', 'incomplete', 'trialing')),
  ADD COLUMN IF NOT EXISTS current_period_end     timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_storage_path    text NULL;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer
  ON public.users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_past_due
  ON public.users(plan_status, current_period_end)
  WHERE plan_status = 'past_due';

COMMENT ON COLUMN public.users.stripe_customer_id IS
  'Stripe Customer ID (cus_…). One-per-user. Deleted from Stripe on account-deletion via Cluster 01 GDPR cron (D-2 amended 2026-05-17). NULL until first Checkout completes.';
COMMENT ON COLUMN public.users.plan IS
  'Current plan tier. CHECK in (free, solo, agency); founder activates pricing post-launch. ALTER CHECK if names change.';
COMMENT ON COLUMN public.users.plan_status IS
  'Stripe subscription lifecycle. CHECK includes "trialing" (founder decision 2026-05-17 — future-proof for trials). UI scaffold for trial states ships hidden at MVP per PRD 04 §3.4.';
COMMENT ON COLUMN public.users.avatar_storage_path IS
  'Storage path within media-assets bucket (e.g., users/{user_id}/avatar.png). NULL = default initials avatar.';

-- ---- 2. stripe_webhook_events (idempotency log) ----

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id      text PRIMARY KEY,         -- Stripe event.id (evt_…)
  type          text NOT NULL,
  processed_at  timestamptz NOT NULL DEFAULT now(),
  payload_hash  text,                     -- SHA-256 of raw payload for debugging
  user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  outcome       text NOT NULL DEFAULT 'processed'
                  CHECK (outcome IN ('processed', 'duplicate', 'unhandled_type', 'error')),
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_recent
  ON public.stripe_webhook_events(processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_events_user
  ON public.stripe_webhook_events(user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.stripe_webhook_events IS
  'Idempotency log for Stripe webhooks. PRIMARY KEY on event.id prevents double-process. Retained 90 days (manual prune in PRD 04 Phase B).';

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY stripe_events_service_only
  ON public.stripe_webhook_events
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ---- 3. shopify_connection_history (audit D-8 fix) ----

CREATE TABLE IF NOT EXISTS public.shopify_connection_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  event_type   text NOT NULL
                 CHECK (event_type IN (
                   'connected',
                   'disconnected',
                   'scope_changed',
                   'sync_started',
                   'sync_completed',
                   'sync_failed',
                   'reauthorize_required'
                 )),
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  source       text NOT NULL
                 CHECK (source IN ('user', 'system', 'webhook')),
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb
  -- metadata shape (non-enforced; documented for engineers):
  --   connected:       { shop_domain, scopes: [...], access_token_id }
  --   disconnected:    { shop_domain, reason: 'user'|'uninstall'|'scope_revoke' }
  --   scope_changed:   { shop_domain, old_scopes, new_scopes }
  --   sync_started:    { shop_domain, sync_type: 'bulk'|'incremental', count_total }
  --   sync_completed:  { shop_domain, count_processed, duration_ms }
  --   sync_failed:     { shop_domain, error, count_processed }
  --   reauthorize_required: { shop_domain, reason: 'scope_expansion'|'token_invalid' }
);

CREATE INDEX IF NOT EXISTS idx_shopify_history_brand_time
  ON public.shopify_connection_history(brand_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopify_history_event_type
  ON public.shopify_connection_history(event_type, occurred_at DESC);

COMMENT ON TABLE public.shopify_connection_history IS
  'Per-brand Shopify connection + sync audit trail. Powers the sync-history accordion in /account/integrations (audit D-8 fix). FK CASCADE deletes on brand removal.';

ALTER TABLE public.shopify_connection_history ENABLE ROW LEVEL SECURITY;

-- Users can read history for brands they own.
CREATE POLICY shopify_history_read_own
  ON public.shopify_connection_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = shopify_connection_history.brand_id
        AND brands.user_id = auth.uid()
    )
  );

-- Writes only via service_role (Edge Functions / cron / disconnect handlers).
CREATE POLICY shopify_history_write_service
  ON public.shopify_connection_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ---- 4. RPCs ----

-- 4a. Plan-gate helper (SECURITY DEFINER, read-only)
CREATE OR REPLACE FUNCTION public.user_has_active_plan(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT plan_status = 'active'
     AND (current_period_end IS NULL OR current_period_end > now())
    FROM public.users
   WHERE id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_active_plan(uuid) TO authenticated;

COMMENT ON FUNCTION public.user_has_active_plan(uuid) IS
  'Returns true if the user has an active subscription whose period is still valid. Used by usePlanGate composable at MVP (stubbed open for everything until founder activates pricing).';

-- 4b. Shopify history-log helper (SECURITY DEFINER; callable by Edge Functions only)
CREATE OR REPLACE FUNCTION public.log_shopify_connection_event(
  p_brand_id   uuid,
  p_event_type text,
  p_source     text,
  p_metadata   jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.shopify_connection_history(brand_id, event_type, source, metadata)
       VALUES (p_brand_id, p_event_type, p_source, p_metadata)
    RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Callable only by service_role (Edge Functions); no GRANT to authenticated.
REVOKE EXECUTE ON FUNCTION public.log_shopify_connection_event(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_shopify_connection_event(uuid, text, text, jsonb) TO service_role;

COMMENT ON FUNCTION public.log_shopify_connection_event IS
  'Edge Functions and cron jobs call this to write a connection-history row. Service-role only; never user-callable.';

COMMIT;
```

**Notes on this migration:**

1. `plan` CHECK follows Q14 + dispatch prompt. `plan_status` CHECK includes `'trialing'` per founder decision 2026-05-17 (§12.3 RESOLVED) — future-proofs for trial activation without rework.
2. `cancel_at_period_end` lets the UI render "Subscription ends YYYY-MM-DD" without a separate query.
3. `avatar_storage_path` is added here (Cluster 04 owns the Profile section UI); Cluster 05 owns the `media-assets` bucket itself.
4. `stripe_webhook_events.event_id` as PRIMARY KEY = idempotency by design (`INSERT … ON CONFLICT DO NOTHING` then check rowcount).
5. `shopify_connection_history` RLS lets users read their own brands' history; writes are service-only. Read policy joins to `brands.user_id` which is the existing scope (verified against existing M9 RLS on `brands`).
6. `log_shopify_connection_event` is `SECURITY DEFINER` so Edge Functions (running as service_role anyway) can call it cleanly + so its writes always succeed even if invoked from a context with anon role.

### 4.2 RLS policies

| Table | Policy | Purpose |
|---|---|---|
| `public.users` | Existing PRD 01 + 20260316 policies carry over. Stripe + avatar columns inherit. `stripe_customer_id` is writeable only via webhook handler (server-side; uses service_role); the client cannot set it. | Prevent client-side forgery of customer ID. |
| `public.stripe_webhook_events` | `stripe_events_service_only` — `FOR ALL TO service_role`. No `authenticated` policy. | Logs are server-internal. Sentry surfaces failures; users never see this table. |
| `public.shopify_connection_history` | `shopify_history_read_own` (SELECT for authenticated, scoped to owned brands); `shopify_history_write_service` (INSERT for service_role). | Users see their brands' history; no client-side writes possible. |

**Verification:** existing `public.brands` RLS already restricts writes to `brands.user_id = auth.uid()`. The history-read policy joins through that — no new attack surface.

### 4.3 Storage buckets

No new buckets in this PRD. The Profile-section avatar upload writes to the **existing** `media-assets` bucket (owned by Cluster 05).

| Bucket | Path | Owner | This PRD's use |
|---|---|---|---|
| `media-assets` | `users/{user_id}/avatar.png` (FIXED extension — founder decision 2026-05-17, normalize to PNG via `sharp`) | Cluster 05 | Avatar upload writes here via `supabase.storage.from('media-assets').update(...)` (upsert=true) from `avatar-confirm` Edge Function after `sharp` resize→PNG pipeline. Path stored in `users.avatar_storage_path`. Signed URL fetched on display (15-min TTL per scope plan 2.C.13). |

**Cascade behavior:** PRD 01's GDPR cron `storage` step purges `media-assets/users/{user_id}/**` on hard-delete. No new cascade logic needed.

---

## 5. Backend

### 5.1 Edge Functions

All Edge Functions deploy as Vercel Functions under `kova-open-pencil-1/api/stripe/` and `kova-open-pencil-1/api/account/`. The repo already uses Fluid Compute (no Edge runtime — Stripe SDK requires Node).

Idempotency-key handling per Cluster 11 cross-cut convention (client sends `X-Idempotency-Key: <uuid v4>`). Rate-limit per scope plan D-5 (atomic Supabase RPC; reuse M5 pattern; new buckets: `stripe.checkout`, `stripe.portal`, `stripe.invoices`).

**Audit-log cross-cut (W0-1):** the Stripe webhook handler in §5.1.3 and the profile/email-change flows append rows to `public.audit_log` via the Cluster 11 `writeAudit(supabaseAdmin, { userId, eventType, payload, clusterOwner: '04' })` helper at `api/_shared/audit.ts`. Table DDL + RLS + helper are owned by **PRD 11 §2.1 / §4.1 / §5.5** (founder lock #11). Webhook event types emitted: `stripe.checkout.completed`, `stripe.subscription.created`, `stripe.subscription.updated`, `stripe.subscription.deleted`, `stripe.invoice.payment_succeeded`, `stripe.invoice.payment_failed`.

---

#### 5.1.1 `POST /api/stripe/checkout-session`

```typescript
// kova-open-pencil-1/api/stripe/checkout-session.ts
// Method:      POST
// Auth:        Supabase JWT (verifyAuth shared helper)
// Headers:     Authorization: Bearer <jwt>
//              X-Idempotency-Key: <uuid v4>            (recommended)
// Body:        { price_id: string, success_url: string, cancel_url: string }
// Response 200: { session_id: string, url: string }
// Response 401: { error: 'unauthenticated' }
// Response 422: { error: 'invalid_price', detail: string }
// Response 429: { error: 'rate_limited', retry_after_seconds: n }
// Response 500: { error: 'internal_error', request_id }
//
// Side effects:
//   1. Lookup users.stripe_customer_id; if NULL → stripe.customers.create({ email, name, metadata: { user_id } }) → save to users.stripe_customer_id
//   2. stripe.checkout.sessions.create({
//        customer: users.stripe_customer_id,
//        mode: 'subscription',
//        line_items: [{ price: price_id, quantity: 1 }],
//        success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
//        cancel_url,
//        client_reference_id: user_id,        // doubled-up with customer.metadata for resilience
//        idempotency_key:  X-Idempotency-Key  // forwarded to Stripe SDK
//      })
//   3. Audit-log row 'stripe.checkout.session_created' with metadata { price_id, session_id }
//
// Idempotency: per-request via X-Idempotency-Key (Cluster 11) + Stripe SDK forwards same key so Stripe also dedups
// Rate limit: 10 req/min/user (Stripe.checkout bucket)
// Allowed price_ids: server validates against constants (STRIPE_PRICE_ID_SOLO, STRIPE_PRICE_ID_AGENCY); rejects unknown
```

---

#### 5.1.2 `POST /api/stripe/portal-session`

```typescript
// kova-open-pencil-1/api/stripe/portal-session.ts
// Method:      POST
// Auth:        Supabase JWT; users.stripe_customer_id MUST exist
// Body:        { return_url: string }
// Response 200: { url: string }
// Response 401: { error: 'unauthenticated' }
// Response 404: { error: 'no_customer' }                          (user has never checked out)
// Response 429: { error: 'rate_limited' }
// Response 500: { error: 'internal_error', request_id }
//
// Side effects:
//   1. SELECT stripe_customer_id FROM users WHERE id = auth.uid()
//   2. If NULL → 404 (UI redirects to Checkout flow instead)
//   3. stripe.billingPortal.sessions.create({ customer, return_url })
//   4. Audit-log row 'stripe.portal.session_created' with metadata { return_url }
//   5. Return { url } — client opens in NEW TAB via window.open(url, '_blank')
//
// Why new tab + not iframe: Stripe Customer Portal cannot be embedded (per docs.stripe.com/customer-management — "redirect the customer to the url of the session"). Spec verified via WebFetch 2026-05-15.
// Rate limit: 10 req/min/user (Stripe.portal bucket)
```

---

#### 5.1.3 `POST /api/stripe/webhook`

```typescript
// kova-open-pencil-1/api/stripe/webhook.ts
// Method:      POST
// Auth:        Stripe signature header (Stripe-Signature) verified via stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
// Body:        Stripe event payload (raw — Vercel: export const config = { api: { bodyParser: false } } or use req.text())
// Response 200: { received: true }       (ALWAYS 200 if signature OK; processing errors logged but ack first)
// Response 400: { error: 'invalid_signature' }
// Response 500: { error: 'internal_error' }  (only if signature verify itself throws unexpectedly)
//
// Algorithm (must complete within 20s — Stripe retries on timeout/non-2xx):
//   1. Read raw body. Verify signature via stripe.webhooks.constructEvent (throws SignatureVerificationError → 400).
//   2. INSERT INTO stripe_webhook_events (event_id, type, payload_hash) VALUES (event.id, event.type, sha256(raw))
//      ON CONFLICT (event_id) DO NOTHING.
//      If rowcount = 0 → duplicate; UPDATE outcome='duplicate' on existing row (no-op) → return 200.
//   3. Dispatch on event.type:
//        - 'checkout.session.completed'        → handleCheckoutCompleted(event)
//        - 'customer.subscription.created'      → handleSubscriptionCreated(event)
//        - 'customer.subscription.updated'      → handleSubscriptionUpdated(event)
//        - 'customer.subscription.deleted'      → handleSubscriptionDeleted(event)
//        - 'invoice.paid'                       → handleInvoicePaid(event)
//        - 'invoice.payment_failed'             → handleInvoicePaymentFailed(event)
//        - anything else                        → UPDATE outcome='unhandled_type'; return 200 (don't error — Stripe sends events we don't subscribe to in test mode)
//   4. On handler exception: Sentry capture; UPDATE outcome='error', error_message; return 200 (Stripe will retry via webhook config; the next attempt will hit idempotency check)
//   5. On success: UPDATE outcome='processed'; return 200
//
// Event handlers (TypeScript pseudocode):
//
//   handleCheckoutCompleted(event):
//     const session = event.data.object as Stripe.Checkout.Session
//     const userId = session.client_reference_id || session.metadata?.user_id
//     // session.subscription is now set; sync via subscription.created handler
//     // No DB update here — subscription.created fires immediately after and is authoritative
//     auditLog('stripe.checkout.completed', userId, { session_id: session.id })
//
//   handleSubscriptionCreated(event) / handleSubscriptionUpdated(event):
//     const sub = event.data.object as Stripe.Subscription
//     const userId = await resolveUserIdFromCustomer(sub.customer as string)
//     const planName = priceIdToPlan(sub.items.data[0].price.id)  // map from constants
//     UPDATE users SET
//       stripe_subscription_id = sub.id,
//       plan = planName,
//       plan_status = sub.status,                     // 'active'|'past_due'|'cancelled'|'incomplete'|'trialing' — DB CHECK supports all 5 (founder decision 2026-05-17)
//       current_period_end = to_timestamp(sub.current_period_end),
//       cancel_at_period_end = sub.cancel_at_period_end
//     WHERE id = userId
//     auditLog('stripe.subscription.' + event.type.split('.').pop(), userId, { subscription_id: sub.id, status: sub.status })
//
//   handleSubscriptionDeleted(event):
//     UPDATE users SET plan = 'free', plan_status = 'cancelled', stripe_subscription_id = NULL, cancel_at_period_end = false WHERE stripe_customer_id = sub.customer
//     auditLog('stripe.subscription.deleted', userId, { ... })
//
//   handleInvoicePaid(event):
//     const invoice = event.data.object as Stripe.Invoice
//     If user is past_due → UPDATE plan_status = 'active'
//     auditLog('stripe.invoice.paid', userId, { invoice_id, amount_paid: invoice.amount_paid })
//
//   handleInvoicePaymentFailed(event):
//     UPDATE users SET plan_status = 'past_due' WHERE stripe_customer_id = invoice.customer
//     auditLog('stripe.invoice.payment_failed', userId, { invoice_id, attempt_count: invoice.attempt_count })
//     Resend send: 'subscription-payment-failed.html' with Update-card CTA → /account/billing
//     Sentry capture as info (not error — expected dunning flow)
//
// Concurrency: a single Vercel function instance handles events serially; cross-instance race covered by event_id PRIMARY KEY.
// Signature TTL: Stripe default 5-min tolerance between event timestamp + now. Vercel cold-start under 1s = fine.
```

---

#### 5.1.4 `GET /api/stripe/invoices`

```typescript
// kova-open-pencil-1/api/stripe/invoices.ts
// Method:      GET
// Auth:        Supabase JWT; users.stripe_customer_id MUST exist
// Query:       ?limit=12 (default 12, max 50)
// Response 200: { invoices: Array<{ id, created_at, description, amount_paid, currency, status, hosted_invoice_url, invoice_pdf }> }
// Response 401 / 404 / 429: standard shapes
//
// Side effects:
//   1. stripe.invoices.list({ customer: users.stripe_customer_id, limit, expand: ['data.charge'] })
//   2. Map response to a slimmed shape (drops PII not needed in UI)
//   3. Return — no DB write
//
// Rate limit: 30 req/min/user (cheap read; UI may auto-refresh)
```

---

#### 5.1.5 `POST /api/stripe/reconcile` (cron-invoked)

```typescript
// kova-open-pencil-1/api/stripe/reconcile.ts
// Method:      POST
// Auth:        Vercel Cron secret (Authorization: Bearer ${CRON_SECRET})
// Body:        {}  (cron-invoked)
// Response 200: { checked: n, healed: n, errored: n }
// Response 401: { error: 'unauthorized' }
// Schedule:    weekly Sun 04:00 UTC (Vercel Cron — vercel.json)
//
// Algorithm:
//   1. SELECT id, stripe_subscription_id FROM users WHERE plan_status = 'past_due' LIMIT 500
//   2. For each: stripe.subscriptions.retrieve(sub_id)
//      If sub.status === 'active' AND local plan_status === 'past_due' → UPDATE plan_status = 'active'
//      If sub.status === 'canceled' AND local !== 'cancelled' → UPDATE per subscription.deleted handler
//   3. Idempotency: read-only on Stripe; UPDATE only when drift detected.
//   4. Audit-log row 'stripe.reconcile.healed' per healed user.
//
// Why this cron exists: webhook delivery is best-effort. If we miss a invoice.paid event, the user stays past_due forever. Weekly heal is cheap insurance.
```

---

#### 5.1.6 `POST /api/account/avatar-upload` (Pre-signed URL pattern — server returns signed URL)

```typescript
// kova-open-pencil-1/api/account/avatar-upload.ts
// Method:      POST
// Auth:        Supabase JWT
// Headers:     X-Idempotency-Key (optional)
// Body:        { mime_type: 'image/png' | 'image/jpeg', size_bytes: number }   // SVG REJECTED (founder decision 2026-05-17 — XSS surface)
// Response 200: { signed_url: string, expires_at: ISO8601, storage_path: string }
// Response 401: { error: 'unauthenticated' }
// Response 413: { error: 'too_large', max_bytes: 5242880 }   // 5 MB (founder decision 2026-05-17)
// Response 415: { error: 'unsupported_mime' }                  // PNG/JPG only — SVG rejected
//
// Side effects:
//   1. Validate mime ∈ {image/png, image/jpeg} + size (≤5 MB)
//   2. Compute storage_path = `users/${user_id}/avatar.png`   // FIXED extension (founder decision 2026-05-17 — normalize to PNG)
//   3. supabase.storage.from('media-assets').createSignedUploadUrl(storage_path) → 15-min URL
//   4. Return { signed_url, expires_at, storage_path }
//
// Client then PUTs the file directly to signed_url. On success, client POSTs /api/account/avatar-confirm.
// The avatar-confirm handler fetches the uploaded file, processes it via `sharp` (resize 256×256, convert to PNG),
// re-uploads the normalized output to the same path (overwrite), then updates users.avatar_storage_path.
//
// Why split: lets the browser stream the original file without proxying through our Function; normalize step
// runs server-side (~50-150ms via sharp) before persisting state.
```

```typescript
// kova-open-pencil-1/api/account/avatar-confirm.ts
// Method:      POST
// Auth:        Supabase JWT
// Body:        { storage_path: string }
// Response 200: { success: true, public_url: string }
//
// Side effects:
//   1. Validate storage_path === `users/${auth.uid()}/avatar.png` (fixed extension)
//   2. supabase.storage.from('media-assets').download(storage_path) — fetch uploaded file
//   3. Run through `sharp` pipeline: rotate (EXIF auto) → resize fit:'cover' 256×256 → toFormat('png', { compressionLevel: 9 })
//   4. supabase.storage.from('media-assets').update(storage_path, normalizedBuffer, { contentType: 'image/png', upsert: true })
//   5. UPDATE users SET avatar_storage_path = $1 WHERE id = auth.uid()
//   6. Generate signed display URL (15-min TTL); return
//   7. Audit-log row 'account.avatar_uploaded' with { original_size, normalized_size }
```

---

### 5.2 RPCs (database functions)

Both ship in the migration in §4.1.

| Function | Args | Returns | Security | Caller |
|---|---|---|---|---|
| `user_has_active_plan(p_user_id)` | uuid | boolean | `SECURITY DEFINER`, `STABLE`, `search_path = public, pg_temp` | `usePlanGate` composable (via PostgREST), Edge Functions |
| `log_shopify_connection_event(p_brand_id, p_event_type, p_source, p_metadata)` | uuid, text, text, jsonb | uuid (new row id) | `SECURITY DEFINER`, `search_path = public, pg_temp` | Edge Functions only (`service_role` execute grant; no `authenticated` access) |

### 5.3 Cron jobs

| Name | Schedule | Function path | Retry | Idempotency | Owner |
|---|---|---|---|---|---|
| `stripe-reconcile-cron` | `0 4 * * 0` (weekly Sun 04:00 UTC) | `/api/stripe/reconcile` | None (cron retries via next week's run); errors → Sentry | Read-only against Stripe; UPDATE only on drift; safe under concurrent runs (none — weekly) | Cluster 04 |

Vercel Cron config additions to `kova-open-pencil-1/vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/delete-account", "schedule": "0 3 * * *" },
    { "path": "/api/stripe/reconcile",   "schedule": "0 4 * * 0" }
  ]
}
```

`CRON_SECRET` env var (server-only, no `VITE_` prefix) shared across all crons per Cluster 01.

### 5.4 External integrations

| Integration | SDK / version | Use | Webhooks | Env vars |
|---|---|---|---|---|
| **Stripe** | `stripe` npm package v17.x (latest GA at PRD time) | `customers.create`, `checkout.sessions.create`, `billingPortal.sessions.create`, `subscriptions.retrieve`, `subscriptions.cancel` (Cluster 01 cron uses), `customers.del` (Cluster 01 cron uses), `invoices.list`, `webhooks.constructEvent` | `POST /api/stripe/webhook` (signature-verified; ack within 20s) | `STRIPE_SECRET_KEY` (server-only), `STRIPE_WEBHOOK_SECRET` (server-only), `VITE_STRIPE_PUBLISHABLE_KEY` (client — Stripe.js for future inline elements; not used at MVP but reserved), `STRIPE_PRICE_ID_SOLO`, `STRIPE_PRICE_ID_AGENCY` (server-only price IDs — values filled in post-pricing-lock) |
| **Resend** | `resend` npm (already installed by Cluster 01) | 4 templates: `subscription-new.html`, `subscription-upgraded.html`, `subscription-cancelled.html`, `subscription-payment-failed.html` (founder decision 2026-05-17 — all 4 events at MVP) | None | `RESEND_API_KEY` (Cluster 01 ships) |
| **Supabase Storage** | `@supabase/supabase-js` | `media-assets` bucket — avatar upload via createSignedUploadUrl | None | Existing |
| **sharp** (NEW) | `sharp` npm package v0.34.x (latest GA at PRD time) | Server-side avatar image normalization (resize 256×256 + convert to PNG). Runs in `avatar-confirm` Edge Function only. ~600 KB install; native bindings auto-resolved per Vercel runtime. | None | None |
| **Shopify** (M9 reuse) | direct fetch (existing) | `IntegrationsCard` reuses existing OAuth start/callback/disconnect endpoints; this PRD wires history-log via `log_shopify_connection_event` RPC into those endpoints | M9 already ships `shop/uninstalled`, `customers/redact`, `shop/redact` handlers — verify they call `log_shopify_connection_event` on uninstall | Existing |

#### 5.4.1 Stripe Customer Portal configuration

Apply via Stripe Dashboard (Test mode + Live mode separately) before launch:

| Setting | Value | Why |
|---|---|---|
| Branding | Kova logo + brand colors | Match in-app visual |
| Headline | "Manage your Kova subscription" | Clear context |
| Features → Customer information | Disabled | Name + email lives in `/account/profile`; portal stays focused on billing |
| Features → Payment methods | Enabled (add/update/delete) | Core capability |
| Features → Invoices | Enabled (view + download) | Core capability |
| Features → Cancellations | Enabled, mode `at_period_end` | User-friendly; webhook fires `customer.subscription.updated` → `cancel_at_period_end=true` |
| Features → Subscription updates | Enabled (allow plan switch) | Users can self-upgrade/downgrade |
| Business information → Privacy policy | `https://kova.app/privacy` | Required for Customer Portal |
| Business information → Terms of service | `https://kova.app/terms` | Required for Customer Portal |
| Default return URL | `https://kova.app/account/billing` | Stripe falls back here if our session-create code omits return_url |

#### 5.4.2 Webhook endpoint registration

In Stripe Dashboard → Developers → Webhooks → Add endpoint:

- Endpoint URL: `https://kova.app/api/stripe/webhook` (production) / `https://kova-staging.vercel.app/api/stripe/webhook` (staging) / `https://*.vercel.app/api/stripe/webhook` (preview — Stripe doesn't allow wildcards; for preview testing use Stripe CLI `stripe listen --forward-to localhost:1420/api/stripe/webhook`)
- Events to send: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- Signing secret: copy `whsec_*` → set as `STRIPE_WEBHOOK_SECRET` env var per environment

#### 5.4.3 Email templates (Resend) — all 4 events ship at MVP (founder decision 2026-05-17)

All templates extend `<EmailShell>` (Cluster 11), use Inter, plain-text fallback, valid `List-Unsubscribe` header (`<mailto:unsubscribe@kova.app>`), `X-Entity-Ref-ID: {{ user_id }}` for thread grouping. Stored at `kova-open-pencil-1/emails/account/*.html`. Each template accepts variables documented per row.

| Template file | Webhook trigger | Subject | Body summary | Variables |
|---|---|---|---|---|
| `subscription-new.html` | `customer.subscription.created` where `plan != 'free'` | `Welcome to Kova {{ planName }} 🎉` | H1: "Welcome to Kova {{ planName }}". P1: "Thanks for subscribing — your account now includes {{ planName }} features." P2: "Your first invoice for ${{ amount }} is processed and you're all set." Primary CTA: "Open Kova" → `https://kova.app/dashboard`. Secondary link: "View invoice" → `{{ hosted_invoice_url }}`. Footer: subscription managed via Kova; unsubscribe note clarifies billing emails are transactional + cannot be opted out. | `planName`, `amount`, `currency` (default USD), `hosted_invoice_url`, `user_id` |
| `subscription-upgraded.html` | `customer.subscription.updated` where price-id changed AND new plan-name != old plan-name | `You're now on Kova {{ planName }}` | H1: "You're on {{ planName }}". P1: "Your plan changed from {{ oldPlanName }} to {{ planName }} effective immediately." P2: "Your next invoice for ${{ amount }} renews {{ currentPeriodEnd \| date('long') }}." Primary CTA: "Open Kova". Secondary: "Manage subscription" → `/account/billing`. | `planName`, `oldPlanName`, `amount`, `currentPeriodEnd`, `user_id` |
| `subscription-cancelled.html` | `customer.subscription.updated` where `cancel_at_period_end` flipped false→true; ALSO `customer.subscription.deleted` (fired at period end) | `Your Kova subscription has been cancelled` | H1: "Subscription cancelled". P1 (for cancel-scheduled): "Your subscription will end on {{ accessEndsOn \| date('long') }}. Until then, you keep full access." P1 (for deleted): "Your subscription ended on {{ accessEndsOn \| date('long') }}. We've moved you to the Free plan." P2: "We'd love to know what we could've done better — reply to this email anytime." Primary CTA: "Reactivate" → `/account/billing`. Secondary: "Send feedback" → `mailto:hello@kova.app`. | `accessEndsOn`, `wasScheduled` (bool — picks the variant), `user_id` |
| `subscription-payment-failed.html` | `invoice.payment_failed` | `Action needed: payment failed for Kova` | H1: "We couldn't charge your card". P1: "Your last payment of ${{ amount }} didn't go through (attempt {{ attemptCount }} of 4)." P2: "Update your card before **{{ deadline \| date('long') }}** to keep your subscription. After that, Kova will downgrade your account." Primary CTA: "Update payment method" → triggers `POST /api/stripe/portal-session` and redirects to portal new tab. Secondary: "View invoice" → `{{ hosted_invoice_url }}`. Footer notes: "Stripe is our payment processor and will also email you separately about this charge." | `amount`, `attemptCount`, `deadline`, `hosted_invoice_url`, `user_id` |

**Send timing:** All emails fire **immediately** from the webhook handler (after the DB UPDATE completes and BEFORE the handler returns 200). Resend SDK call is wrapped in try/catch; failure logs to Sentry as `level: 'warning'` but does NOT 500 the handler (we've already updated DB; Stripe's own customer-emails serve as backup per §12.11).

**Plain-text fallback:** Each `.html` template has a corresponding `.txt` sibling generated at build via `juice` + plain-text extractor. Resend SDK accepts both `html:` and `text:` payloads — we send both.

**Localization:** English only at MVP. Phase 2 adds locale-aware variants based on `users.preferences.locale`.

**Stripe's own emails:** Configure Stripe Dashboard → Settings → Customer emails to ENABLE: "Successful payments" + "Failed payments" + "Refunds" + "Upcoming invoices". Kova emails are supplementary; Stripe's are authoritative for legal/dunning purposes.

### 5.5 Compliance + docs deliverables

| Deliverable | Location | Purpose |
|---|---|---|
| Privacy policy update | `kova-open-pencil-1/docs/legal/privacy-policy.md` (PRD 01 owns the file; this PRD adds Stripe-specific disclosures) | Stripe sub-processor named with data categories: email, name, payment-method tokens (handled by Stripe), invoice metadata. Already partially named by PRD 01; this PRD verifies + extends. |
| RoPA update | `kova-open-pencil-1/docs/legal/ropa.md` | Stripe entry: purpose (subscription billing), data sent (email, customer.metadata.user_id), retention (Stripe holds invoice data 7 years per their docs; we hold `stripe_customer_id` until account deletion) |
| Operator runbook — Stripe Dashboard onboarding | `kova-open-pencil-1/docs/operations/stripe-setup-runbook.md` | Step-by-step for whoever sets up Stripe Live mode pre-launch: Dashboard config (5.4.1), webhook endpoint (5.4.2), price IDs creation, test-mode → live-mode mode flip |

---

## 6. Frontend

### 6.1 Routes (Vue Router)

```typescript
// kova-open-pencil-1/src/router/routes.ts (extend existing)

const accountRoutes = [
  // /account redirects to /account/profile
  {
    path: '/account',
    redirect: '/account/profile',
  },
  // /account/:section?
  {
    path: '/account/:section(profile|brands|billing|brand-kit|integrations|danger)',
    name: 'account',
    component: () => import('@/views/account/AccountView.vue'),
    meta: { theme: 'dark', requiresAuth: true, viewportGuard: 'desktop' },
    props: true,
    // Nested: Brand Kit sub-tabs (Cluster 05) + Brands archive page (Cluster 03 owns content; PRD 04 owns route + chrome)
    children: [
      {
        path: '',
        name: 'account-section',
        components: {
          default: () => import('@/views/account/sections/SectionResolver.vue'),
        },
      },
    ],
  },
  // Stripe return landings (full-page, not nested under /account view chrome)
  {
    path: '/account/billing/success',
    name: 'account-billing-success',
    component: () => import('@/views/account/StripeReturnLanding.vue'),
    props: { mode: 'success' },
    meta: { theme: 'dark', requiresAuth: true, viewportGuard: 'desktop' },
  },
  {
    path: '/account/billing/cancel',
    name: 'account-billing-cancel',
    component: () => import('@/views/account/StripeReturnLanding.vue'),
    props: { mode: 'cancel' },
    meta: { theme: 'dark', requiresAuth: true, viewportGuard: 'desktop' },
  },
]
```

**Route notes:**

- Section param uses Vue Router enumerated path: `:section(profile|brands|billing|brand-kit|integrations|danger)` — invalid section 404s.
- Brand Kit sub-tab routing uses query param `?tab=visuals` (Cluster 05 owns).
- Brand picker uses query param `?brand=:brandId` on Brand Kit + Integrations sections.
- **`/account/brands` cross-cluster ownership (B12 reversal 2026-05-17):** PRD 04 owns the route registration + auth meta + sidebar nav entry; **PRD 03 owns the page content** (active+archived brand inventory grid, B12.3 Restore modal, B12.4 Delete-archived modal). `<SectionResolver>` (§6.4.1) maps `:section === 'brands'` to PRD 03's `<BrandsArchiveView>` component. Auth meta inherits from parent `account` route (requiresAuth: true, theme: dark, viewportGuard: desktop) — no additional guards needed.

### 6.2 Pinia stores

#### 6.2.1 `useBillingStore`

```typescript
// kova-open-pencil-1/src/stores/billing.ts (NEW)
export const useBillingStore = defineStore('billing', () => {
  // State — read by every section that surfaces billing
  const plan = ref<'free' | 'solo' | 'agency'>('free')
  const planStatus = ref<'active' | 'past_due' | 'cancelled' | 'incomplete'>('active')
  const currentPeriodEnd = ref<Date | null>(null)
  const cancelAtPeriodEnd = ref(false)
  const stripeCustomerId = ref<string | null>(null)

  // Cached fetches
  const invoices = ref<Invoice[]>([])
  const invoicesLoaded = ref(false)
  const usage = ref<{ aiGenerations: number; storageBytes: number; resetAt: Date | null }>({
    aiGenerations: 0,
    storageBytes: 0,
    resetAt: null,
  })

  // Computed
  const hasActiveSubscription = computed(() =>
    planStatus.value === 'active' &&
    (currentPeriodEnd.value === null || currentPeriodEnd.value > new Date()),
  )
  const isPastDue = computed(() => planStatus.value === 'past_due')

  // Actions
  async function loadFromUser(user: User): Promise<void> {
    plan.value = user.plan
    planStatus.value = user.plan_status
    currentPeriodEnd.value = user.current_period_end ? new Date(user.current_period_end) : null
    cancelAtPeriodEnd.value = user.cancel_at_period_end
    stripeCustomerId.value = user.stripe_customer_id
  }

  async function startCheckout(priceId: string): Promise<void> {
    const idemKey = crypto.randomUUID()
    const res = await fetch('/api/stripe/checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': idemKey },
      body: JSON.stringify({
        price_id: priceId,
        success_url: `${window.location.origin}/account/billing/success`,
        cancel_url: `${window.location.origin}/account/billing/cancel`,
      }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new BillingError(error)
    }
    const { url } = await res.json()
    window.location.href = url  // Full-page redirect to Stripe Checkout
  }

  async function openPortal(): Promise<void> {
    const res = await fetch('/api/stripe/portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ return_url: `${window.location.origin}/account/billing` }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      if (error === 'no_customer') {
        // No Stripe customer yet — guide user to Checkout instead
        throw new BillingError('no_customer')
      }
      throw new BillingError(error)
    }
    const { url } = await res.json()
    window.open(url, '_blank', 'noopener,noreferrer')  // NEW TAB — Stripe blocks iframe
  }

  async function fetchInvoices(force = false): Promise<void> {
    if (invoicesLoaded.value && !force) return
    if (!stripeCustomerId.value) {
      invoices.value = []
      invoicesLoaded.value = true
      return
    }
    const res = await fetch('/api/stripe/invoices?limit=12')
    if (!res.ok) throw new BillingError('fetch_invoices_failed')
    const { invoices: list } = await res.json()
    invoices.value = list
    invoicesLoaded.value = true
  }

  async function fetchUsage(): Promise<void> {
    // Hits an existing M5 atomic-counter RPC to read current AI-generations count
    // Storage usage computed via supabase.storage.from('media-assets').list path-scoped to user
    // Cap values from @/constants/billing-plans.ts based on plan
    // Implementation detail; see §9.2 integration tests
  }

  return {
    plan, planStatus, currentPeriodEnd, cancelAtPeriodEnd, stripeCustomerId,
    invoices, invoicesLoaded, usage,
    hasActiveSubscription, isPastDue,
    loadFromUser, startCheckout, openPortal, fetchInvoices, fetchUsage,
  }
})
```

#### 6.2.2 `useAccountStore`

```typescript
// kova-open-pencil-1/src/stores/account.ts (NEW)
export const useAccountStore = defineStore('account', () => {
  // Active section
  const activeSection = ref<'profile' | 'billing' | 'brand-kit' | 'integrations' | 'danger'>('profile')

  // Profile section drafts (dirty until saved)
  const draft = reactive({
    name: '',
    timezone: 'UTC',
    // Notification + accessibility prefs live in usePreferencesStore (Cluster 12); drafted there
  })

  // Original snapshot (for diff)
  const original = reactive({ ...draft })

  // Computed
  const hasUnsaved = computed(() => {
    return draft.name !== original.name || draft.timezone !== original.timezone
  })

  const unsavedFields = computed(() => {
    const fields: string[] = []
    if (draft.name !== original.name) fields.push('Name')
    if (draft.timezone !== original.timezone) fields.push('Timezone')
    return fields
  })

  // Actions
  async function loadProfile(user: User): Promise<void> {
    draft.name = user.name
    draft.timezone = user.preferences?.timezone ?? 'UTC'
    Object.assign(original, draft)
  }

  async function save(): Promise<void> {
    if (!hasUnsaved.value) return
    const { error } = await supabase.from('users').update({
      name: draft.name,
      preferences: { ...currentPrefs, timezone: draft.timezone },
    }).eq('id', currentUser.id)
    if (error) throw new AccountError(error.message)
    Object.assign(original, draft)
  }

  function discard(): void {
    Object.assign(draft, original)
  }

  return { activeSection, draft, hasUnsaved, unsavedFields, loadProfile, save, discard }
})
```

### 6.3 Composables

| Composable | File | Signature | Used by |
|---|---|---|---|
| `useAccountSection` | `src/composables/account/use-account-section.ts` | `(): { activeSection: ComputedRef<Section>; setSection(s: Section): void }` — syncs `useAccountStore.activeSection` with `route.params.section`; updates URL on `setSection()`; reads URL on mount | `<AccountView>`, sidebar nav |
| `useBrandPicker` | `src/composables/account/use-brand-picker.ts` | `(scope: 'brand-kit' \| 'integrations'): { selectedBrand: ComputedRef<Brand \| null>; selectedBrandId: ComputedRef<string \| null>; setBrand(id: string): void; renderMode: ComputedRef<'empty' \| 'static-label' \| 'dropdown'> }` — **default precedence (founder decision 2026-05-17):** `route.query.brand` (URL param) > `usePreferencesStore.lastActiveBrandId` (Q5 Layer 2) > first brand alphabetically. Writes URL query on `setBrand()` AND persists to prefs. **renderMode:** `'empty'` (0 brands), `'static-label'` (1 brand — Figma pattern), `'dropdown'` (2+ brands). | `<BrandKitSection>`, `<IntegrationsSection>` |
| `usePlanGate` | `src/composables/account/use-plan-gate.ts` | `(feature: 'ai_generation' \| 'unlimited_history' \| 'custom_fonts' \| string): { allowed: ComputedRef<boolean>; reason: ComputedRef<string \| null> }` | All feature surfaces that may gate (M5 AI proxy, Cluster 09 unlimited history, Cluster 05 brand-font upload). STUB at MVP — `allowed.value = true` for all features. |
| `useAvatarUpload` | `src/composables/account/use-avatar-upload.ts` | `(): { upload(file: File): Promise<{ public_url: string }>; uploading: Ref<boolean>; error: Ref<string \| null> }` — validates mime + size, requests signed URL, PUTs file, calls confirm endpoint | `<ProfileSection>` |
| `useStripeReturn` | `src/composables/account/use-stripe-return.ts` | `(): { planName: ComputedRef<string>; mode: 'success' \| 'cancel'; goToDashboard(): void; goToBilling(): void; retryCheckout(): Promise<void> }` — reads `:mode` route prop + last-known priceId from localStorage for retry | `<StripeReturnLanding>` |

### 6.4 Components

**Icon convention (W0-4 — 2026-05-19):** every icon rendered by a component in this PRD uses `<KovaIcon name="..." size?="..." />` from Cluster 11 §6.4.2 / Plan 11 Task 4.4. The four retired alternates are forbidden per scope plan §6.2 W0-4 lock: (a) raw `<icon-lucide-*>` tags with dynamic names, (b) `<component :is="\`icon-lucide-${name}\`">` template-literal resolution (the pattern flagged by QA-B CRITICAL-4 in Plan 04 line 2332), (c) `i-lucide-*` UnoCSS class strings, (d) `<Icon name="lucide:...">` Nuxt-style. Wave-2 cluster-04 fix agent migrates residual non-conforming icon bindings during its pass.

#### 6.4.1 Page components

| Component | File | Hi-fi reference |
|---|---|---|
| `AccountView` | `src/views/account/AccountView.vue` | A7 chrome (sidebar + content area) |
| `StripeReturnLanding` | `src/views/account/StripeReturnLanding.vue` | B10.1 + B10.2 (single component, `mode` prop branches) |
| `SectionResolver` | `src/views/account/sections/SectionResolver.vue` | Internal — dispatch to specific section component per `useAccountStore.activeSection`. **Maps `'brands'` → PRD 03's `<BrandsArchiveView>` via dynamic import** (B12 reversal 2026-05-17). |
| `ProfileSection` | `src/views/account/sections/ProfileSection.vue` | A7.1 |
| `BillingSection` | `src/views/account/sections/BillingSection.vue` | A7.2 |
| `BrandKitSection` | `src/views/account/sections/BrandKitSection.vue` | A7.3 (shell only — sub-tab content from Cluster 05) |
| `IntegrationsSection` | `src/views/account/sections/IntegrationsSection.vue` | A7.5 (refactored from M9 `SettingsBrandIntegrationsView`) |
| `DangerZoneSection` | `src/views/account/sections/DangerZoneSection.vue` | A7.6 (thin wrapper that mounts `<DangerZoneCard>` from Cluster 01) |
| `BrandsArchiveView` *(cross-cluster, owned by PRD 03)* | `src/views/account/sections/BrandsArchiveView.vue` *(PRD 03 path)* | **B12** page content (active+archived brand grid + B12.3 Restore + B12.4 Delete-archived modals). **PRD 04 only registers the route + sidebar entry; PRD 03 ships this component.** Imported by `<SectionResolver>` when `:section === 'brands'`. |

#### 6.4.2 Reusable account-shell components

| Component | Props | Slots | Emits | Hi-fi origin |
|---|---|---|---|---|
| `<AccountSidebar>` (`src/components/account/AccountSidebar.vue`) | `activeSection: Section`; `items: Array<{ id: Section; label: string; icon: string; warnTinted?: boolean }>` | none | `select: (section: Section)` | A7 sidebar |
| `<AccountSectionHeader>` (`src/components/account/AccountSectionHeader.vue`) | `title: string`; `subcopy: string` | `trailing` (optional, e.g., unsaved-pill slot) | none | A7 section headers |
| `<UnsavedPill>` (`src/components/account/UnsavedPill.vue`) | `fields: string[]` | none | `save`, `discard` | A7.1 pill |
| `<BrandPicker>` (`src/components/account/BrandPicker.vue`) | `modelValue: string \| null` (selected brand id); `brands: Brand[]`; `archivedBrands?: Brand[]`; `renderMode: 'empty' \| 'static-label' \| 'dropdown'` (from `useBrandPicker.renderMode`) | `footer` (e.g., "+ Add new brand" if Cluster 03 dialog exists) | `update:modelValue: (id: string)` | A7.3 (A2b dropdown variant). **Render variants (founder decision 2026-05-17):** `'empty'` → defer to parent `<EmptyState>`; `'static-label'` → render brand name as non-interactive label (no chevron — Figma pattern); `'dropdown'` → full Reka-UI Select with chevron + search. |
| `<PlanCard>` (`src/components/account/PlanCard.vue`) | `plan: string`; `planStatus: 'active' \| 'past_due' \| 'cancelled' \| 'incomplete' \| 'trialing'`; `currentPeriodEnd: Date \| null`; `cancelAtPeriodEnd: boolean`; `features: string[]` | none | `manage-billing`, `compare-plans` | A7.2. Renders **5 status pill variants** including "Trial" (founder decision 2026-05-17 — Trial pill hidden until `planStatus === 'trialing'`). |
| `<TrialBanner>` (`src/components/account/TrialBanner.vue`) | `currentPeriodEnd: Date` (trial-end date); `planName: string` | none | none | net-new. Renders "Trial — {{ daysLeft }} days left of {{ planName }}." Conditional on `useBillingStore.planStatus === 'trialing'`. Ships hidden at MVP — no Stripe trial settings active. Activation = founder turns trial on in Stripe Dashboard; component lights up automatically via reactive store. |
| `<UsageBar>` (`src/components/account/UsageBar.vue`) | `label: string`; `used: number`; `cap: number`; `unit: 'count' \| 'bytes'`; `resetAt?: Date` | none | none | A7.2 |
| `<InvoiceTable>` (`src/components/account/InvoiceTable.vue`) | `invoices: Invoice[]`; `loading?: boolean`; `error?: string` | none | none | A7.2 |
| `<PastDueBanner>` (`src/components/account/PastDueBanner.vue`) | `cardLast4?: string`; `nextAttemptAt?: Date` | none | `update-payment` (opens Portal) | net-new — wired to `useBillingStore.isPastDue` |
| `<IntegrationCard>` (`src/components/account/IntegrationCard.vue`) | `provider: 'shopify' \| 'mailchimp' \| 'klaviyo'`; `status: 'connected' \| 'not_connected' \| 'connecting' \| 'reauthorize' \| 'syncing' \| 'coming_soon'`; `brandId?: string` | none | `connect`, `disconnect`, `sync-now`, `reauthorize` | A7.5 (refactored from M9 `IntegrationsCard.vue`) |
| `<SyncHistoryAccordion>` (`src/components/account/SyncHistoryAccordion.vue`) | `brandId: string` | none | none — internally fetches via `useShopifyConnection(brandId).history` | A7.5 (NEW — wires `shopify_connection_history` table) |

#### 6.4.3 The `<AccountView>` layout

```vue
<!-- src/views/account/AccountView.vue -->
<template>
  <div class="acct-shell">
    <header class="acct-topbar">
      <RouterLink to="/dashboard" class="acct-back">
        <icon-lucide-arrow-left /> Back to dashboard
      </RouterLink>
      <h1 class="acct-title">Account</h1>
    </header>

    <div class="acct-body">
      <AccountSidebar
        :active-section="activeSection"
        :items="sidebarItems"
        @select="setSection"
      />
      <main class="acct-content">
        <SectionResolver />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAccountSection } from '@/composables/account/use-account-section'
import AccountSidebar from '@/components/account/AccountSidebar.vue'
import SectionResolver from './sections/SectionResolver.vue'

const { activeSection, setSection } = useAccountSection()

const sidebarItems = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'billing', label: 'Plan & billing', icon: 'credit-card' },
  { id: 'brand-kit', label: 'Brand Kit', icon: 'palette' },
  { id: 'integrations', label: 'Integrations', icon: 'plug' },
  { id: 'danger', label: 'Danger zone', icon: 'trash-2', warnTinted: true },
] as const
</script>
```

#### 6.4.4 The `<StripeReturnLanding>` layout

Single component handles both `mode='success'` (B10.1) and `mode='cancel'` (B10.2). The visual chrome lifts B2 error-card chrome (per Cluster 11 convention). Icon + headline + sub-copy branch on `mode`. Primary CTA on success = "Go to dashboard"; on cancel = "Try again" (uses last priceId from localStorage to restart checkout). Plan name template variable `{{ planName }}` reads from `useBillingStore.plan` (just-updated by webhook by the time user lands here; webhook usually fires before browser redirect completes).

#### 6.4.5 M9 refactor: `IntegrationsCard.vue` + `SettingsBrandIntegrationsView.vue`

Per §5.6 audit items 1 + 4 + 8, M9 ships these components light-themed at `/dashboard/:brandId/settings/integrations` with an empty sync-history accordion. This PRD refactors them into the new `<IntegrationCard>` + `<SyncHistoryAccordion>` shells under `/account/integrations`. Concrete transform list:

| Concern | Before (M9) | After (this PRD) |
|---|---|---|
| Theme | ~24 light Tailwind utilities in `IntegrationsCard.vue`; ~61 in `SettingsBrandIntegrationsView.vue` | All `bg-white` → `bg-[var(--page)]`; `text-gray-900` → `text-[var(--ink)]`; `text-gray-500` → `text-[var(--ink-2)]`; `border-gray-200` → `border-[var(--line)]`; status colors → kova-hifi.css `--ok` / `--warn` / `--danger` tokens |
| Route | `/dashboard/:brandId/settings/integrations` | `/account/integrations?brand=:brandId` |
| Brand resolution | `route.params.brandId` (URL param only) | `useBrandPicker('integrations')` (URL query + Q5 Layer 2 fallback) |
| Sync history data source | Hardcoded `[]` in `useShopifyConnection` composable line 125 | `useShopifyConnection.fetchConnectionHistory(brandId)` — queries `shopify_connection_history` table; Realtime subscribe on INSERT |
| History accordion empty state | "No history yet." | "No sync history yet. Events show here as you connect and sync." |
| Disconnect confirm | Inline `<dialog>` with custom UI | Cluster 11 `useConfirm()` modal with consistent typography |
| Component split | One monolithic `IntegrationsCard.vue` + duplicate UI in `SettingsBrandIntegrationsView.vue` | Extract `<ShopifyConnectForm>` (shared between connect+reconnect states); `<IntegrationCard>` becomes a thin shell |
| Realtime subscription | Already exists for `shopify_connections.sync_progress` | Add subscription for `shopify_connection_history` INSERTs on the brand row |
| ARIA | progressbar exists in `SettingsBrandIntegrationsView` only | Extract `<SyncProgressBar>` with built-in ARIA, used in both views |

The M9 composable `useShopifyConnection` keeps its existing API; this PRD adds one method (`fetchConnectionHistory`) and modifies `loadConnection()` to invoke it. The OAuth popup + BroadcastChannel flow stays byte-identical (verified safe by audit + tests).

### 6.5 Drag-and-drop handlers

N/A for this cluster.

---

## 7. Tool layer / canvas-engine touches

N/A — this PRD does not touch `packages/core/`, the canvas renderer, or any scene-graph type. Account page lives entirely above the canvas engine.

---

## 8. Acceptance criteria

Every line is testable in code or browser. No "feels right."

### 8.1 Account chrome + navigation

- [ ] Visiting `/account` redirects to `/account/profile` with HTTP 200
- [ ] Visiting `/account/:section` for an unknown section returns 404 (Vue Router path enum)
- [ ] Sidebar renders exactly **6 items** in the order Profile, **Brands**, Plan & billing, Brand Kit, Integrations, Danger zone (B12 reversal 2026-05-17)
- [ ] Danger zone sidebar item is warn-tinted (trash-2 icon in `--warn` color, label in `--ink`)
- [ ] Clicking a sidebar item updates the URL to `/account/{section}` AND renders the section content within ≤200ms
- [ ] `<AccountView>` enforces 240px sidebar + 720px content max-width on viewports ≥1024px
- [ ] Viewport <1024px redirects to `/desktop-only` (PRD 01 viewport guard)
- [ ] Theme = dark (`data-theme="dark"` on `<html>` enforced by Cluster 11 router meta)

### 8.2 Profile section

- [ ] Loads current user.name, user.preferences.timezone, user.avatar_storage_path (via signed URL) within ≤500ms after route mount
- [ ] Editing the Name field marks `useAccountStore.hasUnsaved = true` AND renders `<UnsavedPill>` with "1 unsaved change · Name"
- [ ] Clicking Save persists changes to `users` via `supabase.from('users').update()` and resets the pill
- [ ] Clicking Discard reverts draft to original; pill disappears
- [ ] Avatar Upload button opens file picker filtered to `.png,.jpg,.jpeg` (SVG REJECTED — founder decision 2026-05-17)
- [ ] Files >5 MB are rejected client-side (size check before request) with toast "File too large (max 5 MB)"
- [ ] Files with bad mime are rejected by the server (`/api/account/avatar-upload` returns 415)
- [ ] Successful avatar upload renders the new image in the row within ≤2s of file selection
- [ ] Default initials render when `users.avatar_storage_path IS NULL` (computes from `name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()`)
- [ ] Email "Change…" button triggers `useEmailChange.requestChange()` (Cluster 01 owns the resulting flow)
- [ ] Password row + "Send reset link" button HIDDEN when `FORGOT_PASSWORD_ENABLED=false` (MVP default per Cluster 01 §10)
- [ ] Text size, reduce motion, high contrast toggles persist through `usePreferencesStore` (Cluster 12) to `users.preferences` JSONB
- [ ] Timezone select dropdown enumerates `Intl.supportedValuesOf('timeZone')` (~440 entries); default selection = UTC
- [ ] Saving with debounced autosave fires within 800ms of last keystroke; explicit Save button flushes immediately

### 8.3 Plan & billing section

- [ ] Loads current `plan`, `plan_status`, `current_period_end` from `useBillingStore` on mount (already loaded by auth guard's user-fetch)
- [ ] `<PlanCard>` renders `{{ planName }}` from `users.plan` (default "Free")
- [ ] Status pill renders correct token color: Active = `--ok`, Past due = `--warn`, Cancelled = `--ink-3`, Incomplete = `--warn`
- [ ] "Manage billing" button is HIDDEN when `users.stripe_customer_id IS NULL` (no customer = nothing to manage); shown otherwise
- [ ] Clicking "Manage billing" calls `useBillingStore.openPortal()` → server returns `url` → opens in NEW TAB via `window.open(url, '_blank', 'noopener,noreferrer')`
- [ ] On `no_customer` error, "Manage billing" surfaces a toast "Subscribe first to manage billing" instead of erroring silently
- [ ] `<PastDueBanner>` renders ONLY when `useBillingStore.isPastDue === true`
- [ ] Past-due banner CTA "Update payment method" opens Stripe Portal (same path as Manage billing)
- [ ] AI generations `<UsageBar>` renders `usage.aiGenerations / cap[plan]` where cap comes from `@/constants/billing-plans.ts`
- [ ] Storage `<UsageBar>` shows human-readable units (MB, GB) via shared formatter
- [ ] `<InvoiceTable>` fetches last 12 invoices via `useBillingStore.fetchInvoices()` on first mount
- [ ] Each invoice row's Download icon opens `invoice.hosted_invoice_url` in a new tab
- [ ] Empty invoice state renders Cluster 11 `<EmptyState>` with copy "No invoices yet…"
- [ ] "Upgrade" CTAs hidden at MVP (Q14 launch strategy deferred); "Compare plans" surfaces toast "Pricing coming soon"

### 8.4 Brand Kit section shell

- [ ] Loads `useBrandsStore.brands[]` and renders the brand picker
- [ ] Default selection = `users.preferences.lastActiveBrandId` if set, else first active brand
- [ ] Selecting a brand updates URL `?brand=:brandId` AND persists to `users.preferences.lastActiveBrandId`
- [ ] Sub-tab rail renders 7 tabs in order Visuals · Identity · Tone snippets · Saved blocks · Writing rules · Memories · Knowledge base
- [ ] Tab badges (counts for Tone / Saved / Memories) render when Cluster 05 fetches those — MVP shows zero badges (no data) until Cluster 05 ships
- [ ] Clicking a tab updates `?tab=:tab` query param
- [ ] Tab content slot renders the corresponding Cluster 05 component (MVP renders Cluster 11 `<Skeleton>` placeholder until 05 ships)

### 8.5 Integrations section (M9 refactor)

- [ ] Loads `useBrandsStore.brands[]` and renders the brand picker (same component as Brand Kit)
- [ ] For the selected brand, renders Shopify `<IntegrationCard>` plus 2 "Coming soon" placeholder cards (Mailchimp, Klaviyo)
- [ ] Shopify card status correctly reflects M9 `useShopifyConnection.state` value
- [ ] Connect flow: domain input + Connect button + popup + postMessage callback all work as in M9 (no behavior change other than theme)
- [ ] Disconnect uses Cluster 11 `useConfirm()` (not custom dialog) — confirm copy matches §3.5 spec
- [ ] After disconnect, `<SyncHistoryAccordion>` shows a new "disconnected" event row within ≤2s (Realtime subscribe)
- [ ] `<SyncHistoryAccordion>` shows last 50 events (page size; older accessible via "Show all" link — Phase 2)
- [ ] Empty history renders "No sync history yet. Events show here as you connect and sync."
- [ ] Refactor count check: 0 occurrences of `bg-white`, `text-gray-*`, `border-gray-*` in `IntegrationsCard.vue` post-refactor (grep CI gate — see §9.5)

### 8.6 Danger zone section

- [ ] Section mounts `<DangerZoneCard>` from Cluster 01 without re-implementing the modal
- [ ] Clicking "Delete account" triggers Cluster 01's typed-confirm modal (A9.1) — verify via component test that `<DangerZoneCard>` emits `requested` on confirm
- [ ] Modal sub-copy includes user's email (loaded from `useAuthStore.profile.email`) and brand/canvas/snapshot counts (queried via `useBrandsStore` + a counts RPC)

### 8.7 Stripe return landings

- [ ] `/account/billing/success` renders `<StripeReturnLanding mode="success">` with check-circle icon + plan name
- [ ] Plan name reflects `useBillingStore.plan` (already synced by webhook before user lands)
- [ ] If webhook hasn't fired yet (race), component polls every 1s up to 10s; falls back to plan name "Pro" or "Solo" if no name set after 10s
- [ ] Primary "Go to dashboard" CTA routes to `/dashboard`
- [ ] Secondary "View plan details" CTA routes to `/account/billing`
- [ ] `/account/billing/cancel` renders `<StripeReturnLanding mode="cancel">` with arrow-left neutral icon
- [ ] Primary "Try again" reads last priceId from `sessionStorage` and calls `useBillingStore.startCheckout(priceId)`; if no priceId stored, routes to `/account/billing`
- [ ] Secondary "Back to dashboard" routes to `/dashboard`

### 8.8 Stripe Edge Functions

- [ ] `POST /api/stripe/checkout-session` with valid price_id returns 200 + `url` in <2s
- [ ] Same endpoint with unknown price_id returns 422 `{ error: 'invalid_price' }`
- [ ] Same endpoint without auth returns 401
- [ ] Same endpoint exceeding 10 req/min returns 429 with `retry_after_seconds`
- [ ] `POST /api/stripe/portal-session` with no customer returns 404
- [ ] Same with valid customer returns 200 + `url`
- [ ] `POST /api/stripe/webhook` with valid signature returns 200; with invalid signature returns 400
- [ ] Same endpoint with duplicate event_id (same UUID twice) inserts only once; second call returns 200 quickly without re-processing
- [ ] Webhook ack < 20 seconds (95th percentile measured in Vercel logs)
- [ ] All 6 webhook event handlers update `users` row correctly (covered by integration tests in 9.2)
- [ ] Webhook `customer.subscription.updated` with `cancel_at_period_end=true` correctly sets `users.cancel_at_period_end`
- [ ] `invoice.payment_failed` event triggers Resend email send (via Cluster 11 wrapper)
- [ ] `GET /api/stripe/invoices` returns last 12 invoices for the user's customer; respects `limit` query param up to 50
- [ ] `POST /api/stripe/reconcile` invoked with valid CRON_SECRET reads all `past_due` users and heals drift; without secret returns 401

### 8.9 Security

- [ ] `users.stripe_customer_id` cannot be set by a client-side `UPDATE` (RLS test — existing PRD 01 RLS already restricts users.* writes to user_id = auth.uid(); we verify the new columns inherit)
- [ ] `stripe_webhook_events` cannot be SELECTed by `authenticated` role (RLS test)
- [ ] `shopify_connection_history` SELECT is scoped to brands the user owns (RLS test — auth user A cannot read user B's history)
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_SOLO`, `STRIPE_PRICE_ID_AGENCY` are server-only env vars (no `VITE_` prefix; Vite build verifies via grep — see §9.5)
- [ ] Stripe Customer Portal URL is opened with `noopener,noreferrer` (no window.opener leak)
- [ ] Webhook handler does NOT log raw payload to Sentry (PII concern); logs event.id + event.type + outcome only

### 8.10 Compliance + cross-cuts

- [ ] Privacy policy at `/privacy` names Stripe as sub-processor with data categories: email, name, payment-method token (handled by Stripe), customer.metadata.user_id, invoice metadata
- [ ] RoPA at `docs/legal/ropa.md` includes Stripe row with retention policy
- [ ] Audit log writes happen on every Stripe state change (verified via integration tests)
- [ ] PRD 01's `delete-account-cron` `stripe` step succeeds when this PRD's Stripe SDK + env vars are configured (integration test exercises end-to-end)

---

## 9. Test plan

### 9.1 Unit tests (`bun run test:unit`)

Target coverage: ≥85% on stores + composables + Edge-Function handlers.

| Test file | Covers |
|---|---|
| `tests/unit/stores/billing.test.ts` | `useBillingStore.startCheckout` (happy path, error branches, network failure); `openPortal` (no_customer → BillingError); `fetchInvoices` (cache, force-refresh, empty); `fetchUsage`; computed `hasActiveSubscription`, `isPastDue` |
| `tests/unit/stores/account.test.ts` | `useAccountStore.loadProfile`, `save`, `discard`, `hasUnsaved`, `unsavedFields` reactivity |
| `tests/unit/composables/account/use-account-section.test.ts` | URL ↔ activeSection sync (both directions); invalid section param fallback |
| `tests/unit/composables/account/use-brand-picker.test.ts` | URL query param read; Q5 Layer 2 fallback; setBrand updates both |
| `tests/unit/composables/account/use-plan-gate.test.ts` | Stub returns `allowed: true` for any feature at MVP; ensure no DB hits |
| `tests/unit/composables/account/use-avatar-upload.test.ts` | Mime validation; size validation; signed URL fetch; PUT + confirm flow |
| `tests/unit/composables/account/use-stripe-return.test.ts` | Plan-name polling on success; sessionStorage priceId retrieval on cancel; goToDashboard/goToBilling/retryCheckout |
| `tests/unit/api/stripe/checkout-session.test.ts` | Customer create-on-first-checkout; existing-customer branch; invalid_price; rate limit; idempotency-key forwarding |
| `tests/unit/api/stripe/portal-session.test.ts` | no_customer 404; success URL return; rate limit |
| `tests/unit/api/stripe/webhook.test.ts` | Signature verify (valid + invalid + missing); event_id dedup; per-event-type dispatch (6 handlers); unhandled_type returns 200; handler exception → Sentry + outcome='error' |
| `tests/unit/api/stripe/webhook-handlers/handle-checkout-completed.test.ts` | Reads client_reference_id; falls back to customer.metadata.user_id; audit log |
| `tests/unit/api/stripe/webhook-handlers/handle-subscription-created.test.ts` | Maps price_id to plan name; sets plan/status/period; stores `trialing` as-is when Stripe sends it (founder decision 2026-05-17) |
| `tests/unit/api/stripe/webhook-handlers/handle-subscription-updated.test.ts` | cancel_at_period_end propagation; status transitions |
| `tests/unit/api/stripe/webhook-handlers/handle-subscription-deleted.test.ts` | Resets plan to 'free', cancel_at_period_end to false |
| `tests/unit/api/stripe/webhook-handlers/handle-invoice-paid.test.ts` | Past-due → active recovery |
| `tests/unit/api/stripe/webhook-handlers/handle-invoice-payment-failed.test.ts` | Sets past_due; triggers Resend email; Sentry info-level capture |
| `tests/unit/api/stripe/invoices.test.ts` | Stripe SDK list call; slimming map; limit cap at 50 |
| `tests/unit/api/stripe/reconcile.test.ts` | CRON_SECRET auth; past_due reconcile; cancelled cleanup; no-drift no-op |
| `tests/unit/api/account/avatar-upload.test.ts` | Mime/size validation; signed URL creation; path construction |
| `tests/unit/api/account/avatar-confirm.test.ts` | Path validation; existence check; users.avatar_storage_path UPDATE |
| `tests/unit/components/account/AccountSidebar.test.ts` | Renders 6 items in order (Profile, Brands, Plan & billing, Brand Kit, Integrations, Danger zone) + active highlight + select emit. B12 reversal 2026-05-17. |
| `tests/unit/components/account/BrandPicker.test.ts` | Renders active + archived; emits update:modelValue; search filter |
| `tests/unit/components/account/PlanCard.test.ts` | Status pill color mapping; cancel-at-period-end footer copy; manage-billing visibility |
| `tests/unit/components/account/UsageBar.test.ts` | Percent rendering; unit formatting (bytes/count) |
| `tests/unit/components/account/InvoiceTable.test.ts` | Empty / loading / error / data states; download link target |
| `tests/unit/components/account/PastDueBanner.test.ts` | Only renders on past_due; CTA click emits update-payment |
| `tests/unit/components/account/IntegrationCard.test.ts` | Per-status rendering; emits correct actions |
| `tests/unit/components/account/SyncHistoryAccordion.test.ts` | Empty / data states; per-event-type icon + copy; Realtime subscription mock |
| `tests/unit/components/account/StripeReturnLanding.test.ts` | Mode-branched icon + headline + CTAs; plan-name polling |
| `tests/unit/lib/billing-plans.test.ts` | Plan → cap map; price_id → plan name reverse map; unknown price_id throws |

### 9.2 Integration tests (`bun run test:unit` against local Supabase)

Run against `supabase start` local instance with all migrations applied. Cleanup via test-isolated user IDs.

| Test file | Covers |
|---|---|
| `tests/integration/account/migrations.test.ts` | Apply migration 20260605_04; verify all 7 new users columns + 2 new tables + 2 new RPCs; check constraints + indexes |
| `tests/integration/account/rpc-user-has-active-plan.test.ts` | Active + valid period → true; cancelled → false; past_due → false; past current_period_end → false |
| `tests/integration/account/rpc-log-shopify-event.test.ts` | service_role can call; authenticated cannot; returns new row id; metadata jsonb stored correctly |
| `tests/integration/account/rls-stripe-webhook-events.test.ts` | authenticated SELECT/INSERT/UPDATE/DELETE all return 0 rows / fail |
| `tests/integration/account/rls-shopify-history.test.ts` | User A SELECT on User B's brand history returns 0 rows; User A on own brand returns rows; authenticated INSERT fails |
| `tests/integration/api/stripe-checkout-flow.test.ts` | Mock Stripe SDK; POST checkout-session creates customer + session; subsequent call reuses customer |
| `tests/integration/api/stripe-portal-flow.test.ts` | Mock Stripe SDK; with customer → 200 + url; without → 404 |
| `tests/integration/api/stripe-webhook-subscription-lifecycle.test.ts` | End-to-end: signed event for subscription.created → users row updated; subsequent .updated → period rolled; .deleted → plan='free' |
| `tests/integration/api/stripe-webhook-invoice-lifecycle.test.ts` | invoice.payment_failed → users.plan_status='past_due' + Resend mock called; invoice.paid → recovers to 'active' |
| `tests/integration/api/stripe-webhook-idempotency.test.ts` | Same event sent twice → only one DB write; second response 200 quickly |
| `tests/integration/api/stripe-webhook-signature.test.ts` | Valid signature → 200; invalid → 400; missing → 400 |
| `tests/integration/api/stripe-reconcile-heal.test.ts` | Seed past_due user; mock Stripe.subscriptions.retrieve → active; cron heals; second run no-op |
| `tests/integration/api/avatar-upload-flow.test.ts` | Request signed URL; PUT file to mock Storage; confirm endpoint; verify users.avatar_storage_path |
| `tests/integration/cluster-01-bridge/stripe-step-end-to-end.test.ts` | Cluster 01's delete-account-cron with this PRD's STRIPE_SECRET_KEY configured → cron 'stripe' step succeeds; subscription canceled + customer deleted (mock Stripe SDK) |

### 9.3 E2E tests (Playwright — `bun run test`)

Vercel Agent Browser preferred per `e2e-runner` default. Critical flows only.

| Spec | Covers |
|---|---|
| `tests/e2e/account/sidebar-navigation.spec.ts` | Open `/account` → land on Profile; click each sidebar item → URL + content update; refresh → land back on same section |
| `tests/e2e/account/profile-edit.spec.ts` | Edit name → see unsaved pill → save → reload → name persisted |
| `tests/e2e/account/avatar-upload.spec.ts` | Upload PNG → see new avatar render → reload → still rendered |
| `tests/e2e/account/email-change-handoff.spec.ts` | Click "Change…" → Cluster 01 email-change modal opens (cross-cluster integration check) |
| `tests/e2e/account/checkout-redirect.spec.ts` | Click upgrade → Stripe Checkout opens (Stripe test mode) → complete with test card → land at /account/billing/success → plan name shows |
| `tests/e2e/account/portal-new-tab.spec.ts` | Click "Manage billing" → new tab opens to Stripe Portal (assert `window.target === '_blank'`) |
| `tests/e2e/account/past-due-banner.spec.ts` | Manually set users.plan_status='past_due' → load /account/billing → banner renders → click "Update payment method" → portal opens |
| `tests/e2e/account/integrations-shopify-disconnect.spec.ts` | Connect Shopify (M9 OAuth mock) → disconnect via Cluster 11 confirm → history accordion adds "disconnected" row in real time |
| `tests/e2e/account/brand-picker-persists.spec.ts` | Select brand in Brand Kit → reload → same brand selected (Q5 Layer 2 persistence) |
| `tests/e2e/account/danger-zone-cluster-01.spec.ts` | Click "Delete account" → Cluster 01 modal opens → type "DELETE" → submit → routed to /account-pending-deletion (cross-cluster check) |
| `tests/e2e/account/stripe-cancel-retry.spec.ts` | Land at /account/billing/cancel → click "Try again" → checkout reopens with same priceId |

### 9.4 Manual QA (founder browser smoke)

Per `feedback_browser_smoke_test_before_done` memory — required before claiming done.

- [ ] Sign in; open `/account`; click each section; verify content + theme
- [ ] Edit name + timezone in Profile; observe unsaved pill; save; reload; persists
- [ ] Upload avatar (PNG, JPG, an SVG to see rejection, and a >5MB file to see rejection); verify normalized 256×256 PNG renders
- [ ] Click "Change…" email; complete the cross-cluster flow (Cluster 01); verify B5.1 lands on success
- [ ] In Plan & billing: click "Manage billing" — verify new tab opens to Stripe Customer Portal (test mode)
- [ ] Trigger a Stripe Checkout in test mode (real card 4242 4242 4242 4242); land at B10.1; observe plan name update
- [ ] Cancel a checkout mid-flow; land at B10.2; click "Try again" — same checkout reopens
- [ ] Simulate past-due via Stripe CLI `stripe trigger invoice.payment_failed` → banner appears within ≤5s
- [ ] In Integrations: connect a Shopify dev store; observe history "connected" row; disconnect; observe "disconnected" row in real time
- [ ] Switch brand in Brand Kit + Integrations picker; URL + persisted prefs both update
- [ ] In Danger zone: click "Delete account"; verify Cluster 01 modal; type DELETE; submit; verify sign-out
- [ ] On `/account-pending-deletion`: restore; observe email + dashboard land
- [ ] Trigger weekly reconcile cron manually (`vercel cron invoke stripe-reconcile-cron` in staging); observe no errors

### 9.5 Pre-commit + CI verifications

- `bun run check` — oxlint + type-check zero errors
- `bun run format` — oxfmt no diff
- `bun run test:unit` — all green
- `bun run test:dupes` — jscpd < 3%
- **Theme-drift grep:** `grep -rE "bg-white|bg-gray-[0-9]+|text-gray-[0-9]+|border-gray-[0-9]+" src/views/account/ src/components/account/` returns 0 results (refactor gate)
- **Secret grep:** `grep -rE "VITE_STRIPE_SECRET_KEY|VITE_STRIPE_WEBHOOK_SECRET" .` returns 0 results
- **Migration check:** `supabase db diff --schema public` returns clean (no untracked schema drift)
- Stripe webhook latency test: `stripe trigger customer.subscription.created` followed by SELECT from `users` within 10s shows updated `plan` (smoke against staging)
- **`access_token=` grep (CT-019):** `! grep -rnE "access_token=" kova-open-pencil-1/src/ kova-open-pencil-1/api/` — any literal `access_token=` query-string assignment is a launch-blocker post-M9. Mirrors PRD 02 §9.5. Wired into CI via `.github/workflows/qa-grep.yml` — a non-zero hit blocks merge.

---

## 10. Rollout phasing

### Phase A — Wave 3 close (initial deploy)

- Migration `20260605_04_account_stripe_billing` applied to local + staging Supabase
- Vue routes 6.1 wired
- All Pinia stores + composables shipped
- All components shipped, including the M9 IntegrationsCard + SettingsBrandIntegrationsView refactor
- Edge Functions 5.1.1–5.1.6 deployed to staging
- Stripe Test Mode webhook endpoint registered + signing secret in env
- Stripe Customer Portal configured per 5.4.1 (Test mode)
- Resend email template `subscription-payment-failed.html` deployed
- `usePlanGate` ships as stub (allowed=true for all features) — no enforcement
- `<StripeReturnLanding>` works against test-mode Checkout
- `bun run test:unit` 100% green for new files + ≥85% coverage on Cluster 04 code
- E2E tests in 9.3 run green against staging
- Founder manual smoke pass per 9.4 completed against staging
- Privacy policy + RoPA Stripe + Shopify sub-processor mentions verified

### Phase B — pre-launch activation

- Stripe Live Mode webhook endpoint registered + signing secret rotated
- Stripe Customer Portal configured per 5.4.1 (Live mode)
- Stripe Price IDs created (`price_*` IDs filled into `STRIPE_PRICE_ID_SOLO` / `STRIPE_PRICE_ID_AGENCY`)
- `stripe-reconcile-cron` schedule active in production `vercel.json`
- PRD 01's `delete-account-cron` flips its `stripe` step from "stripe-not-configured" graceful degrade to actually calling Stripe
- Sentry alert rule wired for webhook outcome='error' rate >1% in 5 min, and reconcile-cron errors
- ZDR / sub-processor list re-verified in privacy policy
- Plan-gate activation deferred to a separate founder decision (Q14): when pricing locks, edit `@/constants/billing-plans.ts` to set `gating: true` + define caps per plan

### Feature flags (per `00d` 2.B 10 — hard-coded constants for MVP)

| Flag | Default | Toggle condition |
|---|---|---|
| `STRIPE_CHECKOUT_ENABLED` | `false` until prices locked | Flip after Stripe Live mode + prices set in Stripe Dashboard |
| `STRIPE_RECONCILE_CRON_ENABLED` | `false` in dev, `true` in prod | Activated via `vercel.json` schedule presence |
| `PLAN_GATE_ENFORCED` | `false` (stub allows everything) | Flip when pricing locks; founder edits constants |
| `MAX_AVATAR_SIZE_BYTES` | `5 * 1024 * 1024` (5 MB) | Founder decision 2026-05-17 — matches Figma/GitHub. Adjust if abuse signals. Server resizes to 256×256 PNG regardless. |
| `AVATAR_ALLOWED_MIME` | `['image/png', 'image/jpeg'] as const` | SVG explicitly excluded (XSS) — founder decision 2026-05-17 |
| `AVATAR_OUTPUT_SIZE_PX` | `256` | Final stored dimension; `sharp` resizes via fit:'cover' |
| `AVATAR_OUTPUT_FORMAT` | `'png'` | Server normalization target — fixed extension `avatar.png` (no orphans) |
| `AVATAR_BUCKET_PATH_PREFIX` | `users/{user_id}/avatar` | Hardcoded; matches existing M9 pattern |

---

## 11. Cross-cuts to other PRDs

| Other PRD | What we depend on (from them) | What they depend on us for |
|---|---|---|
| **11 — Shared UI Infrastructure** | `useToast`, `<KovaModal>`, `useConfirm`, skeletons, `<EmailShell>`, `idempotency_keys` table + helper, `audit_log` table, Sentry SDK, Resend SDK wrapper, error pages (`/404`, `/500`), `<EmptyState>` | Brand-picker dropdown pattern (Cluster 11 may absorb if reused across 3+ clusters); we ship the first user. |
| **01 — Auth & Identity** | `<DangerZoneCard>` component; `useAccountDeletion`; `useEmailChange`; `users.deleted_at` + `users.preferences` columns; auth middleware (deleted-account intercept, viewport guard); `/account-pending-deletion` route; auth-shell components (`<AuthMedal>`, `<AuthIcon>` reused by B10.1/B10.2) | Stripe SDK + 5 env vars (`STRIPE_SECRET_KEY`, etc.); `users.stripe_customer_id` column. PRD 01's GDPR cron `stripe` step calls our Stripe SDK; Phase B activation gates on our Wave 3 deploy. |
| **03 — Brand Management** | `useBrandsStore.brands[]`; `Brand` type; archive/restore actions (used by `<BrandPicker>` muted-row rendering) | We don't ship anything for them. |
| **05 — Brand Kit & Drag-Drop** | Sub-tab content components (Visuals, Fonts, Tone snippets, Saved blocks, Writing rules, Memories, KB) for `/account/brand-kit?tab=:tab` | Brand Kit section shell + `<BrandPicker>` + sub-tab nav rail + tab routing. They mount inside us. |
| **12 — Settings & User Preferences** | `usePreferencesStore` (consumes `users.preferences` JSONB from PRD 01); reactive getters for textSize, reduceMotion, highContrast, notifications, timezone, lastActiveBrandId | We write to `users.preferences` via their store API; they have to ship before our Profile section can be feature-complete. Wave 3 has both — co-shipped. |
| **02 — Onboarding & Dashboard** | Topbar avatar dropdown routes to `/account` | None at runtime |
| **06 — Canvas Editor Core Chrome** | Canvas-side topbar avatar dropdown routes to `/account` | None at runtime |
| **09 — Version History** | `<UsageBar>` "Storage" reads snapshot bucket size (their Storage bucket; we read via `supabase.storage.from('canvas-snapshots').list()` size-aggregated) | None at runtime |
| **10 — AI Chat + Memory** | `<UsageBar>` "AI generations" reads counter incremented by M5 atomic-counter RPC | None at runtime |
| **M9 (existing)** | `useShopifyConnection` composable; OAuth start/callback/disconnect endpoints; `normalizeShopDomain` util; M9 compliance webhook handlers (these write to `shopify_connection_history` via our new RPC) | NEW `shopify_connection_history` table; refactored route IA; brand-picker pattern. M9 keeps its existing API; we extend with one method. |

### 11.1 Hygiene rules from `00e §6`

Acknowledged + enforced:

- **No live multi-device canvas sync promises** (§6 #2): N/A in this PRD.
- **D-5E staging trigger** (§6 #3): Phase B activation gates on staging Supabase being a stable mirror of production. Sharpened in §10.
- **D-3 RoPA disclosure** (§6 #4): Stripe sub-processor named in privacy policy; data categories enumerated.
- **D-3 brand-voice guardrail** (§6 #5): N/A in this PRD (owned by Cluster 05).
- **`access_token`-in-URL launch-blocker** (00e §6 footnote): N/A in this PRD (Cluster 02 owns onboarding OAuth flow). We use Stripe's secure session-URL pattern (signed short-lived URLs) — verified §5.1.2.

---

## 12. Risks + open questions

### 12.1 RISK (Medium) — Webhook delivery race vs B10.1 plan-name render

User completes Stripe Checkout → browser redirects to `/account/billing/success` BEFORE Stripe's webhook fires `checkout.session.completed` + `customer.subscription.created`. Component renders plan name from `users.plan` which is still 'free'.

**Mitigation:** `<StripeReturnLanding>` (§6.4.4) polls `useBillingStore` every 1s for up to 10s after mount, watching for `plan !== 'free'`. If still 'free' after 10s, falls back to a generic "subscription confirmed" copy with no plan-name interpolation. Webhook latency is typically <2s per Stripe docs. Founder smoke pass (9.4) explicitly tests this race.

### 12.2 RISK (Medium) — Stripe Live Mode price-id mismatch

Q14 explicitly defers pricing tiers. At Phase B activation, founder must create prices in Stripe Dashboard, fill env vars `STRIPE_PRICE_ID_SOLO` / `STRIPE_PRICE_ID_AGENCY`, AND update the price-id ↔ plan-name map in `@/constants/billing-plans.ts`. If env vars don't match map, Checkout 422s.

**Mitigation:** Operator runbook (§5.5) enumerates the exact order. CI gate: on every deploy to production, a startup health check calls `stripe.prices.retrieve(STRIPE_PRICE_ID_SOLO)` and `.AGENCY` — if either 404s, deployment fails. (Deferred from this PRD; spec'd here, implemented in Phase B.)

### 12.3 RESOLVED 2026-05-17 — `trialing` plan_status added to CHECK

**Founder decision:** Option B — add `'trialing'` to plan_status CHECK NOW. DB CHECK is `('active','past_due','cancelled','incomplete','trialing')`. Webhook handler stores `sub.status` as-is (no mapping). UI scaffold (status pill "Trial" variant + "Trial — X days left" banner) ships hidden at MVP, conditional render on `plan_status === 'trialing'`. Activation deferred until founder turns on Stripe trial settings in Dashboard. Reasoning: founder picked future-proof + overbuild posture; ALTER CHECK was trivial cost today vs. future-rework risk.

### 12.4 RESOLVED 2026-05-17 — Plan-name placeholder + Free-tier feature bullets

**Founder decision:** Ship the templating as specced. Plan-card Free-tier bullets land in `@/constants/billing-plans.ts` with 4 lines:
- "1 brand kit"
- "Unlimited canvases"
- "AI design assistant"
- "Image export (PNG slices)"

Solo / Agency bullets land Phase B when pricing locks. Founder activates prices → users start having `plan='solo'|'agency'` → copy reads "You're on **Solo**" / "You're on **Agency**" — works without code change.

### 12.5 RISK (Low) — Stripe Customer Portal "new tab" UX vs in-page expectation

Users may expect Manage billing to open inline (Figma + Linear + Notion all use in-page settings). Stripe blocks iframe embed (verified via Stripe docs WebFetch 2026-05-15 — recommended pattern is redirect). Hi-fi A7.2 annotation confirms new tab.

**Mitigation:** Button label "Manage billing" suggests an external action. On click, transient toast ("Opening Stripe portal in a new tab…") clarifies. Customer Portal session URL is one-time-use per Stripe docs, so new tab is functionally cleaner than embed anyway (no risk of stale-tab issues).

### 12.6 RESOLVED 2026-05-17 — Past-due banner copy locked

**Founder decision:** Option A. Banner copy:
> "Your last payment didn't go through. Update your card before {{ deadline }} to keep your subscription."

Deadline = `current_period_end + 7 days`. Single CTA "Update payment method" → Stripe Portal new tab.

### 12.7 RISK (Low) — Realtime subscription count

`<SyncHistoryAccordion>` adds a Realtime subscription on `shopify_connection_history` for the active brand. Per scope plan 2.C.11 / `00d` 2.C.11, target is ~4–6 concurrent channels per session. Cluster 04 adds one more (brand-scoped, only when /account/integrations is open). Within budget.

**Mitigation:** Subscription unsubscribed on route leave (Vue `onBeforeRouteLeave` lifecycle).

### 12.8 RESOLVED — Webhook event for non-subscription Stripe accounts

If a user creates a Stripe Customer via `customers.create` but never completes Checkout (e.g., starts upgrade then abandons), `users.stripe_customer_id` is set but `users.stripe_subscription_id` stays NULL. Cluster 01's `delete-account-cron` 'stripe' step needs to delete the Customer even without a subscription.

**Resolution:** PRD 01's step `stripe` handler calls `stripe.subscriptions.cancel` (no-op if NULL — already-canceled treated as success) then `stripe.customers.del` (no-op if already-deleted). Both API calls handle the missing-subscription edge cleanly. **D-2 amendment 2026-05-17** confirms Cluster 01 cron deletes the Stripe Customer on account-deletion (vs. originally "kept forever"). Invoice history persists in Stripe 7 yrs per their docs.

### 12.9 RISK (Low) — Concurrent avatar upload race

Two devices uploading avatar simultaneously: both write to `users/{user_id}/avatar.png`. Storage last-write-wins. Both confirm endpoints UPDATE `users.avatar_storage_path` — UI on each device sees last-saved on next refresh.

**Mitigation:** Accept last-write-wins. Storage default is overwrite-on-upload. UI debouncing prevents in-rapid-succession multi-upload from a single device. Cross-device is rare; if it surfaces, add an `If-Match` header on confirm pointing to a hash.

### 12.10 RISK (Low) — Stripe API outage during cron

`stripe-reconcile-cron` calls Stripe.subscriptions.retrieve which may 5xx during Stripe outages.

**Mitigation:** Cron handler wraps in try/catch per user; failed retrieves log to Sentry and skip; next week's run picks them up. No retry loop in the cron itself (Stripe outages are infrequent + short).

### 12.11 RISK (Low) — `invoice.payment_failed` Resend email lag

Stripe fires `invoice.payment_failed` → our webhook → Resend send. If Resend is down, email fails. Stripe's own dunning sends its own email (configurable in Dashboard).

**Mitigation:** Configure Stripe's built-in dunning email AS WELL ("payment failed" Stripe Customer email — enabled in Stripe Dashboard → Settings → Customer emails). Our Resend email is supplementary, branded as Kova; Stripe's is the authoritative trail. If Resend fails, Stripe still sent its own. Webhook handler logs Resend failure to Sentry but does NOT 500 (we already returned 200 to Stripe).

### 12.12 RESOLVED 2026-05-17 — Brand picker zero/single/multi behavior locked

**Founder decision:**
- **Zero brands** (edge case — Cluster 02 normally blocks this path): Brand Kit + Integrations render Cluster 11 `<EmptyState>` with copy "No brands yet. Create one from your dashboard first." + CTA "Go to dashboard" → `/dashboard`.
- **One brand** (most freelancers at MVP): `<BrandPicker>` renders as **static label** (brand name, no dropdown chevron) — Figma pattern.
- **2+ brands**: full dropdown with chevron.
- **Default selection** when route lands: precedence is `?brand=:brandId` URL param > `users.preferences.lastActiveBrandId` (Q5 Layer 2) > first brand alphabetically.

---

## 13. References

### 13.1 03-doc rows covered

- §2.14 Account / billing (Account settings page row) — full
- §3C #5 — Account page + Stripe wiring — full
- §3C #5b — GDPR delete-account cascade orchestrator — partial cross-cut (Cluster 01 owns; we ship Stripe SDK its cron uses)

### 13.2 Q-decisions baked in

- **Q12** — `/account` full-page route with **6 sidebar sections** as of B12 reversal 2026-05-17 (better than Figma's modal; matches Linear/Notion). This PRD ships the route + sidebar chrome + 4 sections (Profile, Plan & billing, Brand Kit shell, Integrations); 5th (Danger zone) mounts Cluster 01 component; 6th (**Brands**) mounts PRD 03's `<BrandsArchiveView>` component (PRD 03 owns content, PRD 04 owns the route + sidebar entry).
- **Q13** — user-level scope for Profile + Plan & billing + Danger zone; per-brand for Brand Kit + Integrations (brand-picker dropdown). One Stripe Customer per user (D-2 amended 2026-05-17 — Customer deleted on account-deletion via Cluster 01 GDPR cron; was "kept forever").
- **Q14** — Stripe foundation now (Checkout + Customer Portal + webhooks). Launch strategy + pricing intentionally out of scope. Plan structure deferred.
- **Q15** — partial cross-cut. Cluster 01 owns the GDPR cascade; we provide the Stripe SDK + env vars + Customer-deletion logic via PRD 01 §5.1.4.1.
- **§5.6 item 1** — M9 light→dark refactor (`IntegrationsCard`, `SettingsBrandIntegrationsView`). Implemented in §6.4.5.
- **§5.6 item 4** — M9 Integrations IA aligned to Q12/Q13 (route from `/dashboard/:brandId/settings/integrations` → `/account/integrations` with brand picker).
- **§5.6 item 8** — `shopify_connection_history` table built; accordion wired.

### 13.2.1 Founder decisions 2026-05-17 (20 PRD-04 amendments)

| # | Topic | Decision |
|---|---|---|
| 1 | SVG avatar | DROP. PNG/JPG only. XSS surface eliminated. |
| 2 | Trialing status | ADD to plan_status CHECK. Stored as-is (no mapping). |
| 3 | Compare plans button | Visible + toast "Pricing coming soon." |
| 4 | Free plan bullets | 4 lines in `@/constants/billing-plans.ts`: "1 brand kit", "Unlimited canvases", "AI design assistant", "Image export (PNG slices)". |
| 5 | Past-due copy | "Your last payment didn't go through. Update your card before {{ deadline }} to keep your subscription." |
| 6 | Resend Kova-branded emails at MVP | ALL 4 events (payment-failed + new-sub + upgraded + cancelled). See §5.4.3 for copy. |
| 7 | Avatar fallback | Initials on per-user-stable hashed color tile. |
| 8 | Stripe Portal Cancellation | `at_period_end` mode. |
| 9 | Email copy authoring | All 4 Resend subject + body templates drafted in §5.4.3. |
| 10 | Compare plans toast copy | "Pricing coming soon." |
| 11 | Webhook bad-signature response | HTTP 400 Bad Request explicitly. |
| 12 | Brand picker default | `?brand=:brandId` URL param > `users.preferences.lastActiveBrandId` > first brand alphabetically. |
| 13 | Past-due CTA | Single "Update payment method" button → Stripe Portal new tab. |
| 14 | Webhook handler internal errors | Return 500 → Stripe retries (idempotent). |
| 15 | **D-2 AMENDMENT** | Stripe Customer DELETED on account-deletion via Cluster 01 GDPR cron (was "kept forever"). |
| 16 | Avatar storage path | Normalize to PNG (`sharp` dep), fixed path `users/{user_id}/avatar.png`. |
| 17 | Single-brand UX | Static label when 1 brand; full dropdown when 2+. (Figma pattern) |
| 18 | Trial UI scaffold | Status pill "Trial" variant + "Trial — X days left" banner ship hidden, conditional render. |
| 19 | D-2 reversal confirmation | LOCKED. Memory updated. |
| 20 | Avatar max upload size | 5 MB (was 2 MB). Server resizes to 256×256 PNG regardless. |

### 13.2.2 B12 archive reversal 2026-05-17 — `/account/brands` added

Separate decision dispatched same day. B12 archived Brands page promoted from Phase 2 → MVP. **PRD 03 owns the page content** (active+archived inventory grid + B12.3 Restore + B12.4 Delete-archived modals); **PRD 04 owns** the route registration + auth meta + sidebar nav entry. Deltas applied to PRD 04:

- **§3.1 chrome** — sidebar 5 → 6 sections; Brands inserted between Profile and Plan & billing (icon: `layers`). Verified against `Kova Hi-Fi B12 Brands page - Dark.html` lines 554–560.
- **§3.2 sidebar item list** — row updated to 6 items including Brands.
- **§6.1 routes** — `:section` enum expanded: `(profile|brands|billing|brand-kit|integrations|danger)`. Auth meta inherits from parent account route. Cross-cluster ownership note added.
- **§6.4.1 SectionResolver** — maps `'brands'` → PRD 03's `<BrandsArchiveView>` via dynamic import.
- **§8.x acceptance** — sidebar test now asserts 6 items (Profile, Brands, Plan & billing, Brand Kit, Integrations, Danger zone).
- Source: `kova-open-pencil-1/docs/kova-final-prds/00f-B12_REVERSAL_DISPATCH.md` (Prompt B).

### 13.3 Hi-fi files

- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html` — 12 scenes covering all 5 sidebar sections (Profile, Plan & billing, Brand Kit + 7 sub-tabs, Integrations, Danger zone)
- `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B10 Stripe Returns - Dark.html` — 2 scenes (B10.1 success, B10.2 cancel) + plan-name annotation
- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html` — A9.1 delete-account modal + A9.3 deletion-pending landing (both owned by Cluster 01; we mount A9.1 via `<DangerZoneCard>`)
- `main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B5 Email Change Landing - Light.html` — cross-cut; B5.1 primary CTA target is `/account/profile` (Cluster 01 ships landing; we provide the destination route)
- `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B12 Brands page - Dark.html` — cross-cut; B12.1–B12.4 covers the Brands archive page. Content owned by **PRD 03**; PRD 04 uses lines 554–560 to verify sidebar order (Profile / Brands / Plan & billing / Brand Kit / Integrations / Danger zone). B12 reversal 2026-05-17 promoted MVP. Dispatch: `docs/kova-final-prds/00f-B12_REVERSAL_DISPATCH.md` Prompt B.

### 13.4 Design system

- `main-main-kova-scope/design-system/design.md` — spec text, token vocabulary, component contracts
- `main-main-kova-scope/design-system/kova-hifi.css` — canonical dark CSS (every Account-page primitive class definition)
- `main-main-kova-scope/design-system/kova-hifi-light.css` — N/A in this PRD (no light surfaces)
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` — token vocabulary cheat-sheet

### 13.5 Audit + verification inputs

- `kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` — master plan; §3 Cluster 04 + §5 template + §5.5 M9 + §5.6 ratifications + §6 cross-cuts
- `kova-open-pencil-1/docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md` — operator manual followed for this draft
- `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md` — §2.A Cluster 04 (lines 1272–1403) lifted as starting structure; §1.E.1 M9 Shopify audit
- `kova-open-pencil-1/docs/kova-final-prds/00d-EXTERNAL_VERIFICATION_HANDOFF.md` — D-1 (M9 light theme), D-2 (one-Customer-per-user), D-4 (Integrations IA), D-8 (`shopify_connection_history` table), D-5 (Stripe HMAC + idempotency), 2.B.7 webhook patterns
- `kova-open-pencil-1/docs/kova-final-prds/00e-EXTERNAL_VERIFICATION_VERDICT.md` — §6 PRD hygiene rules; §4 Stripe Customer-model verification; §4 Stripe webhook events verification (notes that Q14 list omitted `checkout.session.completed` — fixed in this PRD)
- `kova-open-pencil-1/docs/kova-final-prds/01-auth-and-identity.md` — APPROVED 2026-05-15. This PRD imports `<DangerZoneCard>`, `useAccountDeletion`, `useEmailChange`; ships the Stripe SDK its GDPR cron uses.

### 13.6 M9 source code referenced

- `kova-open-pencil-1/src/components/dashboard/IntegrationsCard.vue` (24 light Tailwind utilities — refactor target)
- `kova-open-pencil-1/src/views/dashboard/SettingsBrandIntegrationsView.vue` (~61 light Tailwind utilities — refactor target)
- `kova-open-pencil-1/src/composables/use-shopify-connection.ts` (composable extended with `fetchConnectionHistory`)
- `kova-open-pencil-1/src/lib/shop-domain.ts` (`normalizeShopDomain` — reused as-is)
- `kova-open-pencil-1/api/shopify/oauth/start.ts`, `callback.ts`, `disconnect.ts` (reused; disconnect handler extended to call `log_shopify_connection_event` RPC)
- `kova-open-pencil-1/api/shopify/compliance/customers-redact.ts`, `shop-redact.ts`, `shop-uninstalled.ts` (existing; extended to call history-log RPC where appropriate)

### 13.7 External sources cited

- [Stripe — Customer Portal integration](https://docs.stripe.com/customer-management/integrate-customer-portal) — "create another portal session and redirect the customer to the `url` of the session" (verified 2026-05-15 via WebFetch — confirms new-tab pattern; iframe not supported)
- [Stripe — Webhooks](https://docs.stripe.com/webhooks) — signature verification via `stripe.webhooks.constructEvent(payload, sig, secret)`; HMAC-SHA256; `Stripe-Signature` header; idempotency via stored event.id; "return quickly a 2xx status code before any complex logic" (verified 2026-05-15)
- [Stripe — Subscriptions webhook events](https://docs.stripe.com/billing/subscriptions/webhooks) — `customer.subscription.{created,updated,deleted}`, `invoice.{paid,payment_failed}` semantics (verified 2026-05-15)
- [Stripe — Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions) — `checkout.session.completed` listed in recommended minimum events (verified via 00e §4 cross-check)
- [Stripe — Customer object](https://docs.stripe.com/api/customers) — no "brands" / sub-account concept; one Customer cleanly holds many subscriptions (verified via 00e §4)
- [Stripe — Cancel a subscription](https://docs.stripe.com/api/subscriptions/cancel) + [Delete a customer](https://docs.stripe.com/api/customers/delete) — used by PRD 01's GDPR cascade `stripe` step
- [Stripe — Customer Portal sessions](https://docs.stripe.com/api/customer_portal/sessions) — short-lived single-use URL; redirect pattern
- [Vercel Cron](https://vercel.com/docs/cron-jobs) — `stripe-reconcile-cron` config
- [Supabase Storage — Signed upload URLs](https://supabase.com/docs/reference/javascript/storage-from-createsignedupload​url) — avatar upload pattern
- [GDPR Art. 17](https://gdpr-info.eu/art-17-gdpr/) — referenced by Cluster 01 cascade; this PRD's privacy policy disclosures align

### 13.8 Memory pointers consulted

- `feedback_app_dark_website_light` — Account page is dark (inside authed app)
- `feedback_figma_ui_theme` — Figma reference for component visuals; Q12 intentionally diverges from Figma's modal to a full-page route
- `feedback_browser_smoke_test_before_done` — §9.4 manual QA gate
- `feedback_verify_with_docs` — Stripe docs verified via WebFetch 2026-05-15 (Customer Portal, Webhooks)
- `feedback_explain_for_nontechnical_founder` — §1.1 plain language + §1.2 caveman both included
- `project_kova_avatar` — user-level scope rationale (freelance marketer one Stripe Customer)
- `project_design_system_master` — canonical paths cited in §13.4
- `project_m9_shopify_tools_schema_bug` — M9 partial-build state; this PRD reuses + refactors per §6.4.5
- `project_pre_prd_audit_ratified` — Wave 3 cleared; local Supabase + CI ephemeral

### 13.9 What is NOT in this PRD (handed elsewhere)

**Cmd+K dropped 2026-05-17** per `00g-CMDK_KILL_DISPATCH.md` — see PRD 02 §12.13 for full scrub log.

- `<DangerZoneCard>` modal + cascade + restore page + middleware — Cluster 01
- Brand Kit sub-tab content (Visuals, Fonts, Tone snippets, Saved blocks, Writing rules, Memories, Knowledge base) — Cluster 05
- Brand-creation flow + brand-archive + brand-delete — Cluster 03
- Toast / modal / skeleton / `<EmailShell>` / Sentry SDK / `idempotency_keys` table — Cluster 11 (Cmd+K palette removed entirely per 00g kill 2026-05-17; W0-7 scrub 2026-05-19)
- `usePreferencesStore` (consumes `users.preferences` JSONB column) — Cluster 12
- Onboarding wizard + dashboard chrome (avatar dropdown chrome) — Cluster 02
- Canvas-side topbar avatar dropdown chrome — Cluster 06
- Mobile-responsive `/account` (desktop-only at MVP) — Phase 2
- Tauri deep-link surface for Stripe — Phase 2
- Plan-comparison page + pricing — Phase 2 / separate founder decision
