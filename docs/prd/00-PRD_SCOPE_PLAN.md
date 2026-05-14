# Kova PRD Scope Plan

> **Status:** ✅ APPROVED FOR PRD AUTHORING. Two audits cleared: (1) Foundation pre-PRD audit 2026-05-13 (`main-main-kova-scope/handoff-docs/PRE_PRD_READINESS_AUDIT_V2.md`); (2) Comprehensive decision-stress-test + gap-fill audit 2026-05-14 (`00c-COMPREHENSIVE_AUDIT_REPORT.md`, 2585 lines) — verdict ⚠️ REQUIRES FOUNDER RATIFICATION flipped to ✅ after founder ratified all 10 priority items (see §5.6). This doc maps the 182-row inventory from `03-implied-surfaces-and-backend.md` + the 39 hi-fi mockup files in `main-main-kova-scope/` into 12 cohesive feature-cluster PRDs.

---

## 1. Purpose

The Kova product spec is currently distributed across four artifact types:

| Artifact | Lives at | What it carries |
|---|---|---|
| **Hi-fi mockups** (39 HTML files, ~210 scenes) | `main-main-kova-scope/batch-a/` + `batch-a-additions/` + `batch-b/` | Visual spec — every surface, state, interaction, copy |
| **Design system** (4 files) | `main-main-kova-scope/design-system/` | Tokens, components, bans, CSS implementation. Four files: `design.md` (spec), `kova-hifi.css` (canonical dark CSS), `kova-hifi-light.css` (canonical light CSS for auth/marketing), `TOKEN_CANONICAL.md` (vocabulary cheat-sheet). |
| **Implied-surfaces inventory** (`03-implied-surfaces-and-backend.md`, 182 rows) | `kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/` | Infrastructure spec — schema, RPCs, Edge Functions, Pinia stores, scene-graph extensions per canvas-side row |
| **Q&A answers** (Q1-25 across 2 companion docs) | `…/design-overhaul/q1-5-answers*.md` + `q6-25-answers*.md` | Founder decisions on engine, data model, billing, UX edge cases |

Each PRD = one cohesive feature cluster that fuses these four artifacts into an implementation-ready spec. Twelve PRDs cover the full MVP. Each PRD is independently authorable + reviewable + dispatchable to engineering.

> **`kova-hifi.css` role in PRDs:** the canonical CSS implementation declares every design token in `:root` (short-name form per TOKEN_CANONICAL.md) + every component primitive class definition (`.btn`, `.dlg`, `.toast`, `.menu`, etc.). When PRDs spec Vue 3 + Tailwind 4 components, they cite `kova-hifi.css` class definitions as the **structural + token reference** — engineers translate the :root block into Tailwind `@theme` tokens in `app.css`, and translate each component class into a Vue component that renders the same markup contract.

---

## 2. PRD output structure

### 2.1 Location

```
kova-open-pencil-1/docs/prd/
  00-PRD_SCOPE_PLAN.md              ← this doc
  01-auth-and-identity.md
  02-onboarding-and-dashboard.md
  03-brand-management.md
  04-account-and-stripe-billing.md
  05-brand-kit-and-drag-drop.md
  06-canvas-editor-core-chrome.md
  07-canvas-engine-extensions.md
  08-canvas-menus-popovers-shortcuts.md
  09-version-history-and-trash.md
  10-ai-chat-and-memory.md
  11-shared-ui-infrastructure.md
  12-settings-and-user-preferences.md
```

### 2.2 Naming convention

`NN-cluster-slug.md` where `NN` is the cluster number (zero-padded). Slug uses kebab-case. No underscores. No spaces.

---

## 3. The 12 clusters

For each cluster: scope boundary, 03-doc rows covered, hi-fi files referenced, Q-decisions baked in, estimated PRD size, dependencies.

### Cluster 01 — Auth & Identity

**Scope:** Authentication surfaces + session management + GDPR cascade orchestrator. The "user exists, is logged in, can be deleted" foundation.

**03-doc coverage:** Q15 (GDPR delete-account cascade), Q12-Q14 partial overlap (user-level scope). No direct §2 rows (auth not in canvas-side inventory).

**Hi-fi files referenced:**
- `batch-a/light/Kova Hi-Fi A15 Auth - Light.html` (signup, login, magic-link, OTP, password-reset)
- `batch-a-additions/light/Kova Hi-Fi B4 Auth Errors - Light.html` (magic-link expired/invalid, OTP wrong/locked, signup email-exists, user-not-found, session-expired)
- `batch-a-additions/light/Kova Hi-Fi B5 Email Change Landing - Light.html`
- `batch-a-additions/light/Kova Hi-Fi B6 Mobile Fallback - Light.html`
- `batch-a-additions/dark/Kova Hi-Fi B4 Session Expired - Dark.html`

**Q-decisions baked in:**
- Q15: 30-day soft-delete (`users.deleted_at`) + daily hard-delete cron cascade across Stripe + Shopify + Anthropic + Storage + DB
- Q12: user-level scope for profile/billing/danger zone

**Infrastructure scope:**
- Supabase Auth wiring (magic-link + OTP)
- `users` table extension: `users.deleted_at`, `idx_users_pending_deletion`
- Edge Functions: `account-deletion-request`, `delete-account-cron`
- RPCs: `request_account_deletion`, `restore_account`
- Auth middleware (grace-period restore detection, session-expiry handling)
- Email templates (verify, password-reset, deletion-confirmation, restore-link)
- Privacy policy + RoPA documentation

**Estimated PRD size:** ~25-30 spec sections. Medium PRD.

**Dependencies:** None — foundational. Blocks 02, 03, 04, 05, 12.

---

### Cluster 02 — Onboarding & Dashboard

**Scope:** First-brand creation flow + brand-list dashboard chrome + sidebar nav + file picker. The post-auth landing surface.

**03-doc coverage:** No direct §2 rows (dashboard not in canvas-side inventory). Implicit from CLAUDE.md MVP scope ("dashboard") + Q17 (brand-switching only via dashboard sidebar).

**Hi-fi files referenced:**
- `batch-a/dark/Kova Hi-Fi A1 Onboarding - Dark.html` (first-brand walkthrough, 4 scenes)
- `batch-a/dark/Kova Hi-Fi 03 Brand Dashboard - Dark.html` (5 scenes: home, sidebar, file grid, brand switcher, empty state)
- `batch-a-additions/dark/Kova Hi-Fi B11 Canvas Creation Transition - Dark.html`
- `batch-a-additions/dark/Kova Hi-Fi B7 Loading Skeletons - Dark.html` (dashboard skeleton)
- `batch-a-additions/dark/Kova Hi-Fi B9 List Search Empty - Dark.html` (file-list empty)
- `batch-a/dark/Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html` (empty states + offline pill)

