# PRD 08 — Canvas Menus, Popovers, Context Menus & Keyboard Shortcuts

## 0. Status & ownership

| Field | Value |
|---|---|
| **Status** | `DRAFT-LOCKED` 2026-05-17 (post-founder-clarification round; ready for implementation handoff) |
| **Wave** | 5 (close) |
| **Author** | Claude (Opus 4.7) |
| **Reviewer** | Jiho Yang (founder) |
| **Last updated** | 2026-05-17 — founder lock-down on (a) Figma View-menu default toggle states + Pixel grid activation + Rulers added; (b) Outlines wireframe submenu (NEW); (c) Show/Hide UI ⌘\; (d) Previous/Next page DROPPED; (e) last-page delete = Figma-style disabled item + tooltip; (f) empty-canvas right-click = Figma full 12-item menu; (g) **B12 archived Brands page promoted to MVP — brand-card right-click adds active vs archived state branch via `useObjectActions().brandCardActiveActions` / `brandCardArchivedActions` (Rename/Archive/Delete vs Restore/Delete); NEW PRD 03 cross-cut**. See §13.2 founder-lock entries + §12.5 + §12.6 RESOLVED |
| **Depends on PRDs** | 06 (chrome host mounts main-menu + right-click trigger surfaces), 11 (useConfirm primitive + `<KovaModal>` shell + toast system + idempotency-key helper N/A here) |
| **Blocks PRDs** | None at MVP. Downstream PRDs (07b, 09) **register into** this PRD's shortcut + context-menu registries by API; they do not block on its primitives shipping ahead of them. |
| **Source artifacts** | Hi-fi: 4 files (B1 top-chrome menus, B1.11 file-name dropdown, B11 Find overlay, B13 Trash confirm cross-cut). 03 doc: §2.2 (23 rows) + §2.8 (10 rows) + §2.10 (28 rows) = 61 rows. §3C #7 + #8 + #9 + #10 + #11. Q-decisions: Q5 (Recent colors Layer 2 localStorage), Q18 (overflow vs canvas right-click), Q23 (Copy/Paste properties), Q24 (drag-drop — cross-cut acknowledgment only), Q25 (13-category shortcut taxonomy). Audit `00c §2.A` lines 1684–1763. |

---

## 1. Problem & outcome

### 1.1 Plain language (for founder)

This PRD ships every menu, popover, context menu, and keyboard shortcut a user interacts with inside the canvas editor, **excluding** the panels and toolbar themselves (those live in Cluster 06) and the engine-side primitives (Cluster 07). Concretely: the logo-anchored main menu with its 8 submenus (File / Edit / View / Object / Text / Arrange / Preferences / Help & account), the file-name dropdown anchored next to the file title, every right-click context menu (canvas, layer row, page row, empty canvas, frame, asset), the find-on-canvas overlay (`⌘F`), the keyboard-shortcuts dialog (`⇧⌘?`), the trash-confirm modal (when reached from dashboard right-click — cross-cut), the canvas-side specializations of `useConfirm()` (delete page, delete layer, irreversible Object-menu items), the declarative keyboard shortcut registry that `use-keyboard.ts` consumes, the always-on number-keys-for-opacity behavior (Figma-exact), and the recent-colors persistence (localStorage per Q5 Layer 2). The user opens any menu, sees a Reka-shell popover with consistent row density / kbd-row glyphs / destructive coloring; clicks any item to dispatch its action; the same action surfaces in the matching right-click and matching shortcut.

### 1.2 Caveman summary (per CLAUDE.md communication style)

User open canvas. Click logo = main menu drop. Hover submenu = sub-popover open. Right-click anywhere = context menu (full set on canvas, compact subset on inspector `•••`). Hit `⌘F` = find overlay open top-center. Hit number key with layer selected = opacity. Hit `⇧⌘?` = shortcuts dialog. All popovers same Reka shell, same Inter, same kbd glyph order ⌃→⌥→⇧→⌘→letter. Delete = destructive coloring, useConfirm modal. Move-to-trash modal = dashboard-only (founder 2026-05-09 ripped it from canvas). PRD wire every menu item to existing editor.ts action — minimal new code, max reuse. Shortcut registry single source of truth: use-keyboard.ts read from it. Components + Prototyping categories hidden in dialog (no DEFER ghost rows).

### 1.3 Outcome (acceptance gate)

User can: (1) open main menu and every submenu including sub-of-sub (Boolean ops, Case, Copy as ▶, Panels ▶); (2) trigger every menu item via mouse OR keyboard shortcut, with identical action behavior; (3) right-click on canvas / layer row / page row / empty canvas / inspector overflow `•••` and see the contextually-correct items (Q18 full vs compact); (4) hit `⌘F` to open Find, type a query, see live-highlighted matches on TEXT content + layer names + frame names + page names (4-field scope), cycle via `⇧⌘F` / `⇧⌘D`, Esc to dismiss; (5) hit `⇧⌘?` to open shortcuts dialog, search across 11 visible categories (DEFER 2 hidden), see each row with its kbd glyphs; (6) press a number key while a layer is selected and watch opacity jump to 10/20/…/100 (or two-digit within 500 ms); (7) open color picker, see recent-colors swatch row persisted per-device. Every destructive item (Delete layer, Delete page, Move to trash from dashboard) routes through useConfirm with the right modal copy. Right-click overflow `•••` and canvas right-click compose from the same `useObjectActions()` composable so no item drifts between surfaces. Layout guides default-ON overlay renders.

---

## 2. Scope

### 2.1 In scope (this PRD)

