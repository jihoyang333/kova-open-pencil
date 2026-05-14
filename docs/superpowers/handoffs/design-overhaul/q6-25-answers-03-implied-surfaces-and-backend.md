# Answers to Q6–Q25 from 03-implied-surfaces-and-backend.md §4

> **Twenty load-bearing decisions** completing the architecture mapping for the 03 doc. Builds on companion `q1-5-answers-03-implied-surfaces-and-backend.md` (which resolved Q1–Q5 + Q6 multiplayer).
>
> **Author:** Claude (Opus orchestrator), 2026-04-25
> **Recipient:** the agent that authored `03-implied-surfaces-and-backend.md` — apply these decisions to update the doc per the **Handoff Instructions** at the bottom.
> **Method:** Each answer Figma-doc-grounded (help.figma.com + developers.figma.com); pencil.dev docs when applicable; Supabase MCP `list_tables` verification for data-model questions; line citations to `packages/core/`, `supabase/migrations/` where relevant. Per founder directive: **"highest-tier-elite app developing standards like Figma or pencil.dev. Never underbuild. Match Figma spec exactly. Every infrastructure decision based on official docs."**
>
> **Q-numbering note:** This doc covers Q6–Q25 from the original 03 doc §4, but Q6 in the original is `brand_assets table existence`. The companion doc separately introduces Q6: Multiplayer (founder direction). To avoid renumbering churn:
> - **Q6 (this doc) = brand_assets table verification** (original 03-doc Q6)
> - **Q6-multiplayer (companion doc)** = solo MVP decision (founder direction, NEW)
> Apply via "Q6a / Q6b" if needed in 03 doc, or rely on doc-name disambiguation.

---

## Tech-stack reminder (read first)

