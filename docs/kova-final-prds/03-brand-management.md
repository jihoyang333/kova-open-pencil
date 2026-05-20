# PRD 03 — Brand Management

## 0. Status & ownership

| Field | Value |
|---|---|
| **Status** | `IN-REVIEW` 2026-05-17 (B12 reversal applied — see §12.10) |
| **Wave** | 2 (post-foundation) |
| **Author** | Claude (Opus 4.7) |
| **Reviewer** | Jiho Yang (founder) |
| **Last updated** | 2026-05-17 |
| **Depends on PRDs** | 01 (Auth — `useAuthStore`, `users` row), 02 (Onboarding & Dashboard — sidebar host, brand-list reads), 04 (Account & Stripe — `/account` shell + `.acc-rail` sidebar host; `/account/brands` route registration), 11 (Shared UI — `<KovaModal>`, `useConfirm()`, `useToast()`, skeletons, `<NotShippedYet>` placeholder) |
| **Blocks PRDs** | 04 (Account & Stripe — brand-context selector in Brand Kit / Integrations sections; `/account/brands` page content owned here), 05 (Brand Kit — per-brand picker reads `useBrandsStore.brands[]`), 06 (Canvas chrome — brand label reads `useBrandsStore.selectedBrand`), 09 (Trash purge — `delete_brand` cascade integrates with trash flow), 10 (AI chat — chat is per-brand; chat cascades on brand delete) |
| **Source artifacts** | Hi-fi: 4 files (A2+A3 picker + new-brand, A4+A9+A10 modals, A6+A2a modal shell, B12 Brands page = MVP per 2026-05-17 reversal). 03-doc: §2.1 brand-label row (cross-cut to Cluster 06), §3C net-new `brands.{tone_snippets, saved_blocks}` JSONB (owned by Cluster 05). Q-decisions: A4.2 archive flow (founder 2026-05-13 lock — action ships; **REVERSED 2026-05-17** — B12 archived inventory page ships MVP, restore + delete-archived enabled, Import CTA dropped); Q17 brand-label = navigate to brand dashboard (REVERSED — no popover); Q19 trash retention (informs cascade copy only). Audit §2.A Cluster 03 lines 1183–1271 lifted as base. |

---

## 1. Problem & outcome

### 1.1 Plain language (for founder)

A Kova user is a freelance email marketer juggling multiple client brands. This PRD ships the **brand record lifecycle**: a picker page that lists all the user's brands (`/brands`), an "add brand" sub-flow (`/brands/new` — 3 steps: name+URL → Shopify connect → brand-kit populate → done splash), three CRUD modals reachable from each brand card's kebab (Rename, Archive, Delete), the auto-assigned brand-color tint so cards stay visually distinguishable at a glance, and a **`/account/brands` archived-inventory page** (B12) that lists active + archived brands together with Restore + Delete-archived flows. Archive is recoverable (sets `archived_at`, hides from picker, browse-and-restore in `/account/brands`); Delete is destructive (typed-confirm with the brand name, hard-deletes via DB cascade across canvases / media / fonts / Shopify connections / chat / memories). The picker is the post-login landing for multi-brand users; single-brand users skip it and go straight to their one brand's dashboard. Cluster 02 owns the dashboard chrome around all of this; Cluster 04 owns the `/account` chrome that hosts B12; Cluster 03 owns the brand records themselves and every surface that creates / renames / archives / restores / deletes one. Cluster 05 owns the per-brand *settings* (Brand Kit, fonts, tone) — this PRD does not touch those.

### 1.2 Caveman summary (per CLAUDE.md communication style)

User have many brand. Brand picker show all brand on grid. Click brand → go dashboard. "+ New brand" → 3-step mini-onboarding (name+URL → Shopify → brand kit → done). Each brand card have kebab: Rename / Archive / Delete. Rename = neutral. Archive = hide but keep. Browse archived + restore at `/account/brands` (B12 page). Delete = type brand name to confirm, hard cascade (canvases, media, fonts, Shopify, chat, memories — all gone). Color auto-assigned at create-time from coral/violet/sage/sand/graphite palette so brand cards look different. Cluster 02 owns dashboard chrome, Cluster 04 owns `/account` shell; this PRD owns brand records + their CRUD + B12 page content.

### 1.3 Outcome (acceptance gate)

User can: (1) land on `/brands` after login if they have 2+ brands, (2) see every active brand as a card with logo + name + URL + Shopify status pill + canvas count + last-edited, (3) hit "+ New brand" → 3-step flow → land in new brand's dashboard, (4) right-click / kebab any card → choose Rename / Archive / Delete, (5) Archive hides the brand from the picker grid + sidebar brand-switcher + brand-list dropdowns (`useBrandsStore.activeBrands`), (6) Delete only succeeds when the user types the brand name exactly (case-sensitive) — destructive CTA stays disabled otherwise, (7) Delete cascades through every child table without dangling rows or orphan Storage objects, (8) every brand created via this PRD has a stable auto-assigned color from the 5-tint palette that survives renames, (9) **navigate `/account/brands` (B12) to see active + archived brands in segmented view (`All / Active / Archived`), restore any archived brand back to active, or delete-archived (typed-confirm hard cascade)**, (10) **filter the `/brands` picker by "Archived" via the top-right dropdown** to surface archived brands in-line as 78% opacity tiles. Backend RLS ensures `brand.user_id = auth.uid()` for every CRUD operation. Audit log row written for create / archive / restore / delete (Cluster 11 breadcrumb stopgap until `audit_log` table ships — see §12.1). Color-override UI is the only Phase 2 item.

---

## 2. Scope

### 2.1 In scope (this PRD)

**Surfaces:**
- `/brands` route — A2.a populated picker + A2.b zero-state. Multi-brand landing. **"Archived" filter dropdown ENABLED** (renders archived brands in-line at 78% opacity when toggled).
- `/brands/new` route — A3.a (name+URL) → A3.b (Shopify connect) → A3.c (brand-kit populate) → A3.d (done splash). 4 scenes.
- `/account/brands` route (B12) — full active + archived inventory inside the Account-page left rail. Segmented control `All / Active / Archived`. Hero has **"+ New brand"** primary CTA only (no Import). Click an active card → brand dashboard. Click archived card kebab → Restore (B12.3) or Delete (B12.4). PRD 04 owns route registration + `.acc-rail` host; PRD 03 owns page content.
- Three active-state CRUD modals reachable from `.bp-card` kebab in the picker (and from the same kebab in any other brand-list surface — sidebar brand-switcher menu, Cluster 04 Account-page brand dropdown, B12 active grid):
  - **A4.1 Rename brand** — single-input neutral modal; slug surfaced read-only.
  - **A4.2 Archive brand** — neutral confirm with structured explainer; sets `archived_at`. Recoverable via B12.3.
  - **A4.3 Delete brand** — typed-confirm (brand name, case-sensitive). Destructive. Hard cascade.
- Two archived-state modals reachable from B12 archived-card kebab:
  - **B12.3 Restore brand** — `.dlg.sm` neutral confirm, no typed-confirm. Clears `archived_at`.
  - **B12.4 Delete-archived brand** — same `<DeleteBrandModal>` component as A4.3 (typed-confirm, hard cascade). Mounted from archived row.

**Data + backend:**
- `brands` table extension: `archived_at timestamptz`, `color text` (CHECK in `('coral','violet','sage','sand','graphite')`), `slug text` (derived from name on insert, immutable per A4.1 spec), `url text` (display URL field captured at create), `description text` (optional, captured at A3.a step).
- Partial index `idx_brands_active_per_user` for hot-path "list my active brands" query.
- 7 SECURITY DEFINER RPCs: `create_brand`, `rename_brand`, `archive_brand`, **`restore_brand` (REAL — clears `archived_at`)**, `delete_brand`, `list_active_brands`, **`list_archived_brands`** (real RPC, MVP per 2026-05-17 reversal — see §5).
- 5 Edge Functions: `POST /api/brands/create`, `POST /api/brands/rename`, `POST /api/brands/archive`, **`POST /api/brands/restore`**, `DELETE /api/brands/delete` (the last calls `delete_brand` RPC then sweeps Storage paths). All authenticated, all rate-limited via `idempotency_keys` (Cluster 11 ships table + helper).
- Storage sweep helper: `purgeBrandStorageObjects(brand_id, user_id)` — deletes per-brand Storage paths in `media-assets/{brand_id}/`, `brand-fonts/{brand_id}/`, `brand-logos/{brand_id}/`, `canvas-snapshots/{brand_id}/`. Storage doesn't cascade via DB FK, so this is explicit.
- Audit events `brand.created`, `brand.renamed`, `brand.archived`, **`brand.restored`**, `brand.deleted` via `writeAudit(event, payload)` helper — **breadcrumb stopgap** (console + Sentry) until Cluster 11 ships `audit_log` table, at which point helper internals swap to INSERT. Signature unchanged. See §12.1.

**Frontend:**
- `useBrandsStore` extension: `activeBrands` getter (filters `archived_at IS NULL`), `archivedBrands` getter (filters `archived_at IS NOT NULL` — **consumed by B12 page + A2.a Archived filter**), `createBrand({ name, url, description })`, `renameBrand(id, newName)`, `archiveBrand(id)`, **`restoreBrand(id)` (REAL, wired)**, `deleteBrand(id, typedConfirm)` actions. All wrap the matching Edge Function call.
- 3-step new-brand wizard composable: `use-new-brand-flow.ts` (state machine for A3.a → A3.b → A3.c → A3.d, with "Cancel" exit guard if any field dirty).
- Components: `<BrandPickerView />`, `<BrandCard />` (kebab launcher; renders active OR archived state based on `brand.archived_at`), `<NewBrandWizardView />`, `<RenameBrandModal />`, `<ArchiveBrandModal />`, `<DeleteBrandModal />` (typed-confirm via `useConfirm()` from Cluster 11), **`<BrandsAccountView />` (B12 page)**, **`<BrandsSegmentedControl />` (`All / Active / Archived`)**, **`<RestoreBrandModal />` (B12.3)**.
- Brand-color seed util `seedBrandColor(existingBrandCount)` — deterministic palette index `palette[count % 5]`. Called inside `create_brand` RPC server-side.

**Cross-cuts shipped from here:**
- `brands.color` column is the canonical source for the `.bp-card .logo.k-*` class on every brand-card across the app. Cluster 02 + 04 + 06 read this column when rendering any brand glyph.

### 2.2 Out of scope (handed to other clusters)