**Q-decisions baked in:**
- Q17: brand-switching happens only on dashboard via sidebar selector (REVERSED 2026-04-25 by founder); no in-canvas brand picker

**Infrastructure scope:**
- `brands` table queries (list active, sort by recent)
- `canvases` table queries per-brand (sort by recent, search)
- `useBrandsStore` (active brand selection persists across sessions)
- `useDashboardStore` (file grid state, search, filters)
- First-brand onboarding wizard composable (`use-onboarding.ts`)
- Brand-creation hook → opens new canvas → triggers `B11` transition

**Estimated PRD size:** ~20-25 spec sections. Medium.

**Dependencies:** 01 (Auth must exist). Blocks 03, 06.

---

### Cluster 03 — Brand Management

**Scope:** Brand picker + create new brand + archive + delete (typed-confirm). Brand record lifecycle excluding settings (which lives in Cluster 05).

**03-doc coverage:** Q17 (brand label click navigates to current brand's dashboard), Q19 (trash retention — used for brand archive), §2.1 brand-label-related row.

**Hi-fi files referenced:**
- `batch-a/dark/Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html` (picker + new-brand form)
- `batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html` (archive brand A4.2, delete brand typed-confirm A9, copy-brand A10)
- `batch-a/dark/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` (modal shell reference)

**Q-decisions baked in:**
- A4.2 archive flow stays (founder confirmed 2026-05-13: archive action exists, no archived-list page at MVP — Phase 2 adds list)
- Q17: clicking brand label = navigate to brand's dashboard (no in-canvas brand-switcher)

**Infrastructure scope:**
- `brands` table CRUD: `create_brand`, `archive_brand` (sets `archived_at`), `restore_brand` (Phase 2 — not in this PRD), `delete_brand` (cascades to canvases, media, fonts, etc.)
- `useBrandsStore` brand-creation flow
- Typed-confirm modal pattern (`useConfirm()` composable — built in Cluster 11)
- Per-brand color palette (auto-assign from Kova brand-color set: coral/violet/sage/sand/graphite per A2 pattern)

**Estimated PRD size:** ~15-20 spec sections. Small-medium.

**Dependencies:** 01, 02, 11 (useConfirm). Blocks 04, 05.

---

### Cluster 04 — Account Page + Stripe Billing

**Scope:** Full-page `/account` route with 5 sidebar sections (Profile, Plan & Billing, Brand Kit, Integrations, Danger zone). Stripe foundation: Checkout + Customer Portal + webhooks. Post-checkout return landings.

**03-doc coverage:** §2.14 Account + Q12 (full-page IA), Q13 (user-level scope), Q14 (Stripe foundation), Q15 (Danger zone). §3C #5.

**Hi-fi files referenced:**
- `batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html` (12 scenes covering all 5 sidebar sections)
- `batch-a-additions/dark/Kova Hi-Fi B10 Stripe Returns - Dark.html` (success, cancel, payment-failed)
- `batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html` (delete-account typed-confirm)
- `batch-a-additions/light/Kova Hi-Fi B5 Email Change Landing - Light.html` (email-change verification — partial cross-cut with 01)

**Q-decisions baked in:**
- Q12: 5 sidebar sections; full-page route at `/account` (better than Figma's modal; matches Linear/Notion)
- Q13: user-level scope. Profile + Plan & Billing + Danger zone = user-scoped. Brand Kit + Integrations have per-brand picker dropdown.
- Q14: Stripe foundation now (Checkout + Customer Portal + webhooks). Launch strategy + pricing out of scope for this doc/PRD (separate founder decision when relevant).

**Infrastructure scope:**
- Vue Router: `/account/:section?` (sections: profile, billing, brand-kit, integrations, danger)
- `users` table extension: Stripe columns (`stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `subscription_status`, `current_period_end`, `cancel_at_period_end`)
- Edge Functions: `stripe-checkout-session`, `stripe-portal-session`, `stripe-webhook` (handle subscription.created/updated/canceled events)
- Plan-based feature-gate middleware (composable: `usePlanGate()` — returns boolean per feature)
- Profile section: avatar, name, email (with change flow), timezone
- Plan & Billing section: current plan badge, upgrade CTA → Checkout, "Manage subscription" → Customer Portal
- Integrations section: Shopify connect/disconnect (per-brand picker)
- Danger zone: delete account (typed-confirm + email + grace-period restore link — Cluster 01 GDPR cascade)

**Estimated PRD size:** ~35-45 spec sections. LARGE PRD. Consider splitting at draft time if it grows too big.

**Dependencies:** 01, 03, 11. Blocks 05.

---

### Cluster 05 — Brand Kit Settings & Drag-Drop

**Scope:** Per-brand Brand Kit settings sub-tabs (Visuals, Fonts, Tone snippets, Saved blocks, Memory, KB sources). Brand-asset drag-drop semantics from kit panel into canvas.

**03-doc coverage:** §2.5 Left panel Assets/Brand kit (16 rows), Q8 (tone snippets + saved blocks INCLUDED in MVP as JSONB on `brands`), Q9 (media table consolidation), Q24 (drag-drop MIME payloads).

**Hi-fi files referenced:**
- `batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html` (Brand Kit sub-tabs — 7 scenes)
- `batch-a-additions/dark/Kova Hi-Fi B3 Brand Kit CRUD Modals - Dark.html` (tone-snippet + saved-block add/edit/delete modals — 7 scenes)
- `batch-a-additions/dark/Kova Hi-Fi B8 Upload States - Dark.html` (logo/font/KB file upload UI states)

**Q-decisions baked in:**
- Q6: `brand_fonts` table NEW (verified via Supabase MCP — `brand_assets` MISSING). Brand fonts have separate lifecycle from images.
- Q8: tone_snippets + saved_blocks = JSONB columns on `brands` (single migration, no new tables)
- Q9: Brand Uploads consolidated into single Assets panel (replaces standalone Media library). Same `public.media` table with `brand_id` FK.
- Q24: drag-drop semantics — Color → fill (Shift+drag = stroke; empty canvas = spawn 200×200 rect). Font → text-font. Logo → image fill OR spawn at natural size. `application/x-kova-saved-block` MIME for saved-block drag-drop spawning TEXT nodes.

**Infrastructure scope:**
- Schema migrations: `brands.tone_snippets JSONB`, `brands.saved_blocks JSONB`, NEW `brand_fonts` table, `public.media` with `brand_id` FK
- Brand-font upload Edge Function (file → Storage bucket → DB record → canvas-engine font-registration hook)
- `useBrandKitStore` (reactive read of selected brand's kit fields)
- `use-canvas-drop.ts` payload handlers for color/font/logo/saved-block MIME types
- AI chat system-prompt builder extension (tone snippets injected as exemplars per Q8)
- Brand Kit settings UI sub-tabs (5 tabs)
- CRUD modals for tone snippets + saved blocks (B3 patterns)
- File-upload UI states (B8 patterns — drop zone, in-progress, success, error, file list)
- KB sources upload (per CLAUDE.md MVP scope)

**Estimated PRD size:** ~30-35 spec sections. Large.

**Dependencies:** 01, 03, 04, 11. Blocks 10 (AI chat tone-snippet injection), 06 (canvas drag-drop receivers).

---

### Cluster 06 — Canvas Editor Core Chrome

**Scope:** Topbar, bottom toolbar, left panel (layers + pages), right panel (inspector). The structural canvas chrome that hosts every editor interaction. NOT engine-side primitives (those are Cluster 07). NOT menus or popovers (Cluster 08).

**03-doc coverage:** §2.1 Top chrome (7 rows) + §2.3 Bottom toolbar (3 rows) + §2.4 Left panel Pages/Layers (12 rows) + §2.6 Inspector / Right panel additions (26 rows). Total: 48 rows.

**Hi-fi files referenced:**
- `batch-b/Kova Canvas - Final.html` (canonical chrome source-of-truth, lines 75-1008)
- `batch-b/chunk-b3/Kova Hi-Fi 10 Left Panel - Dark.html` (4 scenes)
- `batch-b/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html` (7 scenes — properties, fills, text, layout, dimensions, transforms)
- `batch-b/chunk-b5/Kova Hi-Fi 12 Color Picker - Dark.html` (color picker popover — 8 scenes)
- `batch-b/Kova Hi-Fi 08 Top Chrome Menus - Dark.html` (topbar dropdowns catalog)

**Q-decisions baked in:**
- Q3 (inspector): Effects re-added to MVP, Boolean operations row added, vertical text align + stroke align + multiple fills + 4 image fill modes + gradient editor wire to existing engine APIs
- Q4: zero engine extension hooks (canvas-extensions work via external Pinia + public FigmaAPI only)
- Q16: avatar dropdown items (User name + plan badge + Account + Help + Shortcuts + What's new (Phase 2) + Sign out)
- Q17: brand label click = navigate to brand's dashboard (no popover)
- Q18: right-click overflow `•••` = compact subset (5-7 items); canvas right-click = full set (12-20) — same `useObjectActions()` composable

**Infrastructure scope:**
- Vue routes: `/canvas/:canvasId`
- Top chrome composable: topbar layout, file menu, logo dropdown ("Back to dashboard"), brand label, avatar dropdown
- Bottom toolbar: 9 tools (Move/Frame/Rectangle/Ellipse/Pen/Text/Comment/AI/Components) + tool registration (Slice + Measurement added in Cluster 07)
- Left panel: Pages section + Layers tree (`useLayerTree()`, virtual scrolling, expand/collapse, drag-reorder)
- Right panel / Inspector: tab routing (Design only at MVP — Prototype DEFERRED), properties section component (when no selection — §3C #13), per-section panels (Position/Layout/Fill/Stroke/Text/Effects/Export)
- Color picker popover (B5 file 12) — picker logic, gradient editor, eyedropper trigger (canvas-only Q20)
- `useNodeProps()` + `useMultiProps()` consumer pattern (existing in core, extend with new rows)

**Estimated PRD size:** ~45-55 spec sections. LARGEST PRD. May warrant splitting at draft time.

**Dependencies:** 02, 03 (brand context to open canvas), 11. Blocks 07, 08, 09, 10.

---

### Cluster 07 — Canvas Engine Extensions

**Scope:** §2.7 — all core/renderer/canvas-extension work. Slice + Measurement as NodeTypes (lift core lock per CLAUDE.md amendment), Effects renderer wiring, Boolean operations menu wiring, 4 image fill modes, all canvas overlays.

**03-doc coverage:** §2.7 Canvas-engine extensions (33 rows — biggest infra footprint). §3C #1a/#1b/#1c/#1d (4 buckets: core mods + renderer-only + inspector wiring + app-level overlays).

**Hi-fi files referenced:**
- `batch-b/Kova Canvas - Final.html` (overlays + slice + measurement visual reference)
- `batch-b/Kova Hi-Fi 09 Canvas Overlays - Dark.html` (export preview, slice stack, gradient overlay panels — 10 scenes B8.1-B8.10)
- `batch-b/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html` (Effects + Boolean ops UI cross-cut)
- `batch-b/chunk-b5/Kova Hi-Fi 12 Color Picker - Dark.html` (gradient editor — Q3 #12)

**Q-decisions baked in:**
- Q1: Slice = first-class 17th NodeType in `packages/core/src/scene-graph.ts`. Lift core lock per CLAUDE.md amendment.
- Q2: Mask compositing in `renderer/scene.ts` (data model already in core — `isMask` + `maskType`). All 3 mask types ship MVP.
- Q3: 9 features engine-ready (vertical text align, all 4 gradient types, POLYGON, STAR, LINE, stroke align, all 5 effect types, boolean operations, vector network field). 1 partial (OpenType — needs SceneNode wiring). 4 missing (aspectRatio, page-export flag, page-bg-vis, scale tool).
- Q11: Measurement = first-class 18th NodeType in `scene-graph.ts`. Path 1 (lift core lock).
- Q20: Eyedropper canvas-only MVP. Phase 2: screen-wide on macOS Tauri.
- Q21: All 4 image-fill modes (Fill default, Fit, Crop, Tile).
- Q22: JPG export 3-level dropdown (High 0.92 default / Medium 0.80 / Low 0.65).
- Q3 #14: Boolean ops wire existing `figma.booleanOperation()` from `figma-api.ts`. Standard Figma shortcuts: Union (⌘⌥U), Subtract (⌘⌥S), Intersect (⌘⌥I), Exclude (⌘⌥X).
- Q23: Copy/Paste properties full set (better than Figma's stroke-partial).

**Infrastructure scope:**
- **Core mods** (lift lock): SLICE NodeType, MEASUREMENT NodeType, aspectRatio prop, page-export flag, page-bg-visibility, scale tool, OpenType per-text-run wiring, list/link per-text-run attrs, tool registration in `tools/`
- **Renderer-only:** Mask compositing in `renderer/scene.ts`. Effects already shipped (zero work per Q3 #12).
- **Inspector wiring:** Vertical text align, stroke align, multiple fills, 4-mode image fill picker, gradient editor UI, Effects inspector (5 effect types), Boolean ops menu+inspector
- **App-level overlays:** Frame outlines, Mask outlines, Slice region, Snap indicators, Layout guides (default-ON red 10% Q24), Pixel grid, Hover contour, Find highlight, Eyedropper crosshair, Measurement annotations
- **Phase 2 deferred:** Layer thumbnails strategy (§2.4), advanced typography sliders (§2.6), pen dropdown chevron stub (§2.3), arrow primitive (after Track 2 stroke-cap renderer audit), eyedropper screen-wide on macOS Tauri (Q20)

**Estimated PRD size:** ~50-60 spec sections. **SPLIT COMMITTED** (founder-ratified 2026-05-14 — see §5.6 item 10): author as `07a` (Core mods + Renderer) + `07b` (Inspector wiring + Overlays). Execute the split at draft time.

**Dependencies:** 06 (chrome must host the engine). Blocks 09 (snapshots depend on stable scene graph), 10 (AI tools depend on engine state).

---

### Cluster 08 — Canvas Menus, Popovers, Context Menus & Keyboard Shortcuts

**Scope:** §2.2 main menu submenus + §2.8 modals/popovers + §2.10 context menus & shortcuts. All non-engine interaction surfaces inside canvas.

**03-doc coverage:** §2.2 (23 rows) + §2.8 (10 rows) + §2.10 (28 rows) = 61 rows. §3C #7 (right-click context-menu shell), #8 (useConfirm), #9 (keyboard shortcut registry), #10 (main-menu composable), #11 (find composable).

**Hi-fi files referenced:**
- `batch-b/Kova Hi-Fi 08 Top Chrome Menus - Dark.html` (top-chrome menu catalog: File/Edit/Arrange/View + search + user menu)
- `batch-b/chunk-b1/Kova Hi-Fi 13 Canvas Popovers - Dark.html` (right-click context menus, property popovers, frame name edit — 5 scenes)
- `batch-b/chunk-b1/Kova Hi-Fi 14 Find Overlay - Dark.html` (find dialog — 2 scenes)
- `batch-b/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html` (trash flow — cross-cut with Cluster 09)

**Q-decisions baked in:**
- Q18: right-click overflow `•••` (compact 5-7 items) vs canvas right-click (full 12-20). Same `useObjectActions()` composable.
- Q25: keyboard shortcuts dialog = 13 Figma-exact categories (Essentials, Tools, View, Zoom, Text, Shape, Selection, Cursor, Edit, Transform, Arrange, Components-DEFER, Prototyping-DEFER). Hide DEFER until features ship.
- Layout guides toggle DEFERRED (preference UI Phase 2) — but on-canvas overlay ships now, default-ON, red `#FF0000` 10%, 3 grid types
- Number-keys-for-opacity always-on (Figma-exact, no preference). 1=10% … 0=100%. Two-digit within ~500ms.
- Snap toggles DEFERRED with default-ON behavior. Smart guides always-on. Frames/sections always snap to pixel grid (Figma hardcoded).

**Infrastructure scope:**
- Main-menu composable (top-chrome state for nested submenus — §3C #10): File / Edit / Arrange / View / Help (Phase 2)
- Right-click context-menu shell (§3C #7): single Reka DropdownMenu pattern, dispatch-table of items per surface (~12 invocation surfaces across §2.4 / §2.5 / §2.10)
- `useConfirm()` composable (§3C #8): generic confirm-dialog wrapper. Replaces ad-hoc `useCanvasesStore.canvasToTrash` pattern.
- Keyboard shortcut registry (§3C #9): declarative catalog + `use-keyboard.ts` consumer refactor. 13 categories per Q25.
- Find composable + canvas-extension overlay (§3C #11): search scoped to current canvas (TEXT content + layer names + frame names + page names — confirm scope during PRD).
- Keyboard shortcuts dialog modal (Cmd+/) — renders registry catalog by category
- Recent colors persistence (§2.8 row + Q5 Layer 2 localStorage)

**Estimated PRD size:** ~40-50 spec sections. Large.

**Dependencies:** 06 (chrome host), 11. Blocks: none (downstream PRDs reference these primitives).

---

### Cluster 09 — Version History + Snapshot + Trash

**Scope:** §2.11 Version history + §2.12 Trash. Snapshot store (Q7), restore flow, prune cron. Trash retention model (Q19).

**03-doc coverage:** §2.11 Version history (2 rows + 1 cross-cut) + §2.12 Trash (1 row). §3C #2 (snapshot/version-history store).

**Hi-fi files referenced:**
- `batch-b/chunk-b6/Kova Hi-Fi 17 Version History - Dark.html` (timeline panel, restore, compare, timestamps — 11 scenes)
- `batch-b/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html` (trash confirm modal — 3 scenes B13.1/2/3)

**Q-decisions baked in:**
- Q7 (Figma-exact): Yjs doc bytes (Kiwi+Zstd compressed, ~10× reduction); per-canvas (multi-page bundled); 100MB per-brand quota MVP; 30-day free / unlimited paid retention; 30-min autosnapshot + on-disconnect + on-tab-close + on `⌥⌘S`; daily Edge Function or pg_cron prunes free-tier; atomic restore with pre-restore snapshot
- Q19: indefinite retention for trash, no auto-purge. User-initiated permanent-delete only. Account-deletion cascade (Q15) purges trashed files at 30-day mark.

**Infrastructure scope:**
- Schema: NEW `canvas_snapshots` table (canvas_id FK, brand_id FK, kiwi_zstd_bytes BYTEA, created_at, trigger, retention_class)
- Storage bucket: `canvas-snapshots` (large-blob offload for Yjs bytes if size exceeds DB row limit)
- 3 RPCs: `create_snapshot`, `list_snapshots`, `restore_snapshot` (atomic with pre-restore snapshot)
- Autosnapshot heartbeat composable: 30-min interval + lifecycle events (disconnect, tab-close, `⌥⌘S`)
- Daily prune cron (Edge Function or pg_cron): free-tier 30-day retention enforcement
- Trash flow: `canvases.trashed_at` column + Recent files filter + restore action + permanent-delete action
- Version history UI panel (file 17): timeline list, restore button, compare modal (Phase 2), timestamp formatting

**Estimated PRD size:** ~25-30 spec sections. Medium.

**Dependencies:** 06, 07 (scene graph must exist to snapshot). Blocks: none.

---

### Cluster 10 — AI Chat + Memory + Tool Layer

**Scope:** Chat panel + brand memory + AI tool registration + system-prompt builder. Already partially merged (M5 work — see memory `project_m5_task16_wired`). This PRD covers gaps + integration with Brand Kit (Cluster 05) tone-snippets.

**03-doc coverage:** Cross-cuts §2.5 (Brand Kit), §2.7 (AI text suggestions DEFERRED), §2.13 (brand assets). Q8 (tone-snippet AI injection). M5 work tracked separately.

**Hi-fi files referenced:**
- (No standalone hi-fi for chat panel — visual lives in canvas right-panel inspector area, see batch-b inspector files)
- Cross-references to AI generation pattern in `batch-a-additions/dark/Kova Hi-Fi B1 Toasts - Dark.html` (AI generation toast)

**Q-decisions baked in:**
- Q8: tone snippets auto-injected as system-prompt exemplars
- Q24 partial: saved blocks drag-drop creates TEXT node — AI doesn't write TEXT content for these (user-curated)
- M5 decisions: independent chats per canvas, brand memory auto-populated, Supabase storage
- M5.5 decisions: principles-based AI design (not templates), section definitions, brand kit bridge layer

**Infrastructure scope:**
- Chat panel UI (right-side dock or canvas-floating?) — confirm during PRD
- `useChatStore` (per-canvas chat history) + Supabase persistence
- Brand memory store (`useBrandMemoryStore` — flat auto-populated facts per brand)
- System-prompt builder (`buildSystemPrompt(brand, canvas, recentTurns)`)
- Tone-snippet exemplar injection (reads `selectedBrand.toneSnippets[]`)
- AI tool registration (vector tools, slice tool, measurement tool — engine-ready per Q3 #14 + Q11)
- ToolLoopAgent integration (use `@ai-sdk/anthropic`, NOT custom adapter per CLAUDE.md)
- Anthropic API key via server-only env var (NEVER browser-exposed per CLAUDE.md)

**Estimated PRD size:** ~25-30 spec sections. Medium. May reference existing M5/M5.5 implementation rather than re-spec.

**Dependencies:** 05 (Brand Kit for tone-snippet source), 06 (chrome host), 07 (engine tools). Blocks: none.

---

### Cluster 11 — Shared UI Infrastructure

**Scope:** Toast system + error pages + modal primitives + loading skeletons + offline indicator + command-K palette + empty-state patterns. The non-feature-specific UI infrastructure all other clusters use.

**03-doc coverage:** Scattered cross-cuts. §3C #7 (right-click shell), #8 (useConfirm) overlap with Cluster 08 but the primitive lives here.

**Hi-fi files referenced:**
- `batch-a-additions/dark/Kova Hi-Fi B1 Toasts - Dark.html` (8 toast scenes: success/error/info/action/AI-gen/stacked/long-content/over-modal)
- `batch-a-additions/dark/Kova Hi-Fi B2 Error Pages - Dark.html` (404/500/network-unreachable)
- `batch-a/dark/Kova Hi-Fi A5 Command-K - Dark.html` (command palette — 3 scenes)
- `batch-a/dark/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` (modal `.dlg` shell + popover primitives)
- `batch-a-additions/dark/Kova Hi-Fi B7 Loading Skeletons - Dark.html` (5 skeleton patterns)
- `batch-a-additions/dark/Kova Hi-Fi B9 List Search Empty - Dark.html` (3 empty-result patterns)
- `batch-a/dark/Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html` (empty states + offline indicator)

**Q-decisions baked in:** None directly — these are primitives. Used by every other cluster.

**Infrastructure scope:**
- `useToast()` composable + toast component + `<ToastStack />` container
- Error pages: routes `/404`, `/500`, fallback boundary catches unhandled. Network-unreachable boundary.
- `<KovaModal />` component (wraps Reka Dialog) + size variants (sm/md/lg) per A6+A2a
- `useConfirm()` composable (also referenced by Cluster 08)
- Command-K palette composable (`use-command-palette.ts`) + search index + result renderers
- Skeleton component primitives + per-surface skeleton compositions
- Empty-state component + per-surface empty illustrations
- Offline indicator composable: `navigator.onLine` + Supabase channel state (§3C #15)
- Network status pill (A13 pattern)

**Estimated PRD size:** ~30-35 spec sections. Medium-large.

**Dependencies:** None — foundational. Used by ALL other clusters.

---

### Cluster 12 — Settings / Accessibility / User Preferences

**Scope:** §2.9 Settings page + Q5 user-preferences storage layer. Cross-cuts every persisted preference across panels.

**03-doc coverage:** §2.9 (3 rows) + §3C #3 (user-preferences storage). Cross-cuts: §2.4 Page/Layers collapse persistence, §2.7 Show text suggestions, §2.8 Recent colors, §2.10 Show ruler/guide/grid persistence.

**Hi-fi files referenced:**
- (No dedicated Settings page hi-fi — Q5 says small modal pattern, likely embed in Account page Profile section or as standalone `.dlg.md`)
- Cross-reference to `batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html` (if Settings lives in Account)

**Q-decisions baked in:**
- Q5 (corrected): Two-layer architecture. `users.preferences JSONB` column (cross-device sync — better than Figma's local-only model) + localStorage for per-device UI minutiae via VueUse `useLocalStorage`.
- Q5 schema: per-preference allocation between Layer 1 (cross-device) and Layer 2 (per-device) — table in companion Q-doc.
- DEFERRED: Snap toggles re-introduction (~7 prefs unlock-ready). Custom keybindings (DEFERRED — registry-ready).

**Infrastructure scope:**
- Schema: ALTER `users` ADD COLUMN `preferences JSONB NOT NULL DEFAULT '{}'`
- `usePreferencesStore` (Pinia): reads `users.preferences` JSONB, provides reactive getters per pref, debounced server-write
- `useLocalStoragePreferences` (VueUse wrapper for per-device prefs)
- Per-pref allocation table (per Q5 companion): which prefs go to Layer 1 vs Layer 2
- Settings page UI (modal or page — confirm during PRD)
- Accessibility section: reduced motion (defers to OS), keyboard navigation enhancements, screen-reader landmarks audit
- Persisted prefs receivers throughout app (Layers/Pages collapse state, Recent colors store, Show text suggestions, Show ruler/guide/grid, snap-overlay visibility per-canvas)

**Estimated PRD size:** ~20-25 spec sections. Medium.

**Dependencies:** 01 (users table). Blocks 08 (recent colors), 06 (panel collapse).

---

## 4. Authoring order (wave-based)

Sequential authoring (one PRD at a time per founder pick 2026-05-13). Six waves, two PRDs per wave (can author back-to-back; second wave depends on first).

| Wave | PRD(s) | Why this order |
|------|--------|----------------|
| **1** | **01 Auth & Identity** | Foundation. Every other cluster depends on logged-in user. |
| **1** (close) | **11 Shared UI Infrastructure** | Foundation. Every other cluster uses toasts/modals/skeletons/error-pages/Command-K. |
| **2** | **02 Onboarding & Dashboard** | Post-auth landing. Sets the dashboard chrome other clusters reference. |
| **2** (close) | **03 Brand Management** | Brand records exist after this. Canvas + Account both need brand context. |
| **3** | **04 Account Page + Stripe Billing** | User-scoped account chrome + billing foundation. |
| **3** (close) | **12 Settings / Accessibility / User Preferences** | `users.preferences` JSONB lands. Multiple downstream clusters consume. |
| **4** | **05 Brand Kit Settings & Drag-Drop** | Per-brand kit lifecycle + canvas drag-drop receivers. AI chat consumes tone-snippets after this. |
| **4** (close) | **06 Canvas Editor Core Chrome** | Chrome structure that hosts engine work. Largest PRD. May split. |
| **5** | **07 Canvas Engine Extensions** | Engine-side work. Biggest infra. Strong split candidate (07a + 07b). |
| **5** (close) | **08 Canvas Menus, Popovers, Context Menus & Shortcuts** | Interaction surfaces over the engine. |
| **6** | **09 Version History + Snapshot + Trash** | Trust UX layer. |
| **6** (close) | **10 AI Chat + Memory + Tool Layer** | AI layer on top of canvas + Brand Kit. References M5/M5.5 work. |

Founder reviews each PRD before next dispatches.

---

## 5. PRD template (every PRD includes)

```markdown
# PRD: <Cluster name>

## 0. Status & ownership
- Status: DRAFT / REVIEW / APPROVED / IN-IMPLEMENTATION
- Author: <agent or human>
- Reviewer: founder (Jiho Yang)
- Last updated: <date>
- Depends on PRDs: <list>
- Blocks PRDs: <list>

## 1. Problem & outcome
- Plain-language: who is the user, what task, what changes for them?
- Caveman-tier 1-paragraph summary (per CLAUDE.md communication style)

## 2. Scope
### 2.1 In scope
[bullet list of every surface + behavior in this PRD]
### 2.2 Out of scope (explicitly NOT this PRD)
[list cross-cuts handed to other clusters]
### 2.3 Deferred to Phase 2
[list anything documented but not building now]

## 3. Visual spec
| Surface | Hi-fi file | Scenes | Notes |
|---------|-----------|--------|-------|
| ... | ... | ... | ... |

Caveats for divergence: per PRE_PRD_READINESS_AUDIT_V2 caveats addendum (if any).

## 4. Data model
### 4.1 Schema migrations
```sql
-- SQL migration text
```
### 4.2 RLS policies
[per-table policy specs]
### 4.3 Storage buckets
[bucket names + access rules]

## 5. Backend
### 5.1 Edge Functions
[per function: name, trigger, args, return, dependencies]
### 5.2 RPCs / database functions
[per RPC: name, args, return, transaction boundary]
### 5.3 Cron jobs
[per cron: schedule, function, retention/cleanup behavior]
### 5.4 External integrations (Stripe / Shopify / Anthropic)
[per integration: SDK, webhook handlers, error handling]

## 6. Frontend
### 6.1 Routes
[Vue Router paths + lazy-load boundaries]
### 6.2 Pinia stores
[per store: state shape, getters, actions]
### 6.3 Composables
[per composable: signature, usage]
### 6.4 Components
[per component: props, slots, emits — leaf components only; sub-tree shown in mockup]
### 6.5 Drag-drop / DnD handlers (if applicable)
[MIME types + payload shape + receiver behavior]

## 7. Tool layer / canvas-engine touches (if applicable)
- packages/core/ modifications (lift core lock per CLAUDE.md amendment if any)
- Scene-graph extensions (NodeType additions)
- Renderer changes
- App-level overlays
- AI tool registrations

## 8. Acceptance criteria
- [ ] [testable bullet]
- [ ] [testable bullet]
- [ ] ...

## 9. Test plan
### 9.1 Unit tests
[per-function targets, key edge cases]
### 9.2 Integration tests
[API endpoint + DB integration scenarios]
### 9.3 E2E tests
[user-flow scenarios via Playwright / Vercel Agent Browser]
### 9.4 Manual QA
[founder browser-verify checklist per memory `feedback_browser_smoke_test_before_done`]

## 10. Rollout phasing
- Phase A: [what ships in this PRD's first deploy]
- Phase B (if applicable): [what ships in follow-up]
- Feature gates / flags: [per gate, default + activation criteria]

## 11. Cross-cuts to other PRDs
| Other PRD | What we depend on | What they depend on us for |
|-----------|-------------------|----------------------------|

## 12. Risks + open questions
| Risk | Severity | Mitigation |
|------|----------|------------|
| ... | ... | ... |

## 13. References
- 03-doc rows covered: [list row IDs]
- Q-decisions baked in: [Q1, Q3, ...]
- Hi-fi files: [paths]
- Design system:
  - `main-main-kova-scope/design-system/design.md` (spec)
  - `main-main-kova-scope/design-system/kova-hifi.css` (canonical dark CSS — tokens + component classes; engineers translate to Tailwind @theme + Vue components)
  - `main-main-kova-scope/design-system/kova-hifi-light.css` (canonical light CSS — auth/marketing only, link only if PRD covers a light surface)
  - `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` (vocabulary cheat-sheet — short/long/scoped naming + canonical hex values)
- Source-of-truth visual bar: `main-main-kova-scope/batch-b/Kova Canvas - Final.html` `.kc {}` block (lines 75-502) for canvas chrome.
```

---

## 5.5. Existing M9 Shopify integration — partial-build cross-cut

> **CRITICAL:** Shopify integration is NOT green-field. M9 milestone shipped a partial Shopify integration in 2026-04-21 → 2026-04-25 on branch `feat/m9-shopify` (current working branch). Code exists for 18 API routes, 5 AI tools (schema bug fixed 2026-05-13), OAuth flow with polling fallback, brand-kit auto-extract, onboarding StoreTypeStep, settings integrations page, canvas Shop panel + product variant bindings. **BUT:** Built by autonomous agent ("Ralphy") without explicit founder-intent alignment requirements. **Comprehensive audit cleared 2026-05-14** (`00c-COMPREHENSIVE_AUDIT_REPORT.md`) — M9 alignment decisions ratified, see §5.6 (items 1, 3, 4, 6).

**Cluster impact:** Shopify integration weaves through 4 PRD clusters. Each affected PRD must include a section: "M9 reuse / refactor / re-spec analysis" that calls out:

- What existing M9 code/schema the PRD reuses verbatim
- What M9 needs refactor to align with PRD intent
- What M9 needs re-spec (rewrite + replace)

| PRD Cluster | M9 surface | Reuse / refactor / re-spec call (ratified 2026-05-14 — see §5.6) |
|-------------|-----------|--------------------------------|
| **02 Onboarding & Dashboard** | `StoreTypeStep.vue` (onboarding Shopify connect step) | **REFACTOR** — light→dark theme (§5.6 item 1). Otherwise reuse logic verbatim. |
| **04 Account Page + Stripe Billing** | `SettingsBrandIntegrationsView.vue` + `IntegrationsCard.vue` (settings → integrations) | **REFACTOR** — (a) light→dark theme (§5.6 item 1); (b) re-route from `/dashboard/:brandId/settings/integrations` URL-param to `/account/integrations` + brand-dropdown per Q12/Q13 (§5.6 item 4); (c) wire NEW `shopify_connection_history` table behind the empty sync-history accordion (§5.6 item 6). |
| **05 Brand Kit & Drag-Drop** | `api/shopify/brand-kit-extract.ts` (auto-populate Brand Kit from store theme) | **RE-SPEC** — extend extract to also scrape brand voice + tone snippets via Claude API on Shopify connect (§5.6 item 3). Current colors/fonts/logo logic reused. |
| **06 Canvas Editor Core Chrome** | `src/canvas-extensions/product-variant/` (Shop panel + variant bindings) | **REUSE** — verify Shop panel docks in right panel + product drag-drop integrates with Q24 semantics during Cluster 06 PRD. |
| **10 AI Chat + Memory + Tool Layer** | 5 Shopify AI tools (`search_products`, `get_collection`, `get_variant`, `get_active_discounts`, `get_shop_context`) | **REUSE** — schema bug fixed 2026-05-13, 22 tests pass. Verify alignment with Q3 + Q8 + Cluster 10 intent during PRD. |
| **01 Auth & Identity (GDPR cascade)** | `delete-account-cron` cascade includes Shopify disconnect + OAuth revoke (Q15) | **BUILD** — `delete-account-cron` Edge Function not yet built (audit item 9, expected). Cluster 01 builds it + `gdpr_deletion_queue` retry table; cascade includes Shopify OAuth revoke. |

**Pre-PRD-authoring blockers from M9 — dispositions (audit cleared 2026-05-14, see §5.6):**
- 18 failing unit tests → **TEST-DEBT.** Pre-existing Reka/Vue mock rot, not M9 fault. Triage in Wave 6 cleanup; explicitly out of scope for Waves 1–5 PRDs.
- 20 uncommitted files → **COMMIT** before any Shopify-touching PRD authors (grouped-commit plan — schema-bug fix + polling fallback + sync workers + UI surfaces + migrations).
- Manual smoke test recipe → founder executes before Shopify-touching PRD authors (Clusters 02/04/05/06/10).
- Vercel production deploy (Handoff 14) → **deferred until after Wave 1-3 PRDs ship code** (founder decision 2026-05-13).

Audit cleared. PRDs author against ratified M9 state — not re-spec from scratch. M9 alignment decisions in §5.6 items 1, 3, 4, 6.

---

## 5.6. Pre-PRD comprehensive audit — ratification log

> **Comprehensive audit cleared 2026-05-14.** Report: `00c-COMPREHENSIVE_AUDIT_REPORT.md` (2585 lines). Verdict was **⚠️ REQUIRES FOUNDER RATIFICATION** — Q1–Q25 all PASS, foundation strong, no BLOCKERS, but 10 priority items needed founder input. All resolved 2026-05-14. **Verdict flips → ✅ APPROVED FOR PRD AUTHORING.**

### Founder decisions ratified 2026-05-14 (6)

| Audit # | Item | Decision | Reversibility | Affects |
|---|------|----------|---------------|---------|
| 1 | M9 light-theme drift on 3 Shopify surfaces (`StoreTypeStep`, `IntegrationsCard`, `SettingsBrandIntegrationsView`) — violates dark-app rule | **FIX PRE-LAUNCH.** Refactor all 3 to dark theme (~6–12 hr). | TRIVIAL | Clusters 02, 04 |
| 2 | Stripe Customer scope | **ONE STRIPE CUSTOMER PER USER, FOREVER.** No per-brand billing — freelancer pays one subscription, manages many client brands. Matches Kova avatar. | HARD | Cluster 04 |
| 3 | M9 `brand-kit-extract` scope vs Q8 | **EXTEND.** On Shopify connect, `brand-kit-extract` also scrapes brand voice + tone snippets via Claude API. Richer kit at onboarding. Current colors/fonts/logo logic reused. | SOFT | Cluster 05 |
| 4 | M9 Integrations IA | **ALIGN TO Q12/Q13.** Reconcile M9 route to `/account/integrations` + brand-dropdown. M9's `/dashboard/:brandId/settings/integrations` URL-param route gets refactored. | SOFT | Cluster 04 |
| 5 | 8 cross-cutting infra picks | **RATIFY ALL 8 AUDITOR DEFAULTS:** Vercel Cron (job queue), Resend (email), Sentry (error tracking), Supabase CLI (migration runner), hard-coded feature flags, + default rate-limit / upload-cap / storage-bucket-layout. | mix | All clusters |
| 8 | M9 sync-history accordion renders empty (`Connection.history` TS field, no DB column) | **BUILD `shopify_connection_history` TABLE.** Cluster 04 needs it anyway. Wires the empty accordion. | SOFT | Cluster 04 |

### Items handled without founder decision (4)

| Audit # | Item | Disposition |
|---|------|-------------|
| 6 | 18 failing unit tests | **TEST-DEBT.** Pre-existing Reka/Vue mock rot, not M9 fault. Triage in Wave 6 cleanup. Out of scope for Waves 1–5 PRDs. |
| 7 | 20 uncommitted files on `feat/m9-shopify` | **COMMIT** via grouped-commit plan before any Shopify-touching PRD authors. |
| 9 | Q15 `delete-account-cron` cascade Edge Function not built | **EXPECTED.** Cluster 01 builds it + `gdpr_deletion_queue` retry table. Surfaced as launch blocker in Cluster 01 PRD §12. |
| 10 | PRD 07 (Canvas Engine Extensions) 50–60 spec sections | **SPLIT COMMITTED** into `07a` (Core mods + Renderer) + `07b` (Inspector wiring + Overlays). Execute at draft time. See §3 Cluster 07. |

### Audit-verified coverage

25 Q-audit blocks present (all PASS) · 12 cluster gap-fill specs present · 15 cross-cutting decisions · 15 architecture decisions · 13 tooling decisions. External claims re-verified via live WebFetch: Figma help (Q2, Q7, Q11), Stripe docs (Q14), GDPR Art. 17 (Q15), Shopify OAuth revoke (Q15 cascade). Sources cited in report §Methodology.

---

## 6. Cross-cuts that span multiple PRDs

These primitives + integrations touch 3+ PRDs and need consistent treatment:

| Primitive | Cluster of origin | Used by |
|-----------|-------------------|---------|
| `useConfirm()` composable | 11 + 08 | 03 (delete brand), 04 (delete account, cancel sub), 09 (delete snapshot, empty trash), 05 (delete tone snippet, delete saved block) |
| Toast system (incl. variant taxonomy: success / error / info / AI-gen) | 11 | every cluster with mutation feedback (03, 04, 05, 06, 07, 09, 10) |
| Modal `.dlg` shell | 11 | 03, 04, 05, 08, 09 |
| Loading skeletons | 11 | 02, 03, 04, 05, 09 |
| Command-K palette | 11 | 02, 06 (canvas-aware nav) |
| Right-click context-menu shell | 08 | 02 (file grid right-click), 03 (brand list right-click), 06 (layer right-click), 08 (canvas right-click) |
| Keyboard shortcut registry | 08 | 06 (tool shortcuts), 07 (boolean ops shortcuts), 08 (all menu shortcuts), 12 (custom-keybindings unlock-ready) |
| User preferences (Layer 1 JSONB + Layer 2 localStorage) | 12 | 06 (panel collapse), 08 (recent colors, ruler visibility), 07 (show text suggestions) |
| Brand context (active brand selection) | 03 | 02, 04, 05, 06, 10 |
| Snapshot/version-history store | 09 | 06 (autosnap heartbeat), 07 (scene graph stability), 10 (chat references canvas state) |
| Vue Router meta theme detection (light vs dark) | 11 | 01, 02, 04 set per-route; 06–10 inherit dark (added per 00c §1.D) |
| Supabase Realtime channel naming convention | 11 | 09 (snapshot progress), 10 (chat streaming), 04 (Shopify M9 sync progress) (added per 00c §1.D) |
| Idempotency-key pattern for write Edge Functions | 11 | 01 (deletion request), 04 (Stripe webhook), 09 (snapshot create) (added per 00c §1.D) |
| Tauri command-surface naming (`kova.*`) | 06 | 06 (canvas chrome owns Tauri menu), 07 (eyedropper Phase 2) (added per 00c §1.D) |

**Implication:** Cluster 11 + 08 + 12 ship foundational primitives. Downstream clusters reference them by API, don't re-spec. The four cross-cuts added 2026-05-14 (per the comprehensive audit §1.D "hidden dependencies" finding) are owned by Cluster 11 + Cluster 06 and must be specced as named conventions, not re-invented per consuming PRD.

---

## 7. Open questions per cluster

**None pending at scope-plan time.** All 25 §4 founder Qs resolved 2026-04-25. Q-decisions baked into each cluster's scope.

Questions surface during PRD authoring (visual ambiguity in hi-fi, infra gap discovered, edge case not covered by Q-answers). Each PRD has §12 Risks + Open Questions section where these get tracked + escalated to founder for resolution.

---

## 8. Definition of "PRD ready for implementation"

A PRD ships from DRAFT → REVIEW → APPROVED when:

- [ ] Every §3 surface has a hi-fi file reference + scene ID
- [ ] §4 data model has migration SQL ready to run
- [ ] §5 backend has Edge Function signatures + RPC specs
- [ ] §6 frontend has route paths + Pinia store shapes + composable signatures
- [ ] §8 acceptance criteria all testable (not aspirational)
- [ ] §9 test plan has unit + integration + E2E coverage
- [ ] §11 cross-cuts list complete + every dependency has a fulfilling PRD or explicit owner
- [ ] §12 risks listed with mitigation OR escalated to founder + resolved
- [ ] Founder sign-off recorded in §0 status field

After APPROVED → PRD enters implementation queue. `superpowers:writing-plans` skill consumes the PRD to produce step-by-step implementation plan. TDD workflow per `superpowers:test-driven-development` executes the plan.

---

## 9. Total scope summary

| Metric | Value |
|---|---|
| Total clusters / PRDs | 12 |
| Estimated total spec sections | ~350-400 across all PRDs |
| Hi-fi files referenced | 39 (every batch-a, batch-a-additions, batch-b file mapped) |
| 03-doc rows covered | 182/182 (full coverage, B12/B13 scope-removed not counted) |
| Q-decisions referenced | All 25 (Q1-Q25) |
| Authoring waves | 6 (sequential, 2 PRDs per wave) |
| Estimated authoring time | ~12-16 founder-review sessions, ~2-4 hr per PRD |

---

## 10. Next step

Both audits cleared, all 10 priority items ratified (see §5.6). **Ready for Wave 1.** Next: draft **`01-auth-and-identity.md`** (Cluster 01 Auth & Identity), then **`11-shared-ui-infrastructure.md`** (Cluster 11 Shared UI Infrastructure). Founder reviews each PRD before the next dispatches.