**Main menu (top-chrome) + sub-popovers:**
- Logo-trigger root popover (8 items per B1.1 — Back to dashboard / File / Edit / View / Object / Text / Arrange / Preferences / Help & account, Vector hidden per B1.10)
- File submenu (B1.2) — New design / Place image… (⇧⌘K) / Export… / Save to version history (⌥⌘S) / Show version history / Move to trash (destructive)
- Edit submenu (B1.3 — densest) — Undo / Redo / Cut / Copy / Paste / Paste to replace (⇧⌘R) / Duplicate (⌘D) / Copy as ▶ (PNG only) / Copy properties (⌥⌘C) / Paste properties (⌥⌘V) / Pick color (⌃C) / Find (⌘F) / Find next (⇧⌘F) / Find previous (⇧⌘D) / Select none / Select inverse (⇧⌘A)
- View submenu (B1.4) — Show-hide UI (⌘\) / Minimize UI (⇧⌘\) / Panels ▶ (Left visible, Right visible) / 7 toggle rows: **Pixel grid (⇧') default-ON** / **Layout guides (⇧G) default-ON** / **Rulers (⇧R) default-ON** / Show slices default-OFF / Mask outlines default-OFF / Frame outlines default-OFF / Outlines ▶ sub-of-sub (Show outlines wireframe-mode ⇧O default-OFF — Cluster 07b ships wireframe render primitive) / Zoom 5 rows. **Defaults match Figma View menu screenshot (founder verified 2026-05-17)**
- Object submenu (B1.5) — Group / Ungroup / Frame selection / Bring forward-back / to-front/back / Rotate 90° L-R-180° / Flip H/V / Use as mask (⌃⌘M) / Boolean operations ▶ (Union/Subtract/Intersect/Exclude — visible only on ≥2 multi-select per Q3 #14) / Lock-unlock / Show-hide / Rename / Delete (destructive)
- Text submenu (B1.6) — Bulleted list / Numbered list / Create link / Case ▶ (radio: As typed / UPPERCASE / lowercase / Title Case / Sentence case) / Show text suggestions (disabled Phase-2)
- Arrange submenu (B1.7) — Round to pixel / Pack horizontal-vertical / Distribute horizontal spacing (^⌥H) / Distribute vertical spacing (^⌥V) / 6 distribute-edge variants (left, h-centers, right, top, v-centers, bottom)
- Preferences submenu (B1.8) — Accessibility settings… (single item)
- Help & account submenu (B1.9) — Help / Keyboard shortcuts (⇧⌘?) / Log out

**File-name dropdown (B1.11):**
- Distinct popover anchored to file-name region (NOT logo) — Rename / Duplicate / Save to version history (⌥⌘S) / Show version history / Export… (⇧⌘E)
- **No Move-to-trash** per founder 2026-05-09 — see §2.4

**Right-click context menus (Q18):**
- **Canvas right-click on object** (full set, 12–20 items): Copy / Paste / Cut / Duplicate / Copy as ▶ (PNG) / Copy properties / Paste properties / Pick color / Lock-Unlock / Show-Hide / Bring forward-back / to-front/back / Group / Frame selection / Ungroup / Use as mask (⌃⌘M) / Rotate 90° L-R-180° / Flip H/V / Boolean ops (Union/Subtract/Intersect/Exclude — multi-select gate) / Rename / Delete
- **Inspector overflow `•••`** (compact subset, 5–7 items): Lock-Unlock / Show-Hide / Rename / Copy as PNG / Copy properties / Paste properties / Delete
- **Canvas right-click on empty area** (Figma full menu — founder lock 2026-05-17): Paste here / Paste to replace (⇧⌘R) / sep / Select all (⌘A) / Select inverse (⇧⌘A) / sep / Zoom to 100% (⌘0) / Zoom to fit (⇧1) / Zoom to selection (⇧2) / sep / Pixel grid / Layout guides / Rulers (3 checkable toggles) / sep / Find (⌘F) — 12 items total. All wire to existing `editor.ts` methods + `usePreferencesStore.prefs.view.*`
- **Page row right-click** (left panel Pages): Duplicate page / Rename page / Delete page (destructive, useConfirm) / Move page up / Move page down
- **Layer row right-click** (left panel Layers): Scroll to layer / Reveal in Pages (Phase-2) / mirrors Object menu items contextually
- **Brand-asset row right-click** (left panel Assets — cross-cut Cluster 05, this PRD ships the right-click shell; Cluster 05 ships the asset-specific items)
- **Brand-card right-click** (Brands page — NEW per founder lock 2026-05-17, B12 archived Brands page promoted to MVP): branches on `brand.archived_at !== null` — active state shows Rename / Archive / Delete; archived state shows Restore / Delete. Items live in `useObjectActions().brandCardActiveActions` + `brandCardArchivedActions`. Modal triggers cross-cut to PRD 03 (B12.1 Archive, B12.3 Restore, B12.4 Delete)
- Same `useObjectActions()` composable feeds full vs compact subsets

**Find overlay (B11 / hi-fi 14):**
- `⌘F` opens overlay, floating top-of-canvas at `top: 16px; left: 50%; transform: translateX(-50%)`
- Input + match counter ("1 of 3" / "No results") + prev/next buttons + close (Esc)
- Search scope: TEXT node content + layer names + frame names + page names (founder 2026-04-25 — Figma-exact 4-field scope, no toggle)
- Current match: 2px `--accent` ring + `--accent-soft` fill; other matches: `--accent-soft` fill, no outline; selection syncs to layer tree
- `⇧⌘F` next, `⇧⌘D` previous (cycle), Esc dismiss

**Keyboard shortcut registry + dialog:**
- Declarative shortcut catalog (`useShortcutsStore`) — 11 visible categories per Q25 (Essentials, Tools, View, Zoom, Text, Shape, Selection, Cursor, Edit, Transform, Arrange) + 2 hidden (Components, Prototyping — `deferred: true`, NOT rendered)
- `use-keyboard.ts` refactored to consume the registry (single source of truth — replaces existing inline switch)
- `KeyboardShortcutsDialog.vue` (A8.2 modal) — search filter + category tabs + rows with label + kbd glyph row; opens on `⇧⌘?`
- Number-keys-for-opacity always-on (Figma-exact): 1=10% / 2=20% / … / 9=90% / 0=100% / `00`=0% / two-digit within ~500 ms quick-succession; writes via `editor.ts.updateNodeWithUndo` on every selected layer's opacity property

**useConfirm canvas specializations:**
- Cluster 11 ships the **primitive** (`useConfirm()` + `<ConfirmDialog>` mounted at app shell)
- This PRD ships the **catalog of canvas-side specializations**:
  - Delete page (destructive, requires confirm — last page guarded)
  - Delete layer with locked descendants (mass-skip warn)
  - Object-menu Delete (irreversible items on multi-select with mixed types — surfaces "Some properties don't apply" mass-skip toast per Q23)
  - Trash-confirm cross-cut (B13) — see §2.4

**Recent colors persistence (per Q5 Layer 2):**
- `useUIStateStore.recentColors` (24-entry ring buffer) backed by VueUse `useLocalStorage('kova:ui:recent-colors')`
- Read by color-picker popover (Cluster 06 mounts the color picker — Cluster 12 ships `useUIStateStore` per Q5; this PRD wires the recent-colors row's data binding)

### 2.2 Out of scope (explicitly NOT this PRD)

| Item | Owning PRD |
|---|---|
| **Top chrome shells** — topbar layout, logo trigger surface, file-name trigger surface, avatar dropdown | **06 — Canvas Editor Core Chrome** |
| **Bottom toolbar** + tool dropdowns (Move ▶ Hand/Scale, Frame ▶ Frame/Section/Slice, Rectangle ▶ 6 variants, Pen ▶ Pen/Pencil) — these are toolbar tool variants, not main menu | **06** (hi-fi 13 scenes 13.3–13.7 belong here) |
| **Left panel chrome** (Pages section, Layers tree, Assets/Brand kit panel) — this PRD ships the **right-click menus** anchored on those rows, but not the rows themselves | **06** |
| **Right panel / Inspector** chrome — this PRD ships the **overflow `•••` button** as a context-menu invocation surface; the inspector property panels themselves are 06 | **06** |
| **Color picker popover** (B5 hi-fi 12) — Cluster 06 owns the picker; this PRD wires the recent-colors row's data source | **06** |
| **Engine-side primitives** — Slice node type, Measurement node type, Mask compositing, Effects renderer, Boolean operations engine API, image-fill modes, gradient editor, Eyedropper canvas-extension | **07a + 07b** |
| **`figma.booleanOperation()` engine wiring** — the menu/shortcut handlers in this PRD CALL it; the engine API exists in `packages/core/figma-api.ts` per Q3 #14 | **07a** (already there per `00c`) |
| **`useConfirm()` primitive + `<ConfirmDialog>` shell** | **11** |
| **Toast system + `<KovaModal>` + skeletons + error pages + offline indicator + Command-K palette** | **11** |
| **Idempotency-key helper for Edge Functions** | **11** (N/A in this PRD — no Edge Functions) |
| **Trash-confirm modal entry point** — modal logic lives in **09** (Version History + Trash); this PRD only documents the cross-cut so engineers know where the destructive useConfirm-trash variant lives | **09** |
| **Move-to-trash dispatch from canvas** — explicitly ripped 2026-05-09 (founder). The in-canvas file-name dropdown carries NO trash item; trash only reachable from dashboard file-row right-click | **02 (dashboard right-click trigger) + 09 (confirm + RPC)** |
| **`usePreferencesStore` (Layer 1)** + accessibility prefs modal (A8.3) UI — Preferences ▶ submenu item OPENS the modal but the modal lives in 12 | **12** |
| **`useUIStateStore` (Layer 2)** + localStorage backing — Cluster 12 ships the store; this PRD references `.recentColors` only | **12** |
| **Snap toggles preference UI** (View menu rows for snap-to-grid, snap-to-objects) — DEFERRED per Q24. Default-ON snap behavior already in engine | **12** Phase 2 |
| **Help docs hosting** (external Mintlify/GitBook URL) — Help menu item routes to `mailto:` MVP, external URL Phase 2 | Phase 2 |
| **Custom keybindings** — registry is unlock-ready (per §3C #9), but the per-user-override UI is DEFERRED | **12** Phase 2 |
| **Brand-asset row right-click items** — this PRD ships the shell; Cluster 05 ships the per-asset items (Rename / Delete asset / Use as fill / Use as image) | **05** |
| **Avatar dropdown items** — overlap with Help & account submenu intentional. Avatar dropdown carries Account/Brand kit/Plan/Sign out per Q16; main-menu Help & account submenu intentionally minimal (Help / Keyboard shortcuts / Log out) per B1.9 founder annotation | **06** (avatar dropdown), **04** (Account routes), this PRD (main-menu Help & account) |
| **Vue Router auth middleware + meta.theme** | **01** |

### 2.3 Deferred to Phase 2

- **Vector ▶ submenu** — trigger HIDDEN entirely per B1.10. Reinstated when Vector tooling returns.
- ~~**"Show pixel grid" View menu item** — visible but **disabled** with "Phase 2" pill.~~ **REVERSED 2026-05-17:** Pixel grid now active MVP per founder Figma-parity lock; default-ON; toggles via `prefs.view.pixelGrid`. Cluster 07b ships overlay primitive.
- **"Show text suggestions" Text menu item** — visible but **disabled** with "Phase 2" pill per founder annotation B1.6.
- **"Reveal in Pages" layer right-click item** — Phase 2 per 03-doc §2.10 row.
- **Help item external URL** — `mailto:` MVP, external docs site Phase 2.
- **Pen ▶ chevron dropdown stub** — toolbar item ships with chevron but dropdown is one-row stub in MVP (Cluster 06 detail; mentioned here because the dispatch table treats it the same as other tool dropdowns).
- **Snap-toggle preference rows in View menu** — visible-but-disabled rows per Q24 ("Snap to pixel grid" with `⇧⌘'` etc.) — DEFERRED. Default-ON behavior ships now (engine-side, Cluster 07b).
- **Components category in shortcuts dialog** — `deferred: true`, NOT rendered (Q25).
- **Prototyping category in shortcuts dialog** — `deferred: true`, NOT rendered (Q25).
- **Custom keybinding override UI** — registry shape supports per-user overrides; UI for it is Phase 2 (Cluster 12 hook).
- **Compare-and-restore feature on shortcuts dialog** (a "diff against my custom" view) — Phase 2.
- **Sub-of-sub menus beyond Boolean ops + Case + Copy as + Panels** — current depth (2 levels) is sufficient for MVP scope; deeper nesting Phase 2.

### 2.4 Cross-cut acknowledgments (foreign owners)

- **Cluster 11** owns `useConfirm()` primitive + `<ConfirmDialog>` shell + `<KovaModal>` + toast system. This PRD **consumes** the primitive via the registered confirmation specs catalog; does not re-spec the shell.
- **Cluster 06** owns the topbar chrome that hosts the logo-trigger surface (where `MainMenuPopover` anchors), the file-name trigger surface (where `B1.11` file-name dropdown anchors), and the avatar dropdown (which overlaps Help & account submenu intentionally). Cluster 06 also mounts the right-click trigger surfaces on layer rows, page rows, asset rows, frames, canvas empty area, inspector `•••`.
- **Cluster 07b** owns the engine-side boolean-operation API wiring (`figma.booleanOperation()` invocation paths). Cluster 07b **registers** its boolean-op shortcuts (`⌘⌥U/S/I/X`) into THIS PRD's `useShortcutsStore` at app boot.
- **Cluster 09** owns the Move-to-trash confirm modal logic + the `canvases.trashed_at` RPC. The modal is reached from the **dashboard right-click** (Cluster 02 trigger). This PRD links to the cross-cut, ships nothing for trash itself.
- **Cluster 02** owns dashboard file-grid right-click which is THE entry point for "Move to trash" + B13 confirm modal. The canvas-side file-name dropdown explicitly omits "Move to trash" per founder 2026-05-09 (and per chunk-b1 file 13 scene 13.2's "stripped" annotation).
- **Cluster 12** owns `usePreferencesStore` (Layer 1) + `useUIStateStore` (Layer 2). This PRD reads `useUIStateStore.recentColors` for the color-picker recent row; reads `usePreferencesStore.prefs.view.*` (per founder lock 2026-05-17 Figma defaults: `pixelGrid` default-ON, `layoutGuides` default-ON, `rulers` default-ON, `frameOutlines` default-OFF, `maskOutlines` default-OFF, `showSlices` default-OFF, `wireframeMode` default-OFF) for the View menu toggle rows.
- **Cluster 05** owns brand-asset right-click items (per-asset behavior). This PRD ships the right-click SHELL on asset rows; Cluster 05 plugs items into the dispatch table.

---

## 3. Visual spec

Every surface maps to a hi-fi file. Engineers cite the file + scene ID when implementing.

### 3.1 Main menu + submenus (top chrome — dark theme)

| Surface | Anchor | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Main menu root popover | Logo trigger (left of breadcrumb) | `main-main-kova-scope/batch-b/Kova Hi-Fi 08 Top Chrome Menus - Dark.html` | B1.1 | 8 entries; left-aligned to logo, 8 px below top bar; min-width 260 px; Reka shell |
| File ▶ submenu | Anchored 22 px right of root menu's right edge; top edge 4 px below parent row top | same | B1.2 | New design / Place image… / Export… / sep / Save to version history (⌥⌘S) / Show version history / sep / Move to trash (destructive) — opens A8.4 useConfirm cross-cut |
| Edit ▶ submenu | same | same | B1.3 | Undo (⌘Z) / Redo (⇧⌘Z) / Cut / Copy / Paste / Paste to replace (⇧⌘R) / Duplicate (⌘D) / Copy as ▶ / Copy properties (⌥⌘C) / Paste properties (⌥⌘V) / Pick color (⌃C) / Find (⌘F) / Find next (⇧⌘F) / Find previous (⇧⌘D) / Select none / Select inverse (⇧⌘A) — min-width 280 px |
| View ▶ submenu | same | same | B1.4 | Show/hide UI (⌘\) **default-ON visible** / Minimize UI (⇧⌘\) / Panels ▶ (Left visible, Right visible — sub-of-sub) / sep / 6 checkable toggle rows + 1 sub-of-sub (Figma defaults per founder 2026-05-17): **Pixel grid (⇧') default-ON / Layout guides (⇧G) default-ON / Rulers (⇧R) default-ON** / Show slices default-OFF / Mask outlines default-OFF / Frame outlines default-OFF / Outlines ▶ sub-of-sub / sep / 5 Zoom rows (⌘+, ⌘−, ⌘0, ⇧1, ⇧2). **Previous/Next page items REMOVED MVP per founder Q3 2026-05-17 — nav via Pages list + kbd-only.** Comments / Annotations / Property labels / Multiplayer cursors / Pixel preview / Switch to Draw / Switch to Dev Mode / Memory usage NOT in MVP (no real-time collab; no annotation system; design-tool-meta items irrelevant to email design) |
| Outlines ▶ sub-of-sub | Anchored right of View submenu's "Outlines" row | same | B1.4 | Single item: Show outlines (⇧O) checkable, **default-OFF** — toggles canvas-wide wireframe render mode (no fills, no images, just shape edges). Cluster 07b ships engine wireframe primitive; this PRD wires the menu row + persists in `usePreferencesStore.prefs.view.wireframeMode` (Layer 1 cross-device per Q5). Figma parity confirmed via View menu screenshot (founder 2026-05-17) |
| Object ▶ submenu | same | same | B1.5 | Group (⌘G) / Ungroup (⇧⌘G) / Frame selection (⌥⌘G) / Bring forward (⌘]) / Send backward (⌘[) / Bring to front (⌥⌘]) / Send to back (⌥⌘[) / Rotate 90° L/R/180° / Flip H (⇧H) / Flip V (⇧V) / Use as mask (⌃⌘M) / **Boolean operations ▶ (sub-of-sub — multi-select gate)** / Lock-unlock (⇧⌘L) / Show-hide (⇧⌘H) / Rename… (⌘R) / Delete (⌫) destructive |
| Boolean ops sub-of-sub | Anchored right of Object submenu's "Boolean operations" row | same | B1.5 | Mounted only when ≥2 layers selected (Q3 #14). 4 items: Union (⌘⌥U) / Subtract (⌘⌥S) / Intersect (⌘⌥I) / Exclude (⌘⌥X). When single-select, parent row renders `.disabled` with tooltip "Select 2+ layers" |
| Text ▶ submenu | same | same | B1.6 | Bulleted list (⇧⌘8) / Numbered list (⇧⌘7) / sep / Create link (⇧⌘U) / sep / Case ▶ (sub-of-sub) / sep / Show text suggestions (Phase-2 disabled) |
| Case sub-of-sub | Anchored right of Text submenu's "Case" row | same | B1.6 | Radio behavior: As typed (default) / UPPERCASE / lowercase / Title Case / Sentence case |
| Arrange ▶ submenu | same | same | B1.7 | Round to pixel / sep / group "Pack": Pack horizontal / Pack vertical / sep / group "Distribute spacing": Distribute horizontal spacing (^⌥H) / Distribute vertical spacing (^⌥V) / sep / group "Distribute edges" (6 variants, no shortcuts): Distribute left/h-centers/right/top/v-centers/bottom edges — only B1 submenu using inline group labels |
| Preferences ▶ submenu | same | same | B1.8 | Single item: Accessibility settings… → opens A8.3 modal (Cluster 12) |
| Help & account ▶ submenu | same | same | B1.9 | Help (mailto: MVP) / Keyboard shortcuts (⇧⌘?) → opens A8.2 dialog / sep / Log out → `useAuthStore.signOut()` |
| Copy as ▶ sub-of-sub | Anchored right of Edit submenu's "Copy as" row | same | B1.3 | Single item: "Copy as PNG" (per founder pass-2 re-semantic — image-only export model) |
| Panels ▶ sub-of-sub | Anchored right of View submenu's "Panels" row | same | B1.4 | Two checkable rows: Left visible / Right visible — per-canvas Yjs awareness (Cluster 09 sync) |

### 3.2 File-name dropdown (top chrome — dark)

| Surface | Anchor | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| File-name dropdown popover | File-name text (NOT chevron) — 4 px gap below top chrome, min-width 280 px | `batch-b/Kova Hi-Fi 08 Top Chrome Menus - Dark.html` AND `batch-b/chunk-b1/Kova Hi-Fi 13 Canvas Popovers - Dark.html` | B1.11 (08) + 13.1 closed + 13.2 open | 5 items: Rename / Duplicate / sep / Save to version history (⌥⌘S) / Show version history / sep / Export… (⇧⌘E). **NO "Move to trash" item** per founder 2026-05-09. DEFER items (Add to sidebar, File color profile, Move file) + REMOVE items (Publish library, Create branch) NOT rendered |

### 3.3 Right-click context menus (canvas overlays — dark)

No dedicated hi-fi scene for canvas right-click — the visual contract is the Reka shell from `08 Top Chrome Menus § LOCK HERE`. Items are dispatched per surface per the dispatch table in §6.

| Surface | Trigger | Items | Notes |
|---|---|---|---|
| Canvas right-click on object (full set) | Right-click on selected node OR right-click on unselected node = auto-select then open | 12–20 items (see §2.1 list) | Same `useObjectActions()` composable as inspector `•••` |
| Inspector overflow `•••` (compact subset) | Click on `•••` button in inspector top-right | 5–7 items: Lock-Unlock / Show-Hide / Rename / Copy as PNG / Copy properties / Paste properties / Delete (destructive) | Per Q18; subset projection of full set |
| Canvas right-click on empty area | Right-click on canvas background (no node hit) | **Figma-full menu (founder lock 2026-05-17)** — 12 items: Paste here / Paste to replace (⇧⌘R) / sep / Select all (⌘A) / Select inverse (⇧⌘A) / sep / Zoom to 100% (⌘0) / Zoom to fit (⇧1) / Zoom to selection (⇧2) / sep / Pixel grid / Layout guides / Rulers (3 checkable toggles, defaults all ON per Figma) / sep / Find (⌘F) | Paste-here uses cursor screen-coord → canvas-coord conversion via `editor.canvasToScreen` inverse. Paste-to-replace silent no-op when nothing selected. Zoom rows mirror View > Zoom items. View toggles persist Layer 1 cross-device per Q5. Find row opens FindOverlay (§3.4) |
| Page row right-click | Right-click on a Page row in left panel | Duplicate page / Rename page / Delete page (destructive, useConfirm) / Move page up / Move page down | **Last page guard (founder lock 2026-05-17 — match Figma):** when only one page exists, Delete page menu item renders `.disabled` with hover-tooltip "Cannot delete the last page". No useConfirm invocation. Matches Figma exactly |
| Layer row right-click | Right-click on a Layer row in left panel | Scroll to layer / Reveal in Pages (Phase-2 disabled) / Lock-Unlock / Show-Hide / Rename / Delete | Mirror of Object menu items + 2 layer-tree-only items |
| Brand-asset row right-click | Right-click on an asset in the left-panel Assets section | Shell only — items per Cluster 05 dispatch | Cluster 05 cross-cut |
| Brand-card right-click — **active** (NEW per founder lock 2026-05-17 — B12 archived Brands page promoted MVP) | Right-click on a brand card in Brands page (PRD 03) where `brand.archived_at === null` | 3 items: Rename / Archive / Delete | Items from `useObjectActions().brandCardActiveActions`. Archive opens B12.1 modal (cross-cut PRD 03). Delete opens B12.4 modal (cross-cut PRD 03). Rename activates inline-rename on card |
| Brand-card right-click — **archived** (NEW per founder lock 2026-05-17) | Right-click on a brand card in Brands page where `brand.archived_at !== null` | 2 items: Restore / Delete | Items from `useObjectActions().brandCardArchivedActions`. Restore opens B12.3 modal (cross-cut PRD 03). Delete opens B12.4 modal (cross-cut PRD 03 — irreversible from archived state). State branch in `useContextMenu('brand-card', { brand })` dispatcher |

### 3.4 Find overlay (canvas — dark)

| Surface | Anchor | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Find overlay (empty) | Floating top-of-canvas, `top: 16px; left: 50%; transform: translateX(-50%)` | `batch-b/chunk-b1/Kova Hi-Fi 14 Find Overlay - Dark.html` | 14.1 | Placeholder "Find on canvas"; prev/next disabled; close (`x`) active |
| Find overlay (populated, 1 of N) | same | same | 14.2 | Counter "1 of 3"; "3 results"; prev/next active; current match gets 2px `--accent` ring + `--accent-soft` fill on canvas; other matches `--accent-soft` fill only; layer-tree selection follows current match |
| Find overlay (no results) | same | same | 14.3 | "No results" replaces counter inline; prev/next disabled; no toast (would be noisy) |
| Find overlay dismissed | (closed) | same | 14.4 | Reference frame for visual diffing — overlay adds 16 px vertical chrome only when open |

**Search scope (Q24 / founder 2026-04-25):** TEXT node `content` (per-run, case-insensitive substring) + Layer `name` + Frame `name` + Page `name`. Four simultaneous fields. No scope toggle in MVP.

### 3.5 Keyboard shortcuts dialog (modal — dark)

No dedicated hi-fi scene. Visual contract = Brief A's A8.2 modal shell (locked) + `<KovaModal>` from Cluster 11.

| Surface | Anchor | Notes |
|---|---|---|
| Keyboard shortcuts dialog | Centered modal (medium width — 720 px); 11 visible category tabs + search filter; row format: label + right-aligned kbd glyph row (macOS canonical order ⌃→⌥→⇧→⌘→letter); opens on `⇧⌘?` global shortcut OR via Help & account submenu "Keyboard shortcuts" item; closes on Esc / backdrop click / `×` button | Components + Prototyping categories `deferred: true` and **NOT rendered** (Q25 — hide DEFER, no ghost rows) |

### 3.6 Trash confirm modal (cross-cut Cluster 09 — dashboard surface)

| Surface | Anchor | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Move to trash confirm | Centered modal (`.dlg.sm`) over dashboard view | `batch-b/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html` | B13.1 / .2 / .3 | Reached from **dashboard right-click only** (Cluster 02 trigger). Modal logic + `canvases.trashed_at` RPC live in Cluster 09. This PRD documents the cross-cut and ensures NO canvas-side entry point exists. Backdrop `rgba(26,26,29,0.72)` per CHUNK_B2 §3.1 reconciliation. Success toast on dismiss: "Moved to trash. Restore anytime from Trash." (Q19 indefinite retention copy). |

### 3.7 Reka DropdownMenu shell — visual contract (LOCK)

All popovers in §3.1, §3.2, §3.3 share **one component shell** locked in `08 Top Chrome Menus § LOCK HERE`. Engineers do not re-spec the shell per popover.

- **Surfaces:** background `--rail`; border 1 px `--line`; radius 8 px; padding 4 px outer; shadow `0 24px 60px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.03)`.
- **Item row:** height 26 px; padding 10 px left / 8 px right; gap 10 px; radius 5 px. Hover bg `--line-2`; opened-submenu state bg `--fill`.
- **Label:** 12.5 px Inter 450, `--ink`, flush-left.
- **Submenu chevron:** 12 px Lucide `chevron-right`, `--ink-3`, flush-right.
- **kbd-row:** right-aligned. Inter 11 px tabular-nums, `--ink-3` idle / `--ink-2` hover. Each glyph in its own `<kbd>`; macOS canonical order ⌃ → ⌥ → ⇧ → ⌘ → letter.
- **Toggle row (`.checkable`):** 18 px gutter for 12 px check glyph; `opacity:0` when off, `1` when checked. Reduces left padding to 6 px for optical alignment.
- **Separator (`.sep`):** 1 px `--line-2`, 4 px vertical / 4 px horizontal margin.
- **Group label (`.group`):** 9.5 px Inter 500 sentence-case, `--ink-3`, padding 8/10/4/10. Used in Arrange (Pack / Distribute spacing / Distribute edges) + Boolean ops (Multi-select only).
- **Disabled (`.disabled`):** `--ink-3` color, no hover bg, Phase-2 chip 9.5 px Inter, `--fill` bg, 1/5 pad, 3 px radius, pinned right.
- **Destructive (`.destructive`):** `--warn` color (label + kbd), hover bg `--warn-soft`. Opens A8.4 useConfirm.
- **Min-widths:** `w-260` (root + simple submenus) / `w-280` (Edit / Object / View / Arrange / Text). Never less than 220 px.
- **Sub-popover offset:** 22 px right of parent menu's right edge; top edge 4 px below parent row top.

### 3.8 Design system references

Every popover uses `main-main-kova-scope/design-system/kova-hifi.css` (dark CSS). Tokens used: `--rail`, `--page`, `--line`, `--line-2`, `--fill`, `--fill-2`, `--ink`, `--ink-2`, `--ink-3`, `--ink-4`, `--accent`, `--accent-soft`, `--accent-ink`, `--warn`, `--warn-soft`. **No new tokens introduced** — every value resolves to an existing entry per the LOCK HERE inventory (B1.11 component inventory 07 add).

**Theme rule:** every surface in this PRD is dark. Cluster 11 router-meta-theme convention dictates the canvas route carries `meta.theme = 'dark'`; this PRD inherits.

---

## 4. Data model

### 4.1 Schema migrations

**None.** This PRD ships zero schema changes.

Recent colors are localStorage-only (per Q5 Layer 2 allocation table). View-toggle preferences live in `users.preferences` JSONB (Layer 1 — schema shipped in Cluster 01 `01-auth-and-identity.md` §4.1; consumed in Cluster 12). Default seed per founder lock 2026-05-17: `DEFAULTS.view = { pixelGrid: true, layoutGuides: true, rulers: true, frameOutlines: false, maskOutlines: false, showSlices: false, wireframeMode: false }` (Figma parity).

### 4.2 RLS policies

**None.** No tables touched.

### 4.3 Storage buckets

**None.** No file uploads in this PRD.

---

## 5. Backend

### 5.1 Edge Functions

**None.** Every action in this PRD invokes either an existing `editor.ts` method (engine — read-only contract per CLAUDE.md `packages/core/`) or an existing Pinia store action (e.g., `useEditorStore.deletePage`, `useCanvasesStore.duplicateCanvas`).

### 5.2 RPCs / database functions

**None.**

### 5.3 Cron jobs

**None.**

### 5.4 External integrations

**None.** This PRD does not call Stripe / Shopify / Anthropic / Resend.

---

## 6. Frontend

### 6.1 Routes (Vue Router)

**No new routes.** All surfaces live under the existing `/canvas/:canvasId` route (Cluster 06 owns the route registration). The keyboard-shortcuts dialog and find overlay mount inside the canvas route's `<App>` shell as modal/floating overlays.

### 6.2 Pinia stores

#### 6.2.1 `useMenuStore` (NEW)

```typescript
// kova-open-pencil-1/src/stores/menu.ts
//
// Tracks which top-chrome menu is open and which sub-popover is anchored
// under it. Single source of truth for "is the main menu visible right now?"
// — every submenu component reads from this store; only one root + one
// sub may be open at a time.

export const useMenuStore = defineStore('menu', () => {
  // Root menu identity: 'main' | 'file-name' | null. Null = closed.
  const openMenu = ref<'main' | 'file-name' | null>(null)

  // Submenu identity under main menu: 'file' | 'edit' | 'view' | 'object'
  // | 'text' | 'arrange' | 'preferences' | 'help' | null.
  const openSubmenu = ref<
    | 'file' | 'edit' | 'view' | 'object' | 'text' | 'arrange'
    | 'preferences' | 'help' | null
  >(null)

  // Sub-of-sub identity: 'boolean-ops' | 'case' | 'copy-as' | 'panels' | null.
  const openSubSubmenu = ref<
    'boolean-ops' | 'case' | 'copy-as' | 'panels' | null
  >(null)

  function open(menuId: 'main' | 'file-name'): void {
    openMenu.value = menuId
    openSubmenu.value = null
    openSubSubmenu.value = null
  }

  function openSub(id: typeof openSubmenu.value): void {
    if (openMenu.value !== 'main') return
    openSubmenu.value = id
    openSubSubmenu.value = null
  }

  function openSubSub(id: typeof openSubSubmenu.value): void {
    openSubSubmenu.value = id
  }

  function close(): void {
    openMenu.value = null
    openSubmenu.value = null
    openSubSubmenu.value = null
  }

  return { openMenu, openSubmenu, openSubSubmenu, open, openSub, openSubSub, close }
})
```

#### 6.2.2 `useShortcutsStore` (NEW)

```typescript
// kova-open-pencil-1/src/stores/shortcuts.ts
//
// Declarative keyboard-shortcut registry. Single source of truth that
// `use-keyboard.ts` consumes (refactor from existing inline switch).
// Other clusters (07b boolean ops, 09 version history `⌥⌘S`, 06 tool
// shortcuts) call `register()` at app boot.

export type ShortcutCategory =
  | 'essentials' | 'tools' | 'view' | 'zoom' | 'text' | 'shape'
  | 'selection' | 'cursor' | 'edit' | 'transform' | 'arrange'
  | 'components' | 'prototyping'

export interface Shortcut {
  id: string                         // 'edit.undo', 'object.delete', etc.
  category: ShortcutCategory
  keys: string                       // canonical token string: 'cmd+z', 'shift+cmd+a', '1', '00'
  description: string                // dialog row label
  action: () => void
  deferred?: boolean                 // true for Components + Prototyping (hidden)
  context?: 'global' | 'canvas' | 'text-edit'  // when shortcut listens
  guard?: () => boolean              // optional gate (e.g., multi-select for boolean ops)
}

export const useShortcutsStore = defineStore('shortcuts', () => {
  const registry = ref<Shortcut[]>([])

  function register(shortcut: Shortcut): void {
    const idx = registry.value.findIndex(s => s.id === shortcut.id)
    if (idx >= 0) registry.value[idx] = shortcut
    else registry.value.push(shortcut)
  }

  function unregister(id: string): void {
    registry.value = registry.value.filter(s => s.id !== id)
  }

  // Categories visible in dialog — DEFER filtered out.
  const visibleCategories = computed<ShortcutCategory[]>(() => {
    const ordered: ShortcutCategory[] = [
      'essentials', 'tools', 'view', 'zoom', 'text', 'shape',
      'selection', 'cursor', 'edit', 'transform', 'arrange',
    ]
    return ordered.filter(cat =>
      registry.value.some(s => s.category === cat && !s.deferred)
    )
  })

  // Lookup by category for dialog rendering.
  function byCategory(cat: ShortcutCategory): Shortcut[] {
    return registry.value.filter(s => s.category === cat && !s.deferred)
  }

  // Lookup by keys for use-keyboard.ts dispatch.
  function byKeys(keys: string): Shortcut | undefined {
    return registry.value.find(s => s.keys === keys && !s.deferred)
  }

  return { registry, register, unregister, visibleCategories, byCategory, byKeys }
})
```

#### 6.2.3 `useFindStore` (NEW — find-overlay state)

```typescript
// kova-open-pencil-1/src/stores/find.ts
//
// Per-canvas find state. Reactive query, hit list, current match.

export interface FindHit {
  nodeId: string
  field: 'text-content' | 'layer-name' | 'frame-name' | 'page-name'
  pageId: string                     // page the hit lives on (for cross-page cycling)
  matchStart?: number                // for text-content hits — character offset
  matchEnd?: number
}

export const useFindStore = defineStore('find', () => {
  const isOpen = ref(false)
  const query = ref('')
  const hits = ref<FindHit[]>([])
  const currentIndex = ref(0)        // 0-based

  const currentHit = computed<FindHit | null>(() => {
    if (hits.value.length === 0) return null
    return hits.value[currentIndex.value] ?? null
  })

  function open(): void { isOpen.value = true }
  function close(): void {
    isOpen.value = false
    query.value = ''
    hits.value = []
    currentIndex.value = 0
  }
  function setHits(newHits: FindHit[]): void {
    hits.value = newHits
    currentIndex.value = 0
  }
  function next(): void {
    if (hits.value.length === 0) return
    currentIndex.value = (currentIndex.value + 1) % hits.value.length
  }
  function previous(): void {
    if (hits.value.length === 0) return
    currentIndex.value = (currentIndex.value - 1 + hits.value.length) % hits.value.length
  }

  return { isOpen, query, hits, currentIndex, currentHit, open, close, setHits, next, previous }
})
```

### 6.3 Composables

| Composable | File | Signature | Used by |
|---|---|---|---|
| `useObjectActions` | `src/composables/use-object-actions.ts` | `(): { compactActions: ComputedRef<Action[]>; fullActions: ComputedRef<Action[]>; brandCardActiveActions: ComputedRef<Action[]>; brandCardArchivedActions: ComputedRef<Action[]>; }` where `Action = { id; label; kbd?: string; destructive?: boolean; disabled?: ComputedRef<boolean>; disabledReason?: string; invoke: (ctx?: { brand?: Brand; node?: SceneNode }) => void; }`. Canvas arrays (compact/full) derive from `allCanvasActions[]`. **Brand-card arrays (NEW per founder lock 2026-05-17 — B12 archived Brands page promoted to MVP) derive from active vs archived state:** `brandCardActiveActions = [Rename, Archive, Delete]`; `brandCardArchivedActions = [Restore, Delete]`. State branch in dispatcher checks `brand.archived_at !== null`. Modal triggers cross-cut to PRD 03 (B12.3 Restore modal; B12.4 Delete modal). | `ContextMenuShell` (canvas + brand-card right-click), `OverflowDots` (inspector `•••`) |
| `useContextMenu` | `src/composables/use-context-menu.ts` | `(surface: 'canvas' \| 'empty-canvas' \| 'layer-row' \| 'page-row' \| 'asset-row' \| 'frame' \| 'overflow-dots' \| 'brand-card', ctx?: { brand?: Brand }) => { items: ComputedRef<MenuItem[]>; open(event: MouseEvent): void; close(): void; }`. Dispatch table per surface. **`brand-card` surface (NEW per founder lock 2026-05-17 — B12 archived Brands page promoted to MVP):** branches on `ctx.brand.archived_at !== null` → archived items (`brandCardArchivedActions`) or active items (`brandCardActiveActions`) from `useObjectActions()`. | Right-click handlers on each surface (Cluster 06 mounts canvas surfaces; PRD 02 dashboard / PRD 03 brands page mounts brand-card surface) |
| `useConfirm` (CONSUME — primitive lives in Cluster 11) | `src/composables/use-confirm.ts` (Cluster 11 ships) | `(spec: ConfirmSpec) => Promise<boolean>` where `ConfirmSpec = { title; body; confirmLabel; destructive?; typedConfirmText? }`. | `useObjectActions` (Delete), `useEditorStore.deletePage` wiring, Cluster 09 trash flow |
| `useFind` | `src/composables/use-find.ts` | `(): { open(): void; close(): void; setQuery(q: string): void; next(): void; previous(): void; }`. Wraps `useFindStore`; implements the **4-field search algorithm** (TEXT content + layer names + frame names + page names) — debounced 150 ms on input change; iterates `editor.graph` traversal; updates `useFindStore.hits`. | `FindOverlay.vue`; `use-keyboard.ts` (⌘F / ⇧⌘F / ⇧⌘D bindings) |
| `useMainMenu` | `src/composables/use-main-menu.ts` | `(): { rootItems: ComputedRef<MenuItem[]>; openMenu(): void; openSubmenu(id): void; closeAll(): void; }`. Composes `useMenuStore` state + the dispatch table for File/Edit/View/Object/Text/Arrange/Preferences/Help submenus. | `MainMenuPopover.vue` mounted from Cluster 06 top chrome |
| `useFileNameDropdown` | `src/composables/use-file-name-dropdown.ts` | `(): { items: ComputedRef<MenuItem[]>; open(): void; close(): void; }`. Dispatch for the file-name dropdown (5-item subset per B1.11 / 13.2). | `FileNameDropdown.vue` mounted from Cluster 06 top chrome |
| `use-keyboard.ts` (REFACTOR — existing inline switch → registry consumer) | `src/composables/use-keyboard.ts` | Existing signature retained; internal switch replaced by `useShortcutsStore.byKeys(keysString)?.action()`. Adds the number-keys-for-opacity handler (two-digit window via internal `pendingDigit: Ref<string \| null>` + `setTimeout(500)`). Adds the text-edit guard (skip shortcuts that conflict with text input when `useEditorStore.editingTextNodeId !== null`). | `<App>` shell mounts once |
| `useShortcutRegistration` | `src/composables/use-shortcut-registration.ts` | `(shortcuts: Shortcut[]): void` — convenience wrapper to call `useShortcutsStore.register()` for each. Auto-unregisters on component unmount. | Cluster 07b, Cluster 09, Cluster 06, this PRD all call this at boot |

### 6.4 Components

#### 6.4.1 Menu components

| Component | File | Props | Slots | Emits | Hi-fi origin |
|---|---|---|---|---|---|
| `MainMenuPopover` | `src/components/menu/MainMenuPopover.vue` | `anchorEl: HTMLElement` (logo trigger DOM node) | none | `close` | B1.1 root popover; uses Reka `DropdownMenu.Root` |
| `FileSubmenu` | `src/components/menu/FileSubmenu.vue` | none | none | none | B1.2 — 7 items including destructive Move-to-trash (opens `useConfirm` typed-confirm cross-cut to Cluster 09 dashboard flow when invoked from main-menu File ▶ Move-to-trash — note: this main-menu path stays MVP per audit §2.A; only the in-canvas **file-name dropdown** specifically strips it) |
| `EditSubmenu` | `src/components/menu/EditSubmenu.vue` | none | none | none | B1.3 — densest, min-width 280 px; carries Copy as ▶ sub-of-sub |
| `ViewSubmenu` | `src/components/menu/ViewSubmenu.vue` | none | none | none | B1.4 — 6 checkable rows + Panels ▶ sub-of-sub + Outlines ▶ sub-of-sub (NEW per founder lock 2026-05-17); Show/Hide UI (⌘\) + Minimize UI (⇧⌘\) + 5 Zoom rows. Defaults match Figma per founder lock: Pixel grid / Layout guides / Rulers ON; Show slices / Mask outlines / Frame outlines / Wireframe OFF. Previous/Next page items NOT rendered (dropped MVP) |
| `OutlinesSubmenu` (NEW per founder lock 2026-05-17) | `src/components/menu/OutlinesSubmenu.vue` | none | none | none | B1.4 sub-of-sub — single item "Show outlines" (⇧O) checkable, default-OFF; toggles `usePreferencesStore.prefs.view.wireframeMode` (Layer 1 cross-device) |
| `ObjectSubmenu` | `src/components/menu/ObjectSubmenu.vue` | `multiSelect: boolean` (controls Boolean ops sub-of-sub visibility) | none | none | B1.5 — uses `useObjectActions().fullActions` for the action set |
| `BooleanOpsSubmenu` | `src/components/menu/BooleanOpsSubmenu.vue` | none | none | none | B1.5 sub-of-sub — 4 ops with `⌘⌥U/S/I/X` kbd glyphs |
| `TextSubmenu` | `src/components/menu/TextSubmenu.vue` | none | none | none | B1.6 — bulleted (⇧⌘8) / numbered (⇧⌘7) / link (⇧⌘U) / Case ▶ / suggestions disabled |
| `CaseSubmenu` | `src/components/menu/CaseSubmenu.vue` | `current: 'as-typed' \| 'upper' \| 'lower' \| 'title' \| 'sentence'` | none | `select` (case) | B1.6 sub-of-sub — radio group |
| `CopyAsSubmenu` | `src/components/menu/CopyAsSubmenu.vue` | none | none | none | B1.3 sub-of-sub — single item "Copy as PNG" |
| `PanelsSubmenu` | `src/components/menu/PanelsSubmenu.vue` | none | none | none | B1.4 sub-of-sub — Left visible / Right visible |
| `ArrangeSubmenu` | `src/components/menu/ArrangeSubmenu.vue` | none | none | none | B1.7 — 3 group labels (Pack / Distribute spacing / Distribute edges); 8 distribute variants |
| `PreferencesSubmenu` | `src/components/menu/PreferencesSubmenu.vue` | none | none | none | B1.8 — single item; opens `<AccessibilityModal>` (Cluster 12) |
| `HelpSubmenu` | `src/components/menu/HelpSubmenu.vue` | none | none | none | B1.9 — Help (mailto: MVP, Phase-2 external URL) / Keyboard shortcuts (⇧⌘?) / Log out |
| `FileNameDropdown` | `src/components/menu/FileNameDropdown.vue` | `anchorEl: HTMLElement` (file-name region DOM node) | none | `close` | B1.11 / 13.2 — 5 items, NO trash |
| `MenuItem` (leaf primitive) | `src/components/menu/MenuItem.vue` | `label: string; kbd?: string[]; checkable?: boolean; checked?: boolean; destructive?: boolean; disabled?: boolean; phase2?: boolean; hasSubmenu?: boolean;` | `icon?` (left slot) | `click` | LOCK HERE row spec |
| `MenuSeparator` | `src/components/menu/MenuSeparator.vue` | none | none | none | `.sep` |
| `MenuGroupLabel` | `src/components/menu/MenuGroupLabel.vue` | `label: string` | none | none | `.group` (Pack / Distribute / Multi-select only) |
| `KbdRow` | `src/components/menu/KbdRow.vue` | `keys: string[]` (e.g., `['⌘', 'Z']` or `['⇧', '⌘', 'F']`) | none | none | Renders macOS glyph order ⌃ → ⌥ → ⇧ → ⌘ → letter; each glyph in its own `<kbd class="glyph">` per LOCK HERE |

#### 6.4.2 Context-menu components

| Component | File | Props | Slots | Emits | Hi-fi origin |
|---|---|---|---|---|---|
| `ContextMenuShell` | `src/components/context-menu/ContextMenuShell.vue` | `surface: 'canvas' \| 'empty-canvas' \| 'layer-row' \| 'page-row' \| 'asset-row' \| 'frame' \| 'overflow-dots'`; `triggerEvent: MouseEvent` (for positioning) | none | `close`, `action` (id) | Reka `DropdownMenu` with `modal=false`; reads items from `useContextMenu(surface).items` |
| `OverflowDots` | `src/components/context-menu/OverflowDots.vue` | none | none | none | Inspector `•••` button — mounted from Cluster 06; opens `ContextMenuShell` with `surface='overflow-dots'` |

#### 6.4.3 Find overlay

| Component | File | Props | Slots | Emits | Hi-fi origin |
|---|---|---|---|---|---|
| `FindOverlay` | `src/components/overlay/FindOverlay.vue` | none | none | none | 14.1 / .2 / .3 / .4. Mounted in canvas chrome (Cluster 06 mount point). Reactively reads `useFindStore`. Position fixed: `top: 16px; left: 50%; transform: translateX(-50%)`. Esc handler bound globally |
| `FindHighlightCanvasExtension` | `src/canvas-extensions/find-highlight/index.ts` | (canvas-extension contract per existing `canvas-extensions/` pattern) | n/a | n/a | DOM-positioned overlay above the CanvasKit surface. Draws current-match rect (2 px `--accent` outline + `--accent-soft` fill); other-matches rect (`--accent-soft` fill only). Subscribes to `useFindStore.hits` + `useFindStore.currentIndex` + `editor.graph` bbox lookup. Per Q4 — uses public `FigmaAPI` only, no engine extension hooks |

#### 6.4.4 Keyboard shortcuts dialog

| Component | File | Props | Slots | Emits | Hi-fi origin |
|---|---|---|---|---|---|
| `KeyboardShortcutsDialog` | `src/components/dialog/KeyboardShortcutsDialog.vue` | `open: boolean` (v-model) | none | `update:open` | Cluster 11 `<KovaModal>` size `lg` (720 px wide); category tabs (`useShortcutsStore.visibleCategories`); search filter input (debounced 200 ms); row component composes `<MenuItem>` shell |
| `ShortcutRow` | `src/components/dialog/ShortcutRow.vue` | `shortcut: Shortcut` | none | none | Label left; `<KbdRow>` right |

#### 6.4.5 Trash-confirm modal (CROSS-CUT — Cluster 09 ships)

This PRD does not ship `<TrashConfirmModal>`. Cluster 09 ships `<TrashConfirmModal>` driven by `useConfirm()` + `<KovaModal>` per B13.1 / .2 / .3.

### 6.5 Drag-and-drop handlers

N/A for this cluster (drag-drop semantics are Cluster 05; this PRD's right-click menus invoke existing actions, no drag interactions originate here).

---

## 7. Tool layer / canvas-engine touches

> Per CLAUDE.md `packages/core/` is read-only. This PRD touches **zero** `packages/core/` files. All engine integration is via the existing **public `FigmaAPI`** + the existing **canvas-extension pattern** (per Q4: zero engine extension hooks; canvas-extensions work via external Pinia + public FigmaAPI only).

### 7.1 Engine API consumers (read-only consumers)

| Action | Engine API consumed | Notes |
|---|---|---|
| Object menu Group / Ungroup / Frame selection | `editor.ts.group()`, `editor.ts.ungroup()`, `editor.ts.frameSelection()` | Existing methods |
| Bring forward / Send backward / Bring to front / Send to back | `editor.ts.reorderChildWithUndo(direction, magnitude)` | Existing |
| Rotate 90° L/R/180° + Flip H/V | `editor.ts.commitRotation(angle)` + `editor.ts.commitFlip(axis)` (new wrappers if not exist — keep in `src/actions/` outside core) | If wrappers don't exist, write them at `src/actions/transform-actions.ts` as thin wrappers calling `commitNodeUpdate` |
| Use as mask (⌃⌘M) | Toggles `node.isMask` field via `editor.ts.commitNodeUpdate(nodeId, { isMask: !node.isMask })`. Renderer compositing lives in Cluster 07b | Per Q2 — `isMask` already in core (scene-graph.ts:298–299) |
| Boolean operations | `figma.booleanOperation(op, selectedNodes)` from existing `packages/core/figma-api.ts` per Q3 #14. Action handlers wrap and push undo entry | Multi-select-gated by `useShortcutsStore` guard fn |
| Lock-unlock / Show-hide | `editor.ts.toggleLock(nodeId)`, `editor.ts.toggleVisibility(nodeId)` | Existing |
| Rename (inline) | Reuse `use-inline-rename.ts` (existing). Right-click → starts inline rename on the row | Existing |
| Delete | `editor.ts.deleteSelected()` — gated by `useConfirm` when irreversible (locked descendants, multi-page references) | Existing |
| Copy as PNG | `editor.ts.renderExportImage(nodeIds, 'png')` → `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])` | Existing render + browser Clipboard API; Tauri parity verified via `window.__TAURI__` feature check |
| Copy / Paste / Cut / Duplicate (⌘D) / Paste to replace (⇧⌘R) | `editor.ts.clipboardHtml` slot + `editor.ts.pasteFromHTML()` + duplicate helper | Existing — Q23 expands to property-clipboard via `usePropertyClipboard` (see below) |
| Copy properties / Paste properties (⌥⌘C / ⌥⌘V) | NEW `usePropertyClipboard` composable extends `editor.ts.clipboardHtml` with a structured `CopyablePropertySet` payload: `{ fills?: Paint[]; strokes?: Paint[]; strokeWeight?: number; strokeAlign?: 'inside' \| 'center' \| 'outside'; effects?: Effect[]; cornerRadius?: number \| number[]; blendMode?: BlendMode; opacity?: number; }`. Q23 full-set (better than Figma's stroke-partial). Paste: `editor.ts.commitNodeUpdate` per node; mass-skip surfaces dismissable toast "Some properties don't apply to this layer type." | Composable lives at `src/composables/use-property-clipboard.ts` |
| Pick color (⌃C right-click variant) | Reuses Eyedropper canvas-extension's pixel-read path (Cluster 07b). Right-click variant pre-targets the right-clicked object's bbox bounds; copies hex to clipboard. The standalone Eyedropper tool (toolbar tool — Cluster 06) does the full canvas-only sample | Cluster 07b consumer |
| Find highlight overlay | `editor.ts.graph` traversal + `editor.ts.flashNodes()` + `editor.ts.select()` (when current match changes) | Existing |
| Number-keys-for-opacity (1–0 / 00) | `editor.ts.updateNodeWithUndo(nodeId, { opacity: pct })` per selected layer | Existing |
| Round to pixel | New `editor.ts` action **or** wrapper `src/actions/round-to-pixel.ts` calling `editor.ts.commitMove + commitResize + updateNodeWithUndo` with floor/round arithmetic on x/y/w/h | If `editor.ts.roundToPixel` exists, use it; otherwise wrapper |
| Pack horizontal/vertical + Distribute (8 variants) | Wrappers at `src/actions/layout-actions.ts` (new file outside core); call `editor.ts.commitMove` per sibling | New thin wrappers — no engine touch |
| Show/Hide UI (⌘\) / Minimize UI (⇧⌘\) | `useEditorStore.showUI` boolean toggle | Existing |
| Show ruler / layout guide / pixel grid (View menu + canvas right-click on empty area) | Bind to `usePreferencesStore.prefs.view.*` (Layer 1) via Cluster 12 store; canvas-extension overlays react | Cluster 07b ships the overlays; this PRD wires the toggles |

### 7.2 Canvas-extension additions

| Extension | File | Pattern | Notes |
|---|---|---|---|
| Find highlight | `src/canvas-extensions/find-highlight/index.ts` + DOM-overlay sibling component | DOM-positioned overlay above CanvasKit surface (per Q4 — no engine hook). Subscribes to `useFindStore` + computes node bbox via `editor.graph`. Renders per-match `<div>` rects positioned in canvas coords (transformed via `editor.canvasToScreen`) | Cluster 07b overlay bucket lists "Find highlight" — implementation responsibility split: PRD 08 owns the **data source** (find composable + store + algorithm), PRD 07b owns the **overlay rendering primitive**; PRD 08 mounts the find-highlight extension at canvas init |

No `packages/core/` modifications. No scene-graph extensions. No NodeType additions. No renderer changes.

---

## 8. Acceptance criteria

Every line is testable in code or browser. No "feels right." Engineers verify each before founder review.

### 8.1 Main menu + submenus

- [ ] Click logo trigger → `MainMenuPopover` opens flush below logo, left-aligned, 8 px below top bar; root popover shows 8 entries in B1.1 order (Vector NOT rendered per B1.10)
- [ ] Hover any has-sub root item → sub-popover anchors 22 px right of root menu, top edge 4 px below parent row top
- [ ] Hover-out + delay 200 ms with no movement → sub-popover stays open (Reka default); clicking root menu's separator area or pressing Esc → closes all
- [ ] File submenu shows New design / Place image… / Export… / sep / Save to version history (⌥⌘S) / Show version history / sep / Move to trash (destructive coloring)
- [ ] Edit submenu Copy as ▶ → opens sub-of-sub with single "Copy as PNG"; Edit submenu min-width 280 px verified
- [ ] View submenu Panels ▶ → opens sub-of-sub with two checkable rows "Left visible" / "Right visible"; persist per-canvas Yjs awareness (Cluster 09 sync)
- [ ] View submenu "Layout guides" (⇧G) checkable row renders **checked by default** (default-ON per Q24 + Figma)
- [ ] View submenu "Pixel grid" (⇧') checkable row renders **checked by default** (default-ON per Figma — founder lock 2026-05-17); toggle persists via `usePreferencesStore.prefs.view.pixelGrid` (Layer 1 cross-device); **NOT Phase-2-disabled — activated MVP** with Cluster 07b overlay primitive
- [ ] View submenu "Rulers" (⇧R) checkable row renders **checked by default** (default-ON per Figma); toggle persists via `usePreferencesStore.prefs.view.rulers` (Layer 1)
- [ ] View submenu "Show slices" / "Mask outlines" / "Frame outlines" checkable rows render **UNchecked by default** (default-OFF per Figma — founder lock 2026-05-17); each toggle persists Layer 1 cross-device
- [ ] View submenu "Outlines ▶" row → opens sub-of-sub with single item "Show outlines" (⇧O) checkable, **default-OFF**; toggle flips canvas to wireframe render mode (no fills, no images, edges only); persists via `usePreferencesStore.prefs.view.wireframeMode` (Layer 1); Cluster 07b ships engine wireframe render primitive — this PRD blocks if Cluster 07b not ready (acceptance row marks "wireframe-mode dependency on Cluster 07b")
- [ ] View submenu "Show/Hide UI" (⌘\) row renders **checked by default** (chrome visible); toggle hides topbar + left panel + right panel + bottom toolbar; state lives in `useUIStateStore.uiVisible` (Cluster 12 — Layer 2 per-device or ephemeral; reload resets to visible per Figma parity)
- [ ] View submenu "Minimize UI" (⇧⌘\) row click → reduces topbar height + collapses panel widths to icon-only (existing Cluster 06 chrome size variants)
- [ ] View submenu does **NOT render** Previous/Next page items (removed MVP per founder Q3 2026-05-17 — nav via Pages list)
- [ ] View submenu does **NOT render** Comments / Annotations / Property labels / Multiplayer cursors / Pixel preview / Switch to Draw / Switch to Dev Mode / Memory usage (out of MVP scope — no real-time collab + no annotation system)
- [ ] Object submenu on single-select → Boolean operations row renders `.disabled` with tooltip "Select 2+ layers"
- [ ] Object submenu on multi-select ≥2 → Boolean operations row enabled; hovering opens Boolean ops sub-of-sub showing Union (⌘⌥U) / Subtract (⌘⌥S) / Intersect (⌘⌥I) / Exclude (⌘⌥X) with `Multi-select only` group label
- [ ] Object submenu "Use as mask" row carries `⌃⌘M` kbd-row (control-cmd-M, not plain ⌘M)
- [ ] Text submenu Case ▶ → opens sub-of-sub showing 5 rows as radio group; only one checked at a time; "As typed" default
- [ ] Text submenu "Show text suggestions" row renders disabled with Phase 2 pill
- [ ] Arrange submenu renders 3 group labels (Pack / Distribute spacing / Distribute edges) at correct positions; 8 distribute variants present; only spacing rows carry kbd glyphs (`^⌥H` / `^⌥V`)
- [ ] Preferences submenu shows single item "Accessibility settings…"; click → opens Cluster 12 `<AccessibilityModal>` (A8.3) via emit
- [ ] Help & account submenu shows Help / Keyboard shortcuts (`⇧⌘?`) / Log out — no other items duplicating avatar dropdown per B1.9 annotation
- [ ] Help item click → `mailto:support@kova.app` opens (MVP); Phase-2 flag flips to external URL
- [ ] Keyboard shortcuts item click → `KeyboardShortcutsDialog` opens (same as global `⇧⌘?` shortcut)
- [ ] Log out item click → `useAuthStore.signOut()` invoked → user routed to `/login`

### 8.2 File-name dropdown

- [ ] Click file-name region (text + chevron) in top chrome → `FileNameDropdown` opens left-aligned to file-name text, 4 px below chrome, min-width 280 px
- [ ] Dropdown shows 5 items: Rename / Duplicate / sep / Save to version history (⌥⌘S) / Show version history / sep / Export… (⇧⌘E)
- [ ] **NO "Move to trash" item rendered** (verified by DOM-grep test) per founder 2026-05-09
- [ ] Click Rename → `use-inline-rename.ts` activates on the file-name region; popover closes immediately
- [ ] Click Duplicate → `useCanvasesStore.duplicate(canvasId)` invoked → new canvas opened in new tab; no confirmation modal
- [ ] Click Export… → opens existing Export modal (Cluster 06 / 07b)
- [ ] Click Save to version history → Cluster 09 snapshot save invoked (A8.1 dialog opens)
- [ ] Click Show version history → Cluster 09 timeline panel replaces inspector

### 8.3 Right-click context menus (Q18)

- [ ] Right-click on a selected canvas node → `ContextMenuShell` opens with `surface='canvas'`; renders **full set** items (12–20 per §2.1)
- [ ] Right-click on an unselected node → node auto-selects, then menu opens
- [ ] Right-click on inspector `•••` button → menu opens with `surface='overflow-dots'`; renders **compact subset** (5–7 items per Q18)
- [ ] Compact subset = strict subset of full set (no item appears in compact that isn't in full); verified by test enumerating both arrays and asserting `compact ⊆ full`
- [ ] Right-click on canvas empty area → menu opens with `surface='empty-canvas'`; renders **12 items per Figma-full menu (founder lock 2026-05-17)**: Paste here / Paste to replace (⇧⌘R) / sep / Select all (⌘A) / Select inverse (⇧⌘A) / sep / Zoom to 100% (⌘0) / Zoom to fit (⇧1) / Zoom to selection (⇧2) / sep / Pixel grid (checkable, default-ON) / Layout guides (checkable, default-ON) / Rulers (checkable, default-ON) / sep / Find (⌘F)
- [ ] Paste here uses cursor-position from `e.clientX/Y` → converted to canvas coords via `editor.canvasToScreen` inverse; pasted nodes positioned at cursor
- [ ] Paste to replace with no selection → silent no-op (no toast); with selection → existing selected nodes replaced by clipboard contents
- [ ] All 3 Zoom items invoke existing `editor.ts` zoom methods (`zoomTo100`, `zoomToFit`, `zoomToSelection`)
- [ ] All 3 view-toggle checkable rows read/write via `usePreferencesStore.prefs.view.{pixelGrid, layoutGuides, rulers}` (Layer 1 cross-device per Q5)
- [ ] Find row click → invokes `useFindStore.open()` (same path as ⌘F shortcut)
- [ ] Right-click on Page row → menu opens with `surface='page-row'`; renders Duplicate / Rename / Delete (destructive, useConfirm) / Move up / Move down
- [ ] **Delete page on the only page → menu row renders `.disabled` with hover-tooltip "Cannot delete the last page" (founder lock 2026-05-17 — match Figma exactly). No click handler, no useConfirm invocation.** Tooltip lives in `useObjectActions` disabled-reason field; rendered by `<MenuItem>` `.disabled` variant
- [ ] Right-click on Layer row → menu opens with `surface='layer-row'`; renders Scroll to layer / Reveal in Pages (Phase-2 disabled) / Lock-Unlock / Show-Hide / Rename / Delete
- [ ] Right-click on a Brand-asset row → menu opens with `surface='asset-row'` and renders **Cluster 05 dispatch items** (shell verified open; items per Cluster 05 PRD)
- [ ] **Right-click on Brand card (active state, `brand.archived_at === null`) → `useContextMenu('brand-card', { brand })` opens with 3 items: Rename / Archive / Delete (founder lock 2026-05-17 — B12 archived Brands page MVP)**
- [ ] **Right-click on Brand card (archived state, `brand.archived_at !== null`) → same composable opens with 2 items: Restore / Delete (founder lock 2026-05-17)**
- [ ] Brand-card Archive item click → opens B12.1 Archive modal (cross-cut PRD 03 owns modal + RPC)
- [ ] Brand-card Restore item click → opens B12.3 Restore modal (cross-cut PRD 03)
- [ ] Brand-card Delete item click (from either state) → opens B12.4 Delete modal (cross-cut PRD 03 — destructive, useConfirm typed-confirm)
- [ ] Brand-card Rename item click → activates inline rename on the card title (PRD 03 owns the inline-rename composable; this PRD dispatches to it)
- [ ] State branch test: brand toggled from active → archived → menu items recompute (reactive to `brand.archived_at`); verified via unit test mutating `brand.archived_at` Ref
- [ ] Esc closes any open context menu; click-outside closes

### 8.4 Find overlay

- [ ] `⌘F` (when canvas active, NOT inside a text-edit) → opens `FindOverlay` floating at top-of-canvas (`top: 16px; left: 50%; transform: translateX(-50%)`)
- [ ] Empty input → placeholder "Find on canvas" visible; prev/next disabled (`--ink-4`); close (`x`) active
- [ ] Type query → after 150 ms debounce, `useFindStore.hits` populates by searching 4 fields simultaneously (TEXT content / layer names / frame names / page names)
- [ ] Hits ≥1 → counter shows "1 of N"; prev/next active; "N results" meta visible; current match (index 0) gets 2 px `--accent` outline + `--accent-soft` fill on canvas; other matches `--accent-soft` fill only
- [ ] Layer-tree selection follows current match (single layer selected)
- [ ] `⇧⌘F` cycles to next match (wraps); `⇧⌘D` cycles to previous (wraps); counter updates
- [ ] Hits === 0 → counter hidden; "No results" meta replaces it; prev/next disabled; no toast
- [ ] Esc OR close button → overlay dismisses; `useFindStore.close()` clears query + hits; canvas highlights removed
- [ ] When current match is on a different page than active, navigating to it switches the page first then selects + centers viewport on the node (existing `editor.ts.switchPage` + `flashNodes`)
- [ ] Text-content matches store `matchStart` + `matchEnd` character offsets (per `FindHit` interface) — not surfaced visually in MVP but available for future range-highlight

### 8.5 Keyboard shortcuts dialog (Q25)

- [ ] `⇧⌘?` (global, when canvas active and not inside text-edit) → opens `KeyboardShortcutsDialog`
- [ ] Help & account submenu "Keyboard shortcuts" item → opens same dialog
- [ ] Dialog renders **11 category tabs** in this order: Essentials / Tools / View / Zoom / Text / Shape / Selection / Cursor / Edit / Transform / Arrange
- [ ] **Components and Prototyping categories NOT rendered** as tabs (registry has no non-deferred entries — `visibleCategories` excludes them)
- [ ] Each tab body renders rows: label left, `<KbdRow>` right; kbd glyph order ⌃ → ⌥ → ⇧ → ⌘ → letter; each glyph in its own `<kbd>`
- [ ] Search filter input (debounced 200 ms) filters rows across all categories; "No matches" empty state with neutral copy
- [ ] Dialog opens via `<KovaModal>` size `lg` (720 px); Esc / backdrop click / `×` button closes; `update:open` emit drives parent state
- [ ] Pressing a shortcut visible in the dialog actually triggers its action (sanity-checked in E2E by enumerating registry and synthesizing keydown for each)

### 8.6 Number-keys-for-opacity (Figma-exact)

- [ ] With ≥1 layer selected, pressing `1` → all selected layers' `opacity` set to `0.1` (10%); pressing `9` → `0.9`; pressing `0` → `1.0` (100%)
- [ ] Pressing `0` then `0` within 500 ms → `opacity: 0.0` (0%) — two-digit window
- [ ] Pressing `4` then `3` within 500 ms → `opacity: 0.43` (43%)
- [ ] Pressing `4` then 600 ms idle then `3` → first applies 0.4, then 0.3 (two-digit window expired)
- [ ] Number keys inside a text-edit do NOT trigger opacity (typed into text content) — text-edit guard in `use-keyboard.ts`
- [ ] Each opacity change pushes a single undo entry (via `editor.ts.updateNodeWithUndo`); two-digit window coalesces to one undo entry
- [ ] No preference UI (Figma-exact); always-on; no `usePreferencesStore` toggle

### 8.7 Recent colors (Q5 Layer 2)

- [ ] When color picker (Cluster 06) commits a color to a fill/stroke, the hex is pushed to `useUIStateStore.recentColors` (Cluster 12 store, localStorage-backed via VueUse)
- [ ] Ring buffer caps at 24 entries; oldest evicted (FIFO)
- [ ] Same hex committed twice → not duplicated (move-to-front, no dup)
- [ ] Recent-colors row in color picker reads from store; reactive (new commit appears immediately in row without close-reopen)
- [ ] Page reload → recent colors persist
- [ ] Clearing browser data → recent colors reset to empty (acceptable Layer-2 loss per Q5 design)

### 8.8 useConfirm canvas specializations

- [ ] Delete page (right-click on Page row → Delete) → useConfirm shows modal: "Delete page '<name>'?" / body "All layers on this page will be lost. This can't be undone." / confirm label "Delete page" / destructive variant; on confirm → `useEditorStore.deletePage(pageId)`
- [ ] Delete last page → menu row pre-emptively disabled with hover-tooltip "Cannot delete the last page" (Figma-exact per founder lock 2026-05-17); useConfirm never invoked — guarded at the menu-item level via `useObjectActions` `disabled` + `disabledReason`
- [ ] Delete with locked descendants → useConfirm shows additional warning: "N locked layer(s) will also be deleted" appended to body
- [ ] Object Delete (⌫) on multi-select containing locked layers → useConfirm shows "Delete N layers?" + lock-count warning; confirm → all deleted with single undo entry
- [ ] Paste properties on mixed-type selection → mass-skip toast: "Some properties don't apply to this layer type" (one-time dismissable, stored in `useUIStateStore.dismissedToasts`)
- [ ] Trash-confirm cross-cut: verify `<TrashConfirmModal>` (Cluster 09) is reached ONLY from dashboard right-click (Cluster 02 trigger); canvas-side has no entry point

### 8.9 Shortcut registry integrity

- [ ] At app boot, `useShortcutsStore.registry` is populated by `useShortcutRegistration` calls from this PRD + Cluster 07b (boolean ops) + Cluster 09 (⌥⌘S) + Cluster 06 (tools V/F/R/O/P/T/C)
- [ ] No two registered shortcuts share the same `keys` string (test asserts uniqueness across registry)
- [ ] `use-keyboard.ts` only dispatches via registry — no remaining inline switch (verified by grep: zero `switch (e.code)` blocks in `use-keyboard.ts` post-refactor)
- [ ] Text-edit guard: when `useEditorStore.editingTextNodeId !== null`, only `context === 'text-edit'` shortcuts fire (e.g., text-formatting shortcuts work; canvas shortcuts don't)
- [ ] Global shortcuts (`⇧⌘?`, `⌘F`) fire even outside text-edit context

### 8.10 Reka shell visual integrity

- [ ] Every popover (12 in §3.1 + §3.2, plus all context menus) uses the SAME Reka shell: bg `--rail`, 1 px `--line` border, 8 px radius, 4 px padding, the locked shadow stack
- [ ] Item rows are 26 px tall, 10 px left / 8 px right padding, 5 px radius — no popover overrides
- [ ] kbd-row right-aligned, glyphs in macOS canonical order, color `--ink-3` idle / `--ink-2` hover
- [ ] Destructive rows use `--warn` ink + `--warn-soft` hover bg (warn token degrades to neutral until status palette ships — design.md §1.1 ban 12 reconciled)
- [ ] Visual regression test (Playwright screenshot) on 3 representative popovers: Edit submenu (densest) / Object submenu (most categories) / canvas right-click (compact subset)

---

## 9. Test plan

### 9.1 Unit tests (`bun run test:unit`)

| Target | File | Coverage |
|---|---|---|
| `useShortcutsStore` register/unregister/byKeys/byCategory/visibleCategories | `tests/stores/shortcuts.test.ts` | Registry duplicate detection, deferred filtering, category ordering, lookup correctness |
| `useFindStore` open/close/next/previous/setHits cycling | `tests/stores/find.test.ts` | Index wrap-around (forward + backward), reset-on-close, empty-hits guard |
| `useMenuStore` open/openSub/openSubSub/close transitions | `tests/stores/menu.test.ts` | Mutual exclusivity (one root + one sub + one sub-of-sub), close clears all three |
| `useObjectActions` compact vs full action set composition + brand-card branches | `tests/composables/use-object-actions.test.ts` | `compact ⊆ full`; multi-select gate on Boolean ops; destructive flag on Delete; **`brandCardActiveActions = [Rename, Archive, Delete]` (3 items, founder lock 2026-05-17)**; **`brandCardArchivedActions = [Restore, Delete]` (2 items)**; toggling `brand.archived_at` reactively recomputes both arrays |
| `useContextMenu` dispatch table per surface | `tests/composables/use-context-menu.test.ts` | All 8 surfaces return non-empty items; surface='asset-row' delegates to Cluster 05; **surface='brand-card' branches on `ctx.brand.archived_at` to active vs archived action set** |
| `useFind` 4-field search algorithm | `tests/composables/use-find.test.ts` | Match TEXT content (case-insensitive substring); match layer names; match frame names; match page names; cross-page hits ordered by (page-index, document-order); empty query returns empty hits; debounce timing (150 ms) |
| `usePropertyClipboard` copy/paste per Q23 property set | `tests/composables/use-property-clipboard.test.ts` | Full property set (fills + strokes complete + effects + corner radius + blend + opacity); incompatible-prop silent skip; mass-skip detection |
| `use-keyboard.ts` registry dispatch (post-refactor) | `tests/composables/use-keyboard.test.ts` | byKeys lookup; text-edit guard; number-keys-for-opacity single + two-digit (4-3 within 500 ms = 43%); two-digit timeout edge (4 then 600 ms gap then 3 = 0.4 then 0.3); coalesced undo |
| `<MenuItem>` render variants | `tests/components/menu/MenuItem.test.ts` | Default / hovered / checked / disabled+phase2 / destructive / has-sub / kbd-row order |
| `<KbdRow>` glyph order rendering | `tests/components/menu/KbdRow.test.ts` | macOS canonical order ⌃ → ⌥ → ⇧ → ⌘ → letter regardless of input order; each glyph in own `<kbd>` |
| `<KeyboardShortcutsDialog>` category tab rendering | `tests/components/dialog/KeyboardShortcutsDialog.test.ts` | 11 visible tabs / 0 DEFER tabs; search filter cross-category; empty-state "No matches" |
| `<FindOverlay>` state rendering | `tests/components/overlay/FindOverlay.test.ts` | Empty / populated / no-results states; counter / meta / disabled buttons; Esc handler |

Coverage target: ≥80% lines per CLAUDE.md global testing rule; ≥90% on shortcut-registry + find algorithm because they're load-bearing for every downstream cluster.

### 9.2 Integration tests (against existing `editor.ts` + Pinia stores)

| Scenario | Notes |
|---|---|
| Open main menu → File ▶ → Save to version history | Verify `editor.ts.saveFigFile` or Cluster 09 snapshot RPC invoked (mock RPC layer) |
| Open Object ▶ on multi-select ≥2 → Boolean ops ▶ → Union | Verify `figma.booleanOperation('union', selection)` invoked with correct nodes; undo entry pushed |
| Right-click on layer row → Delete → useConfirm → confirm | Verify `editor.ts.deleteSelected()` invoked; layer removed from `editor.graph` |
| Right-click on page row → Delete page → confirm | Verify `editor.ts.deletePage(pageId)` invoked; current page switches to nearest sibling |
| ⌘F → type "button" → ⇧⌘F | Verify `useFindStore.hits` populated correctly across 4 fields; `currentIndex` increments; `editor.ts.select` + `flashNodes` invoked per cycle |
| Number key with multi-select → opacity update | Verify each selected layer's opacity property updated; single undo entry coalesces multi-layer change |
| Copy properties → Paste properties on mixed-type selection | Verify compatible props applied; incompatible silently skipped; mass-skip toast fired once |
| Recent colors persistence | Commit color → verify `useUIStateStore.recentColors[0]` updated; reload localStorage → verify persisted |

### 9.3 E2E tests (Playwright — `bun run test`)

| Flow | File |
|---|---|
| Full menu navigation: open main → all 8 submenus → all sub-of-subs | `tests/e2e/canvas-menus.spec.ts` |
| File-name dropdown rename → inline rename activated | `tests/e2e/canvas-menus.spec.ts` |
| Right-click on canvas object → Delete → confirm → layer gone | `tests/e2e/canvas-context-menu.spec.ts` |
| Find flow: ⌘F → type query → cycle prev/next → Esc | `tests/e2e/find-overlay.spec.ts` |
| Find no-results state visible | `tests/e2e/find-overlay.spec.ts` |
| Keyboard shortcuts dialog: ⇧⌘? → search "undo" → row found in Edit tab | `tests/e2e/shortcuts-dialog.spec.ts` |
| Components and Prototyping tabs NOT visible in dialog | `tests/e2e/shortcuts-dialog.spec.ts` |
| Number keys for opacity: select layer → press 1 → opacity is 10% (inspector shows "10") | `tests/e2e/opacity-shortcuts.spec.ts` |
| Two-digit opacity: 4 then 3 within 500 ms → opacity is 43% | `tests/e2e/opacity-shortcuts.spec.ts` |
| Recent colors persistence across reload | `tests/e2e/recent-colors.spec.ts` |
| Visual regression: Edit submenu / Object submenu / canvas right-click (screenshot diff) | `tests/e2e/menu-visual-regression.spec.ts` |
| Trash-confirm cross-cut: verify NO trash item in canvas file-name dropdown | `tests/e2e/canvas-menus.spec.ts` (assertion on DOM after opening B1.11) |
| Layout-guides default-ON overlay renders on canvas (visual check via canvas screenshot — Cluster 07b ships the overlay; this PRD's responsibility is the View menu checked-state) | `tests/e2e/view-toggles.spec.ts` |

### 9.4 Manual QA (founder browser smoke per `feedback_browser_smoke_test_before_done`)

Engineer runs against `bun run dev` localhost:1420; founder verifies before approval to ship:

- [ ] Open any canvas → click logo → main menu shows 8 items in correct order; Vector absent; submenus open on hover with correct anchor
- [ ] Click every menu item that has a non-trivial action (Save to version history, Show version history, Boolean ops Union, Use as mask, Copy as PNG) and confirm action fires
- [ ] Right-click on canvas → context menu items correct; right-click on inspector `•••` → compact subset; right-click on page row → Delete page → confirm modal opens
- [ ] `⌘F` → Find opens at top-of-canvas; type "button" → matches highlight; cycle via `⇧⌘F` / `⇧⌘D` — current match outline visible
- [ ] `⇧⌘?` → shortcuts dialog opens; verify 11 tabs (no Components, no Prototyping); search for "undo" returns Edit > Undo row with `⌘ Z` kbd
- [ ] Select a layer → press `1` → opacity = 10% in inspector; press `0` then `0` quickly → opacity = 0%
- [ ] Open color picker → commit colors A, B, C → close → reopen → recent row shows C, B, A
- [ ] Reload browser → recent colors still C, B, A
- [ ] Verify NO "Move to trash" in canvas file-name dropdown (B1.11 / 13.2)
- [ ] Verify layout-guides default-ON (red 10% guide visible on a frame that has `layoutGrids` defined)
- [ ] Verify all popovers render with consistent Reka shell (no drift in radius / padding / shadow)
- [ ] Verify kbd glyphs render in macOS canonical order in every kbd-row across every menu
- [ ] Test viewport: 1440 design width (canonical); 1280 (small laptop) — popovers stay anchored, don't clip

### 9.5 Pre-commit + CI verifications

- [ ] `bun run check` (oxlint + type-check) green
- [ ] `bun run format` green
- [ ] `bun run test:unit` green ≥80% coverage on new files
- [ ] `bun run test` Playwright green
- [ ] `bun run test:dupes` jscpd < 3% (no copy-paste across menu components — abstract via `<MenuItem>` primitive)

---

## 10. Rollout phasing

### Phase A — initial deploy (Wave 5 close)

- All Pinia stores 6.2 shipped
- All composables 6.3 shipped; `use-keyboard.ts` refactor complete (inline switch → registry consumer)
- All components 6.4 shipped (menus, context-menu shells, find overlay, shortcuts dialog)
- Canvas-extension `find-highlight` mounted at canvas init
- Recent-colors wired into Cluster 06 color picker
- Number-keys-for-opacity active
- Layout guides default-ON View menu state correct
- `bun run test:unit` ≥80% coverage on new files
- E2E pack green in CI
- Visual-regression baselines captured for 3 representative popovers + find overlay + shortcuts dialog

### Phase B — Phase-2 reactivations (post-MVP)

- Vector ▶ trigger reinstated when Vector tooling returns
- Show pixel grid View toggle re-enabled
- Show text suggestions Text toggle re-enabled
- Reveal in Pages layer right-click item re-enabled
- Help item routes to external Mintlify/GitBook URL (replaces `mailto:`)
- Snap-toggle preference rows added to View menu (Cluster 12 ships the preference UI)
- Custom keybinding override UI ships (Cluster 12)
- Components / Prototyping shortcut categories rendered when those features ship

### Feature flags (per `00d` 2.B 10 default — hard-coded constants for MVP)

| Flag | Default | Toggle condition |
|---|---|---|
| `HELP_EXTERNAL_URL_ENABLED` | `false` | Flip when external docs site ships (Phase 2) |
| `VECTOR_MENU_ENABLED` | `false` | Flip when Vector tooling re-enters scope (Phase 2) |
| ~~`PIXEL_GRID_TOGGLE_ENABLED`~~ REMOVED 2026-05-17 | n/a | Pixel grid active MVP per founder Figma-parity lock — no flag needed |
| `TEXT_SUGGESTIONS_ENABLED` | `false` | Flip when AI text-suggestions ship (Cluster 10 Phase 2) |
| `REVEAL_IN_PAGES_ENABLED` | `false` | Flip when feature ships (Phase 2) |
| `OPACITY_TWO_DIGIT_WINDOW_MS` | `500` | Adjustable if usability data shows different optimum |
| `FIND_DEBOUNCE_MS` | `150` | Adjustable based on perf profiling on large layer trees |

---

## 11. Cross-cuts to other PRDs

| Other PRD | What we depend on (from them) | What they depend on us for |
|---|---|---|
| **11 — Shared UI Infrastructure** | `useConfirm()` primitive + `<ConfirmDialog>` shell + `<KovaModal>` shell + toast system + `useToast()` composable | Theme detection meta convention (we inherit `meta.theme = 'dark'`; they own the runtime swap) |
| **06 — Canvas Editor Core Chrome** | Topbar layout incl. logo trigger surface + file-name trigger surface; bottom toolbar; left panel (Pages section + Layers tree + Assets panel rows that host right-click triggers); right panel inspector incl. overflow `•••` button; color picker popover (recent-colors row sink) | `<MainMenuPopover>` mount point; `<FileNameDropdown>` mount point; right-click trigger event wiring on each surface; `<OverflowDots>` button component; `<FindOverlay>` mount point; `<KeyboardShortcutsDialog>` mount point in `<App>` shell |
| **07a — Canvas Engine Core + Renderer** | `figma.booleanOperation()` (Q3 #14) public API; `node.isMask` field (Q2); `editor.ts.commitNodeUpdate` / `commitMove` / `commitResize` / `updateNodeWithUndo` / `flashNodes` / `select` / `switchPage` | None — this PRD does not modify core |
| **07b — Canvas Engine Inspector + Overlays** | Find-highlight overlay rendering primitive (canvas-extension pattern); Layout-guides default-ON overlay; Eyedropper canvas-extension (right-click "Pick color" variant reuses); **Pixel-grid overlay primitive (MVP-active, default-ON per Figma — founder lock 2026-05-17)**; **Rulers overlay primitive (MVP-active, default-ON per Figma)**; **Wireframe render mode primitive (Outlines submenu — default-OFF, toggles to canvas-wide line-art render — NEW dep per founder lock 2026-05-17)**; Frame-outlines / Mask-outlines / Slices overlay primitives (default-OFF, on-toggle render) | Boolean-ops shortcuts (`⌘⌥U/S/I/X`) registered into `useShortcutsStore` at boot; Use-as-mask shortcut (`⌃⌘M`); Outlines wireframe shortcut (`⇧O`); Pixel grid shortcut (`⇧'`); Layout guides shortcut (`⇧G`); Rulers shortcut (`⇧R`); shortcut registry shape for any other overlay-triggering shortcuts they introduce |
| **02 — Onboarding & Dashboard** | Dashboard file-grid right-click trigger surface (Move-to-trash entry point — Cluster 02 owns the trigger, Cluster 09 owns the modal) | None — we explicitly do NOT carry a trash entry in canvas |
| **09 — Version History + Trash** | `canvases.trashed_at` RPC + restore + `<TrashConfirmModal>` + B13 success-toast pattern; Save-to-version-history snapshot RPC (⌥⌘S); Show-version-history panel route | Save-to-version-history shortcut (`⌥⌘S`) registered into `useShortcutsStore`; `useConfirm` consumption pattern for canvas-side destructive items |
| **12 — Settings + User Preferences** | `usePreferencesStore` (Layer 1) reads for View toggles per **founder lock 2026-05-17 (Figma defaults)**: `prefs.view.pixelGrid` (default `true`) / `layoutGuides` (default `true`) / `rulers` (default `true`) / `frameOutlines` (default `false`) / `maskOutlines` (default `false`) / `showSlices` (default `false`) / `wireframeMode` (default `false`); `useUIStateStore` (Layer 2 or ephemeral) reads for `uiVisible` (default `true`, reload-resets), `recentColors`, `dismissedToasts`, `pagesCollapsed`, `layersCollapsed` | Defaults shape (`pixelGrid: true, layoutGuides: true, rulers: true, frameOutlines: false, maskOutlines: false, showSlices: false, wireframeMode: false` — Figma-parity per founder 2026-05-17); Recent-colors consumer pattern documented |
| **05 — Brand Kit + Drag-Drop** | Per-asset items dispatched into our `ContextMenuShell` when `surface='asset-row'` | Right-click shell on asset rows (we ship the shell, they ship the items) |
| **03 — Brand Management** (NEW dep per founder lock 2026-05-17 — B12 archived Brands page promoted to MVP) | B12.1 Archive modal + B12.3 Restore modal + B12.4 Delete modal + the corresponding RPCs / mutations (`brands.archive`, `brands.restore`, `brands.deleteHard`); brand-card inline-rename composable; `Brand` type definition incl. `archived_at: string \| null` field | `useObjectActions().brandCardActiveActions` + `brandCardArchivedActions` arrays; `useContextMenu('brand-card', { brand })` surface dispatcher that branches on `brand.archived_at`; `<ContextMenuShell surface='brand-card' triggerEvent>` mount contract |
| **04 — Account & Stripe Billing** | None at runtime | None |
| **01 — Auth & Identity** | `useAuthStore.signOut()` for Help & account submenu Log out item | None |
| **10 — AI Chat + Memory** | None at runtime | None |

### 11.1 Hygiene rules from `00e §6`

Acknowledged + enforced in this PRD:

- **No live multi-device canvas sync promises** (§6 #2): The View menu Panels ▶ "Left visible" / "Right visible" toggles persist per-canvas via Yjs awareness (Cluster 09 sync). Same-user concurrent edits across devices fall back to last-snapshot-wins on the server per Q6 / `00e §6 #2`. This PRD does NOT promise live multi-device menu state sync.
- **D-3 RoPA disclosure**, **brand-voice guardrail**: N/A in this PRD (Cluster 01 + Cluster 05 own).
- **D-5E staging trigger**: N/A in this PRD (no Edge Functions; no cron; no DB writes that need staging-volume validation).
- **No marketing-site spec**: confirmed — this PRD references zero `/marketing` routes.

---

## 12. Risks + open questions

### 12.1 RISK (Medium) — Find performance on large layer trees

`useFind` traverses `editor.graph` on every query change (after 150 ms debounce). For canvases with thousands of nodes + heavy TEXT content, this can stall the main thread.

**Mitigation:** (1) Debounce 150 ms (configurable via feature flag `FIND_DEBOUNCE_MS`). (2) Cache scene traversal results keyed on `editor.sceneVersion`; invalidate on scene mutation. (3) Use a Web Worker for the search algorithm if main-thread stalls measure >50 ms in profiling. (4) Hard cap on hits at 500 — beyond that, surface "Too many results; refine your query" empty-state. **Status:** documented; not blocking PRD approval; engineers benchmark during implementation and add Worker if needed.

### 12.2 RISK (Low) — Reka DropdownMenu nested submenu depth + keyboard navigation

Reka UI's `DropdownMenu` supports nested submenus, but our 2-level nesting (root → submenu → sub-of-sub for Boolean ops / Case / Copy as / Panels) is at the edge of common patterns. Arrow-key navigation through 3 levels of nesting may not work seamlessly.

**Mitigation:** Engineers verify via Reka docs (`context7`) and the `feedback_verify_with_docs` memory; if Reka's nested-submenu keyboard nav is incomplete, write a thin keyboard handler on top of Reka primitives — do NOT swap out Reka. **Status:** verify during implementation; not a blocker for visual / mouse interaction.

### 12.3 RISK (Low) — `use-keyboard.ts` refactor breaks existing shortcuts

The inline switch in `use-keyboard.ts` likely has shortcut wiring already used by Cluster 06 (tool switching V/F/R/O/P/T/C) and other historical work. Refactoring to consume `useShortcutsStore` must preserve every existing binding.

**Mitigation:** (1) Pre-refactor: enumerate every existing shortcut in `use-keyboard.ts` (grep + audit). (2) Post-refactor: register each into the store under the correct category. (3) E2E test pack covers all known shortcuts before merge. (4) Roll out behind a build-time check (no feature flag — this is internal infra). **Status:** straightforward refactor; engineer flags any drift in PR review.

### 12.4 OPEN QUESTION — Brand-asset right-click items split between Cluster 08 and Cluster 05

Cluster 08 ships the `ContextMenuShell` on asset rows; Cluster 05 ships the items. The dispatch contract needs to be unambiguous: does Cluster 08's `useContextMenu(surface='asset-row')` call a Cluster-05-exposed dispatcher function, or does Cluster 05 register items into our registry?

**Recommendation:** Cluster 05 calls `useShortcutRegistration([...])` at app boot to inject asset items into a per-surface registry (extend `useContextMenu` to accept registered items by surface). This keeps the contract one-directional and matches the existing shortcut-registry pattern. Decided unilaterally per §5 founder-question protocol "Pure naming" rule — confirm during Cluster 05 PRD authoring.

### 12.5 RESOLVED 2026-05-17 — Default View toggle states (Figma-exact)

Founder reviewed Figma View menu screenshot (`main-main-kova-scope/design-system/compressed-figma-canvas-ui/figma-outline-image-reference.png`) and locked Kova to **match Figma defaults exactly**:

- **Default ON:** Pixel grid / Layout guides / Rulers / Show/Hide UI (chrome visible)
- **Default OFF:** Show slices / Mask outlines / Frame outlines / Outlines wireframe submenu

Earlier "All ON" answer corrected by founder mid-session. Hi-fi B1.4 annotation supersedes for the OFF group; Figma supersedes hi-fi for Pixel grid (now activated MVP, not Phase-2-disabled).

Rulers added to View submenu (was previously only in right-click empty area). Outlines wireframe submenu added (new — Cluster 07b ships engine primitive).

### 12.6 RESOLVED 2026-05-17 — Last-page guard (Figma-exact disabled item + tooltip)

Founder locked **match Figma exactly**: when only one page exists, "Delete page" menu item renders `.disabled` with hover-tooltip "Cannot delete the last page". No click handler. No useConfirm invocation.

Per founder lock 2026-05-17, the error-toast alternative (originally recommended in §8.3) is REJECTED. Figma parity wins — cleaner, zero-surprise, no destructive flash. The disabled state's tooltip surfaces the reason on hover, eliminating the discoverability concern. `useObjectActions` returns `disabled: true, disabledReason: 'Cannot delete the last page'` when `pages.length === 1` for the surface.

### 12.7 OPEN QUESTION — Cmd-G vs Cmd-Alt-G for group/frame

Object submenu B1.5 specifies Group `⌘G`, Ungroup `⇧⌘G`, Frame selection `⌥⌘G`. This matches Figma exactly. No question — recorded here for explicit confirmation.

**Status:** Match Figma. Decided per §5 protocol "Pure naming/convention" — no founder question needed.

### 12.8 RISK (Low) — Reka portal nesting + Find overlay z-index

The find overlay is fixed-position above the canvas; Reka popovers portal to body. If the user opens a context menu while the find overlay is open, z-stacking matters.

**Mitigation:** Find overlay z-index `--z-overlay-find: 40`; Reka portal z-index `--z-popover: 50`. Context menu opens above find overlay (correct stacking — user is interacting with the menu now). Closing the menu via Esc does not close find. Documented in design tokens during implementation.

---

## 13. References

### 13.1 03-doc rows covered

- **§2.2 Main menu submenus** (23 rows) — all File / Edit / View / Object / Text / Arrange / Preferences / Help & account submenu items
- **§2.8 Modals / popovers** (10 rows) — Recent colors persistence (1), Confirmation dialogs (1), Keyboard shortcuts dialog (1), Shortcuts dialog content (1), Number keys for opacity (1); 5 others (color-picker swatch row, missing-fonts tooltip, network status indicator, snapshot/save toasts) cross-cut Clusters 06 / 09 / 11
- **§2.10 Context menus & keyboard shortcuts** (28 rows) — Find / Find next / Find previous (3), Copy properties / Paste properties / Pick color / Select none / Select inverse / Paste to replace / Copy as PNG (7), Show ruler / Show layout guide / Show pixel grid (3 — **all 3 active MVP per founder lock 2026-05-17 Figma defaults**, default-ON), Duplicate page / Rename page / Delete page / Move page up / down (5), Scroll to layer / Reveal in Pages (2), Rotate / Lock / Show / Use as mask (4), 4 boolean-op rows (cross-cut Cluster 07b) — total 28 rows, all wired here
- **§3C #7 Right-click context menu shell** — `ContextMenuShell` + `useContextMenu` dispatch table
- **§3C #8 `useConfirm()` composable** — canvas-side catalog of specializations (primitive in Cluster 11)
- **§3C #9 Keyboard shortcut registry** — `useShortcutsStore` + `use-keyboard.ts` refactor
- **§3C #10 Main-menu composable** — `useMainMenu` + `useMenuStore`
- **§3C #11 Find composable + canvas-extension overlay** — `useFind` + `useFindStore` + `find-highlight` canvas-extension

### 13.2 Q-decisions baked in

- **Q5 (Recent colors)** — Layer 2 localStorage allocation per `useUIStateStore.recentColors`; 24-entry ring buffer; per-device; acceptable to lose on browser data clear
- **Q5 (View toggle persistence)** — Layer 1 `users.preferences.view.*` for `pixelGrid / layoutGuides / rulers / frameOutlines / maskOutlines / showSlices / wireframeMode` — sticky workflow prefs sync cross-device
- **Founder lock 2026-05-17 (Figma View menu screenshot — defaults)** — Default ON: `pixelGrid / layoutGuides / rulers`. Default OFF: `frameOutlines / maskOutlines / showSlices / wireframeMode`. Reference image: `main-main-kova-scope/design-system/compressed-figma-canvas-ui/figma-outline-image-reference.png`
- **Founder lock 2026-05-17 (Outlines wireframe submenu)** — Add `View > Outlines ▶ > Show outlines (⇧O)` sub-of-sub. Toggles canvas-wide wireframe render mode. Cluster 07b ships engine primitive. New dep
- **Founder lock 2026-05-17 (Pixel grid activated MVP)** — Was Phase-2 disabled stub. Now active overlay primitive (Cluster 07b ships), default-ON, persists via `prefs.view.pixelGrid`
- **Founder lock 2026-05-17 (Rulers added to View submenu)** — Was only in right-click empty-area menu. Now also in View submenu (⇧R), default-ON
- **Founder lock 2026-05-17 (Show/Hide UI ⌘\ in View submenu)** — Default ON visible; toggle hides chrome; ephemeral or Layer 2 (reload-resets per Figma)
- **Founder lock 2026-05-17 (Previous/Next page DROPPED from View submenu)** — Nav via Pages list + kbd-only; no menu items
- **Founder lock 2026-05-17 (Comments / Annotations / Property labels / Multiplayer cursors / Pixel preview NOT IN MVP)** — No real-time collab + no annotation system + design-tool-meta items irrelevant to email design. Skipped, not rendered as disabled stubs
- **Founder lock 2026-05-17 (Last-page delete = Figma-style disabled item + tooltip)** — `useObjectActions` returns `disabled: true, disabledReason: 'Cannot delete the last page'` when `pages.length === 1`. Menu row renders `.disabled`. No useConfirm. Replaces earlier error-toast spec
- **Founder lock 2026-05-17 (Empty-canvas right-click = Figma full menu, 12 items)** — Paste here / Paste to replace / sep / Select all / Select inverse / sep / Zoom 100% / Zoom to fit / Zoom to selection / sep / Pixel grid / Layout guides / Rulers / sep / Find. Replaces earlier 3-item minimal spec
- **Founder lock 2026-05-17 (B12 archived Brands page promoted to MVP — brand-card right-click)** — `useObjectActions()` extended with `brandCardActiveActions` (Rename / Archive / Delete) + `brandCardArchivedActions` (Restore / Delete). `useContextMenu('brand-card', { brand })` branches on `brand.archived_at !== null`. Modal triggers cross-cut to PRD 03 (B12.1 / B12.3 / B12.4). Reverses prior assumption that archived Brands page was Phase-2; now MVP scope
- **Q18 (Overflow vs canvas right-click)** — `useObjectActions()` returns both `compactActions` (5–7 items for `•••`) and `fullActions` (12–20 items for canvas right-click); compact ⊆ full
- **Q23 (Copy/Paste properties full set)** — `usePropertyClipboard` carries fills + strokes complete (color + opacity + weight + align + dash pattern) + effects + corner radius + blend mode + opacity (better than Figma's stroke-partial); silent-skip incompatible props with mass-skip toast
- **Q24 (Drag-drop semantics — cross-cut acknowledgment)** — drag-drop MIME types live in Cluster 05; this PRD's right-click menus do not initiate drag interactions
- **Q24 (Layout guides default-ON)** — View menu "Show layout guides" row renders `.checked`; engine-side overlay renders by default (Cluster 07b ships the overlay primitive; Q5 Layer 1 default = `true`)
- **Q24 (Number-keys-for-opacity always-on)** — no preference toggle (Figma-exact); two-digit window 500 ms; written into `use-keyboard.ts`
- **Q24 (Snap toggles DEFERRED with default-ON behavior)** — preference UI not in MVP; default snap behavior ships engine-side (Cluster 07b)
- **Q25 (13-category shortcuts dialog taxonomy)** — registry shape supports all 13 categories; Components + Prototyping `deferred: true` and NOT rendered in dialog; 11 visible tabs

### 13.3 Hi-fi files

- `main-main-kova-scope/batch-b/Kova Hi-Fi 08 Top Chrome Menus - Dark.html` — B1.1 root popover, B1.2 File, B1.3 Edit, B1.4 View, B1.5 Object + Boolean ops, B1.6 Text + Case, B1.7 Arrange, B1.8 Preferences, B1.9 Help & account, B1.10 Vector HIDDEN, B1.11 File-name dropdown, LOCK HERE Reka shell, surface table
- `main-main-kova-scope/batch-b/chunk-b1/Kova Hi-Fi 13 Canvas Popovers - Dark.html` — 13.1 File-name dropdown closed, 13.2 File-name dropdown open (Move-to-trash STRIPPED per founder 2026-05-09). Scenes 13.3–13.7 (tool dropdowns Move / Frame / Rectangle / Pen / Comment) are **Cluster 06 cross-cut**, not in this PRD
- `main-main-kova-scope/batch-b/chunk-b1/Kova Hi-Fi 14 Find Overlay - Dark.html` — 14.1 empty, 14.2 populated 1-of-3, 14.3 no-results, 14.4 dismissed (reference)
- `main-main-kova-scope/batch-b/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html` — B13.1 idle, B13.2 CTA hover, B13.3 post-confirm success toast. **Cross-cut Cluster 09; this PRD documents the cross-cut only**

### 13.4 Design system

- `main-main-kova-scope/design-system/design.md` (spec — token vocabulary, component contracts, bans; §3 components include Dropdown / Menu patterns; §5 bans #4 "no left-border accent on selected rows" applies to menu hover styling)
- `main-main-kova-scope/design-system/kova-hifi.css` (canonical dark CSS — every popover + dialog inherits; LOCK HERE locked in `08 Top Chrome Menus`)
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` (vocabulary cheat-sheet — short names used: `--rail`, `--page`, `--line`, `--line-2`, `--fill`, `--fill-2`, `--ink`, `--ink-2`, `--ink-3`, `--ink-4`, `--accent`, `--accent-soft`, `--accent-ink`, `--warn`, `--warn-soft`)
- Source-of-truth visual bar: `main-main-kova-scope/batch-b/Kova Canvas - Final.html` `.kc {}` block (lines 75–502) for canvas chrome where popovers anchor

### 13.5 Audit + verification inputs

- `kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` (master plan; §3 Cluster 08; §5 PRD template; §5.6 ratification log; §6 cross-cuts row "Right-click context-menu shell" + "Keyboard shortcut registry" + "User preferences"; §8 done definition)
- `kova-open-pencil-1/docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md` (operator manual followed for this draft)
- `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md` (§2.A Cluster 08 lines 1684–1763 lifted as base — empty SQL/RLS/Edge Functions/RPCs confirmed; store + composable + component shells lifted)
- `kova-open-pencil-1/docs/kova-final-prds/00d-EXTERNAL_VERIFICATION_HANDOFF.md` (general decisions; D-5C reversed so single Vite SPA — no Nuxt-specific menu concerns)
- `kova-open-pencil-1/docs/kova-final-prds/00e-EXTERNAL_VERIFICATION_VERDICT.md` (§6 PRD-hygiene rules; §8 resolved-concerns log; Figma 13-category taxonomy "UNVERIFIED but immaterial" per §4 — engineer adapts dialog catalog in one line if Figma's exact count differs)
- `kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/03-implied-surfaces-and-backend.md` (§2.2 + §2.8 + §2.10 + §3C #7-11)
- `kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/q1-5-answers-03-implied-surfaces-and-backend.md` (Q5 Recent colors + View toggle persistence)
- `kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/q6-25-answers-03-implied-surfaces-and-backend.md` (Q18 + Q23 + Q24 + Q25 + DEFERRED edge cases)

### 13.6 External sources cited

- [Figma Help — Use Figma products with a keyboard](https://help.figma.com/hc/en-us/articles/360040328653-Use-Figma-products-with-a-keyboard) — 13-category shortcut dialog (Q25); per `00e §4` taxonomy verdict "UNVERIFIED but immaterial" — registry adapts if exact count differs
- [Figma Help — Use the actions menu in Figma Design](https://help.figma.com/hc/en-us/articles/23570416033943-Use-the-actions-menu-in-Figma-Design) — actions menu / right-click context patterns (Q18 framing)
- [Figma Help — Create layout guides](https://help.figma.com/hc/en-us/articles/360040450513-Create-layout-guides) — red `#FF0000` 10% opacity default; `⇧G` toggle (Q24 layout guides default-ON)
- [Figma Help — Copy and paste properties between layers](https://help.figma.com/hc/en-us/articles/4412765442967-Copy-and-paste-properties-between-layers) — Figma's stroke-partial limitation (Q23 better-than-Figma full set)
- [Reka UI — DropdownMenu primitive](https://reka-ui.com/docs/components/dropdown-menu) — base component shell (verified via context7 + `feedback_verify_with_docs`)
- [VueUse — `useLocalStorage`](https://vueuse.org/core/useLocalStorage/) — Layer 2 persistence wrapper for `useUIStateStore.recentColors` etc. (Q5)
- [Lucide icons — `chevron-right`, `check`, `arrow-left`, `x`, `search`](https://lucide.dev/icons) — every menu / overlay glyph; per CLAUDE.md unplugin-icons + Lucide pattern

### 13.7 Memory pointers consulted

- `feedback_app_dark_website_light` — canvas is dark; every popover in this PRD uses `kova-hifi.css`
- `feedback_figma_ui_theme` — Figma reference for menu structure (Q18, Q25), kbd glyph order, default-ON layout guides
- `feedback_browser_smoke_test_before_done` — §9.4 manual QA gate
- `feedback_verify_with_docs` — context7 (Reka UI / VueUse / Pinia) + WebFetch help.figma.com for Figma claims
- `feedback_explain_for_nontechnical_founder` — §1.1 plain language + §1.2 caveman both included
- `feedback_build_better_not_easier` — Q23 full property set (vs Figma's stroke-partial), 4-field find scope (vs Figma's text-only), Layer 2 recent-colors (Figma is per-canvas, we're per-device which is the better default for the freelancer avatar)
- `feedback_image_export_locked` — Copy as ▶ submenu single item "Copy as PNG" (no SVG, no HTML)
- `project_kova_avatar` — freelance email marketer uses keyboard shortcuts heavily; menu density (26 px rows) and kbd-row prominence matter
- `project_design_system_master` — canonical paths cited in §13.4

### 13.8 What is NOT in this PRD (handed elsewhere)

- Topbar / file-name trigger / bottom toolbar / left + right panel chrome (Cluster 06)
- Color picker popover implementation (Cluster 06)
- Engine boolean-ops API, mask compositing, slice / measurement node types (Cluster 07a / 07b)
- All overlay primitives (find-highlight, layout-guides, frame outlines, mask outlines, slice region) — rendering owned by Cluster 07b; this PRD owns find composable + data source + View menu toggle wiring
- Trash modal + RPC (Cluster 09)
- `useConfirm()` primitive + `<ConfirmDialog>` shell (Cluster 11)
- Toast system (Cluster 11)
- `usePreferencesStore` / `useUIStateStore` + accessibility prefs modal (Cluster 12)
- Brand-asset right-click items (Cluster 05)
- Avatar dropdown items (Cluster 06 / 02)
- Help docs hosting (Phase 2 / no-cluster)