| Item | Owning PRD |
|---|---|
| Dashboard chrome (sidebar, topbar, brand-switcher, file grid, recent files) | 02 |
| Brand Kit settings (per-brand colors / fonts / logos / tone-snippets / saved-blocks editor) | 05 |
| Shopify OAuth flow itself (the redirect → callback → token-store loop) — the A3.b "Connect Shopify" CTA in this PRD hands off to the existing M9 OAuth wiring | M9 / Cluster 04 (settings) — reused, not re-built |
| `/account` shell + `.acc-rail` sidebar + route registration for `/account/brands` | 04 (PRD 03 ships B12 page content as `<BrandsAccountView>` mounted by PRD 04 route) |
| Brand-color **override** UI (let user change a brand's tint after creation) | Phase 2 — Cluster 05 Brand Kit sub-tab |
| Sidebar brand-switcher dropdown + brand-label-in-canvas chrome | 02 (dashboard sidebar) + 06 (canvas brand-label) — both READ `useBrandsStore.activeBrands` from us |
| `users.deleted_at` GDPR cascade orchestrator (account-level — cascades through all owned brands) | 01 — already shipped; brand-delete cascade here is consistent with the per-brand cascade fired from there |
| Trash cron purge | 09 (delete_brand cascade integrates with trash flow — canvases trashed before brand-delete are already gone via FK CASCADE) |
| `useConfirm()` composable, `<KovaModal>` shell, `useToast()`, skeletons, `<NotShippedYet>` placeholder | 11 |
| `audit_log` table + writer helper (PRD 03 ships breadcrumb stopgap via `writeAudit()` until table lands) | 11 — see §12.1 |
| `idempotency_keys` table + Edge Function helper | 11 (00c §1.D cross-cut) |

### 2.3 Deferred to Phase 2

- **Brand-color override UI.** MVP auto-assigns; Phase 2 Brand Kit color sub-tab adds a 5-tint picker so users can manually change.
- **A10.1/A10.2/A10.3 Shopify reconnect / disconnect** — these surfaces are visually adjacent to brand management but are owned by Cluster 04 Account → Integrations + the existing M9 disconnect flow. Out of scope here.

### 2.3.1 Dropped entirely (NOT building)

- **Brand "Import" CTA** (B12 hi-fi shows it in the page hero). Founder cut 2026-05-17 — never building. B12 hero has "+ New brand" primary CTA only. Removed from all hi-fi rasters in §3.

### 2.3.2 Reversal log

- **2026-05-17 reversal**: founder reversed the 2026-05-13 lock on B12. The `/account/brands` page, `restore_brand` RPC + UI, B12.3 Restore modal, B12.4 Delete-archived modal, and A2.a "Archived" filter dropdown are now **MVP**, not Phase 2. `BRANDS_RESTORE_ENABLED` feature flag is kept (default `true`) as a rollback safety toggle. See §12.10.

### 2.4 Cross-cut acknowledgments (foreign owners)

- **Cluster 11** owns `useConfirm()`, `<KovaModal>`, `useToast()`, skeletons, error-states, and `idempotency_keys`. This PRD consumes by composable / component name only.
- **Cluster 02** owns the brand-switcher in the sidebar (the `.brand-switch` chrome) and consumes `useBrandsStore.activeBrands` to render the dropdown. The dropdown's per-row kebab launches the same `<RenameBrandModal>` / `<ArchiveBrandModal>` / `<DeleteBrandModal>` components shipped here.
- **Cluster 04** owns `/account` + `.acc-rail` sidebar + Brand-Kit + Integrations sections + the `/account/brands` **route registration** (auth meta `requiresAuth`, theme `dark`). The brand-picker dropdown those sections expose reads `useBrandsStore.activeBrands` from us. The `/account/brands` **page content** (`<BrandsAccountView>` + segmented control + Restore/Delete-archived flows) is owned **here**, mounted into the Cluster 04 route per 2026-05-17 reversal.
- **Cluster 05** consumes `brands.color` to render brand-kit headers and consumes `brands.{id, name, slug}` to scope per-brand Kit data. It writes `brands.{colors, fonts, logo_url, voice, tone_snippets, saved_blocks}` JSONB columns — those columns exist now or ship via Cluster 05's migration; this PRD does NOT touch them.
- **Cluster 06** consumes `useBrandsStore.selectedBrand` for the canvas brand-label per Q17 (click navigates to `/dashboard?brandId={current}`). No popover.
- **M9 Shopify** existing flow is invoked from A3.b. Per the scope plan §5.5 disposition, Cluster 03 reuses the existing `connectShopify` flow verbatim (no refactor in this PRD).

---

## 3. Visual spec

Every surface maps to a hi-fi file. Engineers cite file + scene ID when implementing. All surfaces are DARK theme (per `feedback_app_dark_website_light` — picker is post-auth, inside-app).

### 3.1 Brand picker surfaces (DARK theme)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Brand picker · populated | `/brands` | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html` | A2.a | 880px content block, 3-col grid of `.bp-card`, top wordmark + avatar pill only (no sidebar — between-brands chrome). Search input on top row + Sort dropdown (Last edited default) + **"Archived" filter dropdown ENABLED** (options: `Hide / Show / Only`; wires to `archivedBrands` getter — when Show, archived tiles render in-line at 78% opacity with "Archived" outline pill; when Only, only archived tiles render). 5-color logo palette (coral / violet / sage / sand / graphite). Last grid tile = `.bp-newcard` ("+ New brand"). Top-right: "Account" button → `/account` (with `<NotShippedYet>` fallback if PRD 04 not yet shipped per §12.7). |
| Brand picker · empty | `/brands` (zero brands) | same | A2.b | Single empty pane (`.bp-empty`) — icon-circle + h3 + p + primary CTA + tour-link foot-hint. Same shell as A2.a; only the grid is replaced. Routes to A3.a on click. |

### 3.2 New-brand wizard surfaces (DARK theme)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Step 1 · Name + URL | `/brands/new` | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html` | A3.a | 3-dot progress strip (dot 1 active). 480px `.onb-card`. Logo auto-fetch slot + 3 fields: Brand name (required), Website (required, https:// prefix affixed), One-line description (optional). "Back to brands" ghost + "Continue" primary. "Cancel" pill in progress-strip top-right. |
| Step 2 · Connect Shopify | `/brands/new/shopify` | same | A3.b | Dot 2 active. `.onb-connect` card (head + body): Shopify store URL input (`.myshopify.com` suffix affixed), 3-scope list (products / images = read; customer/orders = never). "Skip for now" ghost + "Connect Shopify" primary (handoff to M9 OAuth). Context label "New brand · {name}" in progress strip. |
| Step 3 · Brand kit populate | `/brands/new/brand-kit` | same | A3.c | Dot 3 active. 560px wide `.onb-card`. `.onb-drop` zone (PDF/HTML/EML/PNG/JPG, 25 MB cap) + `.onb-files` list + `.onb-textarea` for pasted guidelines + `.onb-ai` extraction preview card (colors / typography / voice / writing rules / seed memories). "Do this later" ghost + "Extract and finish" primary. |
| Step 4 · Done splash | `/brands/new/done` | same | A3.d | All 3 dots done; "Cancel" pill hidden (preserves grid balance). 56×56 check-medal in `--ok-soft`. Single CTA "Enter {brandName}" primary + "Back to brand picker" quiet alt foot-hint. |

### 3.3 Brand CRUD modals (DARK theme)

| Surface | Trigger | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Rename brand | `.bp-card` kebab → "Rename" | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html` | A4.1 | `.dlg.sm` width. Two fields: Brand name (editable) + URL slug (read-only — slug is immutable per A4.1 lock). Foot meta `--ink-3` info icon ("Renaming is reversible. No data is touched."). Neutral "Save" primary CTA. |
| Archive brand | `.bp-card` kebab → "Archive" | same | A4.2 | `.dlg.md` width. Headline "Archive '{brandName}'?". Body: `.info-card` 4-bullet explainer (hidden from switcher / data kept / Shopify stays connected / restore from `/account/brands`) + `.brand-summary` row + paragraph re-statement. Bullet 4 link target = `/account/brands` (B12 page) — live MVP per 2026-05-17 reversal, no longer greyed. Foot meta `--ink-3` info icon ("Reversible. Browse archived brands in /account/brands."). Neutral "Archive brand" primary CTA. |
| Delete brand | `.bp-card` kebab → "Delete" | same | A4.3 | `.dlg.md` width. Headline "Delete brand '{brandName}'?". Body: `.brand-summary` row + `.loss-list` 5-row warn-soft surface (canvases / snapshots / brand-kit / KB sources / Shopify connection — with live counts via store getters) + typed-confirm `.fld` input. CTA is `.btn.danger`, disabled until input matches brand name exactly (case-sensitive). Foot meta `--warn` alert-triangle ("This action is permanent."). |

### 3.4 Modal shell references

| Pattern | Reference file | Notes |
|---|---|---|
| `.dlg.sm` / `.dlg.md` shell | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` | All three CRUD modals share the `.dlg-head` (h3 + p.sub + x close) → `.dlg-body` → `.dlg-foot` (left info-line + right action group) skeleton. Cluster 11 ships the `<KovaModal>` shell that wraps this; this PRD's three modals are content slots within it. |
| Typed-confirm `.fld` + `.input.confirm-typed` | A4.3 + A8.4 (Popovers + Dialogs file, variant 3) | Border colors: idle `--line`, partial `--ink-3`, matched `--ok` (green glow). Component is `<TypedConfirmField>` from Cluster 11; this PRD configures it with `expected={brand.name}` + `case='sensitive'`. |
| `.brand-summary` row + `.loss-list` | A4.2 + A4.3 (intra-file pattern) | Both classes ship as scoped component CSS in the three modal components. No design-system token additions. |

### 3.5 B12 `/account/brands` surfaces (DARK theme — **MVP per 2026-05-17 reversal**)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Brands page · populated | `/account/brands` | `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B12 Brands page - Dark.html` | B12.1 | Hosted inside Cluster 04 `.acc-rail` shell. Hero: page title "Brands" + "+ New brand" primary CTA only (Import REMOVED). Below hero: segmented control `All / Active / Archived` (default `All`). Below: 3-col `.bp-card` grid filtered by segment. Active cards render full-opacity with active-state kebab (Rename / Archive / Delete). Archived cards render 78% opacity with "Archived" outline pill + archived-state kebab (Restore / Delete). Empty segments render zero-state pane per B12.2. |
| Brands page · archived empty | `/account/brands?filter=archived` | same | B12.2 | Empty-pane pattern (`.bp-empty`). Headline "No archived brands". Body p "Archive a brand from `/brands` to see it here." No CTA. |
| Restore confirm | `/account/brands` (archived card kebab → Restore) | same | B12.3 | `.dlg.sm` width. Headline "Restore '{brandName}'?". Body: `.brand-summary` row + paragraph "Restoring brings this brand back to your active list. Canvases, kit, Shopify, and chat are unchanged." No typed-confirm. Neutral "Restore brand" primary CTA. On success: archived card moves to active grid + toast `success("'{name}' restored")`. |
| Delete-archived confirm | `/account/brands` (archived card kebab → Delete) | same | B12.4 | Visually identical to A4.3 — same `<DeleteBrandModal>` component, just launched from the archived row. Footer copy override: render "This action is permanent." (NOT the hi-fi's mis-leaked "GDPR Art. 17 cascade · 30-day soft-delete" — see §12.8; brand-delete is immediate hard cascade). |

### 3.6 Design system references

All surfaces use `main-main-kova-scope/design-system/kova-hifi.css` (dark). Engineers translate `:root` to Tailwind `@theme` tokens in `app.css`. Component primitives referenced from the hi-fi inline styles (`.bp-shell`, `.bp-top`, `.bp-card`, `.bp-card .logo.k-coral` etc., `.bp-newcard`, `.bp-empty`, `.onb-shell`, `.onb-progress`, `.onb-card`, `.onb-id-row`, `.onb-connect`, `.onb-drop`, `.onb-ai`, `.onb-splash`, `.dlg.sm/.md`, `.info-card`, `.brand-summary`, `.loss-list`, `.fld .input.confirm-typed`). Per the scope plan §2.2: engineers translate each class into a Vue component that renders the same markup contract. The 5-color brand-glyph palette (`#d8643c` coral, `#7d6df0` violet, `#94a888` sage, `#c8b48b` sand, `#2d2d29` graphite) is the canonical sampled-favicon set; reused across sidebar brand-switcher (Cluster 02), brand-label (Cluster 06), and Account-page brand-picker dropdowns (Cluster 04).

**Theme:** every route in this PRD carries `meta.theme = 'dark'` per the Cluster 11 cross-cut.

---

## 4. Data model

### 4.1 Schema migrations

Single migration file: `kova-open-pencil-1/supabase/migrations/20260601_03_brands_lifecycle.sql`. Pairs with `20260317_m2_dashboard.sql` (creates `public.brands`).

```sql
-- ============================================================
-- Migration 20260601_03_brands_lifecycle
-- Cluster 03 Brand Management — archive + delete + color tint + slug + url
-- ============================================================

BEGIN;

-- ---- 1. Add lifecycle + display columns ----

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'coral'
    CHECK (color IN ('coral', 'violet', 'sage', 'sand', 'graphite')),
  ADD COLUMN IF NOT EXISTS slug text NULL,
  ADD COLUMN IF NOT EXISTS url text NULL,
  ADD COLUMN IF NOT EXISTS description text NULL;

COMMENT ON COLUMN public.brands.archived_at IS
  'Soft-archive timestamp. Set by archive_brand(); cleared by restore_brand(). NOT a soft-delete — brand stays queryable; UI filters it from active lists. Restored from /account/brands (B12).';
COMMENT ON COLUMN public.brands.color IS
  'Auto-assigned palette tint at create-time. Stable across renames. User-overridable Phase 2.';
COMMENT ON COLUMN public.brands.slug IS
  'URL-safe derivative of name at create-time. Immutable after creation per A4.1 lock.';
COMMENT ON COLUMN public.brands.url IS
  'Display website URL captured at A3.a step 1.';
COMMENT ON COLUMN public.brands.description IS
  'Optional one-liner captured at A3.a step 1.';

-- ---- 2. Slug uniqueness per user ----
-- Slug is immutable so an UPDATE conflict is impossible; index protects INSERTs.

CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_slug_per_user
  ON public.brands(user_id, slug)
  WHERE slug IS NOT NULL;

-- ---- 3. Hot-path index for "list my active brands" ----

CREATE INDEX IF NOT EXISTS idx_brands_active_per_user
  ON public.brands(user_id, updated_at DESC)
  WHERE archived_at IS NULL;

-- ---- 4. Backfill color + slug for existing rows ----
-- Pre-PRD: a small number of dev/staging brand rows exist with NULL slug.
-- This makes the migration safe to run against current state.

UPDATE public.brands
SET color = (ARRAY['coral','violet','sage','sand','graphite'])[
              (abs(hashtext(id::text)) % 5) + 1
            ]
WHERE color = 'coral';  -- only rows still on default

UPDATE public.brands
SET slug = regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')
WHERE slug IS NULL;

COMMIT;
```

### 4.2 RLS policies

RLS is already enabled on `public.brands` (migration `20260317_m2_dashboard.sql`). The four existing policies (SELECT / INSERT / UPDATE / DELETE — all `USING (user_id = auth.uid())`) cover everything this PRD does. **No new policies needed.** Verify on deploy: the migration script logs the row count for `SELECT * FROM pg_policies WHERE tablename = 'brands'` and asserts exactly 4 rows.

The 7 RPCs introduced in §5.2 are `SECURITY DEFINER` and re-enforce `user_id = auth.uid()` inside each function body (defense-in-depth — never trust the caller's role).

### 4.3 Storage buckets

Buckets used (read-only from this PRD's perspective — purged by `purgeBrandStorageObjects` in §5.1.4 on delete):

| Bucket | Purpose | Path layout | Created by |
|---|---|---|---|
| `brand-logos` | Brand logo images uploaded during A3.a or via Brand Kit | `{brand_id}/logo.{ext}` | Cluster 05 migration (existing or net-new) |
| `media-assets` | Per-brand image library | `{brand_id}/{media_id}.{ext}` | `20260322_m4_media.sql` |
| `brand-fonts` | Per-brand custom fonts (Q6) | `{brand_id}/{font_id}.{woff2,ttf,otf}` | Cluster 05 |
| `canvas-snapshots` | Per-brand canvas version-history blobs (Q7) | `{brand_id}/{canvas_id}/{snapshot_id}.kiwi.zst` | Cluster 09 |

The `delete_brand` cascade triggers `purgeBrandStorageObjects()` (Edge Function helper) which iterates these four buckets and deletes every object under `{brand_id}/**`. Storage doesn't cascade with DB FK — explicit purge is required.

---

## 5. Backend

### 5.1 Edge Functions

All Edge Functions live under `kova-open-pencil-1/api/brands/` (Vercel routing). All accept JSON body; all return JSON. All require `Authorization: Bearer <supabase_jwt>`. All use the `idempotency_keys` helper from Cluster 11 (00c §1.D cross-cut) — clients send `Idempotency-Key` header, server records key + result, replays return cached response.

**Hardening (W0-5 / founder lock #15):** every `CREATE FUNCTION ... SECURITY DEFINER` RPC defined by this PRD MUST include `SET search_path = public, pg_temp` within the same function definition. CI-enforced — `bun run check:rls` (Plan 11 Task 11.5) fails on any DEFINER block missing the clause. CT-013 from CONSOLIDATED-TRIAGE.md flagged 8 RPCs in this cluster missing the lock; the Cluster 03 Wave-2 fix agent adds the clause to every DEFINER block in `supabase/migrations/` during its pass.

**Audit-log cross-cut (W0-1):** create / rename / archive / restore / delete each append one row to `public.audit_log` via the Cluster 11 `writeAudit(supabaseAdmin, { userId, eventType, payload, clusterOwner: '03' })` helper at `api/_shared/audit.ts`. Table DDL + RLS + helper are owned by **PRD 11 §2.1 / §4.1 / §5.5** (founder lock #11). The local `writeAudit()` helper described in §5.5 of this PRD has been retired: §5.5 now documents *what* this cluster writes (event-type catalog + payload examples) but the *helper implementation* lives in Cluster 11.

#### 5.1.1 `POST /api/brands/create`

| Field | Value |
|---|---|
| **Trigger** | A3.d "Enter {brandName}" CTA → after onboarding wizard completes |
| **Auth** | Authenticated (Supabase JWT). `user_id` taken from JWT, never from body. |
| **Body** | `{ name: string (1..80), url: string \| null, description: string \| null }` |
| **Validation** | `name` 1–80 chars, not all whitespace. `url` if present matches `^https?://[a-z0-9.-]+\.[a-z]{2,}` (basic URL regex; full DNS validation deferred). `description` ≤ 200 chars. |
| **Action** | Calls `create_brand(p_name, p_url, p_description)` RPC. RPC returns new `brands` row. |
| **Response** | `{ brand: Brand }` (200) \| `{ error: 'name_required' \| 'url_invalid' \| 'description_too_long' }` (422) |
| **Side-effects** | RPC writes `brands` row with auto-assigned color + slug. Writes `audit_log` row `brand.created` (if table present — see §12.1). |
| **Rate limit** | 30 req/min per user (excessive brand creation = abuse signal). |
| **Errors** | 401 (no JWT), 422 (validation), 500 (RPC failure — surface `error` toast). |

#### 5.1.2 `POST /api/brands/rename`

| Field | Value |
|---|---|
| **Trigger** | A4.1 "Save" CTA |
| **Body** | `{ brand_id: uuid, name: string (1..80) }` |
| **Action** | Calls `rename_brand(p_brand_id, p_name)` RPC. Slug not touched (immutable per A4.1). |
| **Response** | `{ brand: Brand }` (200) \| `{ error: 'name_required' \| 'not_owner' \| 'not_found' }` |
| **Rate limit** | 60 req/min per user |
| **Errors** | 401, 403 (RPC raises `permission_denied`), 404, 422, 500 |

#### 5.1.3 `POST /api/brands/archive`

| Field | Value |
|---|---|
| **Trigger** | A4.2 "Archive brand" CTA |
| **Body** | `{ brand_id: uuid }` |
| **Action** | Calls `archive_brand(p_brand_id)`. Sets `archived_at = now()`. |
| **Response** | `{ brand: Brand, next_brand_id: uuid \| null }` (200) \| `{ error: 'already_archived' \| 'not_owner' \| 'not_found' }` |
| **Rate limit** | 30 req/min per user |
| **Side-effects** | If the archived brand is the currently selected brand for the user, server replies with `next_brand_id` (oldest active brand, or `null` if none) so frontend re-routes. |

#### 5.1.4 `POST /api/brands/restore` (MVP per 2026-05-17 reversal)

| Field | Value |
|---|---|
| **Trigger** | B12.3 "Restore brand" CTA on archived-card kebab from `/account/brands` |
| **Body** | `{ brand_id: uuid }` |
| **Action** | Calls `restore_brand(p_brand_id)` RPC. Clears `archived_at`. Fires `writeAudit('brand.restored', { brand_id, name })`. |
| **Response** | `{ brand: Brand }` (200) \| `{ error: 'not_archived' \| 'not_owner' \| 'not_found' }` |
| **Rate limit** | 30 req/min per user |
| **Feature gate** | If `BRANDS_RESTORE_ENABLED=false` (rollback toggle), endpoint returns `503 { error: 'feature_disabled' }`. Default `true`. |
| **Side-effects** | Brand reappears in `useBrandsStore.activeBrands` after client refetch. Sidebar brand-switcher + brand-list dropdowns re-render. |

#### 5.1.5 `DELETE /api/brands/delete`

| Field | Value |
|---|---|
| **Trigger** | A4.3 "Delete brand" CTA (after typed-confirm matches) |
| **Body** | `{ brand_id: uuid, confirm_typed: string }` |
| **Action** | Sequence: (a) call `delete_brand(p_brand_id, p_confirm_name)` RPC — returns brand-name snapshot + canvas count for audit-log; locks the row with `FOR UPDATE` to prevent races. (b) on RPC success, call `purgeBrandStorageObjects(brand_id, user_id)` to sweep four Storage buckets (best-effort — failures are logged but don't fail the request; brand row is already deleted via FK cascade). (c) write `audit_log` row `brand.deleted` with snapshotted `{name, canvas_count}`. |
| **Response** | `{ success: true, deleted_brand_name: string }` (200) \| `{ error: 'confirm_mismatch' \| 'not_owner' \| 'not_found' }` |
| **Rate limit** | 10 req/min per user (this is a destructive action; aggressive limit) |
| **Errors** | 401, 403, 404, 422 (typed-confirm doesn't match — UI should have prevented this; defense-in-depth), 500 |

**Storage sweep helper** (`kova-open-pencil-1/api/_shared/storage-sweep.ts`):

```typescript
export async function purgeBrandStorageObjects(
  supabase: SupabaseClient,
  brandId: string,
  userId: string
): Promise<{ swept: number; failed: string[] }> {
  const buckets = ['brand-logos', 'media-assets', 'brand-fonts', 'canvas-snapshots'] as const
  const failed: string[] = []
  let swept = 0
  for (const bucket of buckets) {
    const { data: objects, error: listErr } = await supabase
      .storage
      .from(bucket)
      .list(brandId, { limit: 1000 })
    if (listErr) { failed.push(`${bucket}:list:${listErr.message}`); continue }
    if (!objects?.length) continue
    const paths = objects.map((o) => `${brandId}/${o.name}`)
    const { error: rmErr } = await supabase.storage.from(bucket).remove(paths)
    if (rmErr) { failed.push(`${bucket}:remove:${rmErr.message}`); continue }
    swept += paths.length
  }
  // Sentry log if anything failed — sweep is idempotent; admin can re-run.
  if (failed.length) console.error('purgeBrandStorageObjects partial', { brandId, userId, failed })
  return { swept, failed }
}
```

**Audit helper** (`kova-open-pencil-1/api/_shared/audit.ts`) — **Cluster 11 stopgap pattern** per §12.1:

```typescript
import * as Sentry from '@sentry/node'

export type BrandAuditEvent =
  | 'brand.created'
  | 'brand.renamed'
  | 'brand.archived'
  | 'brand.restored'
  | 'brand.deleted'

export interface AuditContext {
  userId: string
  brandId: string
  payload?: Record<string, unknown>
}

/**
 * Stopgap audit writer until Cluster 11 ships `audit_log` table.
 *
 * Phase A (Wave 2 — now): write to console.info + Sentry breadcrumb.
 * Phase B (Cluster 11 lands): swap internals to `INSERT INTO audit_log`.
 *
 * Signature is stable — callers do not change at swap time.
 */
export function writeAudit(event: BrandAuditEvent, ctx: AuditContext): void {
  const record = {
    event,
    user_id: ctx.userId,
    brand_id: ctx.brandId,
    payload: ctx.payload ?? null,
    at: new Date().toISOString(),
  }
  console.info('[audit]', JSON.stringify(record))
  Sentry.addBreadcrumb({
    category: 'audit',
    level: 'info',
    message: event,
    data: record,
  })
}
```

Frontend never reads audit events. Loss of an audit row during the stopgap window is operationally tolerable — Sentry breadcrumb preserves the trace for any incident replay. Cluster 11 swap replaces internals only; no caller-site changes.

### 5.2 RPCs (database functions)

All `SECURITY DEFINER`, all granted to `authenticated`, all wrap their work in a single SQL statement-transaction. Live in `kova-open-pencil-1/supabase/migrations/20260601_03_brands_lifecycle.sql` immediately after the schema changes.

```sql
-- ---- create_brand: insert + auto-assign color + derive slug ----

CREATE OR REPLACE FUNCTION public.create_brand(
  p_name        text,
  p_url         text DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS public.brands
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_palette      text[] := ARRAY['coral','violet','sage','sand','graphite'];
  v_count        int;
  v_color        text;
  v_slug         text;
  v_slug_attempt text;
  v_suffix       int := 0;
  v_brand        public.brands;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name_required' USING ERRCODE = '22023';
  END IF;
  IF length(p_name) > 80 THEN RAISE EXCEPTION 'name_too_long' USING ERRCODE = '22023'; END IF;

  -- Color: deterministic per user's existing brand count (stable + visually balanced)
  SELECT count(*) INTO v_count FROM public.brands WHERE user_id = v_user_id;
  v_color := v_palette[(v_count % 5) + 1];

  -- Slug: derive + suffix on collision
  v_slug_attempt := regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g');
  v_slug_attempt := btrim(v_slug_attempt, '-');
  IF v_slug_attempt = '' THEN v_slug_attempt := 'brand'; END IF;
  v_slug := v_slug_attempt;
  WHILE EXISTS (SELECT 1 FROM public.brands WHERE user_id = v_user_id AND slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_slug_attempt || '-' || v_suffix::text;
  END LOOP;

  INSERT INTO public.brands (user_id, name, slug, url, description, color)
  VALUES (v_user_id, btrim(p_name), v_slug, p_url, p_description, v_color)
  RETURNING * INTO v_brand;

  RETURN v_brand;
END;
$$;

-- ---- rename_brand ----

CREATE OR REPLACE FUNCTION public.rename_brand(
  p_brand_id uuid,
  p_name     text
) RETURNS public.brands
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_brand   public.brands;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name_required' USING ERRCODE = '22023';
  END IF;
  IF length(p_name) > 80 THEN RAISE EXCEPTION 'name_too_long' USING ERRCODE = '22023'; END IF;

  UPDATE public.brands
  SET name = btrim(p_name), updated_at = now()
  WHERE id = p_brand_id AND user_id = v_user_id
  RETURNING * INTO v_brand;

  IF v_brand IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  RETURN v_brand;
END;
$$;

-- ---- archive_brand ----

CREATE OR REPLACE FUNCTION public.archive_brand(p_brand_id uuid)
RETURNS public.brands
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_brand   public.brands;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;

  UPDATE public.brands
  SET archived_at = now()
  WHERE id = p_brand_id AND user_id = v_user_id AND archived_at IS NULL
  RETURNING * INTO v_brand;

  IF v_brand IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'already_archived' USING ERRCODE = 'P0001';
    ELSE
      RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
    END IF;
  END IF;
  RETURN v_brand;
END;
$$;

-- ---- restore_brand (REAL — MVP per 2026-05-17 reversal) ----
-- Clears archived_at. Brand returns to active list + brand-switcher dropdowns.
-- Audit event 'brand.restored' fired by Edge Function caller via writeAudit().

CREATE OR REPLACE FUNCTION public.restore_brand(p_brand_id uuid)
RETURNS public.brands
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_brand   public.brands;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;

  UPDATE public.brands
  SET archived_at = NULL
  WHERE id = p_brand_id AND user_id = v_user_id AND archived_at IS NOT NULL
  RETURNING * INTO v_brand;

  IF v_brand IS NULL THEN
    -- Distinguish not-found vs not-archived for caller error mapping.
    IF EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'not_archived' USING ERRCODE = 'P0001';
    END IF;
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_brand;
END;
$$;

-- ---- delete_brand: typed-confirm + hard cascade ----

CREATE OR REPLACE FUNCTION public.delete_brand(
  p_brand_id     uuid,
  p_confirm_name text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_actual_name text;
  v_summary     jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;

  -- Lock the row + read brand name in one statement (no read-then-write race)
  SELECT name INTO v_actual_name
  FROM public.brands
  WHERE id = p_brand_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_actual_name IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_actual_name <> p_confirm_name THEN
    RAISE EXCEPTION 'confirm_mismatch' USING ERRCODE = '22023';
  END IF;

  -- Snapshot meta for audit (canvas count is cheap — single index lookup)
  SELECT jsonb_build_object(
    'name', v_actual_name,
    'canvas_count', (SELECT count(*) FROM public.canvases WHERE brand_id = p_brand_id)
  ) INTO v_summary;

  -- FK CASCADE handles: canvases, media, brand_memories, chat_conversations,
  -- chat_messages, chat_attachments, shopify_connections, product_catalog,
  -- canvas_bindings, brand_fonts.
  DELETE FROM public.brands WHERE id = p_brand_id;

  RETURN v_summary;
END;
$$;

-- ---- list_active_brands (read helper used by useBrandsStore.fetchActive) ----

CREATE OR REPLACE FUNCTION public.list_active_brands()
RETURNS SETOF public.brands
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT * FROM public.brands
  WHERE user_id = auth.uid() AND archived_at IS NULL
  ORDER BY updated_at DESC;
$$;

-- ---- list_archived_brands (read helper for B12 page + A2.a filter — MVP per 2026-05-17 reversal) ----

CREATE OR REPLACE FUNCTION public.list_archived_brands()
RETURNS SETOF public.brands
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT * FROM public.brands
  WHERE user_id = auth.uid() AND archived_at IS NOT NULL
  ORDER BY archived_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.create_brand,
                         public.rename_brand,
                         public.archive_brand,
                         public.restore_brand,
                         public.delete_brand,
                         public.list_active_brands,
                         public.list_archived_brands
  TO authenticated;
```

### 5.3 Cron jobs

**None in this PRD.** Trash purge (Cluster 09) and account-deletion cron (Cluster 01) handle their own retention. Archived brands stay forever (Q19 mental-model parity — archive is not trash; user can keep arbitrarily many). Storage sweep on delete is synchronous in the Edge Function (§5.1.4) — no deferred work queue.

### 5.4 External integrations

**Shopify (A3.b "Connect Shopify"):** A3.b CTA hands off to the existing M9 OAuth flow. Per scope plan §5.5 disposition, Cluster 03 REUSES verbatim — no SDK change, no new endpoints. The handoff is a route navigation: `<NewBrandWizard>` step 2 component imports `useShopifyOAuth()` from `@/composables/use-shopify-oauth` (M9 existing) and calls `oauth.start({ brandId, returnUrl: '/brands/new/brand-kit' })`. The M9 `/api/shopify/connect` route signs the user out to Shopify; on return, M9 routes back to `returnUrl` with the connection stored. Per §5.6 audit item 1, M9 `StoreTypeStep` light-theme drift is fixed by Cluster 02 — by the time this PRD ships, that fix is in.

**No Stripe / Anthropic / Resend integrations in this PRD.**

### 5.5 Audit log

This PRD writes `audit_log` rows for create / rename / archive / restore / delete (5 events). Schema + helper are owned by **Cluster 11** (PRD 11 §2.1 / §4.1 / §5.5; W0-1 dispatch 2026-05-19). This section documents the event-type catalog that Edge Functions in §5.1 emit; the `writeAudit()` helper implementation lives in `api/_shared/audit.ts` (Plan 11 Task 1.3a).

| Edge Function | `event_type` | `payload` shape |
|---|---|---|
| `POST /api/brands/create` | `brand.created` | `{ brand_id, name, slug, color }` |
| `POST /api/brands/rename` | `brand.renamed` | `{ brand_id, name_old, name_new }` |
| `POST /api/brands/archive` | `brand.archived` | `{ brand_id, name, canvas_count }` |
| `POST /api/brands/restore` | `brand.restored` | `{ brand_id, name, archived_at }` |
| `POST /api/brands/delete` | `brand.deleted` | `{ brand_id, name, canvas_count }` |

Every row goes through `writeAudit(supabaseAdmin, { userId, eventType, payload, clusterOwner: '03' })`. The helper Sentry-captures + swallows DB errors so a failed audit write never breaks the user mutation (per W0-1 contract).

See §12.1 for the historical dependency on the table existing — now RESOLVED by W0-1 dispatch.

---

## 6. Frontend

### 6.1 Routes (Vue Router)

| Path | Component | Guard | Theme | Notes |
|---|---|---|---|---|
| `/brands` | `<BrandPickerView>` | `requiresAuth` + redirect to `/onboarding` if user has zero brands AND has never completed onboarding (Cluster 02 owns this check) | dark | Multi-brand landing. Lazy-loaded chunk. |
| `/brands/new` | `<NewBrandWizardView>` (state machine routes internally to A3.a/b/c/d) | `requiresAuth` | dark | Children: `/brands/new` (a), `/brands/new/shopify` (b), `/brands/new/brand-kit` (c), `/brands/new/done` (d). Wizard composable holds state across child routes. |
| `/account/brands` | `<BrandsAccountView>` (B12) | `requiresAuth` | dark | **Route registration owned by PRD 04** (lives inside `/account` chrome with `.acc-rail` sidebar — PRD 04's "Brands" nav item links here). Page content owned here. Segmented control persisted via `?filter=all\|active\|archived` query param. Default `all`. |

Single-brand users skip `/brands` per scope plan §3 Cluster 02 — Cluster 02 router handles the redirect logic.

**Account-button fallback (§12.7 resolved):** The "Account" button in `<BrandPickerView>` top-right always renders. If PRD 04 has not yet registered the `/account` route at runtime, the router falls back to `/account/coming-soon` which renders Cluster 11 `<NotShippedYet feature="Account settings" />`. Discoverability is preserved per Figma pattern (settings always reachable).

### 6.2 Pinia stores

**`useBrandsStore`** (extends existing `src/stores/brands.ts`):

```typescript
// State (existing + new)
const brands              = ref<Brand[]>([])      // all brands incl. archived
const isLoading           = ref<boolean>(false)
const selectedBrandId     = ref<string | null>(null)
const isCreating          = ref<boolean>(false)
const isMutating          = ref<boolean>(false)   // archive/delete/rename in-flight

// Getters
const activeBrands        = computed(() => brands.value.filter(b => b.archived_at === null))
const archivedBrands      = computed(() => brands.value.filter(b => b.archived_at !== null))
const sortedActive        = computed(() => [...activeBrands.value].sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
const selectedBrand       = computed(() => brands.value.find(b => b.id === selectedBrandId.value) ?? null)
const hasAnyBrands        = computed(() => brands.value.length > 0)

// Actions (new + replacing legacy createBrand)
async function fetchBrands(): Promise<void>                              // existing — unchanged
async function selectBrand(id: string): void                             // existing — unchanged
async function createBrand(input: { name: string; url: string | null; description: string | null }): Promise<Brand>
async function renameBrand(id: string, name: string): Promise<void>
async function archiveBrand(id: string): Promise<void>
async function deleteBrand(id: string, typedConfirm: string): Promise<void>
async function restoreBrand(id: string): Promise<void>                   // REAL — MVP per 2026-05-17 reversal; gated by BRANDS_RESTORE_ENABLED flag (default true)
async function fetchArchivedBrands(): Promise<void>                      // populates archivedBrands; lazy-loaded by B12 page on first mount + by A2.a when "Show" or "Only" filter selected
```

All mutating actions:
1. Set `isMutating = true` (UI dim + disable kebabs)
2. POST to corresponding Edge Function with `Idempotency-Key` header (UUID per click)
3. On success: update local `brands` array immutably (`brands.value = brands.value.map(...)`)
4. On failure: toast via `useToast().error(...)` with mapped message + log to Sentry
5. `isMutating = false` (finally)

**Selection-on-archive guard:** after `archiveBrand(id)`, if `id === selectedBrandId.value`, set `selectedBrandId.value = sortedActive.value[0]?.id ?? null`. If null (no active brands left), router navigates to `/brands` (zero-state) — caller's responsibility (component watches selection).

### 6.3 Composables

**`use-new-brand-flow.ts`** — wizard state machine.

```typescript
type Step = 'name-url' | 'shopify' | 'brand-kit' | 'done'

function useNewBrandFlow() {
  const step          = ref<Step>('name-url')
  const name          = ref<string>('')
  const url           = ref<string>('')
  const description   = ref<string>('')
  const brandId       = ref<string | null>(null)     // populated after create on step 4 entry
  const isDirty       = computed(() => name.value.length > 0 || url.value.length > 0 || description.value.length > 0)

  function advance(): void                              // step → next
  function back(): void                                 // step → prev (guarded — no back from step 4)
  async function commitAndAdvance(): Promise<void>      // calls useBrandsStore.createBrand on a3.c "Extract and finish"; on success → step 4
  function cancel(): Promise<boolean>                   // guarded by A8.4 confirm if isDirty; returns true if user confirmed exit
  function reset(): void
  return { step, name, url, description, brandId, isDirty, advance, back, commitAndAdvance, cancel, reset }
}
```

**`use-brand-color.ts`** — read-side helper (assigns the deterministic Vue class):

```typescript
function brandLogoClass(color: BrandColor): string {
  return `bp-card__logo k-${color}`   // 'k-coral' | 'k-violet' | 'k-sage' | 'k-sand' | 'k-graphite'
}
```

**`use-typed-confirm.ts`** — re-used from Cluster 11. Configured by `<DeleteBrandModal>` with `expected={brand.name}`, `case='sensitive'`. Component wraps `<TypedConfirmField>` Cluster 11 ships.

### 6.4 Components

**Icon convention (W0-4 — 2026-05-19):** every icon rendered by a component in this PRD uses `<KovaIcon name="..." size?="..." />` from Cluster 11 §6.4.2 / Plan 11 Task 4.4. The four retired alternates are forbidden per scope plan §6.2 W0-4 lock: (a) raw `<icon-lucide-*>` tags with dynamic names, (b) `<component :is="\`icon-lucide-${name}\`">` template-literal resolution, (c) `i-lucide-*` UnoCSS class strings, (d) `<Icon name="lucide:...">` Nuxt-style. The 22 `<Icon name="lucide:...">` occurrences flagged by QA-B CRITICAL-3 in Plan 03 are scrubbed during the Cluster 03 Wave-2 fix pass.

| Component | Path | Props | Slots | Emits | Notes |
|---|---|---|---|---|---|
| `<BrandPickerView>` | `src/views/brands/BrandPickerView.vue` | — | — | — | Reads `useBrandsStore`. Renders A2.a populated grid or A2.b empty. Top-of-page actions: Account button (routes to `/account`; falls back to `/account/coming-soon` w/ `<NotShippedYet>` if PRD 04 not ready), "+ New brand" primary CTA. Includes `<BrandsArchivedFilter>` dropdown (Hide/Show/Only — ENABLED per 2026-05-17 reversal). |
| `<BrandCard>` | `src/components/brand/BrandCard.vue` | `brand: Brand`, `isCurrent?: boolean` | — | `select`, `archive`, `restore`, `delete`, `rename` | Renders the A2.a `.bp-card`. Active state: kebab opens A8 Reka DropdownMenu with 3 items (Rename / Archive / Delete brand). **Archived state** (`brand.archived_at !== null`): renders at 78% opacity with "Archived" outline pill; kebab shows 2 items (Restore / Delete). Logo glyph reads `brand.color`. Click on active card = `emit('select', brand.id)`. Click on archived card body is no-op in `/brands`; in `/account/brands` opens read-only preview (Phase 2). |
| `<BrandsArchivedFilter>` | `src/components/brand/BrandsArchivedFilter.vue` | `modelValue: 'hide' \| 'show' \| 'only'` | — | `update:modelValue` | A2.a top-right Reka Select dropdown. Three options. Persisted to localStorage `kova.brands.archivedFilter`. Lazy-triggers `useBrandsStore.fetchArchivedBrands()` on first non-Hide selection. |
| `<NewBrandTile>` | `src/components/brand/NewBrandTile.vue` | — | — | `click` | The `.bp-newcard` 5th-tile launcher. Routes to `/brands/new`. |
| `<NewBrandWizardView>` | `src/views/brands/NewBrandWizardView.vue` | — | — | — | Hosts `useNewBrandFlow()`. Renders A3 chrome (`.onb-shell` + `.onb-progress`) + step-component slot via `<router-view>` (children: `<StepNameUrl>`, `<StepShopify>`, `<StepBrandKit>`, `<StepDone>`). |
| `<StepNameUrl>` | `src/views/brands/wizard/StepNameUrl.vue` | — | — | — | A3.a layout. 3 form fields. "Continue" calls `flow.advance()` after validation. |
| `<StepShopify>` | `src/views/brands/wizard/StepShopify.vue` | — | — | — | A3.b layout. Skip → `flow.advance()`. Connect → `useShopifyOAuth().start({ brandId: <pending>, returnUrl })`. (Brand isn't created yet; `brandId` is a temporary client-side UUID swapped after step-3 commit.) |
| `<StepBrandKit>` | `src/views/brands/wizard/StepBrandKit.vue` | — | — | — | A3.c layout. Drop + paste + AI extraction preview. "Extract and finish" → `flow.commitAndAdvance()` (creates brand server-side, then extraction runs in background — Cluster 05 owns the actual extraction; this PRD only commits the brand). |
| `<StepDone>` | `src/views/brands/wizard/StepDone.vue` | — | — | — | A3.d layout. CTA navigates to `/dashboard?brandId={brandId}`. |
| `<RenameBrandModal>` | `src/components/brand/RenameBrandModal.vue` | `brand: Brand`, `open: boolean` | — | `update:open`, `saved` | Wraps `<KovaModal>` size `sm`. Two fields. Save → `useBrandsStore.renameBrand`. |
| `<ArchiveBrandModal>` | `src/components/brand/ArchiveBrandModal.vue` | `brand: Brand`, `open: boolean` | — | `update:open`, `archived` | Wraps `<KovaModal>` size `md`. Info-card + summary + paragraph. Archive → `useBrandsStore.archiveBrand`. Foot meta info icon. |
| `<DeleteBrandModal>` | `src/components/brand/DeleteBrandModal.vue` | `brand: Brand`, `open: boolean` | — | `update:open`, `deleted` | Wraps `<KovaModal>` size `md`. Summary + loss-list (counts from store getters: canvases, snapshots [Cluster 09 getter], brand-kit, KB sources [Cluster 05 getter], Shopify) + `<TypedConfirmField expected={brand.name} case='sensitive'>`. CTA `.btn.danger`. On confirm → `useBrandsStore.deleteBrand(id, typed)`. Reused for both A4.3 (active-card kebab from `/brands`) and B12.4 (archived-card kebab from `/account/brands`). Footer always "This action is permanent." regardless of caller (overrides hi-fi B12.4 mis-leak per §12.8). |
| `<RestoreBrandModal>` | `src/components/brand/RestoreBrandModal.vue` | `brand: Brand`, `open: boolean` | — | `update:open`, `restored` | **MVP per 2026-05-17 reversal.** Wraps `<KovaModal>` size `sm`. B12.3 layout: `.brand-summary` row + paragraph. NO typed-confirm. Neutral "Restore brand" primary CTA. On confirm → `useBrandsStore.restoreBrand(id)`. Foot meta `--ink-3` ("Restored brands return to your active list. No data changes."). |
| `<BrandsAccountView>` | `src/views/account/BrandsAccountView.vue` | — | — | — | **MVP per 2026-05-17 reversal.** B12 page hosted inside Cluster 04 `.acc-rail` shell. Hero: title "Brands" + "+ New brand" CTA (no Import). `<BrandsSegmentedControl v-model="filter">` (`all` / `active` / `archived`). Grid renders `useBrandsStore.activeBrands`, `archivedBrands`, or both depending on filter. Empty segments render B12.2 zero-state. Per-card kebab routes to active or archived modal set based on `brand.archived_at`. Filter persisted via `?filter=` query param. |
| `<BrandsSegmentedControl>` | `src/components/brand/BrandsSegmentedControl.vue` | `modelValue: 'all' \| 'active' \| 'archived'` | — | `update:modelValue` | 3-pill segmented control matching B12.1 hi-fi. Keyboard arrow-key navigation. Aria-role tablist. Triggers `fetchArchivedBrands()` on first `archived` or `all` selection. |

**Skeleton:** `<BrandPickerView>` uses `<KovaSkeleton variant="brand-grid" rows="3" cols="3" />` (Cluster 11 ships the skeleton primitive; per-surface variant is added here).

**Loss-list counts:** the `<DeleteBrandModal>` reads counts via lightweight getters on existing stores:
- `useCanvasesStore.canvasesByBrand(brandId).length` — already exists
- `useSnapshotStore.snapshotsByBrand(brandId).length` — Cluster 09 (graceful 0 if store not yet shipped at runtime)
- `useMediaStore.mediaByBrand(brandId).length` — Cluster 05
- `useBrandMemoriesStore.memoriesByBrand(brandId).length` — existing
- `useShopifyConnectionsStore.hasConnection(brandId)` — M9 existing

If any store hasn't been wired yet at runtime, the loss-list row shows "—" (em-dash) instead of a number. Not a blocker; the row's *category* tells the user enough.

### 6.5 Drag-and-drop handlers

**None in this PRD.** Drag-drop semantics (Q24) are owned by Cluster 05 / Cluster 06. Brand cards in the picker do not support drag-and-drop in MVP.

---

## 7. Tool layer / canvas-engine touches

**N/A — no engine touches.** Brand management lives entirely above the canvas engine. No `packages/core/` mods; no scene-graph additions; no renderer changes; no AI tool registrations.

---

## 8. Acceptance criteria

### 8.1 Picker (`/brands`)

- [ ] User with ≥ 2 active brands lands on `/brands` after login; sees populated grid (A2.a) with one card per active brand
- [ ] User with 0 brands lands on `/brands` and sees the empty pane (A2.b) — clicking the primary CTA navigates to `/brands/new`
- [ ] User with 1 active brand never lands on `/brands` — Cluster 02 router skips them straight to `/dashboard?brandId={the-one}`
- [ ] Each brand card shows: 5-tint logo glyph, brand name (truncates with ellipsis at card width), URL (truncates), Shopify pill (connected / reconnect / not connected), canvas count, last-edited timestamp
- [ ] "+ New brand" tile is the 5th grid slot (or 2nd if 1 active brand exists)
- [ ] Card click navigates to `/dashboard?brandId={card.id}` and calls `useBrandsStore.selectBrand(card.id)`
- [ ] Kebab on each card opens a Reka DropdownMenu with 3 items: Rename, Archive, Delete brand
- [ ] Archived brands are rendered at 78% opacity with an "Archived" outline pill (per A2.a hi-fi annotation card 5 — Field Notes) when the Archived filter dropdown is set to "Show" or "Only". The Archived filter dropdown is **ENABLED MVP per 2026-05-17 reversal** (options: Hide / Show / Only; default Hide; selection persists to localStorage `kova.brands.archivedFilter`)
- [ ] Archived-card kebab in `/brands` (when filter = Show or Only) opens 2-item DropdownMenu: Restore / Delete (per B12.1 archived-state spec)
- [ ] Account button top-right always renders; clicking routes to `/account`. If PRD 04 not yet shipped, fallback route `/account/coming-soon` renders `<NotShippedYet feature="Account settings" />` placeholder
- [ ] No "Import" CTA appears anywhere in `/brands` or `/account/brands` (founder cut 2026-05-17)
- [ ] Search input filters cards by `name` OR `url` substring (case-insensitive); empty result shows inline `<EmptySearch>` (Cluster 11 ships)
- [ ] Sort dropdown (Last edited / Name) reorders the grid; preference persists per device via localStorage

### 8.2 New-brand wizard (`/brands/new`)

- [ ] Cancel pill in progress strip opens A8.4 confirm if any field dirty; on confirm, navigates back to `/brands`
- [ ] Step 1 "Continue" disabled until `name` is ≥ 1 non-whitespace char
- [ ] Step 1 URL field validates basic URL format; invalid shows inline help error (per A3.a `.help.error` style)
- [ ] Step 1 logo auto-fetch slot renders a CSS-only placeholder if no logo yet; on URL change, fires `/api/brand-logo-probe` (M9 existing endpoint if available; otherwise client-side favicon probe) and switches to `.fetched` state when found — failure is silent
- [ ] Step 2 "Connect Shopify" routes to M9 OAuth; on success, returns to `/brands/new/brand-kit` with `?shopify_connected=true`
- [ ] Step 2 "Skip for now" advances to step 3 without OAuth
- [ ] Step 3 "Do this later" advances to step 4 without uploads / extraction (Cluster 05 owns extraction; this PRD just commits the brand)
- [ ] Step 3 "Extract and finish" creates the brand record (via `useBrandsStore.createBrand`), then advances to step 4 with `brandId` populated
- [ ] Step 4 "Enter {brandName}" navigates to `/dashboard?brandId={brandId}` and selects the brand
- [ ] Step 4 progress strip shows all 3 dots done; "Cancel" pill is `visibility: hidden` (not removed) to preserve grid layout

### 8.3 Rename modal (A4.1)

- [ ] Opens with `brand.name` pre-filled; cursor in field; URL slug shown read-only
- [ ] Save disabled until `name` ≠ original AND `name` ≥ 1 non-whitespace char
- [ ] Save calls `POST /api/brands/rename`; on success: modal closes; toast `success("Brand renamed")`; sidebar brand-switch + every visible brand-card update reactively
- [ ] On failure (server error): toast error; modal stays open
- [ ] Cmd+Enter triggers Save when enabled
- [ ] Esc closes modal (no save)

### 8.4 Archive modal (A4.2)

- [ ] Opens with headline "Archive '{brand.name}'?"; brand-summary row shows logo + name + canvas count + last-edited + Shopify pill
- [ ] Info-card explainer text is the 4-bullet list from A4.2; bullet 4 reads "Restore anytime from /account/brands" with the path rendered as a live `<router-link>` to `/account/brands` (B12 page — MVP per 2026-05-17 reversal, no longer greyed)
- [ ] "Archive brand" primary CTA (neutral, NOT danger) calls `POST /api/brands/archive`
- [ ] On success: modal closes; toast `success("'{name}' archived")`; brand disappears from picker grid + sidebar switch + every active-brand dropdown across the app; if the archived brand was the currently selected brand, router navigates to `/brands`
- [ ] If brand is already archived (race — another tab), toast `error("Already archived")`; modal closes

### 8.5 Delete modal (A4.3)

- [ ] Opens with headline "Delete brand '{brand.name}'?"; subtitle reinforces irreversibility in `--ink` weight
- [ ] Brand-summary row + 5-row loss-list (canvases / snapshots / brand-kit / KB sources / Shopify) with live counts
- [ ] Typed-confirm field accepts only the brand name (case-sensitive); border + help state cycles per A8.4 variant 3 (idle `--line` → partial `--ink-3` → matched `--ok`)
- [ ] "Delete brand" `.btn.danger` CTA stays disabled until match exact
- [ ] On confirm: calls `DELETE /api/brands/delete`; on success: modal closes; toast `success("Brand deleted")`; brand disappears from every active-brand list; if brand was selected, router navigates to `/brands`
- [ ] On RPC `confirm_mismatch` (defense-in-depth): toast `error("Confirmation didn't match")`; modal stays open with input cleared
- [ ] On server error during cascade: toast `error("Delete failed — try again or contact support")`; brand row stays (transaction rolls back); Sentry logged
- [ ] Storage sweep is best-effort: cascade succeeds even if Storage purge partially fails; failures are logged + admin can re-run sweep via operator script

### 8.6 B12 `/account/brands` page (MVP per 2026-05-17 reversal)

- [ ] Page mounts inside Cluster 04 `.acc-rail` shell at `/account/brands`. If PRD 04 not yet shipped, dev-mode flag enables direct mount at `/account/brands` with placeholder chrome (graceful degradation)
- [ ] Hero renders page title "Brands" + "+ New brand" primary CTA. No "Import" CTA anywhere
- [ ] Segmented control renders 3 pills (`All / Active / Archived`); default `All`; selection persists to URL query param `?filter=`
- [ ] Filter `All`: grid shows active brands at full opacity (with active-state kebab Rename / Archive / Delete) + archived brands at 78% opacity with "Archived" pill (with archived-state kebab Restore / Delete)
- [ ] Filter `Active`: grid shows only `archived_at IS NULL` brands
- [ ] Filter `Archived`: grid shows only `archived_at IS NOT NULL` brands; empty segment renders B12.2 zero-state ("No archived brands")
- [ ] Archived card click on body is a no-op (no navigate); active card click navigates to brand dashboard
- [ ] Restore action via archived-card kebab opens `<RestoreBrandModal>` (B12.3); confirm calls `POST /api/brands/restore`; on success: card moves from archived to active grid + toast `success("'{name}' restored")`
- [ ] Delete-archived action via archived-card kebab opens `<DeleteBrandModal>` (B12.4 — same component as A4.3); typed-confirm required; success cascade-deletes brand
- [ ] First mount of B12 page triggers `useBrandsStore.fetchArchivedBrands()` lazily; subsequent mounts skip if cache fresh (< 60s)
- [ ] If `BRANDS_RESTORE_ENABLED=false`, Restore CTA renders disabled with tooltip "Restore is temporarily disabled" + 503 response from API

### 8.7 Backend

- [ ] `create_brand` RPC seeds `color` deterministically: 1st brand for user = coral, 2nd = violet, 3rd = sage, 4th = sand, 5th = graphite, 6th = coral, etc.
- [ ] `create_brand` derives `slug` from name; on collision within same user, appends `-1`, `-2`, … until unique
- [ ] `archive_brand` raises `already_archived` (not a no-op) when called on an already-archived brand — UI maps to a soft toast
- [ ] `restore_brand` raises `not_archived` when called on an already-active brand; `not_found` when brand doesn't exist or belongs to another user
- [ ] `delete_brand` requires exact case-sensitive name match; mismatch raises `confirm_mismatch`
- [ ] `delete_brand` cascade leaves zero orphan rows in: canvases, media, brand_memories, chat_conversations, chat_messages, chat_attachments, shopify_connections (incl. Vault token via FK), product_catalog, canvas_bindings, brand_fonts
- [ ] Every RPC re-enforces `user_id = auth.uid()` inside the function body (not just relying on RLS)
- [ ] `list_active_brands` returns rows ordered by `updated_at DESC`; only `archived_at IS NULL`
- [ ] `list_archived_brands` returns rows ordered by `archived_at DESC`; only `archived_at IS NOT NULL`
- [ ] All 7 RPCs error-codes documented and surface to frontend as typed errors
- [ ] `writeAudit()` helper writes 5 event types (`brand.created`, `brand.renamed`, `brand.archived`, `brand.restored`, `brand.deleted`) to console + Sentry breadcrumb in Wave 2 stopgap mode
- [ ] Storage sweep deletes all objects under `{brand_id}/**` in: `brand-logos`, `media-assets`, `brand-fonts`, `canvas-snapshots`
- [ ] Edge Functions reject requests without `Authorization` header (401)
- [ ] Edge Functions accept `Idempotency-Key` header and return cached response on replay
- [ ] `/api/brands/restore` returns 503 when `BRANDS_RESTORE_ENABLED=false`

### 8.8 Cross-cut behavior

- [ ] Brand-color tint (`brands.color`) survives a rename — same color before + after
- [ ] Brand-color tint survives an archive + restore round-trip — same color before + after
- [ ] After archive, brand is filtered out of: `useBrandsStore.activeBrands`, sidebar brand-switcher, every Cluster 04 brand-dropdown selector, Brand Kit per-brand picker (Cluster 05)
- [ ] After restore, brand re-appears in all active-brand surfaces; brand-switcher updates reactively
- [ ] After delete, brand is removed from `useBrandsStore.brands[]` entirely (not just filtered)
- [ ] If user has only 1 active brand and archives or deletes it, they land on `/brands` (zero-state A2.b) — except when triggered from `/account/brands`, in which case they stay on B12 with segment auto-switched to Archived

---

## 9. Test plan

### 9.1 Unit tests (`bun run test:unit`)

| Target | Cases |
|---|---|
| `seedBrandColor(count)` helper | 0→coral, 1→violet, 4→graphite, 5→coral, 100→coral, negative→TypeError |
| `slug-from-name(name)` helper | "Patagonia"→"patagonia", "Studio Collective"→"studio-collective", "®®®"→"brand", whitespace-only→"brand", 80-char name→full slug |
| `useBrandsStore.activeBrands` getter | mix of archived + active → correct filter |
| `useBrandsStore.createBrand` happy + error paths | mocks fetch; verifies optimistic write only on 200 |
| `useNewBrandFlow` state machine | advance / back / cancel / commit / reset transitions correct |
| `<DeleteBrandModal>` typed-confirm | partial→disabled, matched→enabled, case-mismatch→disabled, paste→same rules |
| `<BrandCard>` kebab routing | menu items emit correct events |
| `<RenameBrandModal>` | save disabled until name changed AND non-empty |
| `<ArchiveBrandModal>` foot copy + CTA color | neutral primary, not `.danger` |
| `purgeBrandStorageObjects` | mocks Supabase Storage; verifies all 4 buckets iterated; partial failure returns `failed[]` not throws |

Coverage target: ≥ 85% line coverage on every new file under `src/views/brands/`, `src/components/brand/`, `src/composables/use-new-brand-flow.ts`, `src/composables/use-brand-color.ts`.

### 9.2 Integration tests (against local Supabase)

| Scenario | Steps + assertions |
|---|---|
| `create_brand` RPC | Auth as test user; call RPC; assert row exists with correct color (deterministic vs `count(*)`) + slug + user_id |
| Slug collision | Create "Brand A" twice; assert second slug = "brand-a-1" |
| `rename_brand` RPC | Create + rename; assert name updated, slug NOT touched, `updated_at` bumped |
| `archive_brand` RPC | Create + archive; assert `archived_at` set; second call → `already_archived` error |
| `delete_brand` happy | Create + insert child rows in 8 child tables + delete (with correct typed-confirm); assert all child rows gone, brand row gone |
| `delete_brand` confirm mismatch | Create + delete with wrong name; assert `confirm_mismatch` error; brand row preserved |
| RLS isolation | User A creates brand; User B cannot read / rename / archive / delete via direct query nor via RPC |
| `list_active_brands` | Mix archived/active; assert only `archived_at IS NULL` returned, ordered by `updated_at DESC` |
| Storage sweep | Upload fixture objects to all 4 buckets under `{brand_id}/...`; call `delete_brand` + sweep; assert all objects gone |
| Idempotency replay | POST `/api/brands/create` twice with same `Idempotency-Key` → same response, single DB row |

### 9.3 E2E tests (Playwright / Vercel Agent Browser)

| Flow | Steps |
|---|---|
| **New-brand happy** | Login → land on `/brands` (multi-brand) → click "+ New brand" → fill name+URL → continue → Skip Shopify → "Do this later" on brand-kit → click "Enter Patagonia" → assert `/dashboard?brandId=...` with new brand selected |
| **Rename** | Login → `/brands` → kebab on first card → Rename → change name → Save → assert toast + card name updated |
| **Archive** | Same setup → kebab → Archive → confirm → assert brand removed from grid + sidebar |
| **Delete typed-confirm** | Same setup → kebab → Delete → assert CTA disabled → type partial name → CTA still disabled → type full name → CTA enabled → click → assert grid update + toast + dashboard route if was-selected |
| **Empty state → onboarding** | Brand-new account with zero brands → land on `/brands` A2.b → click "New brand" CTA → wizard step 1 |
| **Cancel dirty wizard** | Start wizard → fill name → click Cancel → assert A8.4 confirm appears → confirm → assert routed back to `/brands` with no brand created |
| **Concurrent archive race** | Two tabs open to picker → tab 1 archives brand → tab 2 archives same brand → tab 2 sees toast error("Already archived") |

### 9.4 Manual QA (founder browser smoke per `feedback_browser_smoke_test_before_done`)

- [ ] `/brands` populated grid renders 3-col on 1280px; 1-col under 640px (responsive falls back to single column)
- [ ] All 5 brand-color tints visible across cards (create test brands #1–#5 and verify coral/violet/sage/sand/graphite assignment)
- [ ] Hover state on `.bp-card` shows `--ink-3` border + `#181816` background
- [ ] Hover on kebab shows `--line-2` background
- [ ] Rename modal: Enter submits when valid
- [ ] Archive modal: Esc closes without archiving
- [ ] Delete modal: typed-confirm input shows `.ok` glow when matched; pasting from clipboard works
- [ ] Toast after each CRUD action matches `useToast()` API + auto-dismisses per Cluster 11 spec
- [ ] After archive, sidebar brand-switcher updates within 100ms (reactive store)
- [ ] After delete of currently-selected brand, route lands on `/brands` with toast still visible
- [ ] Network-offline: wizard step 3 commit fails gracefully with toast + retains form state
- [ ] Theme: every surface is dark — no light-mode bleed-through

### 9.5 Pre-commit + CI verifications

- [ ] `bun run check` (oxlint + type-check) passes for every new file
- [ ] `bun run format` clean
- [ ] `bun run test:unit` 100% green for `tests/stores/brands.test.ts`, `tests/composables/use-new-brand-flow.test.ts`, `tests/components/brand/*.test.ts`
- [ ] `bun run test:dupes` stays under 3% threshold (modal components share `<KovaModal>` wrapping; no copy-paste between three CRUD modals — they import shared subcomponents)
- [ ] Migration `20260601_03_brands_lifecycle.sql` runs cleanly against fresh local Supabase + against staging (no constraint conflicts)

---

## 10. Rollout phasing

### Phase A — initial deploy (Wave 2 close)

- Migration `20260601_03_brands_lifecycle.sql` applied to local + staging
- 7 RPCs deployed (`create_brand`, `rename_brand`, `archive_brand`, `restore_brand` **REAL**, `delete_brand`, `list_active_brands`, `list_archived_brands`)
- 5 Edge Functions deployed (`create`, `rename`, `archive`, `restore`, `delete`)
- All frontend components shipped including B12 (`<BrandsAccountView>`, `<BrandsSegmentedControl>`, `<RestoreBrandModal>`, `<BrandsArchivedFilter>`)
- `useBrandsStore` extended actions wired (incl. `restoreBrand` REAL + `fetchArchivedBrands`)
- `useNewBrandFlow` composable shipped
- `writeAudit()` helper shipped (Cluster 11 stopgap — console + Sentry breadcrumb)
- Feature flags hardcoded:
  - `BRANDS_RESTORE_ENABLED = true` (rollback safety toggle per 2026-05-17 reversal — flip off only if Restore needs emergency disable)
- Storage sweep helper shipped
- Unit + integration test suites green (≥ 85% coverage on new files)
- Manual smoke pass against staging — incl. archive → /account/brands → restore round-trip

### Phase B — post-MVP unlock

- Brand-color override picker shipped (Cluster 05 Brand Kit sub-tab) — the only PRD-03 item still Phase 2
- `writeAudit()` internals swapped from breadcrumb stopgap to `INSERT INTO audit_log` once Cluster 11 ships the table

### Feature flags

| Flag | Default (MVP) | Toggle condition |
|---|---|---|
| `BRANDS_RESTORE_ENABLED` | `true` | Flip to `false` only as emergency rollback if Restore behavior is broken |
| `BRAND_NAME_MAX_LEN` | `80` | Adjust if name-truncation feedback surfaces |

---

## 11. Cross-cuts to other PRDs

| Other PRD | What we depend on (from them) | What they depend on us for |
|---|---|---|
| **01 — Auth & Identity** | `useAuthStore.user`; auth middleware; `users` row | None at runtime (account deletion cascades through `auth.users.id` → `brands.user_id ON DELETE CASCADE` — fires our `delete_brand` cascade indirectly, but Cluster 01's cron orchestrator owns that surface) |
| **02 — Onboarding & Dashboard** | Dashboard chrome (sidebar, topbar, brand-switcher widget); router redirect logic (zero/one/multi brand routing) | `useBrandsStore.activeBrands` for sidebar dropdown; `<RenameBrandModal>`, `<ArchiveBrandModal>`, `<DeleteBrandModal>` components for sidebar kebab |
| **04 — Account & Stripe** | `/account` route shell + `.acc-rail` sidebar host with "Brands" nav item; route registration for `/account/brands` (auth meta `requiresAuth`, theme `dark`); fallback route `/account/coming-soon` with `<NotShippedYet>` placeholder if shipped before PRD 03 | `useBrandsStore.activeBrands` + `archivedBrands` for the per-brand picker dropdown in Brand-Kit + Integrations sections; `<BrandsAccountView>` component mounted at `/account/brands` (page content owned here per 2026-05-17 reversal) |
| **05 — Brand Kit & Drag-Drop** | `useBrandKitStore.kitByBrand(brandId)`; `useMediaStore.mediaByBrand` getter | `brands.color` for header tints; `useBrandsStore.selectedBrand` for "which brand am I editing?" context |
| **06 — Canvas Editor Core Chrome** | Canvas chrome (topbar, breadcrumb, brand label) | `useBrandsStore.selectedBrand.{name, color, slug}` for brand label rendering; brand-label click handler navigates to `/dashboard?brandId={current}` per Q17 |
| **09 — Version History + Trash** | `useSnapshotStore.snapshotsByBrand` getter for `<DeleteBrandModal>` loss-list count | Brand-delete cascade includes `canvas_snapshots` rows (FK CASCADE via `brand_id`) — Cluster 09 must add that FK column with `ON DELETE CASCADE` |
| **10 — AI Chat + Memory** | `useBrandMemoriesStore.memoriesByBrand` getter | Brand-delete cascade includes `chat_conversations` + `chat_messages` + `chat_attachments` + `brand_memories` (existing FK CASCADE per migrations) |
| **11 — Shared UI Infrastructure** | `<KovaModal>`, `useConfirm()`, `useToast()`, `<KovaSkeleton>`, `<TypedConfirmField>`, `<EmptySearch>`, `idempotency_keys` table + helper, `audit_log` table (or owner clarification — see §12.1), Reka DropdownMenu wrapper | Brand-grid skeleton variant `brand-grid` registered in `<KovaSkeleton>` |
| **M9 Shopify** (reuse) | `useShopifyOAuth().start({ brandId, returnUrl })`; `useShopifyConnectionsStore.hasConnection(brandId)` | Brand-delete cascade revokes Shopify OAuth token via FK CASCADE on `shopify_connections.brand_id` |

### 11.1 Hygiene rules from `00e §6`

- **No marketing-site spec** — confirmed; this PRD touches no marketing routes.
- **No live multi-device canvas sync promises** — N/A in this PRD (no canvas touches).
- **D-5E staging trigger** — N/A; no cron in this PRD. (Storage sweep is in-request; not a cron.)
- **D-3 RoPA disclosure** — N/A in this PRD (Cluster 01 + Cluster 05 own).
- **D-3 brand-voice guardrail** — N/A (Cluster 05 owns AI-scraped voice/tone confirm step). A3.c step 3 in this PRD UI-only shows the *intent* to extract; actual extraction + confirm-before-write lives in Cluster 05.

---

## 12. Risks + open questions

### 12.1 RESOLVED 2026-05-17 — `audit_log` table ownership

This PRD writes 5 event types (`brand.created`, `brand.renamed`, `brand.archived`, `brand.restored`, `brand.deleted`).

**Decision:** **Cluster 11 owns `audit_log` table + write helper.** PRD 03 ships `writeAudit()` helper (see §5.1 audit helper code block) with a stopgap that writes to `console.info` + `Sentry.addBreadcrumb`. When Cluster 11 lands, helper internals swap to `INSERT INTO audit_log`. Caller signature is unchanged — zero PRD 03 code changes at swap.

**Why:** Audit log is shared infra; multiple clusters write to it (Cluster 01 already needs `account.deletion_requested` + `account.restored`). Owning it inside Cluster 11 avoids schema fragmentation. Stopgap window is operationally tolerable — frontend never reads audit events; Sentry breadcrumb preserves trace for any incident replay.

### 12.2 RESOLVED 2026-05-15 — Typed-confirm string

Dispatcher recommended "DELETE" as the typed-confirm string. Hi-fi A4.3 explicitly LOCKS the brand name as the typed string (annotation: "Locked decision. Disambiguates from A9.1 Delete-account; reading the brand name back to the user inside a destructive context is the same intentional friction as GitHub's 'type the repo name to delete'."). Audit §2.A Cluster 03 RPC signature also uses `p_confirm_name text`.

**Decision:** brand name. Override dispatcher recommendation per source-of-truth precedence (hi-fi lock + audit converge; no Q on this).

### 12.3 RESOLVED 2026-05-15 — Archive vs delete UX

Dispatcher recommended "explicit two-button choice in brand-row right-click". Hi-fi A2.a + B12.1 both use the kebab → Reka DropdownMenu with 3 items (Rename / Archive / Delete) — same pattern as Cluster 02 file-grid right-click. Right-click on the card body is reserved for Phase 2 context-menu parity with file-grid. MVP = kebab dropdown only.

**Decision:** kebab DropdownMenu with 3 items. Matches hi-fi. Right-click body deferred to Phase 2 cross-cut with Cluster 08 context-menu registry.

### 12.4 RESOLVED 2026-05-15 — Brand-color auto-assign algorithm

Dispatcher recommended "hash-of-brand-name modulo color-set-size (deterministic, no DB column)". Audit §2.A spec adds a DB column with `DEFAULT 'coral' CHECK IN (...)`.

**Decision:** DB column + deterministic seed *at INSERT time* inside `create_brand` RPC. Specifically: `palette[(user_brand_count % 5) + 1]` so 1st = coral, 2nd = violet, etc.

**Why:** hash-of-name has two failure modes — (a) rename flips color (UX bug — user expects the tint to be the brand's identity, not its current name); (b) hash collision means two brands of similar names get same color. Stored column survives rename, allows Phase-2 user-override picker (Cluster 05 Brand Kit), and is deterministic at create-time.

### 12.5 RISK (Low) — Loss-list count getters dependency

`<DeleteBrandModal>` loss-list pulls counts from 5 stores (canvases, snapshots, brand-kit, memories, Shopify). Some of those stores haven't shipped yet at Wave 2.

**Mitigation:** every getter call is `?.value ?? '—'`. Em-dash renders if store not yet wired. Category labels alone convey scope ("Canvases · — / Snapshots · — / Brand-kit · all / KB sources · — / Shopify · 1"). Not a launch blocker.

### 12.6 RISK (Low) — Storage sweep partial failure

`purgeBrandStorageObjects` is best-effort. If one of the 4 bucket sweeps fails (network blip, permissions), the brand row is already deleted but some objects remain orphaned.

**Mitigation:** (a) failures logged to Sentry; (b) operator script `scripts/reap-orphan-storage.ts` (admin-only) lists+removes objects whose `brand_id` no longer exists in `brands`. Run monthly during Phase A. Phase B may add a Vercel Cron once Cluster 11 cron infra is in place.

### 12.7 RESOLVED 2026-05-17 — A2.a "Account" button placement

A2.a hi-fi shows an "Account" button next to "+ New brand" in the top-right of the picker block.

**Decision:** **Button always renders.** Click routes to `/account`. If Cluster 04 has not yet registered the `/account` route at runtime, the router falls back to `/account/coming-soon` which renders Cluster 11 `<NotShippedYet feature="Account settings" />`. Discoverability is preserved.

**Why:** Figma always renders Account/Settings from chrome — never feature-gated. Hiding the button removes the entry point and confuses discoverability. Placeholder shell is the standard pattern when route is not yet ready. PRD 04 ships `<NotShippedYet>` route stub as part of its initial scaffolding; PRD 11 ships the placeholder component.

### 12.8 RESOLVED 2026-05-15 — Hi-fi B12.4 footer copy mis-leak

B12.4 hi-fi footer reads: "GDPR Art. 17 cascade · 30-day soft-delete + daily hard-delete cron". This describes the **account-deletion** cascade (Cluster 01), NOT brand-deletion. Brand-delete is immediate hard cascade per audit + this PRD's `delete_brand` RPC.

**Resolution:** B12.4 footer copy is hi-fi divergence from intended brand-delete semantics. Per 2026-05-17 reversal, B12.4 ships MVP via the reused `<DeleteBrandModal>` component — footer is overridden to "This action is permanent." (matching A4.3's foot meta) so the modal renders correctly regardless of caller. The hi-fi mis-leak stays in the source HTML as-is; the implementation diverges intentionally.

### 12.9 RESOLVED 2026-05-17 — A3.b store-URL validation

A3.b shows the Shopify store URL field with `.myshopify.com` suffix affixed.

**Decision:** **No pre-flight validation. Let OAuth fail.** User clicks "Connect Shopify" → redirects to Shopify OAuth → if store invalid, redirects back to step 2 with `?error=store_not_found`. M9 `/api/shopify/connect` already handles this — see M9 reuse note in §5.6. Step 2 component renders inline error banner ("Store not found — check the subdomain") when `?error=store_not_found` present in URL.

**Why:** Shopify itself is the source of truth for store existence — duplicate pre-flight check adds a network round-trip with no upside. Most Shopify apps follow this pattern. CORS would block a direct browser HEAD request anyway; pre-flight would require an extra server proxy endpoint. Founder-confirmed 2026-05-17.

### 12.10 RESOLVED 2026-05-17 — B12 archive inclusion (reversal of 2026-05-13 lock)

Founder reversed the 2026-05-13 lock that scoped B12 (`/account/brands` archived inventory page) to Phase 2.

**Decision (locked 2026-05-17 per `docs/kova-final-prds/00f-B12_REVERSAL_DISPATCH.md`):**

1. `/account/brands` page (`<BrandsAccountView>`) ships **MVP**. Full active + archived inventory inside Cluster 04 `.acc-rail` shell.
2. `restore_brand` RPC is **REAL**, not a stub. Clears `archived_at`. Audit event `brand.restored` fired.
3. `POST /api/brands/restore` Edge Function ships.
4. `<RestoreBrandModal>` (B12.3) ships — `.dlg.sm` neutral confirm, no typed-confirm.
5. `<DeleteBrandModal>` (B12.4) reused — typed-confirm hard cascade; footer override "This action is permanent." per §12.8.
6. `<BrandsSegmentedControl>` ships (`All / Active / Archived`); state in URL `?filter=`.
7. A2.a "Archived" filter dropdown on `/brands` is **ENABLED** (`Hide / Show / Only`) — no longer DISABLED w/ "Coming Phase 2" tooltip.
8. `BRANDS_RESTORE_ENABLED` feature flag kept (default `true`) as emergency rollback safety toggle.
9. **Brand "Import" CTA dropped entirely.** Founder cut — never building. Hero on B12 has "+ New brand" CTA only.

**Cross-PRD coordination (per 00f doc dispatch prompts B/C/D/E):**
- **PRD 04** adds "Brands" item to `.acc-rail` nav + registers `/account/brands` route (auth meta, dark theme).
- **PRD 02** resolves §12.11 Brands-item sidebar SOON pill (item ships visible at MVP, no SOON treatment).
- **PRD 08** `useObjectActions` composable adds archived-state action set (Restore / Delete) on brand cards based on `brand.archived_at !== null`.
- **`00-PRD_SCOPE_PLAN.md` §3** Cluster 03 summary + line-130 archive-flow note updated to reflect reversal.

**Why founder reversed:** Without an archived-list page in MVP, archive becomes a one-way trap (no UI restore path). Forcing users to wait through Phase 2 for a discovery mechanism would either drive avoid-archive workarounds or require operator SQL for support tickets. Shipping B12 MVP is cheap incremental work atop the same RPCs + components Cluster 03 already produced — the page reuses `<BrandCard>`, `<DeleteBrandModal>`, the stored archived_at column, the existing palette logic, and the same Cluster 04 chrome it would have used in Phase 2 anyway.

### 13.1 03-doc rows covered

- **§2.1 brand-label row** — Q17 navigation behavior. This PRD ships `useBrandsStore.selectedBrand` that Cluster 06 reads when rendering the canvas brand label.
- **§3C net-new server-side backend pieces** — NONE owned here directly. `brands.{tone_snippets, saved_blocks}` JSONB (Q8) are owned by Cluster 05; `brand_fonts` table (Q6) is Cluster 05; user-preferences JSONB (Q5) is Cluster 12 + Cluster 01.

### 13.2 Q-decisions baked in

- **A4.2 archive flow** (founder confirmed 2026-05-13 — action ships; **REVERSED 2026-05-17** — B12 archived inventory page ships MVP, restore + delete-archived enabled, A2.a "Archived" filter dropdown ENABLED, Import CTA dropped entirely; see §12.10 + `00f-B12_REVERSAL_DISPATCH.md`).
- **Q17** (REVERSED 2026-04-25): brand label click → navigates to brand's dashboard. NO popover. This PRD does not own the canvas brand-label (Cluster 06) but ships the `selectedBrand` store getter that Cluster 06 consumes.
- **Q19** (Figma-exact trash retention): informs the brand-delete cascade messaging ("This action is permanent" — no 30-day window for brand delete, unlike account delete).
- **Q24** (drag-drop semantics): N/A in this PRD — owned by Cluster 05 / 06.
- **§12.1 audit_log ownership** (RESOLVED 2026-05-17): Cluster 11 owns `audit_log` table + writer; PRD 03 ships `writeAudit()` helper with breadcrumb stopgap.
- **§12.7 Account button placement** (RESOLVED 2026-05-17): button always renders; `<NotShippedYet>` fallback if PRD 04 not ready.
- **§12.9 Shopify store-URL pre-flight** (RESOLVED 2026-05-17): no pre-flight; let OAuth fail with `?error=store_not_found` redirect.

### 13.3 Hi-fi files

- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html` — A2.a populated picker + A2.b zero-state + A3.a/b/c/d 4-step wizard
- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html` — A4.1 Rename + A4.2 Archive + A4.3 Delete typed-confirm
- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` — `.dlg` shell + `.btn.danger` vocabulary reference
- `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B12 Brands page - Dark.html` — B12.1/2/3/4 (**MVP per 2026-05-17 reversal**; Import CTA in hi-fi is DROPPED from build)
- `main-main-kova-scope/handoff-docs/CHUNK_B12_BRANDS_PAGE_REWASH.md` — B12 implementation notes referenced by 00f reversal dispatch
- `main-main-kova-scope/batch-a-additions/dark/screenshots/B12/` — B12 reference screenshots

### 13.4 Design system

- `main-main-kova-scope/design-system/design.md` (spec — component contracts)
- `main-main-kova-scope/design-system/kova-hifi.css` (canonical dark CSS — every class this PRD references)
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` (vocabulary cheat-sheet — short/long/scoped naming, canonical hex values)

### 13.5 Audit + verification inputs

- `kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` §3 Cluster 03; §5 PRD template; §5.6 ratification log; §6 cross-cuts
- `kova-open-pencil-1/docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md` (operator manual followed for this draft)
- `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md` §2.A Cluster 03 (lines 1183–1271) lifted as base — schema columns + RPC signatures + Edge Function shape
- `kova-open-pencil-1/docs/kova-final-prds/00d-EXTERNAL_VERIFICATION_HANDOFF.md` (no Cluster-03-specific items)
- `kova-open-pencil-1/docs/kova-final-prds/00e-EXTERNAL_VERIFICATION_VERDICT.md` §6 PRD-hygiene rules (none gate this PRD; D-3 brand-voice guardrail acknowledged in §11.1)
- `kova-open-pencil-1/docs/kova-final-prds/01-auth-and-identity.md` (canonical reference — sister PRD; template + structure mirrored)

### 13.6 External sources cited

- [Supabase — RLS + SECURITY DEFINER](https://supabase.com/docs/guides/database/postgres/row-level-security) (RPC pattern)
- [Reka UI — DropdownMenu](https://reka-ui.com/docs/components/dropdown-menu) (kebab menu component)
- [Vue 3 Composition API — defineStore (Pinia)](https://pinia.vuejs.org/core-concepts/) (store extension pattern)
- [Vue Router — Nested routes](https://router.vuejs.org/guide/essentials/nested-routes.html) (`/brands/new/*` wizard children)
- [PostgreSQL — hashtext()](https://www.postgresql.org/docs/current/functions-string.html) (deterministic palette index seed)

### 13.7 Memory pointers consulted

- `feedback_app_dark_website_light` — every surface dark (post-auth)
- `feedback_figma_ui_theme` — Figma reference for dropdown / typed-confirm / modal stack semantics
- `feedback_browser_smoke_test_before_done` — §9.4 manual QA gate
- `feedback_explain_for_nontechnical_founder` — §1.1 plain language + §1.2 caveman both included
- `feedback_build_better_not_easier` — store-URL pre-validation deferred (let-OAuth-fail is the simpler UX with no regression) but flagged for founder confirmation
- `feedback_image_export_locked` — N/A (no canvas in this PRD)
- `feedback_verify_with_docs` — Supabase + Reka + Pinia sources cited; no Figma claims raised
- `project_kova_avatar` — user-level scope confirmed; brand-delete is the user-scoped destructive action mirror of account-delete
- `project_design_system_master` — canonical paths cited in §13.4
- `project_pre_prd_audit_ratified` — D-5C Vite-SPA confirmed; no Nuxt/SSR introduced
- `project_m9_shopify_tools_schema_bug` — M9 OAuth reused verbatim per scope plan §5.5 disposition

### 13.8 What is NOT in this PRD (handed elsewhere)

- Dashboard chrome / sidebar (Cluster 02)
- Brand Kit settings UI + per-brand fonts / tone-snippets / saved-blocks editor (Cluster 05)
- Brand-color override picker (Cluster 05 Phase 2 — only Phase 2 item remaining for Cluster 03)
- `/account` shell + `.acc-rail` sidebar + `/account/brands` **route registration** (PRD 04; page content owned here per 2026-05-17 reversal)
- Shopify OAuth flow internals (M9 reuse)
- `<KovaModal>` / `useConfirm()` / `useToast()` / `<KovaSkeleton>` / `<TypedConfirmField>` / `<NotShippedYet>` / `idempotency_keys` / `audit_log` table + writer (Cluster 11; PRD 03 ships `writeAudit()` stopgap)
- Canvas brand-label rendering (Cluster 06 — reads `useBrandsStore.selectedBrand`)
- Trash / version-history cascades (Cluster 09 — must add `brand_id ON DELETE CASCADE` to its tables)
- GDPR account-deletion cascade (Cluster 01 — `brands.user_id ON DELETE CASCADE` already wired; account-delete fires through us indirectly)
- Sidebar "Brands" nav item rendering (PRD 02 — owns sidebar item rendering; per §12.10 resolves §12.11 Brands-item SOON pill removal)
- Archived-state context-menu items on brand cards (PRD 08 — `useObjectActions` composable adds Restore/Delete action set when `brand.archived_at !== null`)

---

**End of PRD 03.**