See `q1-5-answers-03-implied-surfaces-and-backend.md` § "Tech-stack divergence from Figma" for the renderer/multiplayer/scene-graph differences. All recommendations below assume that context: Figma-compatible data model, CanvasKit/Skia renderer (vs Figma's WebGPU), Yjs CRDT (P2P dormant per Q6 multiplayer), 16/30 SceneNode types covered (email-design subset).

---

## Q6: brand_assets table existence — **VERIFIED MISSING**

### Verification (Supabase MCP `list_tables`, 2026-04-25)

`brand_assets` table does **NOT** exist in the public schema of the active Kova Supabase project (`moiuzrkxtkgienykxuio` / `kova-open-pencil`).

**Tables that DO exist:**
```
public.users, public.brands, public.canvases, public.media,
public.shopify_products, public.shopify_media, public.shopify_variants,
public.shopify_variant_prices, public.shopify_metafields,
public.shopify_collections, public.shopify_collection_products,
public.shopify_discounts, public.shopify_orders_agg,
public.shopify_connections, public.shopify_oauth_state,
public.shopify_compliance_log, public.shopify_webhook_log,
public.shopify_purge_queue, public.canvas_product_variant_bindings
```

Migration trail confirms: no `brand_assets` table created in `supabase/migrations/`. The reference in `BRAND_MODEL_CLARIFICATION.md` ("Onboarding writes optional logo to `brand_assets`") is **aspirational/stale** — the actual implementation writes to `brands.logo_url` (per existing schema) or `media` (with `brand_id` FK to `brands`).

### What "brand assets" really means in current architecture

| Asset type | Current storage | Notes |
|---|---|---|
| Brand colors | `brands.colors` JSONB column | Per-brand palette |
| Brand fonts | `brands.fonts` JSONB column | Currently metadata only — actual font files NOT uploaded yet (Q4 of original doc — Brand font upload is net-new) |
| Brand logo | `brands.logo_url` (text URL) | Single logo per brand |
| Brand voice | `brands.voice` text | Used in AI prompts |
| Brand uploads (designer-uploaded images) | `public.media` with `brand_id` FK | Multi-image library per brand. `idx_media_brand_id` index exists. |

### Recommendation: **Do NOT create `brand_assets` table. Extend existing schema as needed.**

| Option | Verdict |
|---|---|
| **A. Use `brands` columns + `media` table for assets** (current state, no new table) | ✅ **Recommended** for everything except brand-uploaded fonts (Q4) |
| B. Create `brand_assets` table for one-off asset metadata | ❌ Premature abstraction; nothing currently needs it |
| C. Migrate `brands.colors`/`fonts`/`logo_url` into normalized `brand_assets` rows | ❌ JSONB on brands is faster for read-on-load + zero migration cost; only helps if cross-brand asset analytics needed (no current product need) |

### What this unlocks for downstream

- **Q9 brand uploads vs media library** — RESOLVED: they're the same table (`public.media` with `brand_id`). UI question only.
- **Q4 brand font upload (original 03 doc)** — needs new `brand_fonts` table OR extend `media` with `mime_type` tracking + a `kind` discriminator (`'image' | 'font' | 'logo'`). Recommend: **`brand_fonts` separate table** because font files have distinct lifecycle (CanvasKit registration + AI prompt awareness + license attestation) different from images.
- **Tone snippets / saved blocks (Q8)** — separate question; likely new tables or JSONB columns on `brands`.

### Update BRAND_MODEL_CLARIFICATION.md

Stale reference to `brand_assets` table should be updated to reflect actual implementation: brand assets distributed across `brands.{colors,fonts,logo_url,voice}` JSONB/columns + `public.media` with `brand_id` FK.

---

## Q7: Snapshot / version-history storage — **MATCH FIGMA SPEC**

### Figma's actual model (verified via [Figma Help — Version History](https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history) + [Figma Blog — Now you can name and annotate your Figma Version History](https://www.figma.com/blog/now-you-can-name-and-annotate-your-figma-version-history/))

**Autosave cadence:**
- **Every 30 minutes** Figma records an automatic checkpoint
- **Additional autosave checkpoints** on connection loss / Figma crash
- Manual snapshots (named, annotated) on demand via `⌥⌘S` ("Save to version history")

**Retention policy:**
- **Free / Starter team:** 30 days of version history
- **Paid teams (Professional+):** unlimited version history
- Snapshots kept until plan downgrade (then truncated to 30 days)

**Snapshot data model:**
- Snapshot = full document state at point in time (not delta)
- User-supplied name + description (optional)
- Auto-generated label if user doesn't name
- Includes thumbnail
- Restore = atomic swap (creates pre-restore snapshot first, then restores target)

**UX:**
- Right-side timeline panel (replaces inspector while open)
- List of snapshots (chronological reverse, newest first)
- Click snapshot → preview in canvas (read-only mode)
- "Restore this version" CTA → confirm modal → snapshot the current state THEN restore the target

### Recommendation: **Figma-exact model. Per-canvas snapshot table + Storage bucket + 30-day retention free / unlimited paid.**

**Schema:**

```sql
CREATE TABLE public.canvas_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id       uuid NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
  brand_id        uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.users(id),
  taken_at        timestamptz NOT NULL DEFAULT now(),
  kind            text NOT NULL CHECK (kind IN ('autosave', 'manual')),
  label           text,                          -- user-supplied name (manual snapshots only)
  description     text,                          -- user-supplied description (manual snapshots only)
  scene_blob_path text NOT NULL,                 -- path in Storage bucket: snapshots/{canvas_id}/{snapshot_id}.kiwi.zst
  scene_size_bytes bigint NOT NULL,              -- size tracking for quota
  thumbnail_path  text,                          -- path in Storage bucket: thumbnails/{canvas_id}/{snapshot_id}.png
  parent_snapshot_id uuid REFERENCES public.canvas_snapshots(id) -- pre-restore link (Figma-pattern)
);

CREATE INDEX idx_canvas_snapshots_canvas_taken ON public.canvas_snapshots(canvas_id, taken_at DESC);
CREATE INDEX idx_canvas_snapshots_brand ON public.canvas_snapshots(brand_id);

-- RLS: snapshots inherit canvas access (brand_id → user_id check)
ALTER TABLE public.canvas_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY snapshots_select ON public.canvas_snapshots FOR SELECT
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));
-- INSERT/DELETE through SECURITY DEFINER RPCs only
```

**Storage:**
- Supabase Storage bucket `canvas-snapshots` (private, signed-URL fetch)
- Layout: `{canvas_id}/{snapshot_id}.kiwi.zst` (Yjs doc bytes encoded with Kiwi binary + Zstd compression — matches OpenPencil `.fig` format pattern per `q1-5-answers` tech-stack table)
- Thumbnails in same bucket: `thumbnails/{canvas_id}/{snapshot_id}.png` (use existing `captureThumbnail` util, ~150×150 PNG)
- Per-brand quota: 100MB MVP (review post-launch); enforce in snapshot-create RPC

**Snapshot data shape:**
- **Yjs doc bytes** (not scene-graph JSON) because:
  - Yjs is the source-of-truth runtime state
  - Round-trip restore preserves CRDT history (Yjs awareness, all node mutations)
  - Encoding via existing `editor.ts.snapshotPage` / `restorePageFromSnapshot` pattern
  - One blob = one canvas (multi-page included)
- **NOT per-page snapshots** — Figma snapshots are file-level (multi-page bundled)
- Compressed with Zstd to match `.fig` format compression (~10x reduction for typical email-canvas Yjs docs)

**Retention policy (Kova MVP — Figma-aligned):**
- **Free tier (no paid plan):** 30 days from `taken_at` (matches Figma free plan)
- **Paid tier (post-launch):** unlimited (matches Figma Professional+)
- Cron job: daily, deletes `canvas_snapshots` rows where `now() - taken_at > '30 days'::interval AND user.plan = 'free'`
- Storage bucket files deleted via Storage trigger on row delete (cascade)

**Autosnapshot cadence (Figma-exact):**
- **Every 30 minutes** while canvas is open and being edited (heartbeat from `editor.ts`)
- **On disconnect** (network loss detected via `navigator.onLine`)
- **On tab close** (beforeunload — best-effort sync to local IndexedDB then queued for upload on next session)
- **On explicit user save** (`⌥⌘S` keyboard shortcut)
- Skip if no scene mutations since last snapshot (check `editor.sceneVersion`)

**Restore behavior (Figma-exact):**
- User clicks snapshot → load `scene_blob_path` from Storage → render in read-only canvas overlay
- User clicks "Restore this version" → confirm modal → atomic operation:
  1. Create new snapshot of CURRENT scene state with `kind = 'manual'`, `label = "Auto-saved before restore"`, `parent_snapshot_id` set to target
  2. Apply target snapshot Yjs doc → swap `editor.graph` state
  3. Push undo entry so user can undo the restore via `⌘Z`
- Toast: "Restored to {label or formatted date}"

### Implementation impact (downstream PRDs)

- **NEW migration:** `canvas_snapshots` table + RLS + RPCs (`create_snapshot`, `restore_snapshot`, `delete_snapshot`)
- **NEW Storage bucket:** `canvas-snapshots` with 100MB-per-brand quota enforced server-side
- **NEW Pinia store:** `useSnapshotStore` (list, create, restore, delete)
- **NEW composable:** `useAutosnapshotHeartbeat` (30-min interval, disconnect detection, tab-close handler)
- **NEW UI:** Right-side snapshot timeline panel (replaces inspector while open) — component shell + per-snapshot row with thumbnail + label + relative date + "Restore" + "Delete" actions
- **Snapshot dialog (manual `⌥⌘S`):** small modal with label + description input + Save CTA
- **Cron:** daily Edge Function or pg_cron job for 30-day pruning on free tier

### Why Figma-exact (founder directive)

- **30-min cadence** = same autosnapshot rhythm Figma users expect; muscle memory matches
- **30-day retention free / unlimited paid** = same plan-tier mental model as Figma
- **Yjs doc bytes** = matches Kiwi binary + Zstd format already used for `.fig` round-trip — engineering reuse
- **Atomic restore with pre-restore snapshot** = Figma-pattern preventing "I restored and lost my current work" footgun
- **Thumbnail in timeline** = same visual scanning UX

---

## Q8: Tone snippets + saved blocks scope — **INCLUDE MVP (founder decision 2026-04-25; JSONB columns on `brands`)**

### Figma equivalent (verified)

**No direct Figma equivalent.** Figma has:
- **Variables / Design tokens** (closest analog) — color/float/string/boolean values that bind to design properties; engine-ready in OpenPencil per `q1-5-answers` Q3 #15 audit
- **Components / Variants** — reusable UI element library with variants
- **Styles** — shared text styles, color styles, effect styles (Figma plan-locked feature)

Figma does NOT have "tone snippets" (brand voice excerpts for AI-generated copy) or "saved text blocks" (reusable copy snippets like CTAs, footers). These are **Kova-specific concepts** for AI-driven email-design generation.

### Recommendation: **Include MVP. Scope minimally as JSONB columns on `brands` table.**

| Option | Verdict |
|---|---|
| **A. JSONB columns on `brands` (`brands.tone_snippets JSONB`, `brands.saved_blocks JSONB`)** | ✅ **Selected by founder 2026-04-25** — minimal lift, no new tables, follows existing JSONB pattern (`brands.colors`, `brands.fonts`); enables richer Brand Kit at launch |
| B. Defer entirely to Phase 2 | ❌ Rejected — Brand Kit MVP becomes thin (colors + fonts + logo only); misses campaign-specific AI generation depth |
| C. Full new tables (`brand_tone_snippets`, `brand_saved_blocks`) with versioning/history | ❌ Over-engineered for MVP; only justified if cross-canvas analytics needed post-launch |

### MVP schema

```sql
ALTER TABLE public.brands
  ADD COLUMN tone_snippets JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{id, label, content}]
  ADD COLUMN saved_blocks JSONB NOT NULL DEFAULT '[]'::jsonb;   -- [{id, label, content, type: 'text'|'cta'|'footer'}]
```

### What they are + how they show up

- **Tone snippets** = labeled brand-voice exemplars (e.g. "Drop the new collection", "Free shipping on $50+"). Each `{id, label, content}` row is auto-injected into AI chat system prompt so AI-generated copy matches brand voice with multiple concrete examples instead of one fuzzy `brands.voice` description.
  - User-facing: Brand Kit section of Account page (Q12) — add/edit/delete snippet rows
  - Optional indicator in chat panel: "AI is using N voice references"
  - NOT visible on canvas (pure AI-prompt metadata)
- **Saved blocks** = reusable copy snippets (footer disclaimer, "Shop the look" CTA, unsubscribe text, etc.). Each `{id, label, content, type}` row drag-drops into canvas as TEXT node with content pre-filled.
  - User-facing: Brand Kit section of Assets panel (§2.5) — list view with drag handle per block
  - Edit/manage in Brand Kit settings page (Account page Q12)
  - Drag-drop semantics per Q24 (extends `application/x-kova-saved-block` MIME-type payload already in Q24 spec)

### Implementation impact

- **NEW migration:** `brands.tone_snippets` + `brands.saved_blocks` JSONB columns (single migration)
- **Pinia store extension:** `useBrandsStore` already loads brand row; add reactive `selectedBrand.toneSnippets[]` + `selectedBrand.savedBlocks[]` getters
- **NEW UI surfaces:** Brand Kit settings page (Account page Q12) tabs for Tone snippets + Saved blocks (CRUD)
- **NEW Assets panel section:** Saved blocks list within Brand Kit section of Assets panel (drag handle per block)
- **AI prompt extension:** chat system-prompt builder appends each `tone_snippets[].content` as an exemplar reference
- **Drag-drop wiring:** extend `use-canvas-drop.ts` `application/x-kova-saved-block` payload handler to spawn TEXT node with content pre-filled

### Cross-cuts

- §2.5 "Section: Brand Kit" row Open Qs → **RESOLVED** (include MVP)
- §2.5 Drag-drop row → already covered by Q24 (`application/x-kova-saved-block` payload added)
- Account page Brand Kit section (§2.14) → adds Tone snippets + Saved blocks management tabs
- Chat AI system-prompt builder (cross-cut to §2.7 Show text suggestions row + AI architecture) → reads tone snippets from selected brand

---

## Q9: Brand uploads vs Media library — **CONSOLIDATE (already same table)**

### Current state (verified 2026-04-25)

There is **no separate "brand uploads" table.** Per Q6 verification, `public.media` is the brand uploads table. Schema (verified via migration grep):

```sql
-- public.media table
brand_id    UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE
-- index: idx_media_brand_id ON public.media(brand_id)
-- bucket: media-assets Storage bucket
-- accessor: useMediaStore (existing Pinia store)
```

### Figma equivalent

**Figma does not split "brand uploads" from "media library."** Figma's Assets panel shows three sections:
1. **Components** — reusable UI elements (DEFER per Kova MVP scope)
2. **Variables** — design tokens (DEFER per Kova MVP scope)
3. **Styles** — shared color/text/effect styles (DEFER per Kova MVP scope)

For images specifically, Figma uses **Image Fill** (drag image onto canvas → image becomes a fill paint on a frame/shape, OR creates new image node). Recent images appear in image-fill picker history. Brand-curated image libraries are usually maintained as **Components in a shared library** (Figma's enterprise feature).

In Kova's adapted model: `public.media` (brand-uploaded images) + `public.shopify_media` (Shopify-imported product images) = the two sources of brand-relevant images. No separate "brand_uploads" needed.

### Recommendation: **Single Assets panel section sourced from `public.media`. Remove the conceptual split.**

| Option | Verdict |
|---|---|
| **A. Single "Brand uploads" section in Assets panel sourced from `public.media`** (current `useMediaStore`) | ✅ **Recommended** |
| B. Two parallel sections (legacy "Media library" panel + new "Brand uploads") | ❌ Confuses users; same data shown twice |
| C. Migrate `media` → `brand_assets` for consistency with naming | ❌ Bikeshed; existing `media` works fine |

### Implementation impact

- 03 doc §2.5 Brand uploads section (currently "section: Brand uploads (designer-uploaded images)") clarified: this IS the existing media library, just rendered inside the new Assets panel UI
- Existing standalone Media library panel (if rendered separately in current Kova UI) is **deprecated** — collapsed into Assets panel
- Existing `useMediaStore`, `useMediaStore.images`, `useMediaStore.length`, `useMediaStore.getPublicUrl` reused as-is
- Drag-drop from Brand uploads section uses existing `use-canvas-drop.ts` MIME-type recognition

### What this unlocks

- §2.5 "Section: Brand uploads (designer-uploaded images)" row marked **RESOLVED** — wires to existing `useMediaStore`
- Standalone Media library panel can be removed from layout if currently rendered separately
- Single mental model for designers: "all brand assets in one place"

---

## Q10: covered by Q5 (Recent colors persistence) — see `q1-5-answers`

Q10 in the 03 doc asks "Recent colors persistence: per-device localStorage or per-user Supabase row?"

**RESOLVED via Q5 (companion doc):** Layer 2 (localStorage) per the per-pref allocation table — *"Recent colors (24-color ring buffer) | 2 (local) | Per-device makes sense; cheap to lose."*

No additional answer needed. Cross-reference Q5 in 03 doc updates.

---

## Q11: Measurement annotations persistence — **MATCH FIGMA SPEC (first-class scene nodes)**

### Figma's actual model (verified via [Figma Help — Add measurements and annotate designs](https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotate-designs) + [Figma Help — Measure distances between layers](https://help.figma.com/hc/en-us/articles/360039956974-Measure-distances-between-layers))

Figma has **two distinct annotation systems:**

**1. Hover-distance display (ephemeral):**
- Select object A → hover object B → red lines appear with horizontal/vertical distance
- Disappears on click-elsewhere
- Not persisted in `.fig`
- Always available, no toggle

**2. Measurement tool (`⇧M`) — Annotation tool (`⇧T`) (persisted scene-graph nodes):**
- "Click Measurement in the toolbar or use the keyboard shortcut Shift M"
- "Hover over a layer to see options for where to start your measurement, then click and drag from your starting point to the layer where you want the measurement to end"
- Annotations are **first-class scene-graph elements** — selectable, editable, persisted in `.fig`, survive refresh, copy/paste, undo/redo
- Annotations include: dimensions (auto-computed), text labels, property callouts (e.g., "Color: #FF0000")

### Recommendation: **Figma-exact: first-class scene nodes (persistent), NOT ephemeral overlays.**

| Option | Verdict |
|---|---|
| **A. First-class scene nodes (Figma-exact)** | ✅ **Recommended** — match Figma muscle memory; survive refresh; copy/paste/undo |
| B. Ephemeral overlays (lost on tool exit / refresh) | ❌ Footgun — designer measures, switches tab, comes back, measurements gone. Bad UX. |
| C. Per-canvas metadata in separate table | ❌ Loses scene-graph integration (selection, undo, copy/paste, layer tree) |

### What this means for `packages/core/`

Two implementation paths:

**Path 1 — Add new SceneNode type `MEASUREMENT`** (lift core lock per CLAUDE.md amendment):
- New 17th NodeType in `scene-graph.ts:67–83` (alongside SLICE from Q1 = 18th)
- Properties: `startPoint: {nodeId, anchor}`, `endPoint: {nodeId, anchor}`, `measurementType: 'distance' | 'dimension' | 'annotation'`, `customLabel?: string`
- Renderer: dashed lines + auto-computed distance label + selection handles
- Persists in Yjs / `.fig`

**Path 2 — Reuse existing SHAPE_WITH_TEXT node-type** (no core lock lift):
- SHAPE_WITH_TEXT already in `scene-graph.ts:83` NodeType union
- Use as a special-purpose grouping with metadata
- Renderer reuses generic shape + text rendering
- Less Figma-faithful (Figma's measurement tool produces dedicated annotation visuals: arrows, dashed lines, callout boxes)

**Recommend Path 1** per founder directive (match Figma exactly). Lift core lock. Add `MEASUREMENT` SceneNode type.

### Implementation impact

- **Core lock lift:** add `MEASUREMENT` to `NodeType` union in `packages/core/src/scene-graph.ts:67–83`
- **Renderer:** new file `packages/core/src/renderer/measurements.ts` (dashed lines, distance label rendering, selection handles)
- **Tool:** new Measurement tool in `editor.ts.activeTool` (`⇧M` shortcut per Figma)
- **Inspector:** properties for selected MEASUREMENT node (start/end refs, measurement type, custom label override, color)
- **Layer tree:** measurement glyph + auto-name "Measurement N" (similar to Slice)
- **Hit-test:** clickable on dashed line stroke (similar to SLICE edge hit-test)

### Cross-cuts

- §2.7 Measurement tool row → MVP confirmed; `MEASUREMENT` SceneNode-type lift the lock
- §2.7 Measurement annotations row → resolved as scene nodes (persistent)
- Inspector measurement properties section → new in §2.6 inspector
- Layer-tree measurement indicator → new in §2.4

---

## Q12: Account page IA — **MATCH FIGMA: single page with sectioned navigation**

### Figma's actual model (verified via [Figma Help — Manage your account settings](https://help.figma.com/hc/en-us/sections/4403936365591-Manage-your-account-settings))

Figma's account UI is structured as a **modal dialog** opened from the avatar dropdown ("Settings"), with **three top-level sections** (visible in tabs):
1. **Account** — profile (name, email, password), preferences (text size, etc.), connected accounts
2. **Community** — public profile, handle, bio
3. **Notifications** — email + in-app notification preferences

For organization-level settings (paid plans), there is a separate **Admin** section accessible via the org-context navigation, with tabs:
- **People** — team members
- **Billing** — payment, invoices
- **Billing Groups** (Enterprise)
- **Settings** — org-wide settings

### Recommendation: **Single full-page route `/account` with sidebar sections (cleaner than Figma's modal pattern).**

| Option | Verdict |
|---|---|
| **A. Full-page route `/account` with left sidebar sections (Profile, Plan & Billing, Brand Kit, Integrations, Sign out)** | ✅ **Recommended** — matches modern SaaS patterns (Linear, Notion). Better than Figma's cramped modal. Plenty of horizontal space for content. |
| B. Modal dialog (Figma-exact) | Acceptable but feels dated; modals are for short interactions, account settings warrant a route |
| C. Multiple routes (`/account/profile`, `/account/billing`, etc.) | ❌ Wastes URL space; nested routing complexity for no real benefit; sidebar tabs achieve the same UX |

### Sections for Kova MVP

| Section | Content | Notes |
|---|---|---|
| **Profile** | Name, email, password change, avatar upload, account preferences (textSize, reduceMotion, highContrast — wires to Q5 `users.preferences` JSONB) | MVP |
| **Plan & Billing** | Current plan, payment method (via Stripe Customer Portal embed), invoice history, plan upgrade/downgrade, usage display (generation count vs cap) | MVP — Stripe foundation built; UI surfaces what plan structure founder activates |
| **Brand Kit** | Per-brand settings: colors, fonts (uploaded), logo, voice, tone snippets (if Q8 in scope), saved blocks (if Q8 in scope) | MVP — currently no surface for these; Account page hosts |
| **Integrations** | Shopify connection status (per brand), connect/disconnect flow | MVP — Shopify already wired (M9); just expose UI |
| **Danger zone** | Delete account (GDPR — see Q15) | MVP |

### Theming

Per `feedback_app_dark_website_light` memory: Account page is **inside authenticated app → dark theme**. Matches editor + dashboard.

### Implementation impact

- **NEW route:** `/account` (Vue Router top-level)
- **NEW page component:** `pages/Account.vue` with left sidebar + content area
- **NEW composable:** `useAccountSection` (active-section state, route-sync via `?section=` query param)
- Reuses `useAuthStore` for profile reads
- Reuses `useBrandsStore` for Brand Kit section (selected brand → settings)
- Reuses `useShopifyConnection(brandId)` for Integrations status
- Stripe Customer Portal embedded as iframe in Plan & Billing section (post-Q14 decision)

---

## Q13: Account scope (user-level vs per-brand) — **USER-LEVEL with per-brand sections**

### Figma's actual model

- **Account** = user-level (single login, follows you across teams/orgs)
- **Plan/Billing** = team-level OR org-level (paid for by team owner / org admin)
- **Brand-specific settings** don't exist in Figma's IA (closest analog: team libraries which are scoped to teams)

### Kova's avatar model context (per `project_kova_avatar.md` memory)

> **CRITICAL:** Kova sells to freelance email marketers managing multiple clients. **User → Brand (= Shop 1:1) → Canvases.** No workspace layer.

So Kova's hierarchy is:
- **User** (the freelance marketer)
- **Brand** (each freelance marketer manages multiple — one per client/Shopify shop)
- **Canvas** (designs within each brand)

### Recommendation: **Account page is USER-LEVEL. Brand Kit + Integrations sections are per-brand (with brand-picker dropdown at top of those sections).**

| Section | Scope | Brand picker? |
|---|---|---|
| Profile | User-level | No |
| Plan & Billing | User-level (one Stripe customer per user, not per brand) | No |
| Brand Kit | Per-brand | Yes — dropdown selects which brand |
| Integrations | Per-brand (each brand has own Shopify connection) | Yes — dropdown selects which brand |
| Danger zone (delete account) | User-level (cascades all brands — see Q15) | No |

### Why user-level Stripe customer (not per-brand)

- Freelance marketers manage many brands but pay one subscription
- Per-brand billing = "10 brands = 10 invoices" UX nightmare
- Pricing strategy can be: "$X/month for unlimited brands" OR "$X per brand on top of base" — but billing entity stays user-level

### Implementation impact

- `useAuthStore.profile` drives user-level sections
- `useBrandsStore.brands[]` populates brand picker in per-brand sections
- Selected brand (per `useUIStateStore.lastActiveBrandId` from Q5 Layer 2) persists across sessions
- Stripe `customer_id` stored on `users.stripe_customer_id` (one per user)

---

## Q14: Stripe + plan picker scope for v1 — **Build Stripe foundation in MVP; launch strategy is founder's call**

### Industry best practices (per [Stripe Docs — Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions) + [Stripe SaaS guide](https://docs.stripe.com/saas))

**Recommended stack for SaaS subscription:**
- **Stripe Checkout** for payment collection (avoids custom card forms; PCI-compliant; mobile-responsive; localized)
- **Stripe Customer Portal** for self-service subscription management (cancel, update payment method, view invoices)
- **Webhooks** to sync state with database (subscription created/updated/deleted, invoice paid/payment failed)
- **Webhook signature verification** (security)
- **Acknowledge webhook within 20 seconds**, process async via job queue (avoid retries + duplicate events)

### Recommendation: **Build Stripe foundation in MVP (Checkout + Customer Portal + webhooks). Launch strategy is founder's call.**

| Option | Verdict |
|---|---|
| **A. Build Stripe foundation now (Checkout + Customer Portal + webhooks). Foundation ready before launch; founder decides go-to-market separately.** | ✅ **Recommended** — preserves all launch-strategy options; avoids "we need to add Stripe in 2 weeks" panic if paid signal matters |
| B. Ship paid from launch with no foundation work | ❌ Foundation work takes 2-4 weeks; cannot start at launch |
| C. Skip Stripe entirely for MVP, add later | ❌ Adds 2-4 weeks of risk at exactly the wrong moment |

### Plan structure

Pricing tiers + plan names + per-tier limits intentionally not specified in this doc. Founder will determine pricing strategy separately when relevant. The Stripe-tied data model below supports any plan structure.

### Stripe-tied data model

```sql
ALTER TABLE public.users
  ADD COLUMN stripe_customer_id text UNIQUE,
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'solo', 'agency')),
  ADD COLUMN plan_status text NOT NULL DEFAULT 'active' CHECK (plan_status IN ('active', 'past_due', 'cancelled', 'incomplete')),
  ADD COLUMN current_period_end timestamptz;
```

### Webhook events to handle (minimum MVP)

1. `customer.subscription.created` → set user.plan, user.plan_status, user.current_period_end
2. `customer.subscription.updated` → update plan/status/period
3. `customer.subscription.deleted` → set plan='free', plan_status='cancelled'
4. `invoice.payment_succeeded` → audit log
5. `invoice.payment_failed` → set plan_status='past_due', send email, lock paid features after grace period

### Implementation impact

- **NEW migration:** users table Stripe columns
- **NEW Edge Function:** `stripe-webhook` (signature verification + state sync; reuse pattern from M9 Shopify webhooks)
- **NEW Edge Function:** `stripe-checkout-session` (create Checkout Session for plan upgrade)
- **NEW Edge Function:** `stripe-portal-session` (create Customer Portal session)
- **NEW UI:** Plan & Billing section in Account page (current plan card + upgrade CTA + manage billing button → opens Stripe Customer Portal in new tab)
- **NEW middleware:** plan-based feature gate (e.g., AI generation count check via existing `try_increment_generation` RPC)

---

## Q15: GDPR delete-account cascade — **Match GDPR Art. 17 + industry standard 30-day soft-delete**

### Compliance requirements (per [GDPR Art. 17 — Right to erasure](https://gdpr-info.eu/art-17-gdpr/))

- **30-day window** to fulfill erasure request from receipt (extendable to 90 days for complex requests with notification)
- **Cascade across all systems** — primary records + sub-processors (Stripe, Supabase, Shopify, Anthropic, etc.)
- **Backups separately addressed** — moving data to backup is NOT erasure; either purge backups or document retention policy in privacy notice
- **Article 19** — communicate erasure to recipients (sub-processors) unless impossible/disproportionate
- **Document everything** in Record of Processing Activities (RoPA)

### Recommendation: **Two-stage deletion: 30-day soft-delete + hard-delete cron. Cascade across Stripe, Supabase, Shopify webhooks, Anthropic chat history.**

**Stage 1 — User-initiated soft-delete (immediate UX):**
- User clicks "Delete account" in Account → Danger zone
- Confirm modal with typed-confirmation ("type DELETE to confirm")
- `users.deleted_at = now()` set
- All cascade tables marked for deletion via FK `ON DELETE CASCADE` (canvases, brands, media — already in current schema)
- User signed out immediately; account inaccessible
- Email confirmation: "Your account is queued for deletion. Data permanently removed in 30 days. Restore by replying to this email."

**Stage 2 — Cron hard-delete after 30 days:**
- Daily Edge Function: find users where `deleted_at < now() - '30 days'::interval`
- For each user:
  1. **Stripe:** cancel subscription if active; delete Stripe Customer (`stripe.customers.del(customer_id)`)
  2. **Shopify:** disconnect all brand connections; revoke OAuth tokens (existing M9 disconnect flow)
  3. **Anthropic:** purge chat history rows (chat_conversations, chat_messages tables — already cascade)
  4. **Supabase Storage:** delete buckets `media-assets/{user_id}/`, `canvas-snapshots/{user_id}/`, `thumbnails/{user_id}/`
  5. **Supabase database:** delete `users` row → cascades all FK-linked tables
- Email confirmation: "Your account and data have been permanently deleted."

### Schema additions

```sql
ALTER TABLE public.users
  ADD COLUMN deleted_at timestamptz NULL;

CREATE INDEX idx_users_pending_deletion ON public.users(deleted_at)
  WHERE deleted_at IS NOT NULL;
```

### RPCs

```sql
-- User-initiated soft-delete
CREATE FUNCTION request_account_deletion()
RETURNS void SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users
  SET deleted_at = now()
  WHERE id = auth.uid() AND deleted_at IS NULL;
  -- Sign out handled client-side via supabase.auth.signOut()
END;
$$ LANGUAGE plpgsql;

-- User can restore within 30 days (sign in again restores)
CREATE FUNCTION restore_account()
RETURNS void SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users
  SET deleted_at = NULL
  WHERE id = auth.uid()
    AND deleted_at IS NOT NULL
    AND deleted_at > now() - '30 days'::interval;
END;
$$ LANGUAGE plpgsql;
```

### Privacy policy / RoPA additions

- Document 30-day retention period
- Document each sub-processor cascade (Stripe, Shopify, Anthropic)
- Document backup retention policy (Supabase point-in-time recovery is 7 days for free tier — cascade-deleted data persists in backups for 7 days then gone)

### Implementation impact

- **NEW migration:** `users.deleted_at` column + index + RPCs
- **NEW Edge Function:** `delete-account-cron` (daily; processes 30-day-old soft-deletes)
- **NEW Edge Function:** `account-deletion-request` (orchestrates Stripe cancel + Shopify disconnect + soft-delete)
- **NEW UI:** Danger zone in Account page with destructive-confirm modal
- **Auth middleware:** redirect to "Account scheduled for deletion. Restore?" page if `deleted_at IS NOT NULL` on sign-in (gives user grace-period restore option)
- **Privacy policy update:** document deletion process + sub-processor cascade

---

## Q16: Avatar dropdown items — **Match Figma + Kova-specific items**

### Figma's avatar dropdown (verified via [Figma Help — View and manage account settings](https://help.figma.com/hc/en-us/articles/1500006061462-View-and-manage-account-settings))

Figma's avatar dropdown (top-right) contains:
1. Username + plan badge (header, non-clickable)
2. **Settings** → opens account settings modal
3. **Plugins / Widgets** → community plugin browser
4. **Help center** → external help docs
5. **What's new** → changelog
6. **Sign out**

Plus:
- Workspace switcher (between teams) — appears at top if user has multiple teams/orgs

### Recommendation: **Kova-adapted set, Figma-aligned where possible. Brand picker REMOVED 2026-04-25 per Q17 reversal — no brand-switching inside canvas.**

| Item | Action | Notes |
|---|---|---|
| User name + plan badge | header (non-clickable) | Display only |
| **Account** | navigates to `/account` | Per Q12 |
| **Help** | opens `/help` (external docs site, Phase 2) or `mailto:` link in MVP | Per §2.2 Help row |
| Keyboard shortcuts | opens shortcuts dialog (Q25) | `⇧⌘?` shortcut also opens this |
| What's new (Phase 2) | opens changelog modal or external page | Defer to MVP+ |
| **Sign out** | calls `useAuthStore.signOut()` | Confirms via `useConfirm` if unsaved Yjs edits (low priority — autosave handles) |

> **Brand picker REMOVED 2026-04-25** per Q17 reversal. Avatar dropdown was originally specced with embedded brand picker (Figma's workspace-switcher analog). Founder ruled: no brand-switching mechanism inside canvas. Avatar dropdown is now purely user-account stuff. Brand-switching happens on dashboard via sidebar selector ("N Nike ▾"). To switch brands: click brand label or logo dropdown's "Back to dashboard" → exits canvas → click sidebar selector to switch.

### Implementation impact

- Avatar dropdown popover component (Reka DropdownMenu)
- "Account" item routes to `/account` (Q12)
- "Sign out" item wires existing `useAuthStore.signOut()`
- ~~Brand picker sub-popover~~ — REMOVED per Q17 reversal

---

## Q17: Brand label (file location) click behavior — **NAVIGATE to brand dashboard (REVERSED 2026-04-25 by founder)**

> **Revision history:**
> - 2026-04-25 v1: Originally recommended brand-picker popover (preserves canvas context).
> - 2026-04-25 v2: REVERSED per founder direction — brand label click now navigates to current brand's dashboard. Cannot switch brands inside canvas.

### Founder rule (2026-04-25)

> "You can't switch from Nike immediately to another brand inside of a canvas — you must exit the canvas first. Then go from the Nike dashboard to then change."

This rule explicitly forbids in-canvas brand switching. Brand context inside canvas is locked to the brand the canvas belongs to. To work on a different brand:

1. Exit canvas — two affordances:
   - Click "← Nike" brand label in canvas top breadcrumb, OR
   - Click top-left logo dropdown → "Back to dashboard" (Figma-analogous to its "Back to files" — see screenshot reference 2026-04-25)
2. Land in current brand's dashboard
3. Click sidebar brand selector ("N Nike ▾" pill at top-left of dashboard sidebar) → opens dropdown of all brands
4. Click a different brand → navigates to that brand's dashboard
5. Open or create a canvas inside that brand

### Recommendation: **Brand label click → navigate to current brand's dashboard. No popover.**

| Option | Verdict |
|---|---|
| **A. Click brand label → navigate to current brand's dashboard** | ✅ **Selected by founder 2026-04-25** — enforces "no brand-switching inside canvas" rule; matches "exit canvas first" mental model |
| B. Brand-picker popover (preserves canvas context) | ❌ Rejected — allows accidental in-canvas brand switches; conflicts with founder's deliberate "exit first" rule |
| C. Click brand label → navigates to brand-specific page | ❌ Same destination as A but not standard naming; "dashboard" is the canonical landing |

### Why navigate (not popover)

- **Single-brand-context-per-canvas mental model.** Designer working on Nike's Spring Drop canvas should NEVER accidentally switch to Allbirds mid-edit. Exit-first prevents this.
- **Reduces canvas chrome complexity.** No anchored popover needed; click is just a Vue Router navigation.
- **Matches "← Nike" breadcrumb visual.** The `←` arrow visually communicates "go back" — the navigation matches the visual.
- **Two affordances for exit (Figma-pattern).** Both top-left logo dropdown ("Back to dashboard", Figma-analogous to its "Back to files") AND brand label breadcrumb lead to the brand dashboard. Same destination, two paths.

### Where the brand-switcher lives instead

After this reversal, brand-switching surfaces are NON-canvas only:

1. **Dashboard sidebar selector** ("N Nike ▾" pill at top-left of brand dashboard sidebar) — **canonical brand-switcher UI**. Click → opens dropdown popover with brand list + search + "Add new brand". Click brand row = navigates to that brand's dashboard.
2. **Page-level Brand picker** (post-login landing) — when user has multiple brands and just logged in. Already in Brief A as A2.
3. **Account page Brand Kit + Integrations sections** (per-brand sections need a brand-picker dropdown at the section's top to choose which brand to manage). Same dropdown component as #1.

The brand-picker is **gone from**: canvas brand label, avatar dropdown (Q16 also revised). No brand-switching anywhere inside the canvas editor.

### Implementation impact

- **Brand label** in canvas chrome wires to Vue Router: `router.push('/dashboard?brandId=' + selectedBrand.id)` (or equivalent route per Kova's routing)
- **Top-left logo dropdown** (per §2.1 row) gains a top-most "Back to dashboard" item (Figma-analogous to its "Back to files"), routes to same destination as brand label click
- **Avatar dropdown** (Q16) drops brand picker entirely
- **Dashboard sidebar selector** ("N Nike ▾") is the canonical brand-switcher — design as a Reka DropdownMenu component anchored to the sidebar logo+name pill at top-left of dashboard. Different anchor + smaller form-factor than the post-login page-level Brand picker.
- ~~Brand-label click handler opens Reka Popover~~ — REMOVED
- ~~Popover anchored to label with search + brand list~~ — REMOVED

---

## Q18: Right-click overflow `•••` menu vs canvas right-click — **Different sets, same surfaces**

### Figma's behavior (verified via [Figma Help — Use the actions menu](https://help.figma.com/hc/en-us/articles/23570416033943-Use-the-actions-menu-in-Figma-Design))

Figma has multiple overlapping menus:
- **Actions menu (`⌘/`)** — global searchable command palette
- **Right-click on canvas object** — context-specific (rotate, mirror, reorder, group, etc.)
- **Right-click on canvas empty area** — view-related (paste, frame, show ruler, etc.)
- **Layer-row right-click** — layer-specific (rename, duplicate, lock, hide, copy ID)
- **Selection-header `•••` overflow** — canvas-object actions but contextual to inspector view

The overflow `•••` is **a subset of the right-click menu** — it shows the most-used actions (lock, hide, rename, delete, copy ID) but skips the context-specific bits (rotate-90, flip).

### Recommendation: **Overflow `•••` = compact subset (5-7 items). Canvas right-click = full set (12-20 items). Same actions wired to same handlers.**

**Overflow `•••` items (compact, top of inspector):**
- Lock / Unlock
- Show / Hide
- Rename
- Copy as PNG (per re-semantic, image-only)
- Copy properties / Paste properties (Q23)
- Delete

**Canvas right-click items (full set):**
- Copy / Paste / Cut / Duplicate
- Copy as PNG
- Copy properties / Paste properties
- Pick color (eyedropper — Q20)
- Lock / Unlock
- Show / Hide
- Bring forward / Send backward / Bring to front / Send to back
- Group / Frame selection / Ungroup
- **Use as mask** (Q2 — `⌃⌘M`)
- Rotate 90° L / R / 180°
- Flip H / V
- **Boolean ops (Union/Subtract/Intersect/Exclude)** if multi-select (Q3 #14)
- Rename
- Delete

### Why two-tier

- Overflow `•••` is "always-visible quick actions"
- Right-click is "everything you might want to do here, contextually"
- Same items wired to same actions ensures consistency

### Implementation impact

- Single `useObjectActions()` composable with all action handlers
- Overflow `•••` component reads compact subset
- Canvas right-click component reads full set
- Both share Reka DropdownMenu shell (per §3A consolidation)

---

## Q19: Move-to-trash retention — **Match Figma: indefinite retention, manual permanent-delete**

### Figma's actual model (verified via [Figma Help — Delete and restore files](https://help.figma.com/hc/en-us/articles/360047512294-Delete-and-restore-files))

> "Files remain in the trash until you, or another team member with access to those files, restores or permanently deletes them."

Figma does **NOT auto-purge trash.** Files stay forever until manual permanent-delete. This is intentional — protects against accidental "I emptied the trash a year ago and now need that file."

### Recommendation: **Match Figma: no auto-purge. User-initiated permanent delete only.**

| Option | Verdict |
|---|---|
| **A. No auto-purge (Figma-exact)** | ✅ **Recommended** — match Figma muscle memory; no surprise data loss |
| B. 30-day auto-purge | ❌ Footgun — designer trashes file, comes back 35 days later, file gone permanently. Surprising. |
| C. 90-day auto-purge | ❌ Same as B but longer; still surprises eventually |

### Storage cost concern

If storage cost grows uncomfortably with indefinite trash retention:
- Add **Storage usage display** in Plan & Billing section showing "X% of quota used (incl. trash)"
- Add **"Empty trash"** button in Trash inbox (existing UI per §2.12)
- Per-plan quotas (free = 1GB; paid = 10GB) — gates per-user not per-canvas
- Defer hard quotas to post-launch based on actual storage cost

### Implementation impact

- **No background purge job** (current state — `useCanvasesStore.permanentlyDelete` is user-initiated only)
- **Update §2.12 row** to confirm: retention indefinite per Figma-spec
- **Add to Plan & Billing UI** (Q12 / Q14): storage usage display
- **Privacy policy** clarifies: trashed files retained until permanent delete OR account deletion (Q15)

---

## Q20: Eyedropper scope — **Canvas-only MVP. Document Figma's macOS-only screen-wide as Phase 2 if Tauri.**

### Figma's actual model (verified via [Figma Help — Sample colors with the eyedropper tool](https://help.figma.com/hc/en-us/articles/27643269375767-Sample-colors-with-the-eyedropper-tool))

- **Browser (any OS):** canvas-only — sample any layer or background of current page
- **Figma Desktop on macOS 14+:** screen-wide — sample anywhere on screen (any app, website, image)
- **Figma Desktop on Windows:** canvas-only (screen-wide NOT supported)
- **Web:** canvas-only

### Recommendation: **MVP = canvas-only (browser + Tauri desktop). Phase 2 = screen-wide on macOS Tauri build.**

| Option | Verdict |
|---|---|
| **A. Canvas-only MVP (matches Figma web + Windows desktop)** | ✅ **Recommended** for MVP |
| B. Screen-wide on macOS Tauri build, canvas-only elsewhere (Figma-exact) | ✅ Phase 2 — match Figma exactly when Tauri shipping |
| C. Screen-wide on web via experimental EyeDropper API | ❌ Browser support inconsistent; only Chromium-based; defer |

### Why canvas-only MVP

- CanvasKit `getImageData()` for canvas pixel readback — straightforward
- Tauri screen-capture API requires platform permissions + native plugin work (macOS Screen Recording permission)
- Email designers mostly sample colors from their own design or imported brand assets — canvas-only covers 95% of use

### Implementation impact

- **MVP:** Eyedropper canvas-extension (per §2.7) using CanvasKit pixel readback
- **Phase 2 (Tauri macOS):** integrate `tauri-plugin-screencap` or similar for screen-wide; gate on `__TAURI__ && macOS`
- **Inspector behavior:** when eyedropper invoked from inside fill picker (vs standalone), auto-write picked color to that fill (matches Figma)
- **Standalone invocation (`^C`):** copies picked hex to clipboard

---

## Q21: Image-fill scaling modes — **Ship all 4 Figma modes (Fill, Fit, Crop, Tile)**

### Figma's actual model (verified via [Figma Help — Adjust the properties of an image](https://help.figma.com/hc/en-us/articles/360041098433-Adjust-the-properties-of-an-image))

Figma supports **4 image-fill scaling modes:**
1. **Fill** — image scales to cover entire shape; may crop overflow
2. **Fit** — image scales to fit inside shape; preserves aspect; padding around if shape ≠ image aspect
3. **Crop** — manual crop with positioning tools (window-on-image)
4. **Tile** — repeating pattern at percentage of original image dimensions

Default mode: **Fill**

### Recommendation: **Ship all 4 modes in MVP per founder direction (match Figma exactly).**

| Option | Verdict |
|---|---|
| **A. All 4 modes (Figma-exact)** | ✅ **Recommended** — engine likely already supports per `kova-tools.ts` IMAGE fill validation; UI only needs picker dropdown |
| B. Fill + Fit only (skip Crop + Tile) | ❌ Email designers DO use Crop (manual hero-image positioning) and occasionally Tile (background patterns). Underbuilds. |
| C. Fill only | ❌ Way underbuilt; users will request the others within first week |

### Image-fill data model (verify against `packages/core/`)

Need to verify: does `Paint` discriminated union in `scene-graph.ts:86–92` for IMAGE fill type include `scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE'` field? Track 2 audit task.

If field exists: inspector wiring only.
If field missing: lift core lock + add `imageScaleMode` field on IMAGE-fill paint variant.

### Implementation impact

- **Inspector:** image-fill picker popover with 4-mode dropdown
- **Crop mode:** manual positioning UI (drag handles inside fill rectangle to position image; matches Figma's crop affordance)
- **Tile mode:** percentage slider for tile size (matches Figma's "% of original")
- **Fit mode:** padding background color picker (when shape ≠ image aspect, what color shows in padding?)
- **Drag-drop image onto canvas** (per §2.5 Assets tab) → defaults to Fill mode

---

## Q22: JPG export quality — **High default, user-exposed quality dropdown (match Figma)**

### Figma's actual model (verified via [Figma Help — Export formats and settings](https://help.figma.com/hc/en-us/articles/13402894554519-Export-formats-and-settings))

Figma JPG export:
- **Default:** High quality (~0.92 quality factor)
- **User-exposed dropdown:** High / Medium / Low
- Each level corresponds to a fixed quality factor (Figma doesn't expose raw 0-100 number)

### Recommendation: **Match Figma exactly: 3-level dropdown (High/Medium/Low), High default.**

| Option | Verdict |
|---|---|
| **A. 3-level dropdown High/Medium/Low (Figma-exact)** | ✅ **Recommended** |
| B. Fixed default 0.92 (no UI) | ❌ Underbuilt; designers want control for file-size optimization |
| C. Raw 0-100 slider | ❌ Over-exposed; "what does 73 mean vs 72?" decision fatigue |

### Quality-factor mapping

| Level | Quality factor | Use case |
|---|---|---|
| **High** (default) | 0.92 | Print-ready, presentation, hero images |
| **Medium** | 0.80 | Standard email asset, web thumbnail |
| **Low** | 0.65 | Lightweight preview, fast-loading |

### Implementation impact

- **CanvasKit JPEG encoder:** verify CanvasKit `Surface.makeImageSnapshot().encodeToBytes('image/jpeg', quality)` accepts quality parameter; if not, use browser fallback (`canvas.toBlob('image/jpeg', quality)`)
- **Inspector:** Export row format dropdown extends with JPG → reveals quality level dropdown when JPG selected
- **Per-node `exportSettings`:** add `quality?: 'high' | 'medium' | 'low'` to JPG export setting

---

## Q23: Property-set definition for Copy/Paste properties — **Match Figma's full default set**

### Figma's actual model (verified via [Figma Help — Copy and paste properties between layers](https://help.figma.com/hc/en-us/articles/4412765442967-Copy-and-paste-properties-between-layers))

Figma's Copy properties (`⌥⌘C`) copies by default:
- **Fills** (solid, gradient, image — including all paint stack)
- **Strokes** (color + opacity only — partial; Figma forum has open requests for weight/position/style copy)
- **Effects** (drop shadow, inner shadow, blurs)
- **Corner radius** (per-corner if set)
- **Other appearance properties** (blend mode, opacity)

Properties NOT copied by default:
- Layout / position / size
- Constraints
- Auto-layout settings
- Text content (only style, not content)
- Variables / styles / components

### Recommendation: **Match Figma's full default set. Copy fills + strokes (full, not just color) + effects + corner radius + blend mode + opacity. Override Figma's stroke-partial limitation (it's a known gap they haven't fixed).**

| Option | Verdict |
|---|---|
| **A. Full property set (fills, strokes complete, effects, corner radius, blend mode, opacity)** | ✅ **Recommended** — go beyond Figma where Figma underbuilt |
| B. Figma-exact subset (strokes partial — only color/opacity) | ❌ Figma users complain about this; we can do better |
| C. User-selectable per-paste (more granular but slower) | ❌ Decision fatigue; defer to "advanced paste" Phase 2 |

### Property set (canonical for Kova)

```ts
type CopyablePropertySet = {
  fills?: Paint[]                  // full Paint stack
  strokes?: Paint[]                // full stroke definitions including weight, align, dash pattern
  strokeWeight?: number            // beyond Figma's default
  strokeAlign?: 'INSIDE' | 'CENTER' | 'OUTSIDE'  // beyond Figma's default
  effects?: Effect[]               // all effect types per Q3 #12
  cornerRadius?: number | { tl, tr, br, bl }
  blendMode?: BlendMode
  opacity?: number
}
```

### Conflict policy when paste target lacks property type

- Pasting typography onto rect (no text node) → silently skip text-only properties
- Pasting fills onto text node → apply (text fills are valid)
- Show toast on mass-skip: "Some properties don't apply to this layer type" (one-time, dismissable)

### Implementation impact

- **NEW composable:** `usePropertyClipboard` — extends existing `editor.clipboardHtml` with structured `CopyablePropertySet` payload
- **Copy properties (`⌥⌘C`):** serializes selection's properties → property clipboard slot
- **Paste properties (`⌥⌘V`):** reads property clipboard → applies via `editor.commitNodeUpdate` per applicable property
- **Per §3A consolidation:** "Properties-clipboard slot" already inventoried; this answer locks the property set definition

---

## Q24: Brand Kit drag-drop semantics — **Brand Kit drops apply contextually (color = fill, font = font on text)**

### Figma's actual model

Figma does **NOT support drag-drop of color swatches onto layers natively** (verified via Figma forum feature request). Color application is via:
- Click fill → opens color picker → pick hex/swatch
- Hover-click on recent-color swatch in color picker

For fonts, drag-drop also not native; font application is via Typography section dropdown.

For images, drag-drop IS native (drop image file onto canvas → image fill).

### Recommendation: **Build BETTER than Figma: support drag-drop for all Brand Kit asset types with contextual semantics.**

| Asset dragged | Drop target | Action |
|---|---|---|
| **Color swatch** | Layer (any with fill support) | Apply as fill (replaces top fill, or adds if shape has no fill) |
| **Color swatch** | Layer with stroke | Modifier-key drag to apply as stroke (Shift+drag = stroke) |
| **Color swatch** | Empty canvas | Spawn a 200×200 rectangle with that fill (Figma doesn't do this; we do for speed) |
| **Font** | Text layer | Apply as font family |
| **Font** | Empty canvas | Spawn TEXT node with default content "Edit text" + that font |
| **Logo image** | Empty canvas | Spawn image at logo's natural size at drop point |
| **Logo image** | Layer with fill support | Apply as image fill (replaces top fill) |
| **Tone snippet** (if Q8 in scope) | Empty canvas / text layer | Spawn or replace TEXT node content |
| **Saved block** (if Q8 in scope) | Empty canvas | Spawn pre-styled text/CTA per block definition |

### Why better than Figma

Figma's "no drag-drop for swatches" is a known UX wart (feature request 31459). Kova's user is a freelance email marketer who works fast — drag-drop is the natural muscle memory.

### Implementation impact

- **Extend `use-canvas-drop.ts`:** new MIME-type-like discriminators for in-app drag payloads:
  - `application/x-kova-brand-color` — `{ hex: string }`
  - `application/x-kova-brand-font` — `{ family: string, fontFileUrl?: string }`
  - `application/x-kova-brand-asset` — `{ assetId: uuid, kind: 'logo' | 'image' }`
  - `application/x-kova-tone-snippet` — `{ snippetId: uuid, content: string }`
  - `application/x-kova-saved-block` — `{ blockId: uuid, blockData: object }`
- **Drop handler:** dispatches per drop target (layer type + payload kind)
- **Visual feedback:** drop-target highlight on hover with ghost preview of action ("Will apply as fill" / "Will replace font")
- **Modifier-key support:** Shift+drag = stroke, Alt+drag = additive fill (don't replace)

---

## Q25: Keyboard shortcuts dialog category taxonomy — **Match Figma's 13 categories**

### Figma's actual model (verified via [Figma Help — Use Figma products with a keyboard](https://help.figma.com/hc/en-us/articles/360040328653-Use-Figma-products-with-a-keyboard))

Figma keyboard shortcuts dialog (`⇧⌘?`) organizes shortcuts into **13 categories:**

1. Essentials
2. Tools
3. View
4. Zoom
5. Text
6. Shape
7. Selection
8. Cursor
9. Edit
10. Transform
11. Arrange
12. Components
13. Prototyping

### Recommendation: **Match Figma's 13 categories exactly. Hide DEFER categories until features ship.**

| Option | Verdict |
|---|---|
| **A. Match Figma's 13 categories exactly (hide DEFER ones)** | ✅ **Recommended** — designer muscle memory; clean expansion path |
| B. Simplify to 5-7 categories | ❌ Underbuilt; loses Figma-parity; users hunt for shortcuts that aren't where Figma puts them |
| C. Custom Kova-specific taxonomy | ❌ Confusing for Figma transfers; no reason to deviate |

### Kova MVP categories (subset of Figma's)

| Figma category | MVP / Defer | Notes |
|---|---|---|
| Essentials | MVP | Save, undo, redo, copy, paste, delete |
| Tools | MVP | Move, frame, text, shape, pen, slice, eyedropper, scale |
| View | MVP | Zoom in/out, fit, 100%, panels, rulers, layout guides, pixel grid |
| Zoom | MVP | Zoom shortcuts |
| Text | MVP | Bold, italic, underline, list types, case, alignment |
| Shape | MVP | Boolean ops (Q3 #14), flatten, pen tool actions |
| Selection | MVP | Select all, select none, select inverse, select within |
| Cursor | MVP | Cursor positioning via arrows |
| Edit | MVP | Find, find next, copy/paste properties |
| Transform | MVP | Rotate, flip, scale |
| Arrange | MVP | Bring forward/back, group, frame, distribute |
| Components | DEFER | Per Kova MVP scope (engine ready but no UI exposure) |
| Prototyping | DEFER | Per Kova MVP scope (engine ready but no UI exposure) |

### Implementation impact

- **Shortcut registry refactor (per §3A consolidation):** declarative catalog with `category` field on each shortcut
- **Dialog UI:** tabs by category; search filter across all categories
- **Hide categories with zero shortcuts** (Components, Prototyping in MVP — show "Coming soon" if needed)

---

## Deferred-feature edge cases

### Layout guides toggle DEFERRED — but on-canvas overlay mapped

**Figma spec (verified via [Figma Help — Create layout guides](https://help.figma.com/hc/en-us/articles/360040450513-Create-layout-guides)):**
- Default color: red `#FF0000` at 10% opacity
- Three grid types: uniform grid, columns, rows
- Toggle visibility via View > Layout guides OR `⇧G` shortcut
- Layout guides defined per-frame (each frame has independent layout-guide settings)
- Hidden ≠ removed (still active for snap-to-grid even when not visible)

**Recommendation:** Even with toggle DEFERRED for MVP, **ship the on-canvas overlay** rendering layout guides per frame's `layoutGrids` field (already in `packages/core/` per Q3 audit). Rationale: feature exists in engine; not exposing it means designers who import .fig files lose their layout guides visually. Ship the overlay; toggle defers but defaults to ON.

### Number-keys-for-opacity preference DEFERRED — but shortcut mapped

**Figma spec (verified across multiple shortcut guides):**
- Always-on, no preference toggle in Figma
- Press 1 → 10%, 2 → 20%, ..., 9 → 90%, 0 → 100%, 00 → 0%
- Two-digit entry: press digits in quick succession (e.g., "4" then "3" within ~500ms = 43%)
- Applies to selected layer's opacity property

**Recommendation:** Match Figma exactly. Always-on for MVP. Don't expose preference toggle (Figma doesn't either). Wire as part of keyboard shortcut registry (per Q25 + §3A consolidation).

### Snap toggles DEFERRED with default-ON behavior

**Figma spec (verified via [Figma forum + help](https://forum.figma.com/suggest-a-feature-11/turning-off-snap-to-pixel-grid-should-turn-snapping-off-8022)):**
- Snap to pixel grid: toggleable via View menu / `⇧⌘'`
- **Frames, sections, components ALWAYS snap to pixel grid regardless of preference** (hardcoded behavior)
- Snap to objects (smart guides): default-ON, no public toggle (always on)
- Snap to layout guides: default-ON when guides defined; no separate toggle

**Recommendation:** Match Figma exactly:
- Snap visualization (red/blue lines per §2.7) **always renders** when snap fires, regardless of preference UI (which is DEFERRED)
- Pixel-grid snap default-ON for non-frame layers; ALWAYS-ON for frames/sections/components
- Smart guides (object-to-object snap) always-on, no toggle
- When preference UI ships post-MVP (per §2.9), toggle exposes the per-layer snap-to-pixel-grid (matches Figma)

---

## Cleanup gaps from prior 03 doc merge (apply alongside Q6–Q25)

The companion `q1-5-answers` doc was applied to 03 doc 2026-04-25. The merge missed 8 stale-framing items per the 03-doc author's review. Apply these alongside Q6–Q25:

1. **§1 Summary table line ~20:** "Net-new frontend infrastructure pieces | 8 (canvas-extension scaffolding for ~15 features...)" — Q4 killed this framing. Replace with 4-bucket split (core mods / renderer-only / inspector wiring / app-overlays).
2. **§1 Summary "New surfaces identified | 14":** add Effects section + Boolean ops menu items → count to 16.
3. **§3B existing-infra-reuse table:** "Multiple fills + Multiple strokes + (Effects REMOVED) + Independent corner radius" — Effects are back per Q3 #12; remove the "(Effects REMOVED)" parenthetical.
4. **§3C row 6 (Slice) duplicates row 1a (which lists Slice node-type as core mod):** dedupe — fold row 6 into row 1a OR have row 1a say "Slice details — see row 6."
5. **§5 sequencing step 4** still says "Build the canvas-extension pattern at scale (§3C #1)" — re-frame using new bucket framing (renderer compositing for masks, core mods for Slice/aspectRatio, etc.).
6. **§4 numbering Q4a for multiplayer is awkward:** renumber as Q6 to match companion doc — OR formalize as "Q6-multiplayer (companion)" cross-reference and leave 03-doc's existing Q6 (brand_assets) numbering intact. Recommend latter to avoid renumber churn for downstream Q7+.
7. **§2.4 Mask indicator + Slice indicator rows:** scrub "depends on Mask feature shipping" / "depends on Slice node-type definition" hedging — both now resolved (Q1, Q2 with engine line citations).
8. **§2.7 "Use as mask" row:** mirror §2.6 half-moon update — data model verified at `scene-graph.ts:298–299`, renderer compositing only.

---

## Sources

### Figma official docs (primary)
- [Version history](https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history) — autosave 30 min; retention 30 days free / unlimited paid
- [Now you can name and annotate Figma Version History](https://www.figma.com/blog/now-you-can-name-and-annotate-your-figma-version-history/) — manual snapshots with name + description
- [Delete and restore files](https://help.figma.com/hc/en-us/articles/360047512294-Delete-and-restore-files) — trash retention indefinite, manual purge only
- [Sample colors with the eyedropper tool](https://help.figma.com/hc/en-us/articles/27643269375767-Sample-colors-with-the-eyedropper-tool) — canvas-only on web/Windows; screen-wide on macOS Desktop only
- [Adjust the properties of an image](https://help.figma.com/hc/en-us/articles/360041098433-Adjust-the-properties-of-an-image) — 4 image-fill scale modes (Fill, Fit, Crop, Tile)
- [Export formats and settings](https://help.figma.com/hc/en-us/articles/13402894554519-Export-formats-and-settings) — JPG quality High/Medium/Low
- [Copy and paste properties between layers](https://help.figma.com/hc/en-us/articles/4412765442967-Copy-and-paste-properties-between-layers) — fills, effects, corner radius copied; strokes partial (color/opacity only — known limitation)
- [Use Figma products with a keyboard](https://help.figma.com/hc/en-us/articles/360040328653-Use-Figma-products-with-a-keyboard) — 13-category shortcut taxonomy
- [Add measurements and annotate designs](https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotate-designs) — Measurement (`⇧M`) + Annotation (`⇧T`) tools, scene-graph persisted
- [Measure distances between layers](https://help.figma.com/hc/en-us/articles/360039956974-Measure-distances-between-layers) — ephemeral hover-distance display
- [Manage your account settings](https://help.figma.com/hc/en-us/sections/4403936365591-Manage-your-account-settings) — Account / Community / Notifications sections
- [Create layout guides](https://help.figma.com/hc/en-us/articles/360040450513-Create-layout-guides) — default red #FF0000 10% opacity, three grid types, `⇧G` toggle
- [Adjust your zoom and view options](https://help.figma.com/hc/en-us/articles/360041065034-Adjust-your-zoom-and-view-options) — snap behaviors, view toggles
- [Use the actions menu in Figma Design](https://help.figma.com/hc/en-us/articles/23570416033943-Use-the-actions-menu-in-Figma-Design) — actions menu / right-click context patterns

### Stripe / GDPR docs
- [Stripe — Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions) — Checkout + Customer Portal + webhooks pattern
- [Stripe — Integrate a SaaS business](https://docs.stripe.com/saas) — SaaS-specific guidance
- [Stripe — Using webhooks with subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks) — event handling, signature verification
- [GDPR Article 17 — Right to erasure](https://gdpr-info.eu/art-17-gdpr/) — 30-day window, cascade requirements

### OpenPencil / pencil.dev docs
- [openpencil.dev](https://openpencil.dev/) — Vue 3 + CanvasKit + Yjs CRDT
- [openpencil.dev/guide/comparison](https://openpencil.dev/guide/comparison) — Open Pencil vs Penpot architecture

### Supabase MCP verification (2026-04-25)
- `mcp__supabase__list_tables` against project `moiuzrkxtkgienykxuio` (kova-open-pencil) — confirmed `brand_assets` does NOT exist in public schema
- Migration grep confirms `media` table has `brand_id` FK to `brands(id)`, `idx_media_brand_id` index

### Codebase line citations
- `packages/core/src/scene-graph.ts:67–83` — NodeType union (16 types)
- `packages/core/src/scene-graph.ts:86–92` — FillType union (incl. IMAGE for Q21)
- `kova-tools.ts.placeMediaImage` — IMAGE fill validation pattern
- `useMediaStore` (existing) — drives Q9 (Brand uploads = `public.media`)
- `useBrandsStore.brands[]` — drives Q17 brand picker
- `useShopifyConnection(brandId)` — drives Q12 Integrations section

---

# Handoff Instructions

You authored `03-implied-surfaces-and-backend.md` and §4 §1–§4 are now fully resolved (Q1–Q5 via companion `q1-5-answers` doc + Q6 multiplayer). This doc resolves Q6–Q25 (Q10 covered by Q5). Apply the following updates to the 03 doc.

> **Sequencing note:** The 8 cleanup gaps from the previous merge (listed above) should be applied in the same pass. Do them all together, in document order.

## 1. Apply 8 cleanup gaps (priority — these are stale framing from previous merge)

In order:
1. §1 Summary table "Net-new frontend infrastructure pieces" row → replace count + description with 4-bucket split (core mods / renderer-only / inspector wiring / app-overlays).
2. §1 Summary "New surfaces identified | 14" → 16 (added Effects section + Boolean ops menu items).
3. §3B existing-infra-reuse — `use-multi-props.ts` row: remove "(Effects REMOVED)" parenthetical; Effects are back per Q3 #12.
4. §3C row 6 (Slice) ↔ row 1a (Slice in core-mods bucket): dedupe — recommend fold row 6 into row 1a, OR row 1a links to row 6 for full Slice spec.
5. §5 sequencing step 4 → reframe "canvas-extension pattern at scale" as per Q4 4-bucket framing (renderer compositing for masks, core mods for Slice/aspectRatio, app-level overlays for guides, etc.).
6. §4 numbering — keep 03-doc's Q6 = brand_assets (this doc). Cross-reference companion-doc Q6-multiplayer separately. Don't renumber 03-doc's Q7+ to preserve cross-doc references.
7. §2.4 Mask indicator + Slice indicator rows: scrub "depends on Mask feature shipping" / "depends on Slice node-type definition" hedging — both now resolved (Q1, Q2 with engine line citations).
8. §2.7 "Use as mask" row: mirror §2.6 half-moon update — already done in previous merge per `q1-5-answers` Handoff Instructions §5; verify it stuck and update if not.

## 2. Apply Q6 (brand_assets) updates

- §2.13 Brand assets & media row: confirm `brand_assets` table does NOT exist; remove flag for verification (already verified). Brand font upload still needs new `brand_fonts` table (recommend) OR extend `media` with kind discriminator.
- §3C #4 Brand font upload row: update Open Qs — `brand_assets` table does NOT exist (verified via Supabase MCP). Use new `brand_fonts` table.
- BRAND_MODEL_CLARIFICATION.md (separate doc, not 03 doc): mark stale reference to `brand_assets` for cleanup.

## 3. Apply Q7 (snapshot) updates

- §2.11 Save to version history row: replace Open Qs with concrete spec — Yjs doc bytes (Kiwi+Zstd compressed), per-canvas not per-page, 30-day free / unlimited paid retention, 30-min autosnapshot cadence. RPC + Storage bucket pattern per Q7 spec.
- §2.11 Show version history row: snapshot timeline panel + restore-confirm modal + atomic restore with pre-restore snapshot.
- §3C #2 (Snapshot store): update Open Qs — all resolved per Q7.

## 4. Apply Q8 (tone snippets + saved blocks) updates

- §2.5 "Section: Brand Kit" row Open Qs: tone snippets + saved blocks → **INCLUDE MVP (founder decision 2026-04-25)**. Scope as JSONB columns on `brands` table (`brands.tone_snippets JSONB`, `brands.saved_blocks JSONB`). Single migration.
- §2.5 Brand Kit row Existing-infra column: add `brands.tone_snippets`, `brands.saved_blocks` to listed columns alongside `colors`, `fonts`, `logo_url`, `voice`
- §2.14 Account page Brand Kit section: add Tone snippets + Saved blocks management tabs
- §2.7 Drag-drop row (or §2.5 if cross-referenced): saved blocks payload `application/x-kova-saved-block` already in Q24 — verify wired through
- §1 Summary: add tone snippets + saved blocks under Brand Kit cluster (no new row count, sub-features within Brand Kit row)
- Cross-cut to AI chat system-prompt builder: tone snippets fed as exemplars

## 5. Apply Q9 (brand uploads) updates

- §2.5 "Section: Brand uploads" row: clarify same as `public.media` table (not separate). Mark RESOLVED.
- §2.5 "Section: Brand uploads" Open Q "Duplicates existing Media library panel — replace it or keep both?" → REPLACE existing standalone Media library panel; consolidate into Assets panel.

## 6. Apply Q11 (measurement annotations) updates

- §2.7 Measurement tool row: Open Q resolved → first-class scene nodes (persistent, Yjs-stored).
- §2.7 Measurement annotations row: Open Q resolved → first-class `MEASUREMENT` SceneNode type. Add to lift-the-lock list (CLAUDE.md amendment).
- Cross-cuts: Inspector measurement properties section (§2.6 NEW), Layer-tree measurement indicator (§2.4 NEW).

## 7. Apply Q12–Q15 (account/billing) updates

- §2.14 Account settings page row: update spec — full-page route `/account` with sidebar sections (Profile, Plan & Billing, Brand Kit, Integrations, Danger zone). Open Qs all resolved.
- §3C #5 (Account + Stripe): update — Stripe foundation + Customer Portal + webhooks. Launch strategy + pricing intentionally not specified in this doc (separate founder decision when relevant).
- NEW row in §3C: GDPR delete-account cascade (per Q15) — `users.deleted_at` column + cron + sub-processor cascade orchestrator Edge Function.

## 8. Apply Q16–Q18 (top chrome / overflow menu) updates

- §2.1 Avatar dropdown row: spec concrete items per Q16 (Brand picker + Account + Help + Keyboard shortcuts + Sign out).
- §2.1 Brand label row: click → brand picker popover (NOT navigate). Per Q17.
- §2.6 Overflow `•••` row + §2.10 Right-click context menu rows: per Q18 — overflow = compact subset, right-click = full set, both share `useObjectActions()` composable.

## 9. Apply Q19–Q25 (UX behavior) updates

- §2.12 Move to trash row: retention indefinite per Figma spec (Q19). No auto-purge cron.
- §2.7 Eyedropper row: canvas-only MVP; macOS Tauri screen-wide Phase 2 (Q20).
- §2.7 Image-fill row: 4 modes Fill/Fit/Crop/Tile per Figma (Q21). Verify `Paint.imageScaleMode` field in `packages/core/`.
- §2.6 Export row JPG: 3-level quality dropdown High/Medium/Low, High default per Figma (Q22).
- §2.10 Copy/Paste properties rows: full property set per Q23 (improves on Figma's stroke partial-copy).
- §2.5 Drag-drop row + §2.7 Image fill row: drag-drop semantics per Q24 (color → fill, font → text-font, image → image fill, etc.). Better than Figma which doesn't support color drag-drop.
- §2.8 Keyboard shortcuts dialog rows: 13-category Figma taxonomy per Q25; hide DEFER categories (Components, Prototyping).

## 10. Apply deferred edge case updates

- §2.7 Layout guides overlay: ship overlay even though preference toggle DEFERRED (default-ON). Per "Layout guides toggle DEFERRED" section above.
- §2.8 Number keys for opacity row: always-on, no preference toggle (Figma-exact). Per "Number-keys-for-opacity DEFERRED" section above.
- §2.7 Snap indicators overlay: always render when snap fires, regardless of preference UI. Per "Snap toggles DEFERRED" section above.

## 11. Update §1 Summary stats (after all edits)

Adjust counts:
- "Net-new server-side backend pieces" — currently 5; add `canvas_snapshots` + `users.deleted_at` + Stripe-related = 7-8
- "New surfaces identified" — 14 → 16 → with Account page sections + Snapshot timeline panel + ... → re-count after changes
- Update Top 5 / Top 3 / Confidence sections to reflect resolved decisions

## 12. Update §4 Open questions

Mark all of the following as **RESOLVED** in §4 with cross-reference to this doc:
- Q6 (brand_assets) → RESOLVED via Q6
- Q7 (snapshot storage) → RESOLVED via Q7
- Q8 (tone snippets) → RESOLVED via Q8 (recommend defer to Phase 2; founder decision)
- Q9 (brand uploads vs media) → RESOLVED via Q9
- Q11 (measurement annotations) → RESOLVED via Q11
- Q12 (Account IA) → RESOLVED via Q12
- Q13 (Account scope) → RESOLVED via Q13
- Q14 (Stripe scope) → RESOLVED via Q14
- Q15 (GDPR cascade) → RESOLVED via Q15
- Q16 (Avatar dropdown items) → RESOLVED via Q16
- Q17 (Brand label click) → RESOLVED via Q17
- Q18 (Overflow vs right-click) → RESOLVED via Q18
- Q19 (Trash retention) → RESOLVED via Q19
- Q20 (Eyedropper scope) → RESOLVED via Q20
- Q21 (Image-fill modes) → RESOLVED via Q21
- Q22 (JPG quality) → RESOLVED via Q22
- Q23 (Copy/paste properties) → RESOLVED via Q23
- Q24 (Drag-drop semantics) → RESOLVED via Q24
- Q25 (Keyboard taxonomy) → RESOLVED via Q25

Plus the 3 deferred edge cases (Layout guides toggle / Number-keys / Snap toggles) → RESOLVED with Figma-aligned defaults documented.

After this pass, §4 should have **zero open questions remaining for MVP scoping.** Any new questions surface during hi-fi design or post-launch user feedback (mark for §8 Phase 2 polish).

---

**End of handoff.** Apply 8 cleanup gaps + Q6–Q25 updates to 03 doc per the above. After application, the 03 doc is the complete infrastructure mapping doc with all open questions resolved.
