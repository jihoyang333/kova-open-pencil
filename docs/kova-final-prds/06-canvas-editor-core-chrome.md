# PRD 06 — Canvas Editor Core Chrome

## 0. Status & ownership

| Field | Value |
|---|---|
| **Status** | `DRAFT` 2026-05-15 → **READY** 2026-05-17 (all §12 founder ratifications applied) |
| **Wave** | 4 |
| **Author** | Claude (Opus 4.7) |
| **Reviewer** | Jiho Yang (founder) |
| **Last updated** | 2026-05-17 (founder ratifications: §12.1 third-section Shop, §12.2 composable page primitives, §12.3 hide topbar Comments, §12.13 AI default tab, §12.14 sticky-on-click, §12.15 InspectorSectionDef priority registry) |
| **Depends on PRDs** | 02 (Onboarding & Dashboard — `/dashboard` route as "Back to dashboard" target), 03 (Brand Management — `useBrandsStore`, A2a brand-picker pattern), 11 (Shared UI Infrastructure — `<KovaModal>`, `useToast`, `useConfirm`, skeletons, idempotency, Realtime channel naming, Tauri command-surface naming) |
| **Blocks PRDs** | 07a (Core mods + Renderer — needs chrome shell to host tool registrations), 07b (Inspector wiring + Overlays — mounts inside this PRD's right-panel sections + overlays in canvas), 08 (Menus + Popovers + Shortcuts — mounts menu trigger anchors in top chrome), 09 (Version History — mounts in right panel when active), 10 (AI Chat — mounts `<ChatPanel>` in right-panel AI tab) |
| **Source artifacts** | Hi-fi: `Kova Canvas - Final.html` (canonical chrome source-of-truth, lines 75–1008), `Kova Hi-Fi 10 Left Panel - Dark.html` (4 scenes), `Kova Hi-Fi 11 Inspector - Dark.html` (7 scenes), `Kova Hi-Fi 12 Color Picker - Dark.html` (8 scenes), `Kova Hi-Fi 08 Top Chrome Menus - Dark.html` (top-chrome menu catalog), `Kova Hi-Fi 16 Toasts + Missing Fonts - Dark.html` (canvas-side toast variant). 03 doc: §2.1 (7 rows) + §2.3 (3 rows) + §2.4 (12 rows) + §2.6 (26 rows) = 48 rows. Q-decisions: Q3 (inspector engine readiness — wire what's ready), Q4 (zero engine extension hooks — canvas-extensions use external Pinia + public FigmaAPI), Q16 (avatar dropdown items), Q17 (brand label = navigate to brand dashboard), Q18 (right-click overflow vs canvas right-click — shared `useObjectActions`). Audit §2.A Cluster 06 (lines 1551–1613). `project_prd10_decisions` memory (right-panel = Design + AI; Prototype DROPPED entirely). Shopify spec §4.1 (Shop panel rework). |

---

## 1. Problem & outcome

### 1.1 Plain language (for founder)

A freelance email marketer opens a canvas and needs every editor surface in place — topbar with brand breadcrumb and avatar, bottom toolbar with the tools she'll spend 80% of her time in, left panel with the page + layer tree, right panel split between properties (Design tab) and chat (AI tab) — all wired to the canvas engine that lives in `packages/core/` and the AI runtime that lives in Cluster 10. This PRD ships the **structural canvas chrome**: the Vue 3 route, the topbar layout, the bottom toolbar with 11 tools (9 from hi-fi + Slice + Measurement registered by Cluster 07a), the left panel with Pages + Layers tree (virtual scrolling, drag-reorder, mask/slice glyphs, hover→canvas-scroll), the right panel **two-tab framework** (Design + AI, default-active **AI** on first canvas open per founder ratification 2026-05-17, sticky-on-layer-selection per Figma pattern, Prototype dropped entirely per founder ratification 2026-05-15) with inspector router that mounts Cluster 07b section components, the Shop panel multi-select + "Import N to chat" button that hands selected products to Cluster 10's chat reference, the drag-drop **receiver** dispatcher that reads Cluster 05's brand-kit MIME payloads and applies them contextually (color→fill, font→fontFamily, logo→image fill, saved-block→TEXT spawn), and the EditorView refactor that removes the floating `<ChatPopup>` so the AI tab is the only chat surface. No new core engine work; everything plugs into existing core APIs.

### 1.2 Caveman summary (per CLAUDE.md communication style)

PRD ship canvas chrome shell. /canvas/:canvasId route. Topbar = logo dropdown + brand breadcrumb (click = navigate dashboard per Q17) + file menu + notifications/comments/avatar. Bottom toolbar = 11 tools (Move/Frame/Rect/Ellipse/Pen/Text/Measurement/AI/Components + Frame dropdown→Slice + Move dropdown→Hand+Scale). Left panel = Pages + Layers tree (virtual scroll, drag-reorder, mask/slice glyphs, search). Right panel = 2 tabs ONLY (AI default on first open + Design — Prototype DROPPED per founder 2026-05-15; AI-default + sticky-on-click ratified 2026-05-17). Design tab routes per-section: Position/Layout/Fill/Stroke/Text/Effects/Export/Page (no-selection). AI tab mount ChatPanel slot (Cluster 10 provides component). Floating ChatPopup REMOVED. Shop panel multi-select + Import N to chat button (writes to chat refs per Cluster 10). Drag-drop receivers dispatch on MIME (color/font/logo/saved-block — Cluster 05 owns sources + contract). Tool registrations for Slice + Measurement plug in from Cluster 07a. Cluster 07b mount inspector sections + overlays + color picker into PRD 06's shells. Cluster 08 mount menus + right-click + find. Cluster 11 ship toast/modal/skeletons used everywhere.

### 1.3 Outcome (acceptance gate)

User can: (1) navigate to `/canvas/:canvasId` and see topbar with brand breadcrumb + file menu + avatar; (2) click the brand label → navigates to `/brand/{current}` (per Q17 — no in-canvas brand switching); (3) click the avatar dropdown and see 5 items: User name + plan badge (header), Account, Help, Keyboard shortcuts (⇧⌘?), Sign out (per Q16; What's new hidden Phase 2); (4) click "Sign out" → calls `useAuthStore.signOut()` → routes to `/login`; (5) see bottom toolbar with 11 tools, click each tool to switch active tool; (6) see left panel with Pages section (current page + add button) + Layers tree (virtual scroll, expand/collapse, drag-reorder, visibility eye, lock icon, mask glyph for `isMask=true` nodes, slice glyph for SLICE nodes — per Cluster 07a registration); (7) hover a layer row → corresponding canvas node highlights (existing `editor.hoveredNodeId`); (8) right-click a layer row → context menu opens (Cluster 08 ships menu, this PRD wires position calc); (9) see right panel with exactly two tabs (Design + AI — Prototype NOT rendered); (10) default tab on first canvas open = **AI** (per founder ratification 2026-05-17 — Kova differentiator surfacing chat-first UX); subsequent opens read per-canvas `localStorage[right-panel-tab:${canvasId}]`; clicking a layer does NOT auto-switch tabs (sticky per Figma); (11) click AI tab → ChatPanel content slot renders (Cluster 10 ships component); (12) Design tab shows inspector sections per selection (Position/Layout/Fill/Stroke/Text/Effects/Export — Cluster 07b mounts) OR Page section when no selection (Cluster 07b ships); (13) drag a brand color from the canvas Assets panel onto a frame fill → top fill replaced (drop receiver dispatch on `application/x-kova-brand-color`); (14) Shift+drag color onto stroke → stroke replaced; (15) drop color on empty canvas → spawn 200×200 rect (per Q24); (16) drag font onto TEXT layer → fontFamily applied; (17) drag logo onto layer with fill → image fill replaced; (18) drag saved-block (from Cluster 05's Brand Kit grip handle OR Assets panel saved-block tile) onto canvas → TEXT node spawns with content (type-aware: `cta` → button-style wrap, `footer` → snap to bottom); (19) multi-select products in Shop panel + click "Import N to chat" → products land as chips in active AI-tab conversation (Cluster 10 callback writes to `chat_conversations.product_references`); (20) ChatPopup (the floating popup) does NOT render anywhere — removed from EditorView; (21) Slice + Measurement tools appear in toolbar (registered by Cluster 07a's tool registration call into this PRD's `useToolRegistry`); (22) clicking the AI tool button in bottom toolbar → opens right panel (if collapsed) + switches to AI tab + focuses ChatPanel composer; (23) the entire canvas chrome respects DARK theme per `kova-hifi.css` (no toggle); (24) the chrome is desktop-only (viewport guard at < 1024px routes to `/desktop-only` per Cluster 01).

---

## 2. Scope

### 2.1 In scope (this PRD)

**Route + view shell:**
- Vue Router route `/canvas/:canvasId` (children: none — chrome is one view)
- `EditorView.vue` — wraps everything in the `kc` class scope per `Final.html` `.kc {}` block (lines 75–502)
- Brand-context guard: if `:canvasId` does not belong to a brand the user owns → 403 redirect

**Top chrome (`.topbar`, 44 px height):**
- Left: logo (24×24 K-monogram) with dropdown chevron (anchor for File menu — Cluster 08 ships the menu)
- File-row: brand breadcrumb pill (logo + brand name) + slash separator + file name + dropdown chevron (anchor for file-name dropdown — Cluster 08 ships)
- Brand label CLICK → navigates `router.push('/brand/' + selectedBrand.id)` per Q17 (no popover, no in-canvas switching)
- Right: notifications icon (Phase 2 — render as muted/hover-only), Present icon (Phase 2 — placeholder), avatar (initials, 26×26 circle, brand-color background). **Comments icon HIDDEN per §12.3 RATIFICATION 2026-05-17** — added back additively when Comments feature ships post-MVP.
- Avatar dropdown (Reka DropdownMenu — Cluster 11 ships shell):
  - Header: User name + plan badge ("Pro" / "Free")
  - Item: **Account** → `router.push('/account')` (Cluster 04)
  - Item: **Help** → opens `mailto:support@kova.app` in MVP (Phase 2: `/help` external docs)
  - Item: **Keyboard shortcuts** (⇧⌘?) → opens shortcuts dialog (Cluster 08 ships)
  - Item: **Sign out** → `useAuthStore.signOut()` (Cluster 01) → `router.push('/login')`
  - **NOT rendered:** Brand picker (per Q17 reversal), What's new (Phase 2 — hidden, not disabled)

**Bottom toolbar (`.toolbar`, floating pill, bottom-center, 11 tools):**
- Move (V) with dropdown chevron — sub-items: Move, Hand (Phase 2 — gated by feature flag), Scale (registered by Cluster 07a)
- Frame (F) with dropdown chevron — sub-items: Frame, Slice (S) (registered by Cluster 07a)
- Rectangle (R)
- Ellipse (O)
- Pen (P) with dropdown chevron (sub-items Phase 2 — render chevron when ≥1 future sub-tool, otherwise omit per 03 doc §2.3 Open Q)
- Text (T)
- **Measurement (⇧M)** — takes the slot the canvas Final hi-fi shows "Comment" in. Comments are DEFERRED to Phase 2 per scope plan. Measurement is registered by Cluster 07a. Per 03 doc §2.7: "Measurement tool (⇧M) — bottom toolbar (under former Comment slot, now standalone since Comments DEFERRED)"
- Divider
- **AI** (Ask Kova) — clicking switches right panel to AI tab + focuses ChatPanel composer (does NOT open a floating popup — popup REMOVED per PRD 10)
- Components (Phase 2 — Components DEFERRED per scope plan; rendered as visible-disabled tool with "Phase 2" tooltip)
- Eyedropper (^C) registered by Cluster 07b — not a default-visible tool; activated via keyboard shortcut OR from inside fill picker

**Left panel (`.left`, 240 px wide):**
- File-row at top: file icon + canvas name + "N emails · edited X ago" meta
- **Pages section** (`.pages`):
  - "Pages" section header + add button (+ icon)
  - Page-row list (current page highlighted)
  - Inline rename on double-click (reuses `use-inline-rename.ts`)
  - Drag-reorder (calls `editor.reorderPage(pageId, newIndex)` — Cluster 07a may add this primitive; if missing, falls back to Yjs page array splice via `editor.ts`)
  - Right-click context menu (Cluster 08 ships menu; this PRD wires anchor + position calc)
- **Layers section** (`.layers`, virtual-scrolling tree):
  - Section header with search icon (Phase 2 — render hover-only) and section count
  - `useLayerTree` composable — derives flat virtualized list from `editor.graph` with expand/collapse state
  - Per-row: caret (expand toggle) · type icon · name · indent · mask glyph (when `node.isMask === true`, type-variant per `maskType`) · slice glyph (when type = SLICE) · visibility eye (hover/selected only) · lock icon
  - Hover row → sets `editor.hoveredNodeId` → existing canvas hover-overlay renders
  - Click row → calls `editor.select(nodeId)`
  - Drag-reorder layers (calls existing `editor.reorderChildWithUndo`)
  - Right-click row → context menu (Cluster 08 ships; this PRD wires)
  - Empty state: "No layers yet" (Cluster 11 empty-state primitive)

**Right panel (`.right`, 264 px wide) — TWO-TAB framework:**
- Tab strip: **Design** + **AI** (default-active = AI on first canvas open per founder ratification 2026-05-17; tab is **sticky** on layer-click — selection never auto-switches the tab). Prototype tab NOT rendered (per founder ratification 2026-05-15, scope plan §3 Cluster 06 "Prototype DEFERRED" line is superseded by "Prototype out of scope entirely")
- Zoom HUD on tab-strip right (e.g., "292%") + caret (opens zoom popover — Cluster 08 ships)
- **Design tab content** — inspector orchestrator:
  - Frame-head: title (Frame / Group / Component / layer name) + dropdown caret + actions (Code/Component/Theme — Phase 2 — render but no-op in MVP)
  - When selection exists: render section list per selection type via `useInspectorRouter` — sections supplied by Cluster 07b (`<PositionSection>`, `<LayoutSection>`, `<FillSection>`, `<StrokeSection>`, `<TextSection>`, `<EffectsSection>`, `<ExportSection>`)
  - When no selection: render `<PageSection>` (Cluster 07b ships) with page background color/opacity/visibility/show-in-exports/Export rows
- **AI tab content** — `<ChatPanel>` slot (Cluster 10 ships the component); this PRD ships the slot mounting + tab-switch wiring
- Tab switching: shared `useRightPanelStore` (NEW) — `activeTab: 'design' | 'ai'`; localStorage-persisted per-canvas per Q5 Layer 2

**Shop panel (RATIFIED 2026-05-17 — third stacked section in LEFT sidebar):**
- Shop panel docks as the THIRD collapsible section in `<LeftPanel>`, stacked below `<PagesPanel>` and `<LayersPanel>`. Width matches existing left panel (240 px — NOT the 260 px from Shopify spec; founder ratified parity with existing chrome over Shopify spec width).
- Section uses Reka `<CollapsibleRoot>` from Cluster 11. Default-expanded ONLY when the active brand has a confirmed `shopify_connection_history.connection_status = 'connected'`; otherwise default-collapsed with empty-state "Connect Shopify in Account → Integrations" CTA.
- Header shows count badge: `Shop · {productCount}`. Body renders `<ShopPanelProducts>` (multi-select grid per Shopify spec §4.1 + §5.2).
- Layout flexbox: PagesPanel `flex-shrink: 0` (intrinsic height ~120 px), LayersPanel `flex: 1 1 auto` (takes remaining space, virtual-scrolls), ShopPanel `flex-shrink: 0` when collapsed, `max-height: 40vh` when expanded (prevents pushing Layers off-screen). User can resize section heights via drag handles between sections.
- Search input (debounced 300 ms)
- Sort dropdown (A–Z default · Price ↑ · Price ↓ — `bestsellers` removed per PRD 10 / Shopify spec §5.2)
- Collection filter dropdown (All collections + per-collection)
- Product grid (2-col, square thumbnail + title + price/range)
- Click-to-toggle select; selected = accent border + checkmark badge
- **Sticky bottom bar (visible when ≥1 selected): "Import N to chat" primary + "Clear" secondary**
- "Import N to chat" → callback writes selected products to active AI-tab conversation's `chat_conversations.product_references` via Cluster 10's `useChatProductReferencesStore.importProducts(productIds)` + clears selection
- Empty state (no Shopify): "Connect Shopify to import products" + Connect CTA → routes to `/account/integrations`
- Empty state (Shopify connected, no products synced yet): skeleton rows (Cluster 11)

**Tabs bar (multiple canvases per session — existing `useTabsStore`):**
- Top of editor view above `.topbar` OR inside `.topbar` — per existing M5 implementation, lives above topbar
- Reuse existing `<TabsBar>` component (already shipped in M5)
- No new logic — verify pattern preserved through chrome refactor

**Drag-drop receivers (`use-canvas-drop.ts` — EXTEND existing):**
- Dispatch on `event.dataTransfer.types` containing any of the 5 Cluster-05 MIME types
- Per MIME handler: dispatch to specific drop logic (color→fill replace, font→fontFamily, logo→image fill, saved-block→TEXT spawn, tone-snippet→TEXT replace)
- Modifier-key handling: Shift = stroke replace, Alt = additive fill
- Drop position: pointer position on canvas (existing `useCanvasInput` provides screen→canvas mapping)
- Visual feedback: drop-target highlight + ghost preview overlay (small label "Will apply as fill" / etc.)
- Existing image-file drop (M5) preserved — `dataTransfer.files` of image MIME → spawn IMAGE node
- Drop validation: payload schema verified via valibot (NOT zod per CLAUDE.md tool layer)

**Floating chrome elements:**
- Zoom HUD (`.zoom`, bottom-right, current zoom %)
- Help FAB (`.help-fab`, bottom-right above zoom — Phase 2 render but disabled in MVP)
- Network status pill (Cluster 11 ships — anchored top-right of topbar OR via Cluster 11's auto-mount)

**Engine integration (no `packages/core/` modification — wires what's there):**
- `useEditorStore` (existing) — verify `showUI` as 3-state enum (hidden / minimized / full) per §2.1 row; add `panelsVisible: { left: boolean; right: boolean }` per-tab state
- `useTabsStore` (existing) — verify per-tab persistence
- `useCanvasesStore` (existing) — verify `reorderPage` + `duplicatePage` actions wired (audit Open Q in 03 doc §2.4 — flag in §12 if missing, add wiring task to Cluster 07a)
- `useToolRegistry` (NEW) — declarative registration API consumed by Cluster 07a's tool registrations (Slice, Measurement, Eyedropper, Scale, Arrow Phase 2)

### 2.2 Out of scope (handed to other clusters)

| Item | Owning PRD |
|---|---|
| Canvas engine NodeType additions (SLICE, MEASUREMENT), field additions (aspectRatio, includeInExports, pageBackgroundVisible), OpenType wiring, tool registrations (Slice/Measurement/Scale/Arrow), mask compositing | 07a — Canvas Engine Core + Renderer |
| Inspector section components (`<PositionSection>`, `<LayoutSection>`, `<FillSection>`, `<StrokeSection>`, `<TextSection>`, `<EffectsSection>`, `<ExportSection>`, `<PageSection>`); color picker popover with eyedropper trigger; gradient editor; image-fill picker; all app-level canvas overlays (frame outlines, mask outlines, slice region, snap, layout guides, pixel grid, hover contour, find highlight, eyedropper crosshair, measurement annotations) | 07b — Canvas Engine Inspector + Overlays |
| Main menu + submenus (File / Edit / View / Object / Text / Arrange / Vector / Preferences / Help); right-click context menus (canvas/page/layer/asset); find overlay; keyboard shortcuts dialog; `useMenuStore`, `useShortcutsStore`, `useFindStore`; `useObjectActions` composable | 08 — Canvas Menus + Popovers + Shortcuts |
| Version history right-panel timeline (mounts in right panel when active — Cluster 09 specifies how to overlay/replace inspector while open) | 09 — Version History + Trash |
| `<ChatPanel>` component (mounts in right-panel AI tab slot owned by this PRD); chat data layer (`useChatStore`, `useChatProductReferencesStore.importProducts`); AI tool registrations; ChatPopup REMOVAL (Cluster 10 removes the component file; this PRD removes the EditorView import + render) | 10 — AI Chat + Memory + Tools |
| Brand-kit drag SOURCES (color swatches, font rows, logo, saved-block grip) + 5 MIME-type contracts; voice-draft confirm modal; brand-kit settings sub-tabs | 05 — Brand Kit & Drag-Drop |
| `<KovaModal>`, `useToast`, `useConfirm`, skeletons, network status pill, error pages; idempotency-key helper; Realtime channel naming convention; Tauri command-surface naming | 11 — Shared UI Infrastructure |
| `useBrandsStore` reads (active brand selection), `<BrandPicker>` component (A2a sidebar variant) | 03 — Brand Management |
| `/dashboard` route (target of brand-label click + logo dropdown "Back to dashboard") | 02 — Onboarding & Dashboard |
| `/account` route (target of avatar dropdown Account item) | 04 — Account & Stripe |
| `useAuthStore.signOut` (avatar dropdown Sign out) | 01 — Auth & Identity |
| `usePreferencesStore` (panel collapse state, recent colors — Layer 1) | 12 — Settings & User Preferences |

### 2.3 Deferred to Phase 2

- **Layer thumbnails** in Layers tree rows (per 03 doc §2.4 Open Q — strategy TBD: direct URL vs CanvasKit re-render vs cached snapshot)
- **Layer search** input — render the search icon but hide the input (per 03 doc §2.4 Phase 2 row)
- **Hand tool** in Move dropdown
- **Components tool** — render visible-disabled with Phase-2 tooltip
- **Comments** — entire collaboration feature; do NOT render the Comment icon in topbar nor a Comment tool in toolbar (Measurement takes the toolbar slot)
- **Present** icon — render visible-disabled (Phase 2)
- **Notifications** icon — render visible-disabled (Phase 2; tied to comments + collaboration)
- **What's new** in avatar dropdown (Phase 2 — hidden, not disabled)
- **Help FAB** — render visible-disabled (Phase 2)
- **Pen dropdown sub-tools** — render Pen without chevron in MVP if no sub-tools registered (per 03 doc §2.3 Open Q)
- **Arrow tool (⇧L)** — registered by Cluster 07a in Phase 2 (gated by stroke-terminator renderer audit)
- **Layer search filter** — Phase 2

### 2.4 Cross-cut acknowledgments (foreign owners)

- **Cluster 07a** registers Slice + Measurement (and Phase 2: Scale, Arrow) tools via `useToolRegistry.register({...})`. This PRD ships the registry API.
- **Cluster 07b** mounts inspector section components into the slots this PRD owns (`<InspectorRouter>` queries `useInspectorRouter()` for the active section list and renders them in stacking order). Cluster 07b also mounts all overlays as canvas children — this PRD provides the `<CanvasOverlayHost>` slot.
- **Cluster 08** mounts menus + right-click handlers. This PRD provides the trigger anchors (logo dropdown trigger, file-name caret, brand label click handler — though brand label is navigate per Q17, not popover, so no menu mount; avatar dropdown anchor; layer-row right-click anchor; canvas right-click anchor; page-row right-click anchor).
- **Cluster 10** ships `<ChatPanel>` and `useChatProductReferencesStore.importProducts(productIds)`. This PRD imports and mounts.
- **Cluster 05** ships MIME contracts for drag-source side; this PRD ships the **receiver** dispatcher.
- **Cluster 11** ships `<KovaModal>` for any dialog (used by this PRD for keyboard-shortcuts dialog mount point); `useToast` for non-blocking feedback; skeletons for layer-tree loading.

---

## 3. Visual spec

Every surface maps to a hi-fi file + scene/line range. Theme: **DARK** (per `feedback_app_dark_website_light`).

### 3.1 Editor frame + chrome shell

| Surface | Route | Hi-fi file | Scene / line range | Notes |
|---|---|---|---|---|
| Editor frame (`.kc`) | `/canvas/:canvasId` | `main-main-kova-scope/batch-b/Kova Canvas - Final.html` | `.kc` block lines 75–98 (root grid, tokens) | Root has `grid-template-rows: 44px 1fr` (topbar + body); body is grid `240px 1fr 264px` (left / center / right) |
| Topbar (`.topbar`) | same | same | lines 100–141 (markup), 611–627 (instance) | 44 px height; left = logo + file breadcrumb (brand pill + sep + file name + caret); right = notifications + present + avatar (**Comments HIDDEN per §12.3** — RATIFIED 2026-05-17) |
| Left panel (`.left`) | same | same | lines 147–215 (CSS), 632–705 (instance) | 240 px wide; Pages section + Layers tree |
| Center canvas (`.center`) | same | same | lines 218–273 (CSS), 707–768 (canvas + frames) | Background `--canvas` (#242428); CanvasKit surface mounts here (existing M5) |
| Bottom toolbar (`.toolbar`) | same | same | lines 275–309 (CSS), 770–800 (instance) | Floating pill, bottom-center; 9 tools rendered in hi-fi |
| Zoom HUD (`.zoom`) | same | same | lines 311–325, 802–805 | bottom-right; reads `editor.zoom` |
| Right panel (`.right`) | same | same | lines 327–501 (CSS), 808–1008 (instance) | 264 px wide; tab strip + frame-head + property body |
| Help FAB (`.help-fab`) | same | same | lines 494–502 | Phase 2 — render visible-disabled |

### 3.2 Top chrome details

| Surface | Hi-fi | Notes |
|---|---|---|
| Logo (24×24 K-monogram) | Final.html line 613 | `.topbar .logo` — `--ink` background, `--bg` text, 6 px radius |
| File breadcrumb pill | Final.html lines 614–620 | `.crumb-brand` (brand color square + brand name) + slash sep + bold file name + caret |
| Brand label CLICK behavior | Q17 | `router.push('/brand/' + selectedBrand.id)`. NO popover. (Cluster 02 owns dashboard route.) |
| File-name caret | Final.html line 618 | Anchor for file-name dropdown (Cluster 08 ships menu) |
| Notifications icon | Final.html line 622 | Phase 2 — visible-disabled (collaboration tied) |
| Present icon | Final.html line 623 | Phase 2 — visible-disabled |
| Comments icon | Final.html line 624 | **HIDDEN** (RATIFIED 2026-05-17 §12.3 — `<TopChromeActions>` renders no Comments slot; additive PR when Comments feature ships) |
| Avatar (26×26 circle) | Final.html line 625, `Kova Hi-Fi 08 Top Chrome Menus - Dark.html` (avatar dropdown panel) | Brand-color background + initials |
| Avatar dropdown content | `08 Top Chrome Menus - Dark.html` (avatar dropdown panel rows) | Per Q16: User+plan header / Account / Help / Keyboard shortcuts / Sign out. NO brand picker (per Q17). NO What's new (Phase 2). |
| Logo dropdown (File menu trigger) | `08 Top Chrome Menus - Dark.html` | Anchor on `.topbar .logo`; Cluster 08 ships the dropdown content (first item: "Back to dashboard" per 03 doc §2.1) |

### 3.3 Bottom toolbar — 11 tools

| Tool | Slot | Key | Source | Hi-fi line | Notes |
|---|---|---|---|---|---|
| Move | 1 | V | Final.html | 772–774 (`active` in hi-fi) | Default tool. Dropdown chevron mounts when Hand + Scale registered |
| Frame | 2 | F | Final.html | 775–777 | Dropdown chevron mounts when Slice registered (Cluster 07a does) |
| Rectangle | 3 | R | Final.html | 778–780 | |
| Ellipse | 4 | O | Final.html | 781–783 | |
| Pen | 5 | P | Final.html | 784–786 | Chevron rendered only if sub-tools registered (per 03 doc §2.3) |
| Text | 6 | T | Final.html | 787–789 | |
| **Measurement** | 7 | ⇧M | 03 doc §2.7 + Cluster 07a | replaces hi-fi line 790–792 "Comment" slot | Comments DEFERRED per scope plan. Measurement registered by Cluster 07a; Cluster 06 reserves the slot via registry priority |
| Divider | — | — | Final.html | 793 | `.divider` between primary + secondary tool clusters |
| **AI (Ask Kova)** | 8 | / (Phase 2) | Final.html | 794–796 | Click → opens right panel + switches to AI tab + focuses ChatPanel composer (per PRD 10 §6 + this PRD §6.3 `useRightPanelStore`) |
| Components | 9 | — | Final.html | 797–799 | Phase 2 visible-disabled. Tooltip: "Components — Phase 2" |
| Scale (Phase 2) | dropdown under Move | K | Cluster 07a registers | — | Move-dropdown sub-item |
| Hand (Phase 2) | dropdown under Move | H | Cluster 07a or later | — | Move-dropdown sub-item |
| Slice | dropdown under Frame | S | Cluster 07a registers | — | Frame-dropdown sub-item |
| Eyedropper | (no toolbar slot) | ^C | Cluster 07b | — | Activated via keyboard or from inside fill picker. Not a tool-button surface |
| Arrow stub (Phase 2) | dropdown under Pen | ⇧L | Cluster 07a (Phase 2) | — | |

### 3.4 Left panel — Pages + Layers

| Surface | Hi-fi file | Scene / line | Notes |
|---|---|---|---|
| File-row (top) | `main-main-kova-scope/batch-b/Kova Canvas - Final.html` | lines 633–639 | File icon (16×16 doc) + canvas name + meta ("3 emails · edited 2m ago") |
| Pages section header | Final.html | lines 641–644 | "PAGES" uppercase label + add button (+) |
| Page row | Final.html | lines 646–650 | Active page highlighted with `--fill` background |
| Page right-click | `main-main-kova-scope/batch-b/chunk-b3/Kova Hi-Fi 10 Left Panel - Dark.html` | scene 10.4 | Menu items: Duplicate / Rename / Delete / Move up/down. Cluster 08 ships menu |
| Layers section header | Final.html | line 652 | "LAYERS" uppercase label |
| Layer row | Final.html | lines 654–702 | Caret · type icon · indent · name · mask glyph (when isMask) · vis eye (hover only) · lock icon |
| Layer row hover/selected | Final.html | lines 661–666 (selected example) | `--select-soft` background, `--ink` text |
| Layer mask glyph variants | 10 Left Panel | scene 10.2 + Q2 maskType variants | ALPHA / VECTOR / LUMINANCE — different glyph per maskType. Per Q2, data model in core; Cluster 07a no work needed |
| Layer slice glyph | 10 Left Panel | scene 10.3 | SLICE NodeType rows show distinct slice glyph (dashed rectangle icon) |
| Layer empty state | 10 Left Panel | scene 10.1 | "No layers yet" copy + small illustration |
| Layer drag-reorder | 10 Left Panel | scene 10.5 (motion) | Drag handle on hover; drop-line indicator between rows |
| Layer search (Phase 2) | 10 Left Panel + 03 doc §2.4 row | annotation | Search icon visible; input hidden in MVP (Phase 2) |

### 3.5 Right panel — tab strip + frame-head + inspector

| Surface | Hi-fi file | Scene / line | Notes |
|---|---|---|---|
| Tab strip (Design + AI) | Final.html | lines 337–359 (CSS), 811–820 (instance shows "Design" tab only in hi-fi; AI tab is the founder amendment 2026-05-15) | TWO tabs only. **Default-active = AI** on first canvas open (per §12.13 founder ratification 2026-05-17; W0-7 propagation 2026-05-19). Subsequent opens read per-canvas `localStorage[right-panel-tab:${canvasId}]`. Click AI tab → switches via `useRightPanelStore.setActiveTab('ai')`. |
| Zoom-r (right side of tab strip) | Final.html | lines 357, 815–818 | Current zoom % + caret (Cluster 08 ships zoom popover) |
| Frame-head | Final.html | lines 361–378 (CSS), 822–833 (instance) | Frame title + caret + 3 action buttons (Code/Component/Theme — Phase 2 no-op in MVP) |
| Inspector body scroll | Final.html | lines 380–381 | `.pbody` overflow auto; sections stack |
| Per-section group | Final.html | lines 383–401 (CSS); section instances at 837–1008 | Each `.group` is a property section (Position/Layout/Fill/Stroke/Text/Effects/Export). Cluster 07b ships section components |
| Properties when no selection (Page section) | `main-main-kova-scope/batch-b/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html` | scene 11.1 (no-selection / Page) | Page bg color · opacity · visibility · "Show in exports" · Export rows. Cluster 07b ships `<PageSection>`. Right panel stays on Design tab when no selection |
| Inspector — Position | 11 Inspector | scene 11.2 | Cluster 07b ships |
| Inspector — Layout (auto-layout) | 11 Inspector | scene 11.3 | Cluster 07b ships |
| Inspector — Fill | 11 Inspector | scene 11.4 | Cluster 07b ships. Multi-fill + paint editor. Color picker popover anchored here |
| Inspector — Stroke | 11 Inspector | scene 11.5 | Cluster 07b ships |
| Inspector — Text | 11 Inspector | scene 11.6 | Cluster 07b ships |
| Inspector — Effects | 11 Inspector | scene 11.7 | Cluster 07b ships per Q3 #12 (5 effect types) |
| Inspector — Export | 11 Inspector | scene 11.7 cont. | Cluster 07b ships per Q22 (JPG quality dropdown) |
| AI tab content | PRD 10 §3 | Cluster 10 ships `<ChatPanel>` | Mounted as child of `.right .pbody` when `activeTab === 'ai'` |

### 3.6 Color picker popover (Cluster 07b mounts; this PRD reserves the popover host)

| Surface | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|
| Color picker | `main-main-kova-scope/batch-b/chunk-b5/Kova Hi-Fi 12 Color Picker - Dark.html` | 8 scenes (12.1–12.8) | Cluster 07b mounts inside fill-row swatch click |

### 3.7 Top-chrome menu host

| Surface | Hi-fi file | Notes |
|---|---|---|
| Top-chrome menu catalog | `main-main-kova-scope/batch-b/Kova Hi-Fi 08 Top Chrome Menus - Dark.html` | Lists every menu's items. Cluster 08 ships the menu rendering; this PRD wires anchors (logo-caret, file-caret, avatar-caret) |

### 3.8 Canvas-side toast variant

| Surface | Hi-fi file | Notes |
|---|---|---|
| Canvas toast variant | `main-main-kova-scope/batch-b/chunk-b2/Kova Hi-Fi 16 Toasts + Missing Fonts - Dark.html` | Same component as Cluster 11's `<ToastStack>` mounted inside canvas chrome (positioned over canvas surface, not in topbar/sidebar). Cluster 11 ships variant `position: 'canvas'` |
| Missing fonts pill | 16 Toasts + Missing Fonts | "Missing fonts" black pill in top chrome when uploaded fonts haven't loaded — anchored top-right of topbar. Uses existing `use-font-status.ts` (already in code). This PRD mounts the pill |

### 3.9 Design system references

This PRD's surfaces all live inside the authenticated app — **dark theme**. Engineers use:
- `main-main-kova-scope/design-system/design.md` (spec)
- `main-main-kova-scope/design-system/kova-hifi.css` (canonical dark CSS — `:root` block → Tailwind `@theme`; component primitive classes → Vue components rendering same markup contract)
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` (cheat-sheet)
- **Canonical canvas-chrome source-of-truth: `main-main-kova-scope/batch-b/Kova Canvas - Final.html` `.kc {}` block (lines 75–502)**

Tokens referenced: `--bg`, `--rail`, `--canvas`, `--fill`, `--fill2`, `--line`, `--line2`, `--ink`, `--ink2`, `--ink3`, `--ink4`, `--select`, `--select-soft`, `--accent`, `--accent-soft`, `--accent-ink`. Component classes used in this PRD: `.topbar`, `.body`, `.left`, `.center`, `.right`, `.toolbar`, `.tool` (+`.active`+`.ai`), `.divider`, `.zoom`, `.tabs`, `.tab` (+`.active`), `.frame-head`, `.group`, `.sub`, `.lbl-row`, `.row-2`, `.row-3`, `.row-4`, `.ipt`, `.seg`, `.swatch`, `.fill-row`, `.help-fab`, `.file-row`, `.sec`, `.pages`, `.page-row` (+`.active`), `.layers`, `.layer` (+`.selected`+`.dim`), `.handle` (selection handles — rendered by existing `useCanvas`), `.size-chip`, `.icon-btn`, `.crumb-brand`. All version-controlled per `project_design_system_master`.

---

## 4. Data model

### 4.1 Schema migrations

None at Cluster 06. (Canvas state in Yjs + y-indexeddb local persistence; chrome reads existing stores; no new tables.)

### 4.2 RLS policies

None.

### 4.3 Storage buckets

None.

---

## 5. Backend

### 5.1 Edge Functions

None at Cluster 06. (Chrome is read-only of existing engine state. Snapshot creation lives in Cluster 09; chat send lives in Cluster 10; voice-draft confirm lives in Cluster 05.)

### 5.2 RPCs / database functions

None.

### 5.3 Cron jobs

None.

### 5.4 External integrations

None at the chrome level. (Existing M5 CanvasKit + Yjs runtime continues unchanged.)

---

## 6. Frontend

### 6.1 Routes (Vue Router)

```typescript
// kova-open-pencil-1/src/router/routes.ts (extend)
// Theme: dark; requires auth; desktop-only

{
  path: '/canvas/:canvasId',
  name: 'canvas-editor',
  component: () => import('@/views/EditorView.vue'),
  meta: { theme: 'dark', requiresAuth: true, viewportGuard: 'desktop' },
  props: route => ({ canvasId: route.params.canvasId }),
  beforeEnter: async (to) => {
    // Verify brand-ownership of :canvasId via useCanvasesStore (Cluster 02 / existing M5)
    // If not owned → redirect to /dashboard
    const ok = await useCanvasesStore().verifyOwnership(to.params.canvasId as string)
    return ok ? true : { name: 'dashboard' }
  },
},
```

### 6.2 Pinia stores

| Store | File | State | Getters | Actions |
|---|---|---|---|---|
| `useEditorStore` (existing — EXTEND) | `src/stores/editor.ts` | EXISTING: scene graph reactivity, `activeTool`, `selectedIds`, `hoveredNodeId`, `zoom`, `panX/Y`, `sceneVersion`, `showUI`, etc. EXTENSIONS: `showUI: 'hidden'\|'minimized'\|'full'` (3-state enum per §2.1 row 5); `panelsVisible: { left: boolean; right: boolean }` per-tab | EXISTING + new: `isLayerVisible(nodeId)`, `isLayerLocked(nodeId)` | EXISTING + new: `setUIVisibility('hidden'\|'minimized'\|'full')`, `togglePanel('left' \| 'right')`, `setPanelVisible('left'\|'right', boolean)` |
| `useRightPanelStore` (NEW) | `src/stores/right-panel.ts` | `activeTab: 'design' \| 'ai'` (NOT 'prototype' — explicitly omitted). **Default on first canvas open = `'ai'`** (per founder ratification 2026-05-17). Persists per-canvas via `usePreferencesStore` Layer 2 (localStorage), keyed `right-panel-tab:${canvasId}` — read-on-mount sets `activeTab` from storage if present, else defaults to `'ai'`. **Sticky on selection**: store does NOT subscribe to `editor.selectedNodeIds$` — layer click never auto-switches the tab. | `isDesignActive`, `isAiActive` | `setActiveTab(tab: 'design'\|'ai')`, `toggleAi()` |
| `useToolRegistry` (NEW) | `src/stores/tool-registry.ts` | `tools: Map<ToolId, ToolDef>` — declarative tool definitions registered by Cluster 07a (and Phase 2 by other PRDs) | `primaryTools` (ordered list shown in toolbar slots), `dropdownTools(parentSlot)` (sub-tools for Move/Frame/Pen dropdowns), `toolByKey(keyCode)`, `activeTool` (proxy to `editor.activeTool`) | `register(tool: ToolDef)`, `unregister(toolId)`, `setActive(toolId)`. ToolDef: `{ id, slot, parent?, icon, label, key?, keySequence?, when?: () => boolean, onActivate: () => void, disabled?: boolean }` |
| `useLayerTree` (NEW — composable, not store) | `src/composables/use-layer-tree.ts` | Virtual-scrolled flat list derived from `editor.graph` + expand/collapse state | `flatRows: ComputedRef<LayerRow[]>`, `rowHeight: 28`, `totalHeight` | `toggleExpand(nodeId)`, `setExpanded(nodeId, expanded)`, `reorderLayer(nodeId, beforeNodeId?, parentNodeId?)` (calls `editor.reorderChildWithUndo`) |
| `useTabsStore` (existing) | `src/stores/tabs.ts` | Per-session tab list, active tab, persistence | (existing) | (existing) — no changes |
| `useCanvasesStore` (existing — VERIFY) | `src/stores/canvases.ts` | (existing) | (existing) | EXISTING: `createCanvas`, `renameCanvas`, `moveToTrash`, `restoreCanvas`, `permanentlyDelete`, `fetchTrashed`. **VERIFY** `reorderPage`, `duplicatePage` exist; if not, ESCALATE to Cluster 07a to ship these. See §12 |

### 6.3 Composables

| Composable | File | Signature | Used by |
|---|---|---|---|
| `useCanvas` (existing) | `src/composables/use-canvas.ts` | CanvasKit surface init, scene render loop | `EditorView` |
| `useCanvasInput` (existing) | `src/composables/use-canvas-input.ts` | Pointer/keyboard input → editor actions | `EditorView` |
| `useLayerTree` (NEW) | `src/composables/use-layer-tree.ts` | (signature in §6.2) | `LeftPanel` / `LayersPanel` |
| `useInspectorRouter` (NEW) | `src/composables/use-inspector-router.ts` | `(): { activeSections: ComputedRef<InspectorSectionDef[]> }` — derives section list from `editor.selectedIds` + `editor.graph[selectedIds[0]].type`. Returns `[PageSection]` when no selection; per-type lists otherwise (FrameSelection → Position+Layout+Fill+Stroke+Effects+Export, TextSelection → adds Text, etc.) | `RightPanel` Design tab |
| `useRightPanelTab` (NEW — composable wrapper around `useRightPanelStore`) | `src/composables/use-right-panel-tab.ts` | `(): { activeTab, switchToDesign(), switchToAi(), focusAiComposer() }` — `focusAiComposer` switches tab + sets focus on Cluster 10's `<ChatInput>` textarea | `BottomToolbar` (AI tool button), Cluster 10 ChatPanel mount |
| `useCanvasDrop` (existing — EXTEND) | `src/composables/use-canvas-drop.ts` | Dispatcher on MIME types. Existing image-file handler preserved. ADDS 5 MIME handlers: `application/x-kova-brand-color`, `-brand-font`, `-brand-asset`, `-saved-block`, `-tone-snippet` (optional). | `EditorView` canvas surface |
| `useObjectActions` (Cluster 08 ships) | `src/composables/use-object-actions.ts` | Single composable wired by inspector overflow `•••` + right-click menus (per Q18) | This PRD's `<FrameHead>` overflow + canvas right-click handler hand off to Cluster 08 |
| `useFontStatus` (existing) | `src/composables/use-font-status.ts` | Missing-font detection per node + global "any-missing" flag (existing, extended by Cluster 05's font-loader) | Topbar "Missing fonts" pill |

### 6.4 Components

**Icon convention (W0-4 — 2026-05-19):** every icon rendered by a component in this PRD uses `<KovaIcon name="..." size?="..." />` from Cluster 11 §6.4.2 / Plan 11 Task 4.4. The four retired alternates are forbidden per scope plan §6.2 W0-4 lock: (a) raw `<icon-lucide-*>` tags with dynamic names, (b) `<component :is="\`icon-lucide-${name}\`">` template-literal resolution, (c) `i-lucide-*` UnoCSS class strings (the pattern flagged by QA-B HIGH-7 in Plan 06 lines 500-502: `icon: 'i-lucide-crop'` / `'i-lucide-ruler'` etc. on tool defs), (d) `<Icon name="lucide:...">` Nuxt-style. Wave-3 cluster-06 fix agent migrates residual non-conforming icon bindings (ToolDef `icon` field becomes a lucide name passed to `<KovaIcon>`) during its pass.

#### 6.4.1 View shell

| Component | File | Notes |
|---|---|---|
| `EditorView` | `src/views/EditorView.vue` (EXISTING — REFACTOR) | Wraps with class `kc`. Removes `<ChatPopup>` import + render (per PRD 10 §5 RIP). Mounts `<TopChrome>`, `<TabsBar>` (existing), `<LeftPanel>`, `<CanvasSurface>` (existing), `<BottomToolbar>`, `<RightPanel>`, `<CanvasOverlayHost>` (Cluster 07b mounts overlays into this slot), `<ToastStack>` (Cluster 11) |

#### 6.4.2 Top chrome

| Component | File | Props / emits | Hi-fi reference |
|---|---|---|---|
| `TopChrome` | `src/components/editor/TopChrome.vue` | Composes children below | Final.html topbar |
| `TopChromeLogo` | `src/components/editor/TopChromeLogo.vue` | `emits: ['open-file-menu']` — click opens File menu (Cluster 08) | Final line 613 |
| `FileBreadcrumb` | `src/components/editor/FileBreadcrumb.vue` | `props: { brand, fileName }`, `emits: ['brand-click', 'file-menu-toggle']`. brand-click → `router.push('/brand/...')` per Q17 | Final lines 614–620 |
| `TopChromeActions` | `src/components/editor/TopChromeActions.vue` | Renders right side: Notifications (visible-disabled), Present (visible-disabled), AvatarDropdown anchor. **Comments NOT rendered (HIDDEN per §12.3 RATIFICATION 2026-05-17).** | Final lines 622–625 |
| `AvatarDropdown` | `src/components/editor/AvatarDropdown.vue` | `props: { user, plan }`, `emits: ['open-account', 'open-help', 'open-shortcuts', 'sign-out']`. 5 items per Q16. Uses Reka DropdownMenu (Cluster 11) | `08 Top Chrome Menus` avatar dropdown panel |
| `MissingFontsPill` | `src/components/editor/MissingFontsPill.vue` | Reads `useFontStatus().globalMissing`; click opens Brand Kit fonts tab (Cluster 05) | `16 Toasts + Missing Fonts` |

#### 6.4.3 Bottom toolbar

| Component | File | Props / emits | Notes |
|---|---|---|---|
| `BottomToolbar` | `src/components/editor/BottomToolbar.vue` | Reads `useToolRegistry.primaryTools` + renders | Final lines 770–800 |
| `ToolButton` | `src/components/editor/ToolButton.vue` | `props: { tool: ToolDef }`, `emits: ['activate']`. Renders icon + tooltip + active state + dropdown chevron (when sub-tools exist) | Per-tool |
| `ToolDropdown` | `src/components/editor/ToolDropdown.vue` | `props: { parentSlot: 'move'\|'frame'\|'pen' }`. Reads `useToolRegistry.dropdownTools(slot)`. Reka DropdownMenu (Cluster 11) | Move/Frame/Pen dropdowns |
| `AiToolButton` | `src/components/editor/AiToolButton.vue` | Click → `useRightPanelTab.focusAiComposer()`. Special styling per `.tool.ai` class | Final line 794 |

#### 6.4.4 Left panel

| Component | File | Props / emits | Hi-fi |
|---|---|---|---|
| `LeftPanel` | `src/components/editor/LeftPanel.vue` | Composes file-row + **3 stacked sections**: `<PagesPanel>` + `<LayersPanel>` + `<ShopPanel>` (RATIFIED 2026-05-17 — third section). Width 240 px. Each section is `<CollapsibleRoot>` with header showing count badge. | Final 632–705 + Shopify spec §4.1 |
| `FileRow` | `src/components/editor/FileRow.vue` | `props: { canvas }` | Final 633–639 |
| `PagesPanel` | `src/components/editor/PagesPanel.vue` (existing) | Renders page list + add button + right-click anchor (Cluster 08 menu mounts on event) | Final 641–650, `10 Left Panel` 10.4 |
| `LayersPanel` | `src/components/editor/LayersPanel.vue` (existing — EXTEND) | Reads `useLayerTree`. Virtual scrolling via existing pattern. Per-row: caret, icon, name, mask glyph, vis eye, lock. Hover → set `editor.hoveredNodeId`. Click → select. Drag-reorder → `useLayerTree.reorderLayer` | Final 652–702, `10 Left Panel` 10.1–10.5 |
| `LayerRow` | `src/components/editor/LayerRow.vue` | `props: { row: LayerRow }`. Renders all glyphs. Renders mask glyph variant per `maskType` (ALPHA/VECTOR/LUMINANCE per Q2) | 10 Left Panel 10.2 |
| `LayersEmptyState` | `src/components/editor/LayersEmptyState.vue` | Renders when `useLayerTree.flatRows.value.length === 0`. Uses Cluster 11 empty-state primitive | 10 Left Panel 10.1 |
| `ShopPanel` | `src/components/editor/sidebar/ShopPanel.vue` (existing M9 — REFACTOR per Shopify spec §5.2) | Collapses 3-tab TabsRoot into single product grid. **Mounts inside `<LeftPanel>` as THIRD stacked collapsible section below `<LayersPanel>` (RATIFIED 2026-05-17 — see §12.1).** Default-expanded when brand has connected Shopify; else default-collapsed. | Shopify spec §4.1 |
| `ShopPanelProducts` | `src/components/editor/sidebar/ShopPanelProducts.vue` (existing — REWORK per Shopify spec §4.1 + §5.2) | Removes `draggable` + `onDragStart` + `serializeShopPayload` + variant-flat listing. Renders 2-col product grid + multi-select + sort + collection filter + sticky bottom bar with "Import N to chat" + Clear | Shopify spec §4.1 |

#### 6.4.5 Right panel

| Component | File | Props / emits | Hi-fi |
|---|---|---|---|
| `RightPanel` | `src/components/editor/RightPanel.vue` | Tab strip + frame-head + tab content slot. Width 264 px | Final 808–1008 |
| `RightPanelTabs` | `src/components/editor/RightPanelTabs.vue` | TWO tabs: Design + AI (default-active = **AI** per `useRightPanelStore`). Reka Tabs (Cluster 11). NO Prototype tab. Sticky on layer-click (component does NOT auto-switch tab on selection events). | Final 811–820 + PRD 10 §3.1 |
| `FrameHead` | `src/components/editor/FrameHead.vue` | `props: { selection }`. Renders title (frame name) + caret + 3 action buttons (Code/Component/Theme — visible-disabled MVP). Also renders overflow `•••` (Cluster 08 wires menu via `useObjectActions`) | Final 822–833 |
| `InspectorRouter` | `src/components/editor/InspectorRouter.vue` | Reads `useInspectorRouter().activeSections` + renders each section component. Section components ship from Cluster 07b. When `activeTab === 'design'` AND no selection → renders `<PageSection>` (Cluster 07b). When `activeTab === 'design'` AND selection → renders per-type sections | Final 837–1008 + PRD 07b |
| `RightPanelAiSlot` | `src/components/editor/RightPanelAiSlot.vue` | When `activeTab === 'ai'`, renders Cluster 10's `<ChatPanel>` | PRD 10 §3 |

#### 6.4.6 Overlay host + canvas surface

| Component | File | Notes |
|---|---|---|
| `CanvasOverlayHost` | `src/components/editor/CanvasOverlayHost.vue` | Slot host inside `.center`. Cluster 07b mounts all canvas overlays (frame outlines, mask outlines, slice region, snap, layout guides, pixel grid, hover contour, find highlight, eyedropper crosshair, measurement annotations) as children. Renders nothing itself; provides geometry-stable parent for absolute-positioned overlay elements | Per scope plan §3 Cluster 07 |
| `CanvasSurface` (existing) | `src/components/editor/CanvasSurface.vue` | EXISTING — CanvasKit surface init. Add drop event listeners for `useCanvasDrop` MIME handlers | Final center area |
| `ZoomHud` | `src/components/editor/ZoomHud.vue` | Bottom-right `.zoom`. Reads `editor.zoom`. Caret opens zoom popover (Cluster 08) | Final 802–805 |

### 6.5 Drag-and-drop handlers (receivers — Cluster 05 owns sources)

`use-canvas-drop.ts` (EXISTING — EXTEND). Dispatch table:

| MIME (from `event.dataTransfer.types`) | Handler | Behavior |
|---|---|---|
| `application/x-kova-brand-color` | `handleBrandColorDrop(payload, target, modifiers)` | If target = layer with fill support → replace top fill with `payload.hex` (Shift = replace top stroke; Alt = append to fills[]). If target = empty canvas → `editor.createNode({ type: 'RECT', x, y, w: 200, h: 200, fills: [{ type: 'SOLID', color: payload.hex }] })` |
| `application/x-kova-brand-font` | `handleBrandFontDrop(payload, target)` | If target = TEXT node → `editor.commitNodeUpdate(target.id, { fontFamily: payload.family })`. If target = empty canvas → `editor.createNode({ type: 'TEXT', x, y, content: 'Edit text', fontFamily: payload.family })` |
| `application/x-kova-brand-asset` | `handleBrandAssetDrop(payload, target)` | If target = layer with fill support → `editor.commitNodeUpdate(target.id, { fills: [{ type: 'IMAGE', imageUrl: payload.url, scaleMode: 'FILL' }] })`. If target = empty canvas → `editor.createNode({ type: 'IMAGE', x, y, imageUrl: payload.url })` sized to natural dimensions (fetch image, read width/height) |
| `application/x-kova-saved-block` | `handleSavedBlockDrop(payload, target)` | Always spawn TEXT node with `payload.blockData.content`. If `payload.blockData.type === 'cta'` → wrap in button-style frame (RECT with rounded corners + fill + child TEXT). If `type === 'footer'` → snap node to bottom of nearest containing frame |
| `application/x-kova-tone-snippet` (optional MVP — owned by Cluster 05 §6.5 footnote) | `handleToneSnippetDrop(payload, target)` | If target = TEXT node → replace content. If target = empty canvas → spawn TEXT |
| `Files` (existing M5) | `handleImageFileDrop(files, target)` | EXISTING — preserve. Image MIME files → spawn IMAGE node via existing M5 `placeMediaImage` flow |

**Modifier-key resolution:** read `event.shiftKey` / `event.altKey` at drop time. Payload validation via valibot before dispatch.

**Drop-target resolution:** existing `useCanvasInput.hitTestAt(x, y)` returns target node or null. Drop position = canvas-space pointer position (existing `screenToCanvas` helper).

**Visual feedback:** during `dragover`, set `editor.dropTargetId` (NEW reactive ref) + `editor.dropTargetAction` (string like `'fill-replace'` / `'stroke-replace'` / `'text-font'` / `'spawn-rect'`). Cluster 07b's hover-overlay reads this to render the ghost preview + label.

---

## 7. Tool layer / canvas-engine touches

**N/A for this PRD's core scope.** No `packages/core/` modifications. This PRD does NOT touch the scene graph, renderer, tools, or kiwi schema — those live in Cluster 07a + 07b. PRD 06 wires the chrome that hosts them.

The single **engine-touching point** is the drag-drop receiver's calls to existing public engine APIs:
- `editor.createNode({ type, x, y, ...props })` — existing in M5 / `figma-api.ts`
- `editor.commitNodeUpdate(nodeId, partial)` — existing
- `editor.hitTestAt(x, y)` — existing
- `editor.screenToCanvas(screenX, screenY)` — existing

All called via the **existing FigmaAPI surface** — no core lift required.

The **`useToolRegistry` API** that Cluster 07a's tool registrations plug into is purely app-side:

```typescript
// src/stores/tool-registry.ts (NEW — app-level, not packages/core/)
export interface ToolDef {
  id: string
  slot: 'move'|'frame'|'rectangle'|'ellipse'|'pen'|'text'|'measurement'|'ai'|'components'  // primary toolbar slot
  parent?: 'move'|'frame'|'pen'  // if present, this tool lives in a dropdown under parent
  icon: string  // lucide icon name
  label: string
  key?: string  // single keyboard shortcut
  keySequence?: string[]  // e.g. ['Shift', 'M']
  when?: () => boolean  // visibility predicate; false → hide tool
  onActivate: () => void  // called when user clicks tool or presses key
  disabled?: boolean
}

// Cluster 07a calls (in src/canvas-extensions/slice/register.ts):
useToolRegistry().register({
  id: 'slice',
  slot: 'frame',
  parent: 'frame',
  icon: 'i-lucide-crop',
  label: 'Slice',
  key: 'S',
  onActivate: () => useEditorStore().setActiveTool('slice'),
})

useToolRegistry().register({
  id: 'measurement',
  slot: 'measurement',
  icon: 'i-lucide-ruler',
  label: 'Measurement',
  keySequence: ['Shift', 'M'],
  onActivate: () => useEditorStore().setActiveTool('measurement'),
})
```

This is the **only Cluster 07a ↔ Cluster 06 contract surface**. Cluster 07a depends on `useToolRegistry` being exported from Cluster 06; Cluster 06 ships this store + an empty registry; downstream registrations from Cluster 07a populate it at app init time.

---

## 8. Acceptance criteria

Every line is testable in code or browser. No "feels right." Engineers verify before founder review.

### 8.1 Route + auth + viewport

- [ ] Navigating to `/canvas/:canvasId` for a canvas the user owns renders the editor view with all chrome elements visible
- [ ] Navigating to `/canvas/:canvasId` for a canvas the user does NOT own redirects to `/dashboard`
- [ ] Viewport < 1024 px on `/canvas/...` redirects to `/desktop-only` (Cluster 01 owns)
- [ ] Unauthenticated access redirects to `/login` (Cluster 01)

### 8.2 Top chrome

- [ ] Topbar renders with logo + brand breadcrumb + file name + caret + right-side icons + avatar
- [ ] Clicking brand label navigates to `/brand/{currentBrandId}` (per Q17); no popover opens
- [ ] Clicking logo dropdown caret opens the File menu (Cluster 08); first item "Back to dashboard" routes to `/brand/...`
- [ ] Clicking file-name caret opens the file-name dropdown (Cluster 08); contains items per 03 doc §3.3
- [ ] Avatar dropdown renders 5 items: User name + plan badge / Account / Help / Keyboard shortcuts / Sign out (per Q16; no brand picker, no What's new)
- [ ] Avatar dropdown "Account" item routes to `/account` (Cluster 04)
- [ ] Avatar dropdown "Sign out" calls `useAuthStore.signOut()` then `router.push('/login')` (Cluster 01)
- [ ] Avatar dropdown "Keyboard shortcuts" opens shortcuts dialog (Cluster 08)
- [ ] Missing-fonts pill renders in topbar when `useFontStatus().globalMissing === true`; click opens `/account/brand-kit/visuals` (Cluster 05)
- [ ] Notifications + Present icons render as visible-disabled (Phase 2)
- [ ] Comments icon NOT rendered in topbar (RATIFIED HIDE 2026-05-17 §12.3) — `<TopChromeActions>` DOM does not contain `[data-testid="topbar-comments"]`

### 8.3 Bottom toolbar

- [ ] Toolbar renders 9 default tools (Move, Frame, Rectangle, Ellipse, Pen, Text, Measurement, AI, Components) per §3.3 (Measurement replaces hi-fi "Comment" slot per 03 doc §2.7)
- [ ] Move tool has a dropdown chevron when Hand or Scale is registered (Phase 2 by Cluster 07a — chevron hidden if no sub-tools)
- [ ] Frame tool has a dropdown chevron with sub-items: Frame + Slice (Cluster 07a registers Slice; chevron present in MVP)
- [ ] Pen tool dropdown chevron hidden in MVP (no sub-tools registered yet per 03 doc §2.3 Open Q)
- [ ] Clicking Components tool shows tooltip "Components — Phase 2" and does NOT activate
- [ ] Clicking AI tool (Ask Kova) opens right panel (if collapsed) + switches active tab to AI + focuses ChatPanel composer
- [ ] Pressing keyboard `V` → active tool = Move; `F` → Frame; `R` → Rectangle; `O` → Ellipse; `P` → Pen; `T` → Text; `S` → Slice (Cluster 07a); `Shift+M` → Measurement (Cluster 07a)
- [ ] Active tool button highlights with `--accent` background (per `.tool.active` class)

### 8.4 Left panel — Pages

- [ ] Pages section renders current page list with active page highlighted
- [ ] Clicking the add button creates a new page (existing `useCanvasesStore.addPage`)
- [ ] Double-click a page row enters inline rename (existing `use-inline-rename`)
- [ ] Drag a page row to a new position reorders (calls `editor.reorderPage` — if missing per §12, falls back to Yjs page-array splice)
- [ ] Right-click on a page row opens context menu (Cluster 08 ships) with items: Duplicate / Rename / Delete / Move up / Move down

### 8.5 Left panel — Layers

- [ ] Layers tree renders all nodes of the current page (virtual-scrolled at 28 px row height)
- [ ] Expand/collapse caret toggles child visibility
- [ ] Hovering a layer row sets `editor.hoveredNodeId` and the canvas renders the hover-overlay (existing)
- [ ] Clicking a layer row sets `editor.selectedIds = [nodeId]` and the inspector switches to per-selection sections
- [ ] Shift+click extends selection; Cmd/Ctrl+click toggles
- [ ] Drag-reorder works within siblings (calls existing `editor.reorderChildWithUndo`)
- [ ] Mask glyph renders next to name on nodes where `node.isMask === true`; variant differs per `node.maskType` (ALPHA = filled-half-circle; VECTOR = path icon; LUMINANCE = brightness icon)
- [ ] Slice glyph renders on SLICE NodeType nodes (Cluster 07a ships NodeType; this PRD renders glyph)
- [ ] Visibility eye toggles `editor.toggleVisibility(nodeId)`
- [ ] Lock icon toggles `editor.toggleLock(nodeId)`
- [ ] Locked layer is not selectable via canvas hit-test (existing engine behavior per 03 doc §2.4)
- [ ] Empty state renders "No layers yet" when tree is empty (uses Cluster 11 empty-state primitive)

### 8.6 Right panel — tab framework

- [ ] Right panel renders exactly TWO tabs: **Design** + **AI** (default-active = **AI** on first canvas open; per-canvas localStorage overrides on subsequent opens)
- [ ] Layer click on canvas does NOT switch tab (sticky behavior — `useRightPanelStore.activeTab` value before click === value after click for both tabs)
- [ ] **Prototype tab is NOT rendered anywhere** in the DOM (verified via DOM inspection in E2E test) — per founder ratification 2026-05-15, scope plan §3 Cluster 06 "Prototype DEFERRED" line is superseded by "Prototype out of scope entirely"
- [ ] Default-active tab on canvas open = AI (founder ratification 2026-05-17 §12.13; W0-7 propagation 2026-05-19)
- [ ] Click AI tab → `useRightPanelStore.activeTab = 'ai'` → `<RightPanelAiSlot>` renders Cluster 10's `<ChatPanel>`
- [ ] Click Design tab → `<InspectorRouter>` renders
- [ ] Tab state persists per-canvas via `usePreferencesStore` Layer 2 (localStorage)
- [ ] Zoom-r (right side of tab strip) reads `editor.zoom` and renders `${Math.round(zoom * 100)}%` + caret

### 8.7 Right panel — Design tab (inspector)

- [ ] When no selection → `<PageSection>` renders (Cluster 07b ships)
- [ ] When selection is a FRAME → Position + Layout + Fill + Stroke + Effects + Export sections render (Cluster 07b ships each)
- [ ] When selection is a TEXT → Position + Text + Fill + Effects + Export render
- [ ] When selection is a RECT/ELLIPSE/POLYGON/STAR/LINE → Position + Fill + Stroke + Effects + Export
- [ ] When multi-selection → use `useMultiProps` (existing) to render mixed-value indicators in each section
- [ ] Frame-head renders selection title + caret + 3 action buttons (visible-disabled MVP) + overflow `•••` (Cluster 08 wires menu)

### 8.8 Right panel — AI tab

- [ ] Click AI tab → `<ChatPanel>` mounts (Cluster 10 ships)
- [ ] `<ChatPopup>` (the floating popup, M5 legacy) is NOT rendered anywhere in EditorView — removed
- [ ] Switching back to Design tab unmounts ChatPanel from DOM (or hides — Cluster 10 PRD specifies)

### 8.9 Shop panel (per Shopify spec §4.1)

- [ ] Shop panel renders inside `<LeftPanel>` as a third collapsible section below `<LayersPanel>` (RATIFIED 2026-05-17 per §12.1)
- [ ] Shop panel default-expanded ONLY when active brand has `shopify_connection_history.connection_status = 'connected'`; else default-collapsed with "Connect Shopify" CTA
- [ ] Renders 2-col product grid with image + title + price (or price range)
- [ ] Search input filters by product title (debounce 300 ms)
- [ ] Sort dropdown options: A-Z (default), Price ↑, Price ↓ — **no "bestsellers"** (removed per PRD 10 / Shopify spec §5.2)
- [ ] Collection filter dropdown shows "All collections" + per-collection
- [ ] Click product card → toggles selection (accent border + checkmark badge)
- [ ] Sticky bottom bar appears when ≥ 1 selected with primary "Import N to chat" + secondary "Clear"
- [ ] Click "Import N to chat" → calls `useChatProductReferencesStore.importProducts(selectedIds)` (Cluster 10) + clears selection
- [ ] Empty state (no Shopify connection): "Connect Shopify to import products" + Connect CTA → routes to `/account/integrations`
- [ ] Empty state (Shopify connected, no products synced): skeleton rows (Cluster 11)
- [ ] `draggable` attribute REMOVED from product cards (per Shopify spec §5.2 RIP)

### 8.10 Drag-drop receivers

- [ ] Drop `application/x-kova-brand-color` on a frame with fill → top fill replaces with hex
- [ ] Shift+drop same payload on a frame with stroke → top stroke replaces
- [ ] Drop same payload on empty canvas at (x, y) → spawn 200×200 RECT at (x-100, y-100) with that fill
- [ ] Alt+drop same payload on a frame → appends to fills[] (not replace)
- [ ] Drop `application/x-kova-brand-font` on TEXT layer → fontFamily updates
- [ ] Drop same payload on empty canvas → spawn TEXT node with "Edit text" + that family at drop point
- [ ] Drop `application/x-kova-brand-asset` (kind='logo') on layer with fill → image fill replaces
- [ ] Drop same on empty canvas → spawn IMAGE node at logo's natural dimensions
- [ ] Drop `application/x-kova-saved-block` (type='text') on empty canvas → spawn TEXT with content
- [ ] Drop same (type='cta') → spawn TEXT wrapped in button-style frame
- [ ] Drop same (type='footer') → spawn TEXT snapped to bottom of nearest containing frame
- [ ] During dragover, `editor.dropTargetAction` reflects intent (`'fill-replace'`, `'spawn-text'`, etc.) so Cluster 07b's hover overlay can render ghost preview + label
- [ ] Drop with invalid payload (valibot validation fails) → silently aborted + console warn (no app crash)
- [ ] Existing image-file drop (from OS file picker) continues to work via existing `placeMediaImage` flow

### 8.11 Engine integration

- [ ] `useToolRegistry.register({...})` accepts a valid `ToolDef` and the tool appears in the toolbar at the next render
- [ ] Cluster 07a's call site (`src/canvas-extensions/slice/register.ts`) registers Slice + Measurement at app init and they appear in toolbar
- [ ] Activating a registered tool (click or keyboard) calls `onActivate` which sets `editor.activeTool`
- [ ] Slice + Measurement glyphs appear in Layers tree for SLICE / MEASUREMENT NodeType nodes (Cluster 07a ships NodeTypes; this PRD reads the type discriminator)

### 8.12 Performance + UX

- [ ] Editor view first paint < 1500 ms on a cold open at production build (Lighthouse perf budget per 2.D.10)
- [ ] Layer tree handles 500 nodes at > 30 fps scroll (virtual scrolling validated)
- [ ] Switching right panel tabs (Design ↔ AI) is < 100 ms transition

### 8.13 Security

- [ ] Brand-ownership check in `beforeEnter` route guard prevents access to other users' canvases
- [ ] No client-side path mutates `editor.activeBrand` based on `:canvasId` route param without server-side verification

---

## 9. Test plan

### 9.1 Unit tests (`bun run test:unit`)

Target coverage: ≥ 80% on new stores + composables + components. Existing M5 components (CanvasSurface, PagesPanel, LayersPanel) extended — additive tests only.

| Test file | Covers |
|---|---|
| `tests/unit/stores/right-panel.test.ts` | `useRightPanelStore` — setActiveTab persistence + localStorage round-trip + isDesignActive/isAiActive |
| `tests/unit/stores/tool-registry.test.ts` | `useToolRegistry.register/unregister/setActive`, primaryTools sort, dropdownTools(parent), toolByKey lookup, when() predicate gate |
| `tests/unit/composables/use-layer-tree.test.ts` | Flat-row derivation from nested `editor.graph`, expand/collapse state, reorder action calls `editor.reorderChildWithUndo` |
| `tests/unit/composables/use-inspector-router.test.ts` | Section list per selection type (none → PageSection; Frame → 6 sections; Text → adds Text section; multi → uses `useMultiProps`) |
| `tests/unit/composables/use-right-panel-tab.test.ts` | switchToDesign, switchToAi, focusAiComposer (verifies tab switch + composer focus call) |
| `tests/unit/composables/use-canvas-drop.test.ts` | EXTENDED — 5 MIME handlers + modifier-key behavior + invalid payload reject |
| `tests/unit/components/editor/TopChrome.test.ts` | Renders all 4 sub-components + correct anchor wires |
| `tests/unit/components/editor/AvatarDropdown.test.ts` | 5 items present per Q16, NO brand picker, NO What's new (hidden), correct emits |
| `tests/unit/components/editor/FileBreadcrumb.test.ts` | brand-click emit + file-menu-toggle emit |
| `tests/unit/components/editor/BottomToolbar.test.ts` | 9 default tools render + AI tool button mounted + Components disabled tooltip + keyboard shortcut to active tool |
| `tests/unit/components/editor/ToolButton.test.ts` | Dropdown chevron rendered iff sub-tools exist |
| `tests/unit/components/editor/RightPanelTabs.test.ts` | EXACTLY 2 tabs visible (Design + AI); Prototype tab NOT in DOM; **default-active = AI** on first canvas open (no localStorage key); click switches; layer-selection event does NOT change `activeTab` (sticky regression guard) |
| `tests/unit/components/editor/InspectorRouter.test.ts` | Renders correct section list per selection (mocked Cluster 07b section stubs) |
| `tests/unit/components/editor/LayersPanel.test.ts` | EXTENDED — mask glyph renders for `isMask=true`; slice glyph renders for SLICE NodeType; empty state renders |
| `tests/unit/components/editor/LayerRow.test.ts` | Per maskType variant renders correct icon; lock/vis icons toggle |
| `tests/unit/components/editor/ShopPanelProducts.test.ts` | REWORKED — no draggable; multi-select; Import N to chat callback |
| `tests/unit/components/editor/ShopPanel.test.ts` | Single panel (no tabs); product-only |

### 9.2 Integration tests

| Test file | Covers |
|---|---|
| `tests/integration/editor/route-guard.test.ts` | Authenticated user with own canvas → 200; with other user's canvas → 302 to `/dashboard`; unauthenticated → 302 to `/login` |
| `tests/integration/editor/drop-receiver-end-to-end.test.ts` | Simulate drag from Brand Kit color swatch → drop on frame → fill replaced via `commitNodeUpdate`. Same for font, logo, saved-block (4 payload types). Verify Yjs state mutated correctly via `editor.graph` read-back |
| `tests/integration/editor/tool-registration.test.ts` | At app init, Cluster 07a register-call (mocked) → toolbar renders Slice + Measurement |
| `tests/integration/editor/shop-panel-import-to-chat.test.ts` | Select 3 products → click Import → `chat_conversations.product_references` has 3 entries (via Cluster 10 store mock or local Supabase) |

### 9.3 E2E tests (Playwright / Vercel Agent Browser preferred)

| Spec | Covers |
|---|---|
| `tests/e2e/editor/load-and-render.spec.ts` | Sign in → open canvas → assert all chrome elements visible (topbar, toolbar, left panel, right panel with 2 tabs, no Prototype tab in DOM) |
| `tests/e2e/editor/avatar-dropdown.spec.ts` | Click avatar → assert 5 items + no Brand picker + no What's new → click each item routes correctly |
| `tests/e2e/editor/brand-label-navigates.spec.ts` | Click brand breadcrumb → assert URL is `/brand/...` |
| `tests/e2e/editor/right-panel-tab-switch.spec.ts` | Click AI tab → ChatPanel visible. Reload page → tab state persists. Click Design → InspectorRouter visible |
| `tests/e2e/editor/ai-tool-button.spec.ts` | Click AI tool in bottom toolbar → right panel switches to AI + composer focused |
| `tests/e2e/editor/layer-tree-interactions.spec.ts` | Hover row → canvas highlights; click row → selected in editor; right-click row → context menu opens (Cluster 08); drag-reorder → order persists |
| `tests/e2e/editor/drag-color-to-frame.spec.ts` | Open Brand Kit Visuals tab in another window (or via canvas Assets panel) → drag color → drop on frame → fill applied. Verify visual screenshot diff |
| `tests/e2e/editor/drag-saved-block-to-canvas.spec.ts` | Drag saved-block grip onto canvas → TEXT node spawns with content |
| `tests/e2e/editor/shop-panel-import-flow.spec.ts` | Connect Shopify (mocked) → Shop panel renders products → multi-select 2 products → click "Import 2 to chat" → switch to AI tab → assert 2 chips visible in composer (Cluster 10 acceptance) |
| `tests/e2e/editor/no-chat-popup.spec.ts` | Assert no `<ChatPopup>` element renders anywhere in DOM (regression guard for removal) |
| `tests/e2e/editor/no-prototype-tab.spec.ts` | Assert no element with text "Prototype" renders in right panel tab strip (regression guard) |

### 9.4 Manual QA (founder browser smoke per `feedback_browser_smoke_test_before_done`)

Founder runs in browser pre-merge:

1. Sign in → open existing canvas → verify chrome renders identical to `Final.html` mockup (topbar layout, brand pill, file name, avatar; left panel pages + layers tree; right panel Design + AI tabs visible; bottom toolbar 11 tools; zoom HUD bottom-right)
2. Click brand breadcrumb → confirm navigates to dashboard (no popover flicker)
3. Click avatar → confirm Account routes to /account; Sign out signs out
4. Click each toolbar tool → confirm active state highlights
5. Press V/F/R/O/P/T keys → confirm tool switches; Shift+M → Measurement (if Cluster 07a shipped)
6. Click AI tool in toolbar → right panel switches to AI tab + composer ready to type (Cluster 10 shipped)
7. Click Design tab → inspector returns
8. Open Brand Kit in another window (/account/brand-kit/visuals) → drag a color swatch onto canvas frame → confirm fill applies
9. Drag font from Brand Kit Visuals onto TEXT layer → confirm font applies
10. Drag saved-block grip from Brand Kit onto canvas → confirm TEXT node spawns
11. Connect Shopify (test store) → open canvas → Shop panel renders products → select 3 → click Import → confirm chips appear in AI tab composer
12. Verify no ChatPopup floats anywhere
13. Verify no Prototype tab visible
14. Resize browser to 800px width → confirm redirect to /desktop-only
15. Take Lighthouse perf snapshot — first paint < 1500 ms

---

## 10. Rollout phasing

| Phase | Scope | Feature gate | Default |
|---|---|---|---|
| **Phase A (this PRD)** | Route + EditorView refactor + Top chrome + Bottom toolbar (9 default tools) + Left panel (Pages + Layers + Shop panel) + Right panel 2-tab framework + Inspector router + drop receivers (5 MIME types) + tool registry API + ChatPopup REMOVAL | none — always on | n/a |
| **Phase B (deferred — Phase 2)** | Hand tool (Move dropdown) · Pen sub-tools (Pen dropdown chevron when populated) · Layer thumbnails · Layer search input · Components tool activation · Comments collaboration · Notifications · Present mode · Help FAB · What's new in avatar dropdown · Arrow tool (Cluster 07a Phase 2) · Tauri-specific Eyedropper screen-wide (Cluster 07b Phase 2) | Per-feature flags in `@/constants.ts`: `HAND_TOOL_ENABLED`, `LAYER_THUMBNAILS_ENABLED`, `LAYER_SEARCH_ENABLED`, `COMPONENTS_TOOL_ENABLED`, `COMMENTS_ENABLED`, etc. | all `false` |

Phase-A ship gate: Cluster 07a + 07b + 08 + 10 + 11 all merged so this PRD's slots have content. Cross-cluster lockstep coordination required.

---

## 11. Cross-cuts to other PRDs

| Other PRD | What we depend on | What they depend on us for |
|---|---|---|
| **01 Auth & Identity** | `useAuthStore.signOut()` (avatar dropdown sign-out); route guard (viewport + requiresAuth) | None directly. (Avatar item triggers Cluster 01 flow.) |
| **02 Onboarding & Dashboard** | `/dashboard` route (brand-label click target + logo dropdown "Back to dashboard" target) | None directly |
| **03 Brand Management** | `useBrandsStore.selectedBrand` (brand-context reactive read); A2a `<BrandPicker>` component (NOT mounted in canvas chrome per Q17 — but its design is referenced for Cluster 05 A2b variant) | None directly |
| **04 Account & Stripe** | `/account` route (avatar dropdown Account target); `/account/integrations` route (Shop panel "Connect Shopify" CTA target) | None directly |
| **05 Brand Kit & Drag-Drop** | 5 drag-MIME contracts + valibot payload schemas; brand-kit-extract draft-status (none consumed in canvas) | **Drop receivers** for the 5 MIME contracts (color, font, logo, saved-block, tone-snippet). Canvas Assets panel surface (Cluster 06 mounts Brand Kit data with drag tiles — Cluster 05's `useBrandKitDrag` composable reused) |
| **07a Canvas Engine Core + Renderer** | SLICE + MEASUREMENT NodeTypes existence (layer-tree glyph dispatch reads `node.type`); mask compositing data (`isMask`+`maskType` per Q2 — layer-tree mask glyph reads); tool registrations via `useToolRegistry.register()` (Slice + Measurement + Phase 2: Scale + Arrow); engine page-reorder + page-duplicate primitives (audit Open Q — see §12) | `useToolRegistry` API export (Cluster 07a's registration calls hit this); `useEditorStore.activeTool` state (Cluster 07a's tools call setActiveTool) |
| **07b Canvas Engine Inspector + Overlays** | All inspector section components (`<PositionSection>`, `<LayoutSection>`, `<FillSection>`, `<StrokeSection>`, `<TextSection>`, `<EffectsSection>`, `<ExportSection>`, `<PageSection>`); color picker popover; all canvas overlays | `<InspectorRouter>` (07b's sections render inside); `<CanvasOverlayHost>` slot (07b's overlays render inside); fill-row anchor for color picker popover; `editor.dropTargetAction` reactive ref for hover-overlay ghost preview |
| **08 Menus + Popovers + Shortcuts** | Main menu + submenus (mounted on logo + file-name dropdowns); right-click context menus (mounted on layer-row + page-row + canvas right-click + asset-row events); find overlay (mounted in canvas); keyboard shortcuts dialog (mounted on `⇧⌘?`); `useObjectActions` composable (used by FrameHead overflow + canvas right-click) | Trigger anchors (topbar logo caret, file-name caret, avatar caret, layer-row right-click event, canvas right-click event, page-row right-click event); position calc helpers; menu-trigger state reactive |
| **09 Version History + Trash** | Version-history right-panel timeline mode (replaces inspector while active) | Right-panel slot is exclusive — when version-history active, inspector hidden. State coordinated via shared `useRightPanelStore.activeMode: 'inspector'\|'history'` (TBD with Cluster 09 PRD — see §12) |
| **10 AI Chat + Memory + Tools** | `<ChatPanel>` component (mounted in AI tab slot); `useChatProductReferencesStore.importProducts(productIds)` callback (Shop panel button calls it); ChatPopup REMOVAL (Cluster 10 deletes component file; this PRD removes import + render from EditorView) | AI tab slot host (`<RightPanelAiSlot>`); Shop panel "Import N to chat" button + selection state |
| **11 Shared UI Infrastructure** | `<KovaModal>` (no direct use in 06; consumed via Cluster 08's shortcuts dialog mount); `useToast` (drop-receiver feedback toasts); `useConfirm` (potentially used by future destructive actions); Reka primitives wrapped; skeletons (Layers loading); idempotency-key helper (not used at chrome level); Realtime channel naming convention (consumed by Cluster 05's brand-fonts subscription mounted from this view) | None directly. |
| **12 Settings + User Preferences** | `usePreferencesStore` Layer 1 (cross-device) + Layer 2 (localStorage) — used for: panel collapse state, recent colors, right-panel-tab persistence, show-ruler/grid persistence | None directly |

---

## 12. Risks + open questions

| # | Risk / Question | Severity | Mitigation / Status |
|---|---|---|---|
| **12.1** | **Shop panel docks where?** Shopify spec §4.1 says "canvas left sidebar, ~260 px wide." Hi-fi Final.html shows Left panel as Pages + Layers only. Two options: (a) **third left-panel section below Layers** (recommended — preserves existing left-panel structure, expandable section). (b) **separate left rail next to the existing left panel** (matches Shopify spec width exactly but adds new chrome). | MEDIUM | **RATIFIED 2026-05-17 (founder): option (a) — Shop panel as third stacked section under Pages + Layers.** Left panel layout: `LeftPanelHeader` (240 px wide) → `<PagesPanel>` (collapsible section, default expanded) → `<LayersPanel>` (collapsible, default expanded, virtual-scroll) → `<ShopPanel>` (collapsible, default collapsed unless brand has Shopify connection — then default expanded). Each section uses Reka `<CollapsibleRoot>` (Cluster 11). Section headers show count badge: "Pages · 3", "Layers · 14", "Shop · 247". `useLeftPanelStore` tracks collapsed state per-section, persisted to localStorage. Matches Figma stacked-section pattern (Pages on top, Layers below). |
| **12.2** | **`editor.reorderPage` + `editor.duplicatePage` audit** — 03 doc §2.4 Open Q says `useEditorStore` may only have `addPage` + `deletePage` + `renamePage`. Cluster 06's Pages right-click needs `duplicatePage` + `reorderPage`. | MEDIUM | **VERIFIED MISSING 2026-05-17** — `grep -rn 'reorderPage\|duplicatePage\|movePage' packages/core/src` returns zero matches. **DECISION: Cluster 06 implements both as composable wrappers in `src/composables/use-page-operations.ts` calling Yjs page-array splice on `editor.pages` Y.Array.** No core mods. Cluster 07a may later promote these to engine primitives but not blocking for Wave 4. Wrapper signatures: `reorderPage(fromIdx, toIdx)`, `duplicatePage(pageId)` (deep clones page tree via `structuredClone` of Y.Array snapshot, appends as new page). Test coverage in `tests/unit/composables/use-page-operations.test.ts`. |
| **12.3** | **Comments icon in topbar** — DEFERRED per scope plan. Render as visible-disabled OR hide entirely? | LOW | **RATIFIED 2026-05-17 (founder): HIDE entirely until Comments feature ships.** Top chrome layout: `<TopChromeLogo> | <FileBreadcrumb> | <TopChromeActions: [Share button only] > | <AvatarDropdown>`. No Comments icon slot at all in MVP. When Comments ships (post-MVP, no committed timeline), `<CommentsIconButton>` will be added between Share and Avatar via additive PR — no other code changes. Rationale: avoids teasing a feature with no committed delivery date; reduces topbar visual clutter; founder explicitly chose hide-over-disable for TOPBAR (distinct from the §12.3 of PRD 05 where disable-with-tooltip was chosen for an in-feature-area CTA). |
| **12.4** | **AI tool button keyboard shortcut** — hi-fi Final.html assigns no key. PRD 10 doesn't either. Should `/` activate AI tab (Figma's Actions menu shortcut)? | LOW | **Recommendation: NO keyboard shortcut in MVP.** Reserve `/` for Cluster 08's Actions menu Phase 2. Keyboard shortcut for AI tab can be added Phase 2 as `⌘J` (Cursor-style) — non-blocking. |
| **12.5** | **Right-panel coexistence with version history (Cluster 09)** | LOW | Cluster 09 PRD defines history-mode interaction. This PRD's `useRightPanelStore` will be extended in Cluster 09 to add `activeMode: 'inspector' \| 'history'`. Both modes are right-panel exclusive. Non-blocking; coordinated at Cluster 09 author time. |
| **12.6** | **Tool registry timing** — Cluster 07a registers tools at app init. If Cluster 07a ships AFTER Cluster 06 to staging, the toolbar would render with only the 7 default tools (Move/Frame/Rectangle/Ellipse/Pen/Text/AI/Components — Measurement missing because Cluster 07a registers it). | MEDIUM | **Lockstep ship**: Wave 5 brings 07a alongside Wave 4 06. If 07a slips → toolbar shows 7 default + dimmed Measurement slot with "Coming in 07a" tooltip. Acceptable degradation. |
| **12.7** | **Drag-drop in Safari** | LOW | Tested in PRD 05 §12.7. Same risk applies — covered by Cluster 05 mitigation. |
| **12.8** | **Tabs bar location** — existing M5 implementation places tabs above topbar. Some Figma-pattern places tabs INSIDE topbar (next to file name). | LOW | **Recommendation: preserve M5 location (above topbar)** — no migration. Phase 2 could rework if founder requests Figma-exact placement. |
| **12.9** | **AI tool icon vs File menu trigger conflict** — hi-fi shows AI tool (sparkle) in bottom toolbar AND Cluster 08's logo dropdown opens File menu. Two AI affordances could confuse users. | LOW | **Acceptable**: AI tool in bottom toolbar is the **primary chat-open affordance**. Logo dropdown opens **File menu** (different concept). No conflict. |
| **12.10** | **Inspector router section ordering** — Cluster 07b decides per-type section list. Cluster 06's `useInspectorRouter` must match. | MEDIUM | **Coordination point**: Cluster 06 + 07b define section-order contract in `src/types/inspector.ts` (NEW). Each section component declares its `priority` integer; router sorts ascending. Decouples 06 from 07b's section list — adding/removing sections doesn't require 06 changes. |
| **12.11** | **EditorView refactor risk** — removing `<ChatPopup>` (PRD 10 owns the actual component delete) requires this PRD's EditorView edit to coordinate. | LOW | **Coordination**: PR 06 + PR 10 either merge together OR PR 10's `<ChatPopup>` delete is done in PR 06's chrome refactor commit. Lockstep via Wave-4 / Wave-6 ship coordination per scope plan. |
| **12.12** | **PRD scope expansion from user prompt** — user brief said "tab routing (Design only — Prototype DEFERRED)". This PRD specs 2 tabs (Design + AI) per PRD 10's founder ratification 2026-05-15. | LOW | **Documented**: superseded by founder decision recorded in `project_prd10_decisions` memory. Founder ratifies in §0 review. |

| **12.13** | **Right-panel default tab on first canvas open** — Design (Figma parity) or AI (Kova differentiator)? | MEDIUM | **RATIFIED 2026-05-17 (founder): AI default on first canvas open.** `useRightPanelStore` initial state: read `localStorage[right-panel-tab:${canvasId}]`; if absent → `activeTab = 'ai'`. Rationale: chat-first UX is Kova's core differentiator over Figma; surfaces value prop immediately; experienced Figma users one-click away from Design. After first user interaction, per-canvas localStorage persists their preference. |
| **12.14** | **Tab behavior on layer-click** — Figma sticks to current tab; Kova auto-switch to Design on selection? | LOW | **RATIFIED 2026-05-17 (founder): STICKY (matches Figma).** Selection events do not modify `useRightPanelStore.activeTab`. `RightPanelTabs` component does NOT subscribe to selection store. Regression guard test: `tests/unit/components/editor/RightPanelTabs.test.ts` asserts that calling `editor.setSelection([nodeId])` does not change `useRightPanelStore.activeTab` for either initial state ('ai' or 'design'). |
| **12.15** | **Inspector section priority contract** — how Cluster 06's `useInspectorRouter` orders Cluster 07b's sections | MEDIUM | **RESOLVED 2026-05-17**: `src/types/inspector.ts` exports `InspectorSectionDef { id, component, priority, supports(node): boolean }`. Cluster 06 ships registry + 1 default section (`PageSection`, priority 10). Cluster 07b registers sections at their own priorities: 20 PositionSection, 30 LayoutSection, 40 AppearanceSection, 50 FillSection, 60 StrokeSection, 70 TypographySection, 80 EffectsSection, 90 ExportSection, 100 VariablesSection. `useInspectorRouter` sorts ascending and renders `.filter(s => s.supports(node))`. Decouples 06 from 07b's section list — adding/removing sections doesn't require 06 changes. Contract co-edit committed in lockstep Wave-4 / Wave-5. |

**All open questions RATIFIED 2026-05-17 (founder + engineering verification):**
- ✅ **§12.1** — Shop panel: **third left-panel section** below Pages + Layers (stacked, collapsible, default-expanded when brand has Shopify).
- ✅ **§12.2** — `editor.reorderPage` + `duplicatePage`: **Cluster 06 implements as composable wrappers** (no core mods); Yjs page-array splice via `use-page-operations.ts`.
- ✅ **§12.3** — Topbar Comments icon: **HIDDEN** entirely in MVP (additive when Comments ships).
- ✅ **§12.13** — Right-panel default on first open: **AI tab** (Kova differentiator).
- ✅ **§12.14** — Tab behavior on layer-click: **STICKY** (no auto-switch; matches Figma).
- ✅ **§12.15** — Inspector section priority: **`InspectorSectionDef` registry contract** in `src/types/inspector.ts`; 07b registers at 20–100.

No remaining open questions. Cluster 06 PRD is ready for implementation (Wave 4).

---

## 13. References

### 13.1 Source artifacts

- **Hi-fi files:**
  - `main-main-kova-scope/batch-b/Kova Canvas - Final.html` (canonical canvas-chrome source-of-truth — `.kc {}` block lines 75–502, instance markup lines 600–1008)
  - `main-main-kova-scope/batch-b/chunk-b3/Kova Hi-Fi 10 Left Panel - Dark.html` (4 scenes — empty, mask variants, slice, drag-reorder motion)
  - `main-main-kova-scope/batch-b/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html` (7 scenes — Page, Position, Layout, Fill, Stroke, Text, Effects/Export)
  - `main-main-kova-scope/batch-b/chunk-b5/Kova Hi-Fi 12 Color Picker - Dark.html` (8 scenes)
  - `main-main-kova-scope/batch-b/Kova Hi-Fi 08 Top Chrome Menus - Dark.html` (top-chrome menu catalog — File / Edit / Arrange / View + search + user/avatar menu)
  - `main-main-kova-scope/batch-b/chunk-b2/Kova Hi-Fi 16 Toasts + Missing Fonts - Dark.html` (canvas-toast variant + missing-fonts pill)

### 13.2 03 doc rows covered

- `kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/03-implied-surfaces-and-backend.md`
  - §2.1 Top chrome / app header (7 rows)
  - §2.3 Bottom toolbar (3 rows)
  - §2.4 Left panel — Pages / Layers (12 rows)
  - §2.6 Inspector / Right panel additions (26 rows — only the chrome/router/page-section parts; inspector sections themselves are Cluster 07b)
  - §3A Right-click context menu shell (consumed via Cluster 08 — anchors mounted here)
  - §3A Toggle-visibility / toggle-lock action surfaces (existing actions; new invocation sites in Layers tree)
  - §3A Canvas drop-payload type extension (this PRD ships the receiver; Cluster 05 ships sources + MIME contract)

### 13.3 Q-decisions baked in

- Q3 (inspector engine readiness — wire what's ready; effects re-added; boolean ops new)
- Q4 (zero engine extension hooks needed for canvas-extensions; product-variant pattern is external Pinia + public FigmaAPI — this PRD's drop receivers follow that pattern)
- Q16 (avatar dropdown items — 5 items per §2.1)
- Q17 (brand label = navigate to brand dashboard — REVERSED 2026-04-25 by founder; no popover)
- Q18 (right-click overflow `•••` vs canvas right-click — compact vs full; both use Cluster 08's `useObjectActions`)
- Q20 (eyedropper canvas-only MVP — Cluster 07b owns; this PRD doesn't render an eyedropper tool button)
- Q21 (image fill 4 modes — Cluster 07b's `<FillSection>` owns)
- Q22 (JPG export 3-level quality — Cluster 07b's `<ExportSection>` owns)
- Q24 (drag-drop semantics + 5 MIME payloads — receivers in this PRD's §6.5)

### 13.4 Audit, verification, scope-plan references

- `kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` §3 Cluster 06 (scope) + §6 cross-cuts table
- `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md` §2.A Cluster 06 (lines 1551–1613) — auditor's pre-baked spec
- `kova-open-pencil-1/docs/kova-final-prds/00d-EXTERNAL_VERIFICATION_HANDOFF.md` — D-10 (no PRD 06 split — keep as one)
- `kova-open-pencil-1/docs/kova-final-prds/00e-EXTERNAL_VERIFICATION_VERDICT.md` §6 (PRD-hygiene notes — no live multi-device sync promises)
- `kova-open-pencil-1/docs/kova-final-prds/10-ai-chat-and-memory.md` §6 + §11 + §12.1 — Cluster 06 amendment task (right-panel 2-tab framework, Shop panel rework, ChatPopup removal)
- `kova-open-pencil-1/docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md` §4.1 (Shop panel rework) + §5 (M9 migration plan)

### 13.5 PRD 01 + 05 canonical references

- `kova-open-pencil-1/docs/kova-final-prds/01-auth-and-identity.md` — section template, idempotency, RLS shape, acceptance phrasing, test-plan layout
- `kova-open-pencil-1/docs/kova-final-prds/05-brand-kit-and-drag-drop.md` — MIME contract definitions (consumed by §6.5)

### 13.6 Design system (canonical, version-controlled per 00e §4)

- `main-main-kova-scope/design-system/design.md`
- `main-main-kova-scope/design-system/kova-hifi.css`
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md`
- **Source-of-truth visual bar**: `main-main-kova-scope/batch-b/Kova Canvas - Final.html` `.kc {}` block (lines 75–502) for canvas chrome

### 13.7 M9 reuse + REWORK

- `kova-open-pencil-1/src/components/editor/sidebar/ShopPanelProducts.vue` — REWORK per Shopify spec §5.2 (remove draggable + onDragStart + serializeShopPayload import + variant-flat listing; add multi-select + Import N to chat)
- `kova-open-pencil-1/src/components/editor/sidebar/ShopPanel.vue` — REWORK (collapse 3-tab TabsRoot to single product panel; remove Collections + Discounts tabs per Shopify spec §5.1)
- `kova-open-pencil-1/src/stores/shopify-products.ts` — KEEP as data source (trim variant-flat assumptions per spec §5.2)
- `kova-open-pencil-1/src/views/EditorView.vue` — REWORK (remove `<ChatPopup>` import + render at line 33 + line 282; remove `useShopDrop` destructure + canvas dragover/drop handler tied to drag-place model + `<ShopBuildPrompt>` render block per Shopify spec §5.1)
- `kova-open-pencil-1/src/canvas-extensions/product-variant/` — RIP entire directory per Shopify spec §5.1 (Cluster 10 + the migration commit own the file deletes; this PRD removes EditorView wiring)

### 13.8 Memory pointers (per 00a §3 reading order)

- `feedback_app_dark_website_light` — canvas inside authenticated app → DARK theme
- `feedback_figma_ui_theme` — Figma reference for chrome (topbar, tabs, layer tree, inspector)
- `feedback_browser_smoke_test_before_done` — §9.4 manual QA
- `feedback_verify_with_docs` — Figma help center references (verified via WebFetch in 00e §4)
- `feedback_no_hide_without_permission` — Comments + Notifications visibility decisions in §12.3 respect this (founder confirms hide vs disabled)
- `project_kova_avatar` — freelance email marketer → per-brand canvas; no in-canvas brand switching (Q17)
- `project_design_system_master` — canonical design-system path
- `project_m9_shopify_tools_schema_bug` — Shop panel REWORK is post-fix (22 tests pass)
- `project_prd10_decisions` — right-panel = 2 tabs (Design + AI), Prototype DROPPED entirely (founder ratification 2026-05-15)
- `project_pre_prd_audit_ratified` — Wave 4 = Cluster 05 + 06 per scope plan §4

— End of PRD 06 —
