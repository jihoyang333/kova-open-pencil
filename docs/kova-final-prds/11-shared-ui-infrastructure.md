# PRD 11 — Shared UI Infrastructure

## 0. Status & ownership

| Field | Value |
|---|---|
| **Status** | `IN-REVIEW 2026-05-17` |
| **Wave** | 1 (foundation — ships in parallel with Cluster 01) |
| **Author** | Claude (Opus 4.7) |
| **Reviewer** | Jiho Yang (founder) |
| **Last updated** | 2026-05-17 |
| **Depends on PRDs** | None — foundational. |
| **Blocks PRDs** | ALL — every other cluster (01, 02, 03, 04, 05, 06, 07a, 07b, 08, 09, 10, 12) consumes ≥3 primitives from this PRD. |
| **Source artifacts** | Hi-fi: 6 files (B1, B2, A6+A2a+A8, B7, B9, A11+A12+A13). 03 doc: §3C #7, #8, #15. Q-decisions: none direct (these are primitives consumed by every cluster). Audit §2.A Cluster 11 (lines 2008–2057) + §1.D cross-cuts (Vue Router theme, Realtime channels, idempotency-key, Toast variants, Tauri command-surface naming). |
| **Changelog** | 2026-05-17 — Cmd+K palette dropped (00g); offline UX switched to Figma-style icon+tooltip; KD-1/2/4/5/6 ratified (KD-3/8 deleted with Cmd+K); Sentry/Resend/Vercel cron stubbed with env-var guards (real accounts wired before first prod deploy per 00 §11). |

---

## 1. Problem & outcome

### 1.1 Plain language (for founder)

Every other PRD in the 12-cluster MVP needs the same handful of small UI building blocks: toast notifications, modal dialogs, confirm-before-destroy prompts, loading skeletons, empty-state panels, the offline indicator, 404 / 500 error pages, the shared HTML email template, and a few backend conventions (idempotency keys on write endpoints, named Supabase Realtime channels, route-driven theme switching). If each cluster invents its own answer, twelve different toast components ship and the app looks like twelve apps stitched together. This PRD ships one canonical version of each primitive — typed, accessible, theme-aware, and ready to import. Downstream PRDs consume by name; they do not re-spec. Cluster 11 is the load-bearing floor under everything.

### 1.2 Caveman summary (per CLAUDE.md communication style)

Every cluster need same small UI pieces. Toast. Modal. Confirm. Skeleton. Empty state. Offline pill. Error pages. Email shell. Plus four cross-cut rules: idempotency key on writes, named Realtime channels, route picks theme, Tauri commands all start `kova.*`. Build once here. Other clusters import. No copy-paste. No drift.

### 1.3 Outcome (acceptance gate)

A Wave 2 PRD author opens any cluster spec and finds **every** UI primitive they need already typed, named, and Storybook-able: `useToast()`, `useConfirm()`, `<KovaModal>`, `<KovaPopover>`, `<KovaMenu>`, `<KovaSkeleton>`, `<EmptyState>`, `<NetworkStatusIndicator>`, `<KovaButton>`, `<KovaInput>`, `<KovaField>`, `<KovaSegmented>`, `<KovaPill>`, `<KovaTooltip>`, `<KovaToast>`, `<ToastStack>`, `<MarketingShell>`, `<EmailShell>`. Vue Router auto-swaps the stylesheet based on `route.meta.theme`. Sentry catches every uncaught error to a single project. The `idempotency_keys` table backs every write Edge Function in 4 other PRDs. The Realtime channel-naming convention (`kova.{userId}.{domain}.{topic}`) is named, documented, and registered as the only allowed pattern.

---

## 2. Scope

### 2.1 In scope (this PRD)

**Composables (9):**
- `useToast()` — global toast queue (8 variants per B1)
- `useConfirm()` — Promise-returning confirm modal (module-level `pendingConfirm` ref)
- `useOnlineStatus()` — `navigator.onLine` + Supabase Realtime ping fallback
- `useTheme()` — read `route.meta.theme` + swap stylesheet at runtime
- `useIdempotencyKey()` — `crypto.randomUUID()` + per-action key generator
- `useChannelName(domain, topic)` — builds `kova.{userId}.{domain}.{topic}` Realtime channel name
- `useSentry()` — captureException wrapper with Kova context tagging
- `useEmailShell()` — template-string composition helper for Resend payloads
- `useReducedMotion()` — `prefers-reduced-motion` media query reactive ref (drives skeleton shimmer + transition opt-out)

**Pinia stores (2):**
- `useToastStore` — toast queue state (visible / queued)
- `useConfirmStore` — pending confirm state (module-level pattern under the hood)

**Components (18):**
- `<KovaToast>` + `<ToastStack>` — 8 variants per B1
- `<KovaModal>` — wraps Reka Dialog, sm/md/lg sizes per A8
- `<KovaPopover>` — wraps Reka Popover (consumed by avatar dropdown, brand switcher, color picker — built downstream)
- `<KovaMenu>` — wraps Reka DropdownMenu (foundation for §3C #7 right-click shell consumed by Cluster 08)
- `<KovaTooltip>` — wraps Reka Tooltip
- `<KovaButton>` — primary / secondary / ghost / danger / text / icon variants; sm / md sizes
- `<KovaInput>` — text / email / search variants; idle / focus / error / locked / typed-confirm states
- `<KovaField>` — `<label>` + `<KovaInput>` + helper text + error text composition
- `<KovaSegmented>` — segmented control (used by Q5 accessibility prefs textSize + others)
- `<KovaPill>` — neutral / accent / outline / dot variants
- `<KovaSkeleton>` — 4 radius variants (pill / card / line / circle); driven by `prefers-reduced-motion`
- `<EmptyState>` — 3 size variants (32 inline / 40 panel / 48 full-page); query-echo support
- `<NetworkStatusIndicator>` — A13-derived single topbar icon + tooltip (offline only); see §3.7
- `<MarketingShell>` — light-theme shell used by `/privacy`, `/terms` (Cluster 01 consumes)
- `<EmailShell>` — shared transactional HTML email template (Inter, Kova branding, List-Unsubscribe header)
- `<Error404View>` — `/404` route (B2.1)
- `<Error500View>` — `/500` route (B2.2)
- `<NetworkUnreachableView>` — global boundary (B2.3)

**Backend cross-cuts:**
- `idempotency_keys` table + RLS policy + cleanup cron
- `verifyIdempotency()` helper for Edge Functions (`api/_shared/idempotency.ts`)
- `audit_log` table + service-role-only RLS + `writeAudit()` helper (`api/_shared/audit.ts`) — consumed by Cluster 01 (deletion-request / restore / email-change), Cluster 03 (brand CRUD), Cluster 04 (Stripe webhook), Cluster 05 (voice-draft confirm)
- `kova.{userId}.{domain}.{topic}` Realtime channel-naming convention (docs + helper)
- Vue Router `meta.theme` runtime stylesheet swap (Cluster 11 owns the mechanism; downstream PRDs set `meta.theme` per route)
- Sentry SDK install (`@sentry/vue` browser, `@sentry/node` server) + DSN wiring
- Resend SDK wrapper (`api/_shared/email.ts`) + `<EmailShell>` template
- **Stub policy:** Sentry, Resend, and Vercel cron integrations ship as no-op stubs guarded by their env vars. Each helper checks for the env var at call time; if missing, logs a warning and returns a no-op result. Real accounts are wired before first production deploy per `00-PRD_SCOPE_PLAN.md §11 Pre-launch checklist`. Env vars: `VITE_SENTRY_DSN_BROWSER`, `SENTRY_DSN_SERVER`, `RESEND_API_KEY`, `CRON_SECRET`.

**Routes:**
- `/404`, `/500`, `/network-unreachable` (the boundary; rendered when fetch failure boundary triggers)

### 2.2 Out of scope (handed to other clusters)

| Item | Owning PRD |
|---|---|
| Right-click context menu catalog (which items appear in which surface's right-click) | 08 — Menus & Shortcuts (the shell `<KovaMenu>` ships here; the dispatch table per surface ships in 08) |
| Specific surface skeletons (dashboard greeting, memory list, KB sources split) | Each consuming cluster (02 ships dashboard skeleton composition; 05 ships KB skeleton composition) — `<KovaSkeleton>` primitives ship here |
| Specific empty states (no canvases yet, no memories yet, no saved blocks) | Each consuming cluster — `<EmptyState>` component + 3 size variants ship here |
| Auth-specific surfaces (sign-in / OTP / sessions-expired chrome) | 01 — Auth (`<AuthShell>`, `<AuthCard>`, etc. ship in 01 because they are auth-scoped, not generic UI primitives) |
| Marketing site itself | Out of MVP — separate Astro project (per `00e §8 D-5C` reversal). `<MarketingShell>` here exists ONLY to render `/privacy` + `/terms` from inside the SPA. |
| Toast wiring per-mutation (e.g., "Canvas saved", "Memory added") | Each consuming cluster — `useToast()` API + variants ship here |
| Mobile fallback page (`/desktop-only`) | 01 — Auth (light surface, auth-adjacent — ships in 01 per the existing PRD's §3) |

### 2.3 Deferred to Phase 2

- Service Worker offline page (currently 03 doc §3C ranks SW caching as Phase 2 — `00d §3.C 2.B.9`)
- Status palette (`.toast.success` green / `.toast.error` red) — degraded to neutral per `design.md §5 ban 12`; status conveyed by glyph + copy at MVP, color in Phase 2
- "What's new" feed (per Q16 avatar dropdown) — Phase 2 registry plug-in
- Help docs hosting (Mintlify / GitBook) — `00 §3 Cluster 11 +0` actually owned by Phase 2 (per 03 doc §3C #12)
- Localization / i18n — all primitives ship English-only at MVP
- Long-form Customer Support widget (Intercom / HelpScout) — per `00d §3.C 2.D.13` defer until DAU > 1000

### 2.4 Cross-cut acknowledgments (foreign owners)

- **Cluster 08** ships the right-click dispatch catalog (which menu items show on which surface). This PRD ships `<KovaMenu>` shell + the per-surface registry pattern; 08 ships the actual item lists.
- **Cluster 12** ships `usePreferencesStore` (`users.preferences` JSONB consumer). `useReducedMotion()` here reads `prefers-reduced-motion`; future "Reduce motion" preference in 12 will override the OS-detected value via a derived computed.
- **Cluster 01** ships `idempotency_keys` *usage* (the deletion-request Edge Function consumes the helper). This PRD ships the table + helper.
- **Cluster 06** ships Tauri menu (top-of-screen menu bar). The `kova.*` command-surface naming convention is documented here; 06 enforces it.
- **Cluster 10** ships chat streaming over Realtime. The `kova.{userId}.chat.{conversationId}.stream` channel-name pattern is documented here; 10 consumes.

---

## 3. Visual spec

Every primitive maps to hi-fi files. Engineers cite file + scene ID when implementing.

### 3.1 Toasts (dark only; toast UI never on light surfaces)

| Surface | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|
| Success toast | `main-main-kova-scope/batch-a-additions/dark/batch-0/Kova Hi-Fi B1 Toasts - Dark.html` | B1.1 | "Canvas saved · 2s ago"; auto-dismiss 5s; `.toast` 280–420 px wide, padding 12 px, border 1 px `--line`, radius 5 px |
| Error toast | same | B1.2 | "Export failed · error details"; **sticky** (manual dismiss only); warn glyph in `--ink-2` |
| In-progress / AI-generating | same | B1.3 | "Generating 3 variations…"; no dismiss; spinner glyph; replaced in place when done |
| Action toast (Undo) | same | B1.4 | "Memory added · Undo"; **sticky** until user clicks Undo or dismisses; secondary CTA in `--accent` |
| AI-gen toast | same | B1.5 | "AI generated 5 color combos"; sparkle glyph in `--accent-ink`; auto-dismiss 5 s |
| Stacked (2 toasts) | same | B1.6 | Bottom-right stack; gap 8 px between; max 5 visible (per §12 KD-1) |
| Long-content (wrapping) | same | B1.7 | Multi-line body wraps at 320 px; auto-dismiss 8 s (longer for longer copy) |
| Over-modal | same | B1.8 | Toast renders ABOVE modal backdrop (z-index 21 vs modal 19); never blocked |

**Container:** `<ToastStack />` mounted once in `<App>` shell, position fixed bottom-right (22 px / 22 px), z-index 20 (toasts), modal backdrop z-index 19.

**Variants taxonomy** (canonical — per `00c §1.D` cross-cut row "Toast variants taxonomy"):

| Variant | Glyph | Auto-dismiss | Sticky? | Use case |
|---|---|---|---|---|
| `success` | `check` | 5 s | no | Mutation succeeded |
| `error` | `alert-triangle` | (sticky) | **yes** | Mutation failed |
| `info` | `info` | 5 s | no | Neutral notice |
| `action` | (none — text-led) | (sticky) | **yes** | Action with Undo or other CTA |
| `progress` | `loader` (spinner) | (until status changes) | n/a | In-progress operation |
| `ai` | `sparkles` (in `--accent-ink`) | 5 s | no | AI-generated content notice (canonical CSS class `.toast.ai`; renamed from `ai-gen` 2026-05-20 per W6 REDO code-reviewer MEDIUM-8) |

### 3.2 Error pages (route-driven, full-page; dark)

| Surface | Route | Hi-fi file | Scene | Theme |
|---|---|---|---|---|
| 404 Not Found | `/404` (also Vue Router catch-all `:pathMatch(.*)*`) | `main-main-kova-scope/batch-a-additions/dark/batch-0/Kova Hi-Fi B2 Error Pages - Dark.html` | B2.1 | DARK (default; light variant when `meta.theme = 'light'`) |
| 500 Server Error | `/500` (and the global Vue error boundary catches uncaught errors and renders here) | same | B2.2 | DARK |
| Network unreachable | `/network-unreachable` OR full-app boundary when `useOnlineStatus().status === 'offline'` AND any Supabase call fails | same | B2.3 | DARK |

**Page shell** (`.err-page`): absolute inset 0, flex center, padding 32 px, gap 22 px. **Card** (`.err-card`): 420 px max, transparent, no border. **Icon tile** (`.err-icon-tile`): 48 × 48, radius 6 px, bg `--bg`, glyph in `--ink-3`.

Headline 15 px / 600 / `--ink`. Body 12.5 px / 400 / `--ink-2` (max 48 ch). CTAs: `.btn.primary` (primary) + `.btn.text` (secondary, no border, hover `--line-2` bg).

| Page | Headline | Body | Primary CTA | Secondary CTA |
|---|---|---|---|---|
| 404 | "Page not found" | "It may be archived or you don't have access." | "Go to dashboard" | "Sign out" |
| 500 | "Something broke" | "Try again in a moment." | "Try again" | "Go to dashboard" |
| Network | "Can't reach Kova" | "Check your internet connection." | "Retry connection" | (none) |

**Theme bridge:** routes carry `meta.theme = 'dark'` (default). Cluster 01 may render its own light-theme error states for the auth flow; 01 does NOT inherit these dark pages.

### 3.3 Modals (dark inside app; light variant in auth)

`<KovaModal>` wraps Reka Dialog. Sizes:

| Size | Width | Use case | Hi-fi anchor |
|---|---|---|---|
| `sm` | 460 px | Single field / confirmation | A8.1 Snapshot dialog |
| `md` | 540 px | 2–4 fields / small choice | A8.3 Accessibility prefs |
| `lg` | 880 px | Catalog / 2-column layout | A8.2 Keyboard shortcuts |

**Shell** (`.dlg`): bg `--page`, border 1 px `--line`, radius 10 px. **Anatomy:**
- `.dlg-head` — padding 18 px 22 px 12 px; `<h3>` 16 px / 600 / `--ink`; optional `.sub` 12.5 px / `--ink-3`; close `.x` 26 × 26 in top-right (hover bg `--line-2`)
- `.dlg-body` — padding 4 px 22 px 18 px; flex column gap 14 px
- `.dlg-foot` — padding 14 px 22 px; flex space-between; border-top 1 px `--line-2`; left meta + right buttons

**Backdrop:** `.modal-backdrop` rgba(0, 0, 0, 0.72), z-index 19, click-to-close (when not `destructive`).

**Stack limit** (per KD-2 in §12): max 2 modals nested (parent + child). Opening a 3rd closes the innermost first. Reka Dialog supports nested via portals; the stack ceiling is enforced in `useConfirmStore`.

### 3.4 Popovers + menus

| Component | Hi-fi anchor | Notes |
|---|---|---|
| `<KovaPopover>` | A2a brand switcher (280 px); A6 avatar (240 px) — `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` | Position auto-flips above/below anchor based on viewport; arrow 10 × 10 rotated square |
| `<KovaMenu>` | (shell only — Cluster 08 fills with right-click items per surface) | Reka DropdownMenu; min-width 240 px; padding 6 px; item hover bg `--line-2`; supports separators + section headers |
| `<KovaTooltip>` | (no dedicated hi-fi — wrapper convention) | Reka Tooltip; show delay 500 ms; 11.5 px / `--ink` on `--rail` bg, radius 5 px |

### 3.5 Skeletons (loading)

`<KovaSkeleton>` — `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B7 Loading Skeletons - Dark.html`. Animation = single shimmer gradient (the ONLY gradient in the system per `design.md`); 1.4 s ease-in-out infinite. `prefers-reduced-motion: reduce` → static `--fill-2` (no animation).

| Radius variant | CSS | Use case |
|---|---|---|
| `r-pill` | radius 999 px | Round buttons, badge placeholders |
| `r-card` | radius 6 px | Card placeholders, thumbnails |
| `r-line` | radius 3 px | Text-line placeholders |
| `r-circle` | radius 50 % | Avatar / icon placeholders |

Surface compositions (B7.1–B7.5) ship in their consuming clusters (e.g., Cluster 02 owns the dashboard greeting skeleton); this PRD ships only the primitives.

### 3.6 Empty states

`<EmptyState>` — 3 size variants (per `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B9 List Search Empty - Dark.html` B9.4 reference grid):

| Variant | Icon | Headline | Use case | Border |
|---|---|---|---|---|
| `inline-32` | 32 × 32, glyph 16 × 16, radius 5 px | 12.5 px / 500 | Filter returns zero in a list | none |
| `panel-40` | 40 × 40, glyph 17 × 17, radius 50 % | 13 px / 600 | No data exists yet (panel-bounded) | 1 px dashed `--line` |
| `full-48` | 48 × 48, surface glyph | 15 px / 600 | Full-viewport empty (e.g., empty dashboard) | none (focal) |

**Anatomy** (`.empty-pane`): flex column gap 6 / 8 / 10 px (by variant); centered; max-width 36 ch on body copy; CTA row uses `.ghost-link` (no border, bg transparent, color `--accent`, hover bg `--line-2`).

**Query-echo** (B9.1–B9.3): when headline includes a quoted user query, wrap in `<span class="q">` — font-weight 600, color `--ink`. Example: "No memories match \"shipping\"".

Per-surface empty states (A11.1–A11.8 from `Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html`) are owned by their consuming clusters — primitives ship here.

### 3.7 Network status (online / offline) — Figma-style minimal indicator

**Decision (2026-05-17):** Adopt Figma's minimal offline UX. No persistent pill in topbar. No 28 px banner across topbar. Single small icon in topbar (right side, beside avatar) with hover tooltip when offline.

| State | Surface | Visual |
|---|---|---|
| Online | Topbar icon hidden (no chrome consumed for healthy state) | n/a |
| Offline | Topbar icon `cloud-off` (14 × 14, color `--ink-2`) + hover tooltip: "You're offline. Changes saved locally and sync when you reconnect." | A13 reference adapted |

**Component:** `<NetworkStatusIndicator>`. Renders nothing while online; renders the icon + `<KovaTooltip>` wrapper while offline.

**Detection (per KD-3 in §12, formerly KD-4):** `useOnlineStatus()` returns `'online' | 'offline'`:
- Primary: `navigator.onLine` reactive ref
- Secondary: ping Supabase Realtime presence channel every 3 s; on 10 s no-ack → mark `offline` (covers DNS/firewall edge cases where browser thinks online but our backend is unreachable)
- Transitions: instant on `navigator.onLine` flip to offline; debounced 1 s on Realtime ping; instant on transition back to online

**Why no banner:** Image-export-only product means offline lockdown is less critical than Figma's multi-user concurrent editing. Yjs/y-indexeddb auto-persists every change locally; the user doesn't lose work. The tooltip is sufficient to explain state. Banner would consume top-of-screen real estate without benefit.

**Sidebar footer offline indicator (A13 hi-fi `.net-strip`):** RETIRED from MVP. Single topbar icon is the canonical surface.

**Figma reference:** [What can I do offline in Figma?](https://help.figma.com/hc/en-us/articles/360040328553) — confirms Figma uses an icon + tooltip pattern (no persistent banner) for offline state.

### 3.8 Marketing + email shells (LIGHT theme)

| Shell | Used by | Theme |
|---|---|---|
| `<MarketingShell>` | Cluster 01 `/privacy`, `/terms` (long-form light pages) | LIGHT (`kova-hifi-light.css`) |
| `<EmailShell>` | Cluster 01 transactional emails (5 templates: deletion-scheduled, deletion-completed, restored, email-change-to-old, email-change-to-new); Cluster 04 Stripe receipts (subscription-confirmed etc.); future cluster emails | LIGHT (email-safe HTML; inlined CSS; Inter web font with system fallback) |

**`<EmailShell>` requirements** (per `00d §3.B-i` Resend conventions):
- Inline CSS (no `<style>` blocks — many email clients strip them)
- `List-Unsubscribe` header in Resend send config
- `<title>` from prop
- Header: Kova wordmark (24 px tall PNG, retina @2x; hosted on Vercel `/public/email/`)
- Footer: "Sent to {{email}}. [Manage email preferences]({{settings_url}})" + 2026 © Kova
- Plain-text fallback rendered from Markdown intermediate (Resend supports both)
- Max width 600 px, mobile-responsive (single-column at <600 px)

### 3.9 Design system references

All primitives consume `kova-hifi.css` `:root` tokens. Components reference tokens, never hex literals. Tailwind `@theme` translation in `app.css` ships at PRD-implementation time (engineering follows `kova-hifi.css :root` → `@theme` block 1:1).

**Theme detection per route** (per `00c §1.D` cross-cut, owned here):

```typescript
// Pseudo-implementation in src/composables/use-theme.ts
const route = useRoute()
const theme = computed(() => route.meta.theme ?? 'dark')
// In src/main.ts (after router):
watch(theme, (t) => document.documentElement.dataset.theme = t, { immediate: true })
```

Routes set `meta.theme: 'light' | 'dark'`:
- `light`: auth (01 ships), `/privacy`, `/terms`, `/desktop-only` (01 ships fallback)
- `dark`: every other authenticated app surface (default fallback when `meta.theme` unset)

Stylesheets:
- `kova-hifi.css` (canonical dark) — loaded always
- `kova-hifi-light.css` (canonical light) — loaded always; scoped via `:root[data-theme="light"]` override on the same custom-property names

This means a single LinkedIn-style "what theme am I in" question always has a deterministic answer; downstream PRDs need only set `meta.theme` on each new route they ship.

---

## 4. Data model

### 4.1 Schema migrations

Single migration file: `kova-open-pencil-1/supabase/migrations/20260520_11_shared_ui_infrastructure.sql`.

```sql
-- ============================================================
-- Migration 20260520_11_shared_ui_infrastructure
-- Cluster 11 Shared UI Infrastructure — idempotency_keys + audit_log
-- Pairs with: nothing (first migration in this cluster)
-- ============================================================

BEGIN;

-- ---- idempotency_keys (cross-cut per 00c §1.D) ----

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key            text PRIMARY KEY,            -- caller-supplied UUID v4
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint       text NOT NULL,               -- e.g. 'POST /api/account/deletion-request'
  request_hash   text NOT NULL,               -- sha256(method + '|' + path + '|' + bodyText). Callers MUST deterministically serialize JSON before sending — the helper hashes raw bytes (see §5.5 / C-HIGH11).
  response_status int  NOT NULL,
  response_body   jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (length(key) >= 16 AND length(key) <= 64)
);

-- TTL index for cleanup cron (24-hour retention per KD-4 in §12)
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
  ON public.idempotency_keys(created_at);

-- Per-user lookup index (uncommon but helpful for debug)
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_endpoint
  ON public.idempotency_keys(user_id, endpoint, created_at DESC);

COMMENT ON TABLE public.idempotency_keys IS
  'Per-request idempotency cache. Cross-cut primitive owned by Cluster 11. Consumed by Cluster 01 (deletion-request, restore, email-change), Cluster 04 (Stripe webhook), Cluster 09 (snapshot create). Retention 24 hours via daily prune cron.';

COMMENT ON COLUMN public.idempotency_keys.request_hash IS
  'sha256(method + ''|'' + path + ''|'' + bodyText). The helper hashes the raw bodyText byte-for-byte — it does NOT canonicalize JSON. Clients that need deterministic replays MUST serialize JSON deterministically (stable key order, no incidental whitespace). Second call with same key but different bodyText returns 422, not the cached response. See PRD 11 §5.5 and C-HIGH11 closure.';

-- RLS: service_role only (only Edge Functions read/write)
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY idempotency_service_only
  ON public.idempotency_keys
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ---- audit_log (cross-cut — founder lock #11; W0-1 dispatch 2026-05-19) ----

CREATE TABLE IF NOT EXISTS public.audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES public.users(id) ON DELETE CASCADE,
  event_type     text NOT NULL,                 -- e.g. 'account.deletion_requested', 'brand.created', 'stripe.webhook.invoice_paid'
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  cluster_owner  text,                          -- denormalized for debugging: '01' | '03' | '04' | '05' | etc.
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Per-user event lookup (newest first)
CREATE INDEX IF NOT EXISTS idx_audit_log_user_event
  ON public.audit_log(user_id, event_type, created_at DESC);

-- Cluster-scoped sweep (debug + GDPR per-cluster review)
CREATE INDEX IF NOT EXISTS idx_audit_log_cluster_created
  ON public.audit_log(cluster_owner, created_at DESC);

COMMENT ON TABLE public.audit_log IS
  'Append-only event log. Cross-cut primitive owned by Cluster 11 (founder lock #11). Consumed via writeAudit() helper by Cluster 01 (deletion-request / restore / email-change), Cluster 03 (brand CRUD), Cluster 04 (Stripe webhook events), Cluster 05 (voice-draft confirm). Service-role only — no authenticated SELECT.';

COMMENT ON COLUMN public.audit_log.cluster_owner IS
  'Denormalized cluster identifier (the cluster whose Edge Function wrote the row). Lets ops grep audit traffic per cluster without joining to event_type allow-lists.';

-- RLS: service_role only — no authenticated reads
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_service_only
  ON public.audit_log
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
```

**Notes:**

1. **Idempotent migration:** `IF NOT EXISTS` on every DDL; safe to re-run on a staging snapshot.
2. **`request_hash` defense:** a client that reuses an idempotency key for a *different* request (different body) gets a 422, not the cached 200. Protects against logic bugs in callers.
3. **Retention 24 hours** (per KD-4 in §12) — sufficient for the realistic retry window (network failures resolve within seconds; user-driven retries within minutes; mobile/desktop sleep/wake cycles within hours). 24 hours balances replay protection against table growth.
4. **`ON DELETE CASCADE` from `user_id → users.id`** — when Cluster 01's GDPR cascade hard-deletes a user, their idempotency keys + audit_log rows go with them. No orphans.
5. **No `gdpr_deletion_queue.idempotency_key` cross-reference here:** Cluster 01's migration declares its own `idempotency_key text` column on its queue; the column FK-references `idempotency_keys(key)` is not required — the Edge Function looks up by key directly.
6. **`audit_log` is append-only:** consumers MUST use the `writeAudit()` helper (§5.5) rather than raw `INSERT`. No UPDATE / DELETE policy is granted (service_role bypasses RLS but ops should treat the table as immutable except for `ON DELETE CASCADE` from `users`). Retention is unbounded at MVP — review at first 1M-row milestone.
7. **`event_type` is a free-text discriminator** (no DB-enforced enum) so consumers can ship new events without coordinating a migration. Convention: `{cluster_domain}.{verb}` lowercase snake — e.g. `account.deletion_requested`, `brand.archived`, `stripe.webhook.invoice_paid`. The `cluster_owner` column carries the numeric cluster identifier for ops dashboards.

### 4.2 RLS policies

| Table | Policy | Purpose |
|---|---|---|
| `public.idempotency_keys` | `idempotency_service_only` — `FOR ALL TO service_role` | Only Edge Functions (service_role) can read/write. No user-facing access. |
| `public.audit_log` | `audit_log_service_only` — `FOR ALL TO service_role` | Only Edge Functions (service_role) can read/write. Authenticated clients have **no** SELECT/INSERT/UPDATE/DELETE. Per founder lock #11. |

**Verification:** the test in §9.2 asserts `authenticated` role SELECT/INSERT/UPDATE/DELETE all fail / return 0 rows.

### 4.3 Storage buckets

No new Storage buckets in this PRD. Email template assets (Kova wordmark PNG) live in Vercel `/public/email/` — served from the Vercel CDN, not Supabase Storage.

---

## 5. Backend

### 5.1 Edge Functions

#### 5.1.1 `POST /api/cron/idempotency-cleanup`

```typescript
// kova-open-pencil-1/api/cron/idempotency-cleanup.ts
// Method:      POST
// Auth:        Vercel Cron secret (Authorization: Bearer ${CRON_SECRET})
// Body:        {}
// Response 200: { deleted: n }
// Response 401: { error: 'unauthorized' }
// Schedule:    daily at 04:00 UTC (Vercel Cron — vercel.json)
//
// Algorithm:
//   DELETE FROM public.idempotency_keys
//    WHERE created_at < now() - INTERVAL '24 hours'
//   RETURNING count(*)
//
// Idempotency: naturally idempotent (delete-where).
// Lock: none needed (DELETE is atomic at row level; cron won't overlap given 24-hr interval).
```

### 5.2 RPCs (database functions)

None. The idempotency check happens in Edge Function code (TypeScript), not in a DB function — it needs to read+write a row atomically with body hashing, which is easier in app code than in PL/pgSQL.

### 5.3 Cron jobs

| Name | Schedule | Function path | Retry | Idempotency | Lock | Owner |
|---|---|---|---|---|---|---|
| `idempotency-cleanup` | `0 4 * * *` (daily 04:00 UTC) | `/api/cron/idempotency-cleanup` | Cron runs daily; missing one day is harmless (next run cleans 48 hr worth) | Naturally idempotent (delete-where) | None needed | Cluster 11 |

Vercel Cron config in `kova-open-pencil-1/vercel.json` (append to existing `crons` array — Cluster 01 already declares `delete-account-cron`):

```json
{
  "crons": [
    { "path": "/api/cron/delete-account",          "schedule": "0 3 * * *" },
    { "path": "/api/cron/idempotency-cleanup",     "schedule": "0 4 * * *" }
  ]
}
```

### 5.4 External integrations

| Integration | SDK / version | What this PRD uses | Webhooks |
|---|---|---|---|
| **Sentry** | `@sentry/vue` (browser) + `@sentry/node` (server-side Edge Functions) | Error capture; release-tagged with `VERCEL_GIT_COMMIT_SHA`; user context tagged via `setUser({ id: auth.user?.id })` after sign-in | None |
| **Resend** | `resend` npm | Edge Function helper `sendEmail({ to, subject, react: <EmailShell>… })` — wraps SDK; `List-Unsubscribe` header injected automatically | None |
| **Supabase Realtime** | `@supabase/supabase-js` (already installed) | Channel-naming helper `useChannelName(domain, topic)` builds `kova.${userId}.${domain}.${topic}` | n/a |

**Sentry config** (`kova-open-pencil-1/src/sentry.ts`):

```typescript
import * as Sentry from '@sentry/vue'
import type { App } from 'vue'
import type { Router } from 'vue-router'

export function installSentry(app: App, router: Router): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return // disabled in local dev
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_VERCEL_ENV ?? 'development',
    release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: 0.1,                // 10% of transactions
    replaysSessionSampleRate: 0,          // disabled at MVP (Phase 2)
    replaysOnErrorSampleRate: 1.0,        // capture session replay on error
    sendDefaultPii: false,                // never send PII by default
    beforeSend(event) {                   // strip likely-PII fields from breadcrumbs
      if (event.user?.email) event.user.email = undefined
      return event
    },
  })
}
```

**Note on `VITE_SENTRY_DSN` browser-side:** Sentry DSNs are public per `docs.sentry.io` — designed to be safe to ship to the browser. The DSN identifies the project, not a secret. This does NOT violate the `feedback_app_dark_website_light` "never `VITE_` server-only secrets" rule.

**Server-side Sentry** (Edge Functions) uses a separate `SENTRY_DSN_SERVER` env var so the browser and server contexts get tagged separately. Initialized in `api/_shared/sentry.ts`.

### 5.5 Shared helpers (`api/_shared/`)

| Helper | File | Purpose |
|---|---|---|
| `verifyIdempotency()` | `api/_shared/idempotency.ts` | Edge Function entrypoint helper — accepts `req`, returns `{ cached: false, persist: (status, body) => void } \| { cached: true, status, body }`. Hashes request body; stores response on first success. |
| `writeAudit()` | `api/_shared/audit.ts` | Append-only audit-log writer. Signature: `writeAudit(supabaseAdmin, { userId, eventType, payload, clusterOwner }) → Promise<void>`. Inserts one row into `public.audit_log` via service-role client. Swallows + Sentry-captures `42P01` (table-missing) so a consumer call never breaks the request path. Consumed by Cluster 01 (deletion-request / restore / email-change), Cluster 03 (brand CRUD), Cluster 04 (Stripe webhook events), Cluster 05 (voice-draft confirm). |
| `sendEmail()` | `api/_shared/email.ts` | Resend wrapper. Accepts `{ to, subject, react: <EmailShell>… , text }`. Returns Resend message ID. Injects `List-Unsubscribe`. **Stub guard:** Returns no-op (logs warn) if env var is missing. Real account wired before first prod deploy per 00 §11. |
| `captureException()` | `api/_shared/sentry.ts` | `@sentry/node` capture wrapper with Kova context tagging. **Stub guard:** Returns no-op (logs warn) if env var is missing. Real account wired before first prod deploy per 00 §11. |
| `verifyAuth()` | `api/_shared/auth.ts` *(already exists per M9; documented here for convention)* | JWT verification; returns `userId` or throws 401. |
| `channelName(userId, domain, topic)` | `api/_shared/realtime.ts` | Server-side mirror of frontend `useChannelName` for cases where Edge Functions broadcast on Realtime. |

**Stub guard for cron handler (`/api/cron/idempotency-cleanup`):** Returns no-op (logs warn) if `CRON_SECRET` env var is missing. Real `CRON_SECRET` wired before first prod deploy per 00 §11.

`verifyIdempotency` reference implementation (`api/_shared/idempotency.ts`):

```typescript
// kova-open-pencil-1/api/_shared/idempotency.ts
import { createHash } from 'node:crypto'
import { supabaseAdmin } from './supabase'

export interface IdempotencyHandle {
  cached: false
  persist: (status: number, body: unknown) => Promise<void>
}
export interface IdempotencyCached {
  cached: true
  status: number
  body: unknown
}

export async function verifyIdempotency(
  req: Request,
  userId: string,
  endpoint: string,
): Promise<IdempotencyHandle | IdempotencyCached> {
  const key = req.headers.get('X-Idempotency-Key')
  if (!key) {
    // No key → not idempotent; caller still must run logic (but no replay protection).
    return { cached: false, persist: async () => {} }
  }
  if (!/^[a-zA-Z0-9_-]{16,64}$/.test(key)) {
    throw new Response(JSON.stringify({ error: 'invalid_idempotency_key' }), { status: 400 })
  }

  const bodyText = await req.text() // consume once; caller must re-parse from a clone if needed
  const requestHash = createHash('sha256')
    .update(`${req.method}|${new URL(req.url).pathname}|${bodyText}`)
    .digest('hex')

  // Try to read existing row
  const { data: existing } = await supabaseAdmin
    .from('idempotency_keys')
    .select('request_hash, response_status, response_body')
    .eq('key', key)
    .maybeSingle()

  if (existing) {
    if (existing.request_hash !== requestHash) {
      throw new Response(
        JSON.stringify({ error: 'idempotency_key_reused_with_different_body' }),
        { status: 422 },
      )
    }
    return {
      cached: true,
      status: existing.response_status,
      body: existing.response_body,
    }
  }

  return {
    cached: false,
    persist: async (status, body) => {
      await supabaseAdmin
        .from('idempotency_keys')
        .insert({ key, user_id: userId, endpoint, request_hash: requestHash, response_status: status, response_body: body as object })
    },
  }
}
```

**Usage from a consumer (Cluster 01 `deletion-request.ts`):**

```typescript
const idem = await verifyIdempotency(req, userId, 'POST /api/account/deletion-request')
if (idem.cached) return new Response(JSON.stringify(idem.body), { status: idem.status })
// ... run logic ...
const responseBody = { success: true, scheduled_purge_at }
await idem.persist(200, responseBody)
return new Response(JSON.stringify(responseBody), { status: 200 })
```

### 5.6 Realtime channel naming convention

Per `00c §1.D` cross-cut row (this PRD owns):

**Format:** `kova.{userId}.{domain}.{topic}`

- `kova` — namespace prefix (avoids collision if Kova co-tenants with another Supabase project later)
- `{userId}` — owning user's `users.id` UUID; isolates per-user subscribers (server-side, RLS still enforces the channel ACL)
- `{domain}` — feature domain: `canvas`, `chat`, `shopify`, `billing`, `presence`
- `{topic}` — specific resource: `{canvasId}.snapshot`, `{conversationId}.stream`, `{brandId}.sync`, `events`

**Known channels** (registered here so downstream clusters can grep + reuse):

| Channel | Owner cluster | Purpose |
|---|---|---|
| `kova.{userId}.canvas.{canvasId}.snapshot` | 09 | Snapshot progress / restore notifications |
| `kova.{userId}.chat.{conversationId}.stream` | 10 | AI chat token streaming |
| `kova.{userId}.shopify.{brandId}.sync` | 04 (M9 reuse) | Shopify sync progress |
| `kova.{userId}.billing.events` | 04 | Stripe webhook → client (subscription updated, payment failed) |
| `kova.{userId}.presence` | 11 (heartbeat) | Online/offline detection heartbeat |

**Helper** (`src/composables/use-channel-name.ts`):

```typescript
export function useChannelName(domain: string, topic: string): string {
  const auth = useAuthStore()
  if (!auth.userId) throw new Error('useChannelName called before sign-in')
  return `kova.${auth.userId}.${domain}.${topic}`
}
```

### 5.7 Tauri command-surface naming

Per `00c §1.D` cross-cut row (Cluster 11 documents the convention; Cluster 06 enforces it inside the Tauri menu binding):

**Format:** `kova.{noun}.{verb}` — noun-first preferred (A-LOW3 / B-LOW5 closure 2026-05-19).

Rationale: noun-first groups commands by domain in the Tauri menu binding and in command-palette autocompletion — typing `kova.file.` reveals every file-domain command. Verb-first would group by action (`undo`, `redo`, `copy`) which scatters domain ownership across the surface. All examples and downstream cluster specs already use noun-first; the §5.7 prose previously said "verb-first preferred" inconsistently and is now corrected.

Examples (specced in downstream clusters):
- `kova.file.open`, `kova.file.save`, `kova.file.export`
- `kova.edit.undo`, `kova.edit.redo`, `kova.edit.copy`, `kova.edit.paste`
- `kova.eyedropper.activate` (Phase 2 — Q20)

Verb-first variants like `kova.open.file` are forbidden by the CI grep gate (§9.5) for the same reason raw-icon syntaxes are forbidden in §6.2 — namespace cleanliness beats local convenience.

Cluster 06's Tauri menu registration MUST use this convention. Cluster 11 ships no Tauri commands itself but owns the naming rule (enforced via a CI grep step — see §9.5).

---

## 6. Frontend

### 6.1 Routes

| Route | Component | Theme | Auth | Notes |
|---|---|---|---|---|
| `/404` | `Error404View` | dark | no | Also Vue Router catch-all `:pathMatch(.*)*` |
| `/500` | `Error500View` | dark | no | Boundary fallback for uncaught errors (Vue `errorHandler`) |
| `/network-unreachable` | `NetworkUnreachableView` | dark | no | Global fallback when `useOnlineStatus() === 'offline'` AND a backend call fails |

Marketing routes (`/privacy`, `/terms`) live in Cluster 01's PRD; this PRD ships `<MarketingShell>` they compose with.

### 6.2 Pinia stores

```typescript
// src/stores/toast.ts (NEW)
export const useToastStore = defineStore('toast', () => {
  const visible = ref<Toast[]>([])
  const queued  = ref<Toast[]>([])
  const MAX_VISIBLE = 5  // KD-1

  function show(toast: NewToast): string {
    const id = crypto.randomUUID()
    const t: Toast = { ...toast, id, createdAt: Date.now() }
    if (visible.value.length < MAX_VISIBLE) {
      visible.value.push(t)
      scheduleAutoDismiss(t)
    } else {
      queued.value.push(t)
    }
    return id
  }

  function dismiss(id: string): void {
    visible.value = visible.value.filter(t => t.id !== id)
    if (queued.value.length > 0) {
      const next = queued.value.shift()!
      visible.value.push(next)
      scheduleAutoDismiss(next)
    }
  }

  function scheduleAutoDismiss(t: Toast): void {
    if (t.variant === 'error' || t.variant === 'action') return  // sticky
    const ms = t.duration ?? (t.variant === 'progress' ? Infinity : 5000)
    if (ms === Infinity) return
    setTimeout(() => dismiss(t.id), ms)
  }

  return { visible, queued, show, dismiss }
})
```

```typescript
// src/stores/confirm.ts (NEW)
export const useConfirmStore = defineStore('confirm', () => {
  const pending = ref<ConfirmRequest | null>(null)
  const stack   = ref<ConfirmRequest[]>([])  // for nested (max 2 per KD-2)

  async function confirm(opts: ConfirmOptions): Promise<boolean> {
    if (stack.value.length >= 2) {
      // Close innermost (per KD-2 stack limit)
      const innermost = stack.value.pop()!
      innermost.resolve(false)
    }
    return new Promise<boolean>((resolve) => {
      const req: ConfirmRequest = { ...opts, id: crypto.randomUUID(), resolve }
      stack.value.push(req)
      pending.value = req
    })
  }

  function resolveTop(result: boolean): void {
    const top = stack.value.pop()
    if (!top) return
    top.resolve(result)
    pending.value = stack.value.at(-1) ?? null
  }

  return { pending, stack, confirm, resolveTop }
})
```

### 6.3 Composables

| Composable | File | Signature | Used by |
|---|---|---|---|
| `useToast` | `src/composables/use-toast.ts` | `(): { show: (toast: NewToast) => string; dismiss: (id: string) => void; success, error, info, action, progress, aiGen: (opts: Partial<NewToast>) => string }` | Every cluster with mutation feedback |
| `useConfirm` | `src/composables/use-confirm.ts` | `(): { confirm: (opts: ConfirmOptions) => Promise<boolean> }` | 03, 04, 05, 08, 09 |
| `useOnlineStatus` | `src/composables/use-online-status.ts` | `(): { status: ComputedRef<'online' \| 'offline'>; lastChange: ComputedRef<number> }` | 06 (canvas autosnapshot pause on offline), 02 (dashboard offline UX), 11 (topbar offline icon mount) |
| `useTheme` | `src/composables/use-theme.ts` | `(): { theme: ComputedRef<'light' \| 'dark'> }` | App.vue (mounts once); reactive to `route.meta.theme` |
| `useIdempotencyKey` | `src/composables/use-idempotency-key.ts` | `(): { generate: () => string }` (returns `crypto.randomUUID()` — wrapped for testability) | 01 (deletion-request, restore), 04 (Stripe checkout), 09 (snapshot create) |
| `useChannelName` | `src/composables/use-channel-name.ts` | `(domain: string, topic: string): string` | 09, 10, 04 |
| `useSentry` | `src/composables/use-sentry.ts` | `(): { capture: (err: unknown, context?: Record<string, unknown>) => void }` | App.vue error boundary + ad-hoc capture sites |
| `useEmailShell` | `src/composables/use-email-shell.ts` | `(opts: { title: string; preheader?: string; bodyMd: string }): { html: string; text: string }` | Edge Functions building Resend payloads |
| `useReducedMotion` | `src/composables/use-reduced-motion.ts` | `(): { reduced: ComputedRef<boolean> }` (wraps VueUse `useMediaQuery('(prefers-reduced-motion: reduce)')`) | `<KovaSkeleton>` (suppresses shimmer); future Cluster 07 transitions |

### 6.4 Components

#### 6.4.1 Composite components

| Component | Props | Slots | Emits | Hi-fi origin |
|---|---|---|---|---|
| `<ToastStack>` | (none — reads `useToastStore`) | none | none | B1.1–B1.8 stack pattern; mounted once in `<App>` |
| `<KovaToast>` | `toast: Toast` | none | `dismiss: (id: string)` | B1 per-variant |
| `<KovaModal>` | `open: boolean (v-model)`; `size?: 'sm' \| 'md' \| 'lg' = 'md'`; `title?: string`; `description?: string`; `closeOnBackdrop?: boolean = true`; `destructive?: boolean = false`; `loading?: boolean = false` | `default` (body), `footer` | `update:open: (open: boolean)` | A8.1/.2/.3 `.dlg` |
| `<KovaPopover>` | `open: boolean (v-model)`; `anchor: TemplateRef<HTMLElement>`; `placement?: Placement = 'bottom-start'`; `width?: number \| 'auto' = 'auto'` | `default` (content) | `update:open` | A6 + A2a `.popover` |
| `<KovaMenu>` | `items: MenuItem[]`; `align?: 'start' \| 'end' = 'start'`; `width?: number = 240` | none (driven by `items` prop) | `select: (item: MenuItem)` | A6 avatar dropdown anchor (catalog per surface lives in Cluster 08) |
| `<KovaTooltip>` | `content: string`; `placement?: Placement = 'top'`; `delay?: number = 500` | `default` (anchor element) | none | (Reka wrapper, no dedicated hi-fi) |
| `<NetworkStatusIndicator>` | (none — reads `useOnlineStatus`) | none | none | A13-derived. Renders nothing while online; renders `cloud-off` icon + `<KovaTooltip>` while offline. See §3.7. |

#### 6.4.2 Primitive components

| Component | Props | Slots | Emits | Notes |
|---|---|---|---|---|
| `<KovaIcon>` (W0-4 — sole icon tag for the entire app) | `name: string` (lucide icon name, kebab-case, e.g. `'check'`, `'arrow-left'`, `'cloud-off'`); `size?: 'xs' \| 'sm' \| 'md' \| 'lg' = 'md'` (12 / 14 / 16 / 20 px); `class?: string` | none | none | Wraps `unplugin-icons` lucide import. Uses a **static `Map<string, Component>`** internal registry rather than dynamic `<component :is>` with a template-literal name — keeps icon set tree-shakeable AND avoids runtime resolution failures (per QA-B CRITICAL-3/4 + HIGH-7/17). Throws a dev-mode warn (no-op in prod) for unknown names. Renders an inline SVG with `aria-hidden="true"` by default; `<KovaIcon name="..." aria-label="...">` flips on `role="img"`. **All other icon syntaxes are forbidden** (see scope plan §6.2 "Icon convention" W0-4 lock). |
| `<KovaButton>` | `variant?: 'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'text' \| 'icon' = 'secondary'`; `size?: 'sm' \| 'md' = 'md'`; `loading?: boolean`; `disabled?: boolean`; `icon?: string`; `iconPosition?: 'leading' \| 'trailing' = 'leading'`; `type?: 'button' \| 'submit' \| 'reset' = 'button'` | `default` (label) | `click` | Renders `.btn`, `.btn.primary`, etc. from kova-hifi.css. **`icon` prop accepts a lucide name and is rendered internally via `<KovaIcon>`.** |
| `<KovaInput>` | `modelValue: string`; `type?: 'text' \| 'email' \| 'search' = 'text'`; `placeholder?: string`; `disabled?: boolean`; `state?: 'idle' \| 'focus' \| 'error' \| 'locked' \| 'typed-confirm' = 'idle'`; `confirmTarget?: string` (when `state='typed-confirm'`, value must match this to fire `confirm:ready`) | none | `update:modelValue`; `confirm:ready: (matches: boolean)` (typed-confirm pattern from A8.4) | Renders `.input` |
| `<KovaField>` | `label: string`; `helpText?: string`; `error?: string`; `required?: boolean = false` | `default` (the input element) | none | Renders `.fld` (label + control + help) |
| `<KovaSegmented>` | `modelValue: string`; `options: Array<{ value: string; label: string; icon?: string }>` | none | `update:modelValue` | Renders `.seg` |
| `<KovaPill>` | `variant?: 'neutral' \| 'accent' \| 'outline' = 'neutral'`; `dot?: boolean = false`; `dotState?: 'ok' \| 'warn' \| 'info' = 'ok'` | `default` (label) | none | Renders `.pill` |
| `<KovaSkeleton>` | `width?: string \| number = '100%'`; `height?: string \| number = 14`; `radius?: 'pill' \| 'card' \| 'line' \| 'circle' = 'line'` | none | none | Renders `.skeleton.r-*`; respects `useReducedMotion()` |
| `<EmptyState>` | `size?: 'inline-32' \| 'panel-40' \| 'full-48' = 'panel-40'`; `icon: string` (lucide icon name); `headline: string`; `body?: string`; `query?: string` (echo'd into headline as `<span class="q">`) | `cta` (optional CTA row) | none | Renders `.empty-pane` + `.empty-pane.inline` variant |

#### 6.4.3 Marketing + email shells

| Component | Props | Slots | Theme | Notes |
|---|---|---|---|---|
| `<MarketingShell>` | `title: string` | `default` (page body) | LIGHT | Header (Kova wordmark + nav: Privacy / Terms / Support) + footer (© 2026 Kova). Used by `/privacy` + `/terms` (Cluster 01). |
| `<EmailShell>` | `title: string`; `preheader?: string` | `default` (Markdown→HTML body) | LIGHT (email-safe) | Inlined CSS; max-width 600 px; Inter web font fallback to system; List-Unsubscribe footer; PNG wordmark from `/public/email/`. Used by all transactional emails. |

### 6.5 Drag-and-drop handlers

N/A for this cluster.

---

## 7. Tool layer / canvas-engine touches

N/A — this PRD does not touch `packages/core/`, the canvas renderer, or any scene-graph type. All primitives live above the canvas engine.

---

## 8. Acceptance criteria

Every line is testable in code or browser. No "feels right." Engineers verify each before founder review.

### 8.1 Toast system

<!-- W0-12 exemplar annotations (2026-05-20) — see 00a §9.6. Pattern: <!-- ACC: <kebab-id> --> on bullet; matching id on Plan §3 test. Engineers extend to other §8 sections during plan execution as fuzzy-match gate flags non-obvious mappings. -->

- [ ] `useToast().success('Canvas saved')` enqueues a toast that renders in `<ToastStack>` and auto-dismisses at 5000 ms (within ±100 ms tolerance) <!-- ACC: 11-toast-success-auto-dismiss -->
- [ ] `useToast().error(...)` toast is sticky — does NOT auto-dismiss; user must click `×` <!-- ACC: 11-toast-error-sticky -->
- [ ] `useToast().action(...)` toast is sticky AND renders a secondary CTA in `--accent` <!-- ACC: 11-toast-action-sticky-cta -->
- [ ] `useToast().progress(...)` toast renders a spinner glyph; resolving via `setLoading(false)` swaps to a `success` or `error` variant in place
- [ ] `useToast().aiGen(...)` toast uses sparkle glyph in `--accent-ink`
- [ ] 6 toasts enqueued in rapid succession → 5 visible + 1 queued; dismissing one promotes the queued toast within 100 ms
- [ ] Long-content toast wraps at 320 px width and auto-dismisses at 8000 ms (longer wrap → longer dwell)
- [ ] Toast renders above modal backdrop (z-index test: open `<KovaModal>`, fire `useToast().info(...)` → toast is visible without dismissing modal)
- [ ] Manual dismiss via `×` click removes only the clicked toast (not the queue)
- [ ] `prefers-reduced-motion: reduce` suppresses toast slide-in animation; toast still appears, just without translate

### 8.2 Confirm modal

- [ ] `await useConfirm().confirm({ title: 'Delete?', confirmLabel: 'Delete', destructive: true })` resolves `true` on click of "Delete" button
- [ ] Resolves `false` on Escape key, on backdrop click (when `closeOnBackdrop` not disabled), on `×` click
- [ ] `destructive: true` renders the confirm CTA as `.btn.danger`
- [ ] `typedConfirm: 'DELETE'` requires user to type "DELETE" before confirm CTA enables; mismatch keeps CTA disabled
- [ ] Two nested confirms: stack accommodates 2; opening a 3rd auto-closes the innermost (resolves `false`)
- [ ] Resolved promise garbage-collects the confirm request from `useConfirmStore`

### 8.3 Modals + popovers + menus

- [ ] `<KovaModal size="sm">` renders 460 px wide; `md` 540 px; `lg` 880 px
- [ ] Open / close via v-model `:open`
- [ ] Backdrop click closes (when `closeOnBackdrop` not `false`)
- [ ] Escape key closes (Reka default — preserved)
- [ ] `loading: true` disables close + renders a top-bar shimmer line
- [ ] `<KovaPopover>` auto-flips above/below anchor based on viewport space (Floating UI middleware via Reka)
- [ ] `<KovaMenu items={...}>` dispatches `select` event with the chosen item; closes on select
- [ ] Tooltip shows after 500 ms hover; hides on mouse-leave

### 8.4 Skeletons + empty states

- [ ] `<KovaSkeleton radius="line" />` renders with 3 px radius + shimmer animation
- [ ] All 4 radius variants render correctly
- [ ] `prefers-reduced-motion: reduce` → static `--fill-2` bg, no animation
- [ ] `<EmptyState size="inline-32">` renders 32-px icon, 12.5-px headline, no border
- [ ] `<EmptyState size="panel-40">` renders 40-px icon (circular), 13-px headline, dashed 1-px border
- [ ] `<EmptyState size="full-48">` renders 48-px icon, 15-px headline, no border (focal)
- [ ] `query` prop wraps the echo in `<span class="q">` (verified via DOM test)
- [ ] `cta` slot renders below body copy with margin-top 6/8/10 px (by variant)

### 8.5 Network status

- [ ] `useOnlineStatus()` returns `'online'` when `navigator.onLine === true` AND Realtime ping succeeded within 10 s
- [ ] Returns `'offline'` when `navigator.onLine === false`
- [ ] Returns `'offline'` when `navigator.onLine === true` BUT Realtime ping has not ack'd in >10 s (debounced 1 s to avoid flicker)
- [ ] `<NetworkStatusIndicator>` renders nothing in the DOM while `useOnlineStatus().status === 'online'`
- [ ] `<NetworkStatusIndicator>` renders the `cloud-off` icon (14 × 14, `--ink-2`) beside the avatar in the topbar while `status === 'offline'`
- [ ] Hovering the icon shows a `<KovaTooltip>` with copy "You're offline. Changes saved locally and sync when you reconnect."
- [ ] Status transitions from offline → online instantly hide the icon (no banner to dismiss)

### 8.6 Theme detection

- [ ] Navigating to a route with `meta.theme = 'light'` sets `<html data-theme="light">`
- [ ] Navigating to a route with `meta.theme = 'dark'` sets `<html data-theme="dark">`
- [ ] Navigating to a route with no `meta.theme` defaults to `dark`
- [ ] Stylesheet swap is synchronous (no FOUT) — both stylesheets ship at app boot; only the `data-theme` attribute flips
- [ ] System theme preference (`prefers-color-scheme`) is NOT used — route meta always wins (Figma model, per `feedback_app_dark_website_light`)

### 8.7 Idempotency keys

- [ ] Edge Function called with `X-Idempotency-Key: <uuid>` and `{}` body inserts a row in `idempotency_keys`
- [ ] Same key + same body → returns cached `response_status` + `response_body`, does NOT re-execute logic
- [ ] Same key + DIFFERENT body → returns 422 `idempotency_key_reused_with_different_body`
- [ ] No key → executes logic, no row inserted, no replay protection
- [ ] Invalid key format (`length < 16` or `> 64`, or characters outside `[A-Za-z0-9_-]`) → returns 400
- [ ] Daily cron deletes rows where `created_at < now() - INTERVAL '24 hours'`
- [ ] RLS: `authenticated` role SELECT/INSERT/UPDATE/DELETE on `idempotency_keys` all fail / return 0 rows
- [ ] `verifyIdempotency` is integrated by Cluster 01's `deletion-request` Edge Function (verified by import-grep)

### 8.8 Realtime channel naming

- [ ] `useChannelName('canvas', 'abc-123.snapshot')` returns `kova.{userId}.canvas.abc-123.snapshot`
- [ ] Throws if called before sign-in (`auth.userId` null)
- [ ] CI grep step (§9.5) fails the build if a Realtime `.channel(...)` call uses a string not matching `^kova\\..*\\..*$`

### 8.9 Sentry + error pages

- [ ] Uncaught error in a Vue component is captured by Sentry (`Sentry.captureException` called via Vue `errorHandler`)
- [ ] User signs in → `Sentry.setUser({ id: ... })` fires (no email, per `sendDefaultPii: false`)
- [ ] Navigating to a non-existent route routes to `/404` and renders `<Error404View>` (catch-all `:pathMatch(.*)*`)
- [ ] An uncaught error during render routes to `/500` and renders `<Error500View>` (Vue `app.config.errorHandler`)
- [ ] When `useOnlineStatus() === 'offline'` AND a `fetch` to a `/api/...` endpoint fails, the global error boundary routes to `/network-unreachable`

### 8.10 Email shell

- [ ] `<EmailShell title="Welcome">` renders 600-px max-width HTML with inlined CSS (validated via `juice` library or equivalent — no `<style>` tag in output)
- [ ] `List-Unsubscribe` header is injected when sending via `sendEmail()` helper
- [ ] Plain-text fallback is generated from the Markdown intermediate
- [ ] Renders correctly in: Gmail (web), Apple Mail (macOS), Outlook 365 (web), Litmus suite

### 8.11 Security

- [ ] No `VITE_` prefix on `SENTRY_DSN_SERVER`, `RESEND_API_KEY`, `CRON_SECRET` (CI grep step)
- [ ] `VITE_SENTRY_DSN` is browser-exposed (intentional per Sentry docs — DSN is public)
- [ ] `idempotency_keys.response_body` does NOT store any field whose key matches `password|token|secret|key|api_key` (defensive — Edge Functions should never return these in 200 responses anyway, but the helper sanity-checks)

---

## 9. Test plan

### 9.1 Unit tests (`bun run test:unit`)

Target coverage: ≥85% on stores + composables + components.

| Test file | Covers |
|---|---|
| `tests/unit/stores/toast.test.ts` | enqueue / dismiss / max-visible promotion / sticky variants / auto-dismiss timing |
| `tests/unit/stores/confirm.test.ts` | confirm/resolve flow / stack-2 enforcement / Escape resolves false |
| `tests/unit/composables/use-toast.test.ts` | All 6 variant helpers (success/error/info/action/progress/aiGen) |
| `tests/unit/composables/use-confirm.test.ts` | Promise resolution; typed-confirm gating |
| `tests/unit/composables/use-online-status.test.ts` | `navigator.onLine` mocking; Realtime ping ack flow; 10-s timeout; 1-s debounce |
| `tests/unit/composables/use-theme.test.ts` | `route.meta.theme` reactive swap; default fallback to dark |
| `tests/unit/composables/use-idempotency-key.test.ts` | UUID format; deterministic mock for tests |
| `tests/unit/composables/use-channel-name.test.ts` | Format; throws before sign-in |
| `tests/unit/composables/use-reduced-motion.test.ts` | Media-query mock |
| `tests/unit/components/KovaToast.test.ts` | Renders per variant; dismiss button |
| `tests/unit/components/ToastStack.test.ts` | Renders 0/1/5/6 toasts; stack overflow promotion |
| `tests/unit/components/KovaModal.test.ts` | v-model open/close; sizes; backdrop click; Escape; loading state |
| `tests/unit/components/KovaPopover.test.ts` | Auto-flip; v-model |
| `tests/unit/components/KovaMenu.test.ts` | Items render; select emit |
| `tests/unit/components/KovaButton.test.ts` | Every variant + size + loading + disabled |
| `tests/unit/components/KovaInput.test.ts` | Every state; typed-confirm `confirm:ready` emit |
| `tests/unit/components/KovaField.test.ts` | Label / error / help text composition |
| `tests/unit/components/KovaSegmented.test.ts` | v-model; options render |
| `tests/unit/components/KovaSkeleton.test.ts` | All 4 radius variants; reduced-motion suppression |
| `tests/unit/components/EmptyState.test.ts` | All 3 sizes; query echo |
| `tests/unit/components/NetworkStatusIndicator.test.ts` | Renders nothing when online; renders icon + tooltip when offline |
| `tests/unit/components/Error404View.test.ts` | Renders B2.1 copy + 2 CTAs |
| `tests/unit/components/Error500View.test.ts` | Renders B2.2 copy + 2 CTAs |
| `tests/unit/components/NetworkUnreachableView.test.ts` | Renders B2.3 copy + 1 CTA |
| `tests/unit/components/EmailShell.test.ts` | Renders 600-px wrapper; inlines CSS; plain-text fallback generation |
| `tests/unit/components/MarketingShell.test.ts` | Header + footer; nav links |
| `tests/unit/api/_shared/idempotency.test.ts` | First call → persist; replay → cached; key mismatch → 422; bad key → 400 |
| `tests/unit/api/_shared/email.test.ts` | Resend mock; List-Unsubscribe header |
| `tests/unit/api/_shared/sentry.test.ts` | captureException wrapper tags Kova context |
| `tests/unit/api/cron/idempotency-cleanup.test.ts` | CRON_SECRET auth; delete-where execution; auth-failure 401 |

### 9.2 Integration tests (against local Supabase per `00d §3.B-iii D-5E`)

| Test file | Covers |
|---|---|
| `tests/integration/cluster-11/migration.test.ts` | Apply migration; verify `idempotency_keys` columns + indexes + RLS enabled |
| `tests/integration/cluster-11/rls-idempotency.test.ts` | `authenticated` SELECT/INSERT/UPDATE/DELETE all fail |
| `tests/integration/cluster-11/idempotency-end-to-end.test.ts` | Full POST → cache → replay → key-mismatch flow using a real Supabase Postgres |
| `tests/integration/cluster-11/cron-idempotency-cleanup.test.ts` | Seed rows with `created_at = now() - 25 hours`; invoke cron; assert rows deleted; recent rows preserved |

### 9.3 E2E tests (Playwright — `bun run test`)

| Spec | Covers |
|---|---|
| `tests/e2e/cluster-11/toast-flow.spec.ts` | Open dev page that triggers each toast variant; verify rendering + auto-dismiss + sticky behavior |
| `tests/e2e/cluster-11/confirm-flow.spec.ts` | Trigger confirm modal; click Cancel → false; trigger again, click Confirm → true; typed-confirm requires text match |
| `tests/e2e/cluster-11/error-pages.spec.ts` | Navigate to `/this-does-not-exist` → assert `/404`; navigate to a page that throws → assert `/500`; throw a fetch error while offline → assert `/network-unreachable` |
| `tests/e2e/cluster-11/theme-swap.spec.ts` | Navigate to `/privacy` → assert `<html data-theme="light">`; navigate to `/dashboard` (light to dark cross) → assert `<html data-theme="dark">`; verify no FOUT (initial render is in the destination theme) |
| `tests/e2e/cluster-11/offline-flow.spec.ts` | Simulate offline (Playwright route abort); assert banner renders; restore connectivity; assert banner dismisses |

### 9.4 Manual QA (founder browser smoke)

Per `feedback_browser_smoke_test_before_done` — required before claiming the feature done.

- [ ] Open the dev Storybook (or `/dev/cluster-11` showcase route) and verify all 8 toast variants render visually-identical to B1.1–B1.8 hi-fi
- [ ] Verify all 3 modal sizes (A8.1 / .2 / .3 corollary) render at the right widths and the `×` close button works
- [ ] Verify the avatar dropdown popover (A6) opens at the correct anchor + auto-flips when near viewport bottom
- [ ] Disconnect Wi-Fi on the laptop; verify the `cloud-off` icon appears in the topbar beside the avatar within 10 s; hover shows tooltip; reconnect; verify icon hides
- [ ] Verify the `/404` and `/500` pages match B2.1 / B2.2 byte-for-byte (token-driven, no hex literals)
- [ ] Open `/privacy` → confirm light theme renders correctly (no leftover dark styles)
- [ ] Send yourself a test deletion-scheduled email via Cluster 01's Edge Function (once 01 lands); verify the `<EmailShell>` renders correctly in Gmail web + Apple Mail
- [ ] In an inspector, trigger a console error; verify it lands in Sentry's project (release tag matches the current `VERCEL_GIT_COMMIT_SHA`)

### 9.5 Pre-commit + CI verifications

- `bun run check` — oxlint + type-check zero errors
- `bun run format` — oxfmt no diff
- `bun run test:unit` — all green
- `bun run test:dupes` — jscpd < 3%
- **Grep**: no `VITE_` prefix on `SENTRY_DSN_SERVER`, `RESEND_API_KEY`, `CRON_SECRET` (CI grep step in GitHub Actions / Vercel build)
- **Grep**: Realtime channel naming — `grep -rn "\\.channel('[^k]" src/ api/` must return 0 (every channel string must start with `kova.`)
- **Grep**: Tauri command naming — `grep -rn "register(.\\*,.\\*[^.]*'[^k]" src/tauri/` returns 0 (every Tauri command name must start with `kova.`)

---

## 10. Rollout phasing

### Phase A — initial deploy (Wave 1 close, in parallel with Cluster 01)

- Migration `20260520_11_shared_ui_infrastructure` applied to local + CI Supabase
- All 9 composables shipped + unit-tested
- All 2 stores shipped + unit-tested
- All 18 components shipped + unit-tested + visually smoke-tested in `/dev/cluster-11` showcase route
- `<App>` shell mounts `<ToastStack>` + `<NetworkStatusIndicator>` once
- Vue Router `meta.theme` runtime swap active; default theme `dark`
- 3 error-page routes wired
- Sentry installed both client + server; release tags wired to Vercel `VERCEL_GIT_COMMIT_SHA`
- Resend SDK installed + `sendEmail()` helper + `<EmailShell>` component
- `verifyIdempotency()` helper + `idempotency-cleanup` cron deployed (cron schedule active immediately; safe even at zero traffic — DELETE-where runs idempotent against an empty table)
- Realtime channel-naming + Tauri command-naming conventions documented; CI grep steps active

### Phase B — pre-launch hardening

- Litmus / Email-on-acid suite passes for `<EmailShell>` against Gmail / Outlook / Apple Mail / Yahoo
- Sentry release-health enabled with crash-free-sessions tracking
- Performance audit: `<ToastStack>` mount + first paint of `<KovaModal>` both under 16 ms (LCP-relevant)
- Accessibility audit via axe-core: zero P0 violations on every primitive (per `00d §3.C 2.D.11`)
- Status-palette Phase 2 plan staged (re-introducing `--warn` / `--ok` / `--review` color)

**Pre-launch checklist:**
- Founder wires Sentry projects (browser + server), Resend account + kova.app domain DNS verification, Vercel Pro plan + CRON_SECRET. See `00-PRD_SCOPE_PLAN.md §11`.
- **Linear activation steps live in `docs/operator-runbook.md`** (B-LOW5 closure 2026-05-19). Every `TODO(pre-launch §11)` marker in the codebase points there; the runbook collects them into a single ordered checklist (Sentry browser → Sentry server → Resend → Vercel Cron → Stripe → M9 channel rename → final gate). Do not delete the runbook once activated — it doubles as disaster-recovery activation script.

### Feature flags (per `00d §3.B-i` — hard-coded constants for MVP)

| Flag | Default | Toggle condition |
|---|---|---|
| `TOAST_MAX_VISIBLE` | `5` | KD-1 default; raise if user-research surfaces stacking pain |
| `TOAST_DEFAULT_DURATION_MS` | `5000` | KD-1 default; tune per variant in Phase B |
| `MODAL_STACK_MAX` | `2` | KD-2 default; rarely exceeded — flag exists only for emergency raise |
| `IDEMPOTENCY_RETENTION_HOURS` | `24` | KD-4 default; raise to 72 if mobile-app sleep cycles produce false dupes |
| `ONLINE_PING_INTERVAL_MS` | `3000` | KD-3 default |
| `ONLINE_PING_TIMEOUT_MS` | `10000` | KD-3 default; raise on flaky carriers |
| `SENTRY_SAMPLE_RATE_TRACES` | `0.1` | 10 % of transactions; raise for canary releases |
| `SENTRY_SAMPLE_RATE_REPLAYS_ON_ERROR` | `1.0` | Always capture replay on error; tune down on bandwidth concerns |
| `STATUS_PALETTE_ENABLED` | `false` | Phase 2 — re-introduce `--warn` / `--ok` / `--review` color |

---

## 11. Cross-cuts to other PRDs

| Other PRD | What we depend on (from them) | What they depend on us for |
|---|---|---|
| **01 — Auth & Identity** | None at runtime | `useToast`, `<KovaModal>`, `useConfirm`, `<DangerZoneCard>` modal logic, `<EmailShell>`, `idempotency_keys` table + helper, error pages, Sentry SDK wrapper, `<MarketingShell>` for `/privacy` + `/terms`, `useTheme` runtime stylesheet swap |
| **02 — Onboarding & Dashboard** | None | `useToast`, `<KovaModal>`, `useConfirm`, `<EmptyState>`, `<KovaSkeleton>`, `useOnlineStatus` |
| **03 — Brand Management** | None | `useConfirm` (delete brand typed-confirm), `<KovaModal>`, `useToast` |
| **04 — Account + Stripe** | None | `useConfirm` (delete-account, cancel-sub), `<KovaModal>`, `useToast`, `<EmptyState>` (no integrations connected), `<EmailShell>` (Stripe receipts), `idempotency_keys` table + helper (Stripe webhook), Realtime channel name `kova.{userId}.billing.events` |
| **05 — Brand Kit & Drag-Drop** | None | `useConfirm` (delete tone snippet, delete saved block), `<KovaModal>` (tone-snippet edit), `useToast`, `<EmptyState>` (no tone snippets yet), `<KovaSkeleton>` (KB sources loading) |
| **06 — Canvas Editor Core Chrome** | None | `useToast` (canvas saved), `useOnlineStatus` (autosnapshot pause on offline), Tauri command-surface naming (`kova.*`), `<KovaPopover>`, `<KovaMenu>`, `<KovaTooltip>` |
| **07a / 07b — Canvas Engine** | None | `useToast` (export complete), `<KovaModal>` (boolean-op confirms) |
| **08 — Menus, Popovers, Shortcuts** | None | `<KovaMenu>` shell (Cluster 08 fills with the per-surface dispatch tables); `<KovaPopover>`; keyboard shortcut registration patterns |
| **09 — Version History + Trash** | None | `useConfirm` (delete snapshot, empty trash), `<KovaModal>` (manual snapshot), `useToast`, `idempotency_keys` table + helper (snapshot create), Realtime channel name `kova.{userId}.canvas.{canvasId}.snapshot` |
| **10 — AI Chat + Memory** | None | `useToast` (AI-gen variant), `<KovaSkeleton>` (chat message loading), Realtime channel name `kova.{userId}.chat.{conversationId}.stream` |
| **12 — Settings & User Prefs** | `usePreferencesStore` (Layer 1 `users.preferences` JSONB consumer) — when "Reduce motion" pref ships, `useReducedMotion()` derives from it instead of OS-only | `<KovaModal>` (settings panel), `<KovaSegmented>` (text-size picker), `useToast` (pref saved) |

### 11.0a Resend two-runtime ownership (CT-015 / C-MED-X.3)

Resend is wrapped twice because Kova has two server runtimes:

- **Cluster 11 — Vercel Functions runtime** ships `api/_shared/email.ts` exporting `sendEmail(payload) → { id, skipped }`. Used by Cluster 04 (Stripe receipts) and any other Vercel Function callsite.
- **Cluster 01 — Supabase Edge Functions runtime** ships `supabase/functions/_shared/resend-client.ts` (Plan 01 Task 2.4) exporting `sendEmail({ to, subject, templatePath, variables, idempotencyKey }) → { id }`. Used by Cluster 01's deletion / restore / email-change flows and Cluster 12's transactional emails.

**Shared invariants (CT-015):**

1. Both wrappers read `RESEND_API_KEY` from the runtime's own env.
2. Both wrappers MUST env-guard with the same breadcrumb pattern:
   ```ts
   if (!process.env.RESEND_API_KEY) {
     console.warn('[resend] skipped — RESEND_API_KEY not set')
     // TODO(pre-launch §11): Sentry.captureMessage('resend_skipped_no_api_key', 'warning')
     return { id: `stub_…`, skipped: true }
   }
   ```
3. Both wrappers accept an idempotency key and forward it as `X-Idempotency-Key` to Resend (Resend honours it server-side as of 2025; see Plan 01 §2.4).
4. Live wiring (`import { Resend } from 'resend'`) is gated by founder lock #19 / pre-launch §11. Until then, the helpers stub-return + breadcrumb so production divergence is observable.

If either wrapper drifts from these invariants, the consolidator MUST file a fresh finding rather than land the change.

### 11.1 Hygiene rules from `00e §6`

Acknowledged + enforced in this PRD:

- **No marketing-site spec** (§6 #1): `<MarketingShell>` exists ONLY for `/privacy` + `/terms` static pages rendered inside the SPA. The marketing site itself (per `00d §3.B D-5C` resolution) is a separate Astro project built later — out of MVP scope.
- **No live multi-device canvas sync** (§6 #2): `useOnlineStatus` reports per-device only; this PRD does NOT promise cross-device coordination.
- **D-5E staging trigger** (§6 #3): N/A for this PRD (cron is harmless against empty tables; no Stripe / Shopify cascade dependency).
- **D-3 RoPA disclosure** (§6 #4): N/A in this PRD (Cluster 01 + 05 own privacy disclosures).
- **D-3 brand-voice guardrail** (§6 #5): N/A in this PRD (Cluster 05 owns).

---

## 12. Risks + open questions

### 12.1 KEY DECISION KD-1 — Toast queue + auto-dismiss policy

**Recommendation:** 5 visible max, infinite queued, auto-dismiss 5000 ms default, **sticky** for `error` and `action` variants (manual dismiss only).

**Rationale:** 5 visible matches what fits on a 1080 p screen without occluding the canvas; infinite queue prevents dropped notifications during burst (e.g., Shopify sync 50 products → 50 toasts queued, none lost); sticky for errors prevents the user missing a critical message they were not looking at; sticky for actions because the action toast IS the affordance (e.g., Undo) and must persist until acted on.

**Reversibility:** SOFT — `TOAST_MAX_VISIBLE` + `TOAST_DEFAULT_DURATION_MS` are feature flags.

### 12.2 KEY DECISION KD-2 — Modal stack max 2 nested

**Recommendation:** Max 2 modals nested (parent + child). Opening a 3rd auto-closes the innermost (resolves its promise `false`).

**Rationale:** 2 nested is enough for "confirm a destructive action inside a settings modal" (the most common nesting). 3+ is a UX anti-pattern; if encountered, the right call is to refactor the flow, not to support deeper nesting. Reka Dialog supports nested portals; the cap is enforced in `useConfirmStore`.

**Reversibility:** SOFT — `MODAL_STACK_MAX` feature flag.

### 12.3 KEY DECISION KD-3 — Online/offline detection signals

**Recommendation:** Primary `navigator.onLine`; secondary Supabase Realtime heartbeat ping every 3 s on `presence` channel; mark offline after 10 s no-ack. Debounce transitions 1 s to avoid flicker. UI surface = single topbar icon + tooltip (no pill, no banner per §3.7).

**Rationale:** `navigator.onLine` is reactive and free but lies in edge cases (browser thinks online but DNS / firewall blocks our Supabase host). Realtime ping catches that. 3 s interval = ~20 pings/min/user, well under Supabase's per-connection limit. 10 s timeout = 3 missed pings; tolerable false-negative rate. Founder ratified 2026-05-17 the Figma-style minimal indicator (icon + tooltip only); see §3.7.

**Reversibility:** SOFT — feature flags tune both intervals.

### 12.4 KEY DECISION KD-4 — `idempotency_keys` retention 24 hours

**Recommendation:** Delete rows older than 24 hours via daily cron.

**Rationale:** Realistic retry windows: network failure resolves within seconds; user-driven retries within minutes; mobile/desktop sleep/wake cycles within hours. 24 hours covers all of these. Longer retention bloats the table without practical benefit. Daily cron at 04:00 UTC.

**Reversibility:** SOFT — `IDEMPOTENCY_RETENTION_HOURS` feature flag.

### 12.5 KEY DECISION KD-5 — Realtime channel naming `kova.{userId}.{domain}.{topic}`

**Recommendation:** Lock the format. Document the 5 known channels (canvas snapshot, chat stream, shopify sync, billing events, presence heartbeat). CI grep step enforces every `.channel(...)` call uses the prefix.

**Rationale:** Without a naming convention, downstream clusters invent their own (M9 already shipped `sync-progress-${brandId}` — needs to be migrated to `kova.{userId}.shopify.{brandId}.sync` per this PRD). Centralized naming enables grep-based dependency mapping, RLS policy templating, and easier debugging in Supabase Dashboard.

**Reversibility:** HARD-ish — every consuming cluster encodes the name; migrating would require coordinated PRs. But: ratifying now (before consumers ship) is cheap. The HARD-ish class is *future*, not present.

**Closure (C-MED-11.6, 2026-05-19 W1 dispatch):** RESOLVED. Plan 11 Task 9.5 ships the M9 channel-name migration `sync-progress-${brandId}` → `kova.{userId}.shopify.{brandId}.sync`. Single client-side callsite at `src/composables/use-shopify-connection.ts:155`. No server-side change required — Supabase Realtime `postgres_changes` events are delivered by filter, not by channel name; channel name is a subscriber-side namespace. CI grep gate added under Plan 11 Task 11.x verifies no `sync-progress-` literals remain in `src/` after the migration lands.

### 12.6 RISK (Low) — `<EmailShell>` rendering drift across email clients

Email clients vary wildly in CSS support. Inlining via `juice` handles most cases, but `<style>` blocks, `@media` queries, and `position` are unreliable across Outlook 2016 / Outlook 365 / Gmail / Apple Mail / Yahoo / mobile clients.

**Mitigation:** §8.10 acceptance criterion verifies rendering in 4 representative clients. Phase B includes Litmus / Email-on-acid suite (per §10). Email templates use a constrained subset of CSS (margins, padding, font-size, color, text-align, width) — never `flex`, `grid`, `position`. Fallback to plain-text always available.

### 12.7 RISK (Low) — Sentry sampling under-captures rare bugs

`tracesSampleRate: 0.1` (10 %) means rare transactions may never be sampled.

**Mitigation:** `replaysOnErrorSampleRate: 1.0` ensures every error gets a session replay. Phase B re-tunes both rates based on incident-investigation hit rate.

### 12.8 RESOLVED 2026-05-19 (A-MED3) — `<KovaSkeleton>` shimmer animation direction (LTR vs locale-aware)

Hi-fi B7 demos shimmer animating left-to-right (translateX -100 % → 300 %). For Arabic / Hebrew localization (Phase 2), the natural direction reverses.

**Decision (W1 dispatch 2026-05-19):** ship LTR-only at MVP. Wire the gradient direction to `document.dir` in Phase 2 (i18n). No build-time hook required; Phase 2 spec will add a single `:dir`-aware CSS rule.

### 12.9 RESOLVED 2026-05-19 (A-MED3) — Toast positioning per device class

Bottom-right is the canonical position per B1. On a desktop > 2560 px wide, the toasts may appear unreachably-far from the user's focus.

**Decision (W1 dispatch 2026-05-19):** ship bottom-right at MVP (matches Figma + Linear). No per-device override at MVP. Phase 2 may add a `useToast.position()` override if user research surfaces a complaint; default stays bottom-right.

### 12.10 DROPPED 2026-05-17 — Cmd+K command palette

Founder dropped the global Cmd+K command palette from MVP scope. Canvas workflow doesn't need a global navigation shortcut; users exit to dashboard for file/brand switching. Cmd+K palette doesn't fit the model. A5 hi-fi retired. KD-3 + KD-8 (browser conflict risk) deleted with it. See `00g-CMDK_KILL_DISPATCH.md`.

---

## 13. References

### 13.1 03-doc rows covered

- §3C #7 — Right-click context menu shell (shell `<KovaMenu>` here; per-surface item catalog in Cluster 08)
- §3C #8 — `useConfirm()` composable
- §3C #15 — Network status indicator composable (`useOnlineStatus`)
- §3A — Cross-cutting consolidation rows (toast variant taxonomy, modal `.dlg` shell — primitives ship here)
- §1.D cross-cuts (per `00c §1.D` hidden-dependencies findings):
  - Vue Router meta theme detection
  - Supabase Realtime channel naming convention
  - Idempotency-key pattern for write Edge Functions
  - Toast variants taxonomy (canonical)
  - Tauri command-surface naming (`kova.*`)

### 13.2 Q-decisions baked in

None directly. Cluster 11 is **primitives only** — every Q-decision lives in the consuming clusters. Cross-references:

- Q5 (user preferences) — `useReducedMotion` will derive from Cluster 12's "Reduce motion" pref once shipped (not blocking Wave 1)
- Q6 (multiplayer dormant) — `useOnlineStatus` reports per-device only (no cross-device coordination promise)
- Q15 (GDPR cascade) — `idempotency_keys.user_id ON DELETE CASCADE` honors Cluster 01's hard-delete

### 13.3 Hi-fi files

- `main-main-kova-scope/batch-a-additions/dark/batch-0/Kova Hi-Fi B1 Toasts - Dark.html` (B1.1–B1.8 — toast variants)
- `main-main-kova-scope/batch-a-additions/dark/batch-0/Kova Hi-Fi B2 Error Pages - Dark.html` (B2.1 / B2.2 / B2.3 — 404 / 500 / network-unreachable)
- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` (A6 avatar popover anchor; A2a brand-switcher popover anchor; A8.1 / .2 / .3 dialog shell; A8.4 typed-confirm)
- `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B7 Loading Skeletons - Dark.html` (B7.1–B7.5 — skeleton compositions; primitives derived)
- `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B9 List Search Empty - Dark.html` (B9.1–B9.4 — empty-state size variants)
- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html` (A11.x empty states — consuming-cluster composition; A12 coming-soon shell — Phase 2; A13 online / offline indicator — primitive here)

### 13.4 Design system

- `main-main-kova-scope/design-system/design.md` (token vocabulary; §5 ban 12 status-palette deferred)
- `main-main-kova-scope/design-system/kova-hifi.css` (canonical dark CSS — `:root` + `.toast`, `.dlg`, `.popover`, `.empty-pane`, `.skeleton`, `.net-strip`, `.offline-banner`, `.btn`, `.input`, `.fld`, `.seg`, `.pill`)
- `main-main-kova-scope/design-system/kova-hifi-light.css` (canonical light CSS — used by `<MarketingShell>` + `<EmailShell>`)
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` (vocabulary cheat-sheet — short/long/scoped + hex)

### 13.5 Audit + verification inputs

- `kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` (master plan; §3 Cluster 11; §5 PRD template; §5.6 ratification; §6 cross-cuts — esp. the 4 added 2026-05-14)
- `kova-open-pencil-1/docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md` (operator manual followed)
- `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md` (§2.A Cluster 11 lines 2008–2057 — schema + stores + composables + components; §1.D cross-cuts lines 630–640)
- `kova-open-pencil-1/docs/kova-final-prds/00d-EXTERNAL_VERIFICATION_HANDOFF.md` (D-5 infra ratifications — Sentry, Resend, idempotency pattern, Realtime channel arch 2.C.11; D-5C SSR reversal; D-5E staging trigger)
- `kova-open-pencil-1/docs/kova-final-prds/00e-EXTERNAL_VERIFICATION_VERDICT.md` (§6 PRD-hygiene rules; §4 official-source verification — Sentry, Resend, Vercel Cron, Supabase Realtime patterns all CONFIRMED)
- `kova-open-pencil-1/docs/kova-final-prds/01-auth-and-identity.md` (canonical reference — PRD-template-in-practice; demonstrates how to consume idempotency, Realtime, theme, Resend)

### 13.6 External sources cited

**Figma reference (per `CLAUDE.md` §"Figma Is the Reference. Always."):**

- [Figma — Notifications and toasts](https://help.figma.com/hc/en-us/articles/360039829434-Use-notifications-in-Figma) (bottom-right positioning, auto-dismiss timing, stacking pattern — informs §3.1)
- [Figma — Modals and dialogs (in-app UX patterns)](https://www.figma.com/community/file/928108847914589057) (size variants sm/md/lg, backdrop click-to-close, destructive confirms — informs §3.3)
- [Figma — Empty states & loading patterns](https://help.figma.com/hc/en-us/articles/360038006194-Use-loading-states-in-prototypes) (skeleton shimmer convention; empty-state size variants — informs §3.5 + §3.6)
- [Figma — Connection status and offline behavior](https://help.figma.com/hc/en-us/articles/360040328553) (icon + tooltip pattern, no persistent banner — informs §3.7 + KD-3)

**Implementation libraries:**

- [Reka UI — Dialog](https://reka-ui.com/components/dialog) (KovaModal wraps this)
- [Reka UI — Popover](https://reka-ui.com/components/popover) (KovaPopover wraps this)
- [Reka UI — DropdownMenu](https://reka-ui.com/components/dropdown-menu) (KovaMenu wraps this)
- [Reka UI — Tooltip](https://reka-ui.com/components/tooltip) (KovaTooltip wraps this)
- [Sentry — Vue SDK](https://docs.sentry.io/platforms/javascript/guides/vue/) (@sentry/vue install + config)
- [Sentry — Node SDK](https://docs.sentry.io/platforms/node/) (server-side Edge Function init)
- [Resend — API reference](https://resend.com/docs/api-reference/emails/send-email) (sendEmail wrapper)
- [Resend — List-Unsubscribe header](https://resend.com/docs/dashboard/emails/headers#list-unsubscribe) (compliance)
- [Vercel — Cron Jobs](https://vercel.com/docs/cron-jobs) (cron config)
- [Supabase — Realtime channels](https://supabase.com/docs/guides/realtime/channels) (naming convention compliance)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) (service_role-only policy pattern)
- [VueUse — useMediaQuery](https://vueuse.org/core/useMediaQuery/) (prefers-reduced-motion / prefers-color-scheme)
- [Vue 3 — `app.config.errorHandler`](https://vuejs.org/api/application.html#app-config-errorhandler) (global error boundary → /500 route)
- [Tailwind CSS — `@theme` directive](https://tailwindcss.com/docs/theme) (translation target for `:root` block)
- [Litmus — Email client market share](https://www.litmus.com/email-client-market-share) (validates which clients §8.10 must cover)

### 13.7 Memory pointers consulted

- `feedback_app_dark_website_light` — dark inside app, light only on auth + marketing + mobile fallback; theme convention canonical
- `feedback_figma_ui_theme` — Figma reference for visual decisions (toast position, modal sizes, offline indicator pattern)
- `feedback_browser_smoke_test_before_done` — §9.4 manual QA gate
- `feedback_verify_with_docs` — Reka UI + Sentry + Resend + Vercel + Supabase docs cited in §13.6
- `feedback_explain_for_nontechnical_founder` — §1.1 plain language + §1.2 caveman both included
- `project_design_system_master` — canonical design-system path (main-main-kova-scope/design-system/)
- `project_pre_prd_audit_ratified` — local Supabase + CI ephemeral for §9.2; Sentry / Resend / idempotency patterns ratified

### 13.8 What is NOT in this PRD (handed elsewhere)

- Per-mutation toast copy strings ("Canvas saved · 2s ago" etc.) — consuming clusters
- Right-click dispatch catalog (which items per surface) — Cluster 08
- Per-surface skeleton compositions (dashboard greeting, memory list, KB sources) — consuming clusters
- Per-surface empty-state instances (A11.1–A11.8) — consuming clusters
- Auth-specific shells (`<AuthShell>`, `<AuthCard>`) — Cluster 01
- Mobile fallback `/desktop-only` route — Cluster 01
- Marketing site (the actual `/marketing` Astro project) — out of MVP
- Service Worker / offline page — Phase 2
- Status palette color (`--warn` / `--ok` / `--review`) — Phase 2 reintroduction
- Localization / RTL — Phase 2
- Help docs hosting — Phase 2

---

**End of PRD 11 — Shared UI Infrastructure**
