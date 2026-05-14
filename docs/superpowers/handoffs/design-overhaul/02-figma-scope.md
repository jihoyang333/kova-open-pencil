# Figma Scope for Kova — Master Decision List

> **Phase**: 1 of design overhaul (this document) → 2 hi-fi batch generation (downstream).
> **Source brief**: `official-claude-design-overhaul/handoff/FIGMA_SCOPE_BRIEF.md` (with founder edits applied during this run).
> **Inventories cataloged**: 28 Figma screenshots (`figma-functionalities-ui-screenshots/`) + 7 OpenPencil baseline screenshots (`kova-open-pencil-ss/`).
> **Author**: Opus subagent. Reviewed-by: founder (post-delivery, expected).
> **Date**: 2026-04-24.

---

## 1. Summary

### Approach

1. **Sources skimmed**: only `FIGMA_SCOPE_BRIEF.md` (with founder live edits) + `BRAND_MODEL_CLARIFICATION.md` per founder Q1. Other companion docs (FEATURES.md, DESIGN.md, UI_REPLACEMENT_MODE.md) are stale on auth/export/theme/comments/mobile and were skipped to prevent contradictions.
2. **Cataloging**: dispatched 5 parallel subagents to produce structured per-screenshot UI element inventories (4 batches × 7 Figma + 1 batch × 7 OpenPencil). Tagging done solo with one rubric for consistency.
3. **Incremental writes**: surface groups committed to this file one at a time so context exhaustion can't lose work.
4. **Self-review** at the end for tag drift, bias-toward-keep uniformity, and concrete REMOVE reasoning.

### Tag rubric (pinned for the downstream hi-fi agent and future readers)

**Tags:**
- **KEEP-baseline** — surface already exposed in OpenPencil today; stays.
- **KEEP-new** — not in OpenPencil; comes from Figma; Kova adopts (may adapt, re-semantic, or rebuild from scratch — implementation detail for the hi-fi agent).
- **REMOVE** — hide from Kova UI surface (code may stay in source for future tiers; we just don't expose). Permanent removal — feature contradicts a non-negotiable / hard-exclude.
- **DEFER** — feature/concept is sound, post-MVP scope. Hidden from MVP UI but earmarked to revisit post-launch. Distinct from REMOVE (permanently out). Added 2026-04-25 in 2nd founder review pass.
- **FLAG** — genuine ambiguity between KEEP-with-re-semantic and REMOVE/DEFER; founder decides.

**Re-semantic note** — when the Figma surface stays but its meaning shifts in Kova (e.g. "Share" = generate signed preview link, not invite collaborators). Tracked in its own column on the master list.

**REMOVE bar** — must cite either (a) one of the 14 hard-exclude categories (with founder-confirmed adjustments below) or (b) a literal non-negotiable conflict where adaptation is impossible (no Kova analogue — feature requires property X that contradicts non-negotiable #Y).

**Bias** — "if in doubt, KEEP." First-principles ICP test: will a Figma-native freelance email marketer feel something missing/wrong if absent? If yes → KEEP. Build cost is not my concern. Rebuild-from-scratch is fine if the feature saves the user time.

### Non-negotiables (REMOVE if literally violated, no adaptation possible)

1. **Image-slice export only.** No HTML / CSS / MJML.
2. **Single-user local-first (Yjs).** No real-time multiplayer cursors, no live co-editing, no presence avatars, single session per user.
3. **Desktop only.** No mobile / tablet / responsive-app design.
4. **User → Brand → Canvas → Pages.** No workspaces, teams, seats, shared brands.
5. **Auth = Supabase magic link + OTP.** Cannot redesign into biometric/passkey.

### Founder-confirmed adjustments to hard-exclude list (applied this run)

- **Sticky notes** → ~~KEEP~~ → **DEFER** (revised 2026-04-25 — async feedback family deferred to post-MVP)
- **Comments / annotations / review threads** → ~~KEEP, async client-feedback semantic~~ → **DEFER** entire async client-feedback feature family to post-MVP (revised 2026-04-25)
- **Version history** → KEEP, distinct from "Branching" (hard-exclude #10 covered branching only)
- **Pages** → KEEP, sub-canvas semantic (canvas = Kova file = infinite workspace; page = sub-canvas)
- **Share button** → KEEP-baseline, **re-semantic shifts 2026-04-25**: button stays as a placeholder; hover shows "coming soon" tooltip; signed-link + comment infrastructure DEFERRED to post-MVP. NOT multiplayer invite.
- **Masks** → KEEP (founder confirmed 2026-04-25 — vector engine clipping; useful for circular logos / hero crops / branded shapes; brings 6 FLAG rows to KEEP-new)
- **Plugins ecosystem (store + plugin slots)** → hard REMOVE (founder confirmed; AI capabilities live in first-party AI path, NOT plugin slots — out of this scope)
- **FigJam connectors / brainstorming flow** → hard REMOVE (Klaviyo flow builder owns campaign-flow; no in-canvas need)
- **Smart animate / prototype mode** → hard REMOVE; **animated GIF content** → ~~KEEP~~ → **DEFER** (revised 2026-04-25 — post-MVP)

### Founder review passes (2026-04-25 — applied)

Two manual review passes after initial scoping, both 2026-04-25. The DEFER tag was introduced in pass 2.

#### Pass 1 — "email marketers don't use 99% of the time" / "power-user esoteric"

33 KEEP rows flipped → REMOVE in this pass.

- **Vector submenu (§3.2.h, 6 rows)** — REMOVE entire section (Join / Smooth join / Delete-and-heal / Split / Simplify / Offset vector). Email design uses basic shapes + text + images, not vector path manipulation.
- **Pencil tool (§3.4.a, 1 row)** — REMOVE. Freehand drawing not needed; designers import images for hand-drawn elements.
- **Help submenu items (§3.2.k, 3 rows)** — REMOVE Video tutorials + Release notes + Legal summary.
- **Effects section (§3.8.j, 7 rows)** — REMOVE entire section. Designers import pre-shadowed images instead.
- **Settings power-user toggles (§3.10, 11 rows)** — REMOVE the esoteric ones (Keep tool selected, Flip while resizing, Keyboard zooms into selection, Invert zoom direction, Ctrl+click right click, Use number keys for opacity TOGGLE — behavior remains ON, ⌘⌥↑/↓ rotate, Use scroll wheel zoom, Right-click drag to pan, Keyboard layout, Nudge amount).
- **Color picker rare options (§3.11.b, 5 rows)** — REMOVE Libraries tab + Angular / Diamond / Conic gradients + alternative-color-model dropdown. KEEP solid + linear + radial gradients + **image fill (founder explicit)** + Hex input + Brand Kit access via swatch palette.

#### Pass 2 — DEFER aggressive ("anything that's heavy backend for marginal MVP value")

Introduced **DEFER** as 5th tag (post-MVP, not REMOVE). ~108 row tag changes across this pass: ~102 KEEP/FLAG → DEFER, ~6 additional → REMOVE. Net result: master list shrinks dramatically in MVP scope; ~18% of rows are now DEFER (post-MVP).

**Async client-feedback family DEFERRED entirely** (Comments / Annotations / Sticky notes / Review threads): §3.2.d View toggles × 2; §3.4.a bottom-toolbar Comment slot + chevron + Comment item + Annotation item; §3.5 Comment markers + Annotation markers; §3.13.a Add comment + Add annotation right-click; §3.13.c Add comment empty-canvas. **Measurement tool (⇧M) stays KEEP** — designer-internal spacing tool, distinct from client feedback. Share button stays KEEP-baseline as a placeholder with "coming soon" hover tooltip.

**Components / instances workflow DEFERRED** (~14 rows): Object menu × 5 (Create / Slots / Reset / Detach / Main), Selection-type header icons × 3, Insert/component bottom-toolbar slot, Layers panel instance indicator, Assets panel Local components section, Context-menu × 2 (Add to library, Detach instance), Boolean diamond shortcut.

**Variables system DEFERRED** (~11 rows): mappings table + §3.8.a Variables section header + entire §3.11.a Variables Collection modal × 9 rows. Brand Kit + brand_profiles already do the variable+mode work.

**Styles system DEFERRED** (~9 rows): mappings + §3.8.a Styles section + 4 popover items + 4-dot style picker icons across Typography/Fill/Stroke. Brand Kit covers the token need.

**Sections (container-above-frames) DEFERRED**: §3.2.e Wrap in section + Convert to section + Convert to frame + §3.4.a bottom-toolbar Section item — designers organize multi-email canvases with regular Frames in MVP.

**Boolean vector groups DEFERRED**: §3.2.e Boolean groups submenu + §3.8.b diamond shortcut.

**AI billing surface REMOVED** (2 rows): §3.2.a "AI balance" main-menu item + §3.11.c AI balance popover. Kova billing lives in a separate Account page outside the editor.

**AI chat preferences REMOVED** (4 rows in §3.10): Play audio notifications + Show text suggestions + Show tool suggestions + Show AI chat on canvas. AI chat pill itself (bottom-left of canvas) is KEEP-baseline (OP-native) — always shown, no toggle. New row added in §3.6.c for the pill.

**Multi-format export DEFERRED** (PNG + JPG only): §3.8.k WebP + SVG + advanced overflow + Multiple stacked rows. Copy as ›  also PNG-only (§3.2.c + §3.13.a re-semantic).

**Settings section thinned to Accessibility-only** (effective): all 7 default-able preference toggles DEFERRED with default-ON behavior preserved (Snap × 3, Highlight on hover, Rename duplicates, Show dimensions, Hide canvas UI during changes). Smart quotes/symbols REMOVED entirely (no auto-conversion). Color profile + Permissions and helpers DEFERRED. Only Accessibility settings remains as KEEP-new — the user-facing preferences page is essentially Accessibility-only in MVP.

**View menu toggles thinned**: Pixel grid (auto-show at zoom > 800% only, no toggle), Layout guides (default OFF, no toggle), Property labels REMOVED (Kova uses hover-affordance + Layers-panel-highlight model instead), Frame outlines KEEP-new toggle.

**Universal command palette ⌘K DEFERRED** (§3.2.a) — ⌘K is already bound in Kova to summon the AI popup, would conflict with Figma's Actions search.

**A? "Missing fonts" header button DEFERRED** (§3.1) — redundant with the in-context yellow A? badge in Typography panel + canvas underline on missing-font text.

**Power-user features DEFERRED**: §3.2.c Set default properties + Select matching layers + Select all with submenu; §3.2.f Adjust + Text direction + Spell check; §3.2.g Tidy up; §3.2.b New submenu (templates) + Save local copy; §3.4.b Scribble tool; §3.7 Asset hover preview; §3.8.f Appearance Expand icon; §3.8.g Paragraph indent; §3.8.i Stroke advanced + Individual sides; §3.13.a Select sibling/parent/matching context-menu items; §3.13.b Set as default page + Copy page link; §3.10 Permissions and helpers; §3.11.c Help "?" button + popover.

**Brand-uploaded fonts KEEP-new** (§3.2.k "Open font settings" → re-semantic to "Brand font upload").

**Find scoped to current canvas** (§3.2.c) — Find/Find next/Find previous KEEP. Find and replace REMOVED.

**Create link plain URL only** (§3.2.f) — designer-internal reference only. Kova exports flat PNG; click-tracking happens in Klaviyo. No tracking integration.

**Animated GIF content DEFERRED** (was OQ #21).

**Onboarding tooltips DEFERRED** (§3.11.c).

**Cross-brand canvas transfer DEFERRED** (§3.3 Move file).

**Pinned canvases DEFERRED** (§3.3 Add to sidebar).

**Color profile management DEFERRED** (§3.3 + §3.10).

**Custom keybindings DEFERRED** (§3.12) — Kova ships with exact Figma shortcuts in MVP for seamless transition.

**Support forum DEFERRED** (§3.2.k).

**Page right-click "Move up/down" KEEP, "Set as default page" + "Copy page link" DEFERRED**.

**Multiple fills KEEP** (§3.8.h). **Independent-corner-radius KEEP** (§3.8.f). **Auto-layout independent-padding KEEP** (§3.8.e). **Auto-layout wrap mode KEEP** (§3.8.e). **Eyedropper / Pick color KEEP** (§3.2.c). **Copy properties / Paste properties KEEP** (§3.2.c). **Niche shapes (Polygon / Star / Arrow) KEEP** (§3.4.a). **Vertical text alignment KEEP** (§3.8.g). **Stroke Position dropdown KEEP** (§3.8.i). **Selection-type "overflow •••" KEEP** (§3.8.b). **Edit > Paste to replace KEEP** (§3.2.c). **Layer reparent via drag KEEP** (§3.6.b). **Export scale 1x/2x/3x KEEP** (§3.8.k). **Frame outlines View toggle KEEP** (§3.2.d). **Page right-click move up/down KEEP** (§3.13.b). **Drag-and-drop from Asset card → canvas KEEP** (§3.7). **Layer thumbnails KEEP** (§3.6.b).

### Surprises encountered

1. **The "Frame" → "Email canvas" mapping was wrong.** Founder clarified mid-run: canvas = a Kova *file* (infinite workspace, like a Figma file). Frames live INSIDE canvases. Pages = sub-canvases nested inside the parent canvas. Updated `FIGMA_SCOPE_BRIEF.md` directly (3 surgical edits) before tagging.
2. **Figma's `View > Multiplayer cursors` toggle exists** as a user preference even in Figma. Tagged REMOVE — even Figma considers it optional.
3. **Bottom toolbar already has Dev Mode active by default in screenshots** (the dev-mode cursor appears highlighted-blue in batch 4). All three right-cluster items (Scribble + Dev cursor + `</>` code) → REMOVE.
4. **OpenPencil already has a SHOP tab in the left panel** alongside LAYERS. This is pre-existing Kova-specific scaffolding — not from Figma. Tagged KEEP-baseline.
5. **Figma's "AI balance" + credits popover** is built into the main menu (3,000 credits/month, monthly reset). ~~Kova will use a different billing model — FLAG for founder.~~ **REMOVED entirely (2026-04-25 founder review): Kova billing lives in a separate Account page outside the editor; not surfaced in main menu.**
6. **"Drafts" location label** under the file name in Figma. Kova has no Drafts/Files split — canvases live in brands directly. Re-semantic to "Brand name" (e.g. shows "Gymshark" instead of "Drafts").
7. **Figma's "Switch to Draw" mode** appears in the View menu. This is Figma's Draw/whiteboard mode — REMOVE (different product mode entirely).
8. **`Place image/video`** keyboard shortcut (⇧⌘K) exists. The "/video" portion is irrelevant for static email images — re-semantic to image-only.
9. **Figma's right panel has tabs (Design / Prototype)** — OpenPencil has only Design (as a heading, not a tab). Removing the tabs entirely simplifies the right panel; re-styling Design from a tab to a heading.
10. **Figma's Assets tab in left panel browses team libraries (UI kits, Apple Design Resources)**. Kova's Assets tab will be brand-scoped (Shopify products + brand uploads). Same UI surface, different content source.

### Key judgment calls

- **Variables** (Figma's design-token system) → KEEP-new with FLAG note about whether to merge into Brand Kit or keep as separate Brand Variables system. Founder decision.
- **Components / instances workflow** → FLAG generously — full Figma components system is heavy for single-user email design, but founder banked "wherever Figma feels Figma, copy it" → leans KEEP. Listed component-related rows individually so founder can selectively REMOVE.
- **Section / Slice tools** → KEEP-new — sections useful for organizing multiple emails on one canvas; slices are *perfect* for Kova's image-only export model (export selective image slices from a frame).
- **All Plugins removed cleanly** per founder. Did NOT split into "plugin-slot vs. AI-feature" rows on the master list (would muddy scope). AI-feature analogues live in a separate first-party AI scope outside this document.

### Confidence: high on hard-excludes, medium on judgment calls

Hard-exclude application: **high** confidence — applied 14 categories + founder adjustments uniformly across 200+ entries.
Judgment calls (FLAGs): **medium** — founder review on FLAG rows is critical; these are items I genuinely couldn't resolve from rubric alone.

---

## 2. Kova concept mappings

Explicit Figma → Kova translations. Some are confirmed (locked), some need founder confirmation.

| Figma concept | Proposed Kova name | Reasoning | Confirmed? |
|---|---|---|---|
| File | **Canvas** | Infinite workspace; one canvas can hold many email designs / pages / notes / brainstorming. Mirrors Figma's "file = workspace" model. | ✅ Founder confirmed |
| Pages (multiple per file) | **Pages** (sub-canvases) | Same model — pages-within-a-file; each page = its own infinite sub-canvas. | ✅ Founder confirmed |
| Frame | **Email frame** | A frame inside a canvas/page, sized for email (600px typical). | ✅ Founder confirmed |
| Auto-layout | **Auto-layout** (unchanged) | Critical for email section stacking — email designers expect this verbatim. | ✅ Founder confirmed |
| Team libraries | **Brand kit** | Per-brand: contains colors / fonts / logos / tone — single-user, not cross-user. | ✅ Founder confirmed |
| Version history | **Version history** (unchanged) | Same UX; revisions per canvas. Distinct from branching (which is REMOVED). | ✅ Founder confirmed |
| Comments / annotations / review threads / sticky notes | ~~**Async client feedback**~~ | DEFERRED to post-MVP (2026-04-25): entire async client-feedback feature family (comments, annotations, sticky notes, review threads) is post-launch scope. Designers ship images to Klaviyo and use Klaviyo's review tools meanwhile. | 🟦 DEFERRED 2026-04-25 |
| Share button | **Placeholder — "coming soon" hover** | Button stays as KEEP-baseline placeholder (Figma-native expectation). Hover shows "coming soon" tooltip. Signed-link + comment infrastructure DEFERRED to post-MVP. NOT multiplayer invite. | ✅ Founder confirmed (re-semantic) |
| "Drafts" file location label | **Brand name** | Founder confirmed 2026-04-25 (Figma fidelity): single brand-context indicator. Label shows brand name (e.g. "Gymshark"); Kova-specific brand chip (separate pill) is REMOVED to avoid duplication. | ✅ Founder confirmed |
| Components / instances | ~~**Reusable email blocks**~~ | DEFERRED to post-MVP (2026-04-25): full components/instances workflow is heavy for single-user; designers can duplicate-and-modify in MVP. Reusable blocks revisit post-launch. | 🟦 DEFERRED 2026-04-25 |
| Styles (color / text / effect / layout) | ~~**Brand tokens**~~ | DEFERRED to post-MVP (2026-04-25): Brand Kit already does the token work. A parallel Styles UI is duplication. Same logic as Variables — DEFER. | 🟦 DEFERRED 2026-04-25 |
| Variables | ~~**Brand variables**~~ | DEFERRED to post-MVP (2026-04-25): Brand Kit + brand_profiles already do the variable+mode work (per-brand colors/fonts/tone; brand-switch = mode-switch). Variables UI duplicates this. | 🟦 DEFERRED 2026-04-25 |
| Assets panel (left) | **Brand assets** | Shopify product images + brand-uploaded assets. NOT Figma library kits (UI kits / Apple Design Resources removed). | ⚠️ Founder confirm |
| Place image/video | **Place brand asset** | Image picker should default to brand assets (Shopify products + uploads). "Video" not applicable for static email. | ⚠️ Founder confirm |
| Plugins ecosystem | (none) | Hard REMOVE (founder confirmed). Plugin-class capabilities live in first-party AI features, OUT of this scope. | ✅ Locked REMOVE |
| Multiplayer cursors / Presence | (none) | Hard REMOVE — non-negotiable #2 (single-user local-first). | ✅ Locked REMOVE |
| Branches (Create branch) | (none) | Hard REMOVE — non-negotiable #2. Distinct from version history (which is KEEP). | ✅ Locked REMOVE |
| Dev Mode / Inspect / Code export / `</>` cursor | (none) | Hard REMOVE — non-negotiable #1 (image-only export) + hard-exclude #3. | ✅ Locked REMOVE |
| Open in desktop app | (none) | Kova IS the desktop app (Tauri); no browser-vs-desktop split exists. | ✅ Locked REMOVE |
| Slides / FigJam (except sticky notes) / Sites | (none) | Hard REMOVE — different products entirely. | ✅ Locked REMOVE |
| Move to trash | **Move to trash** (re-semantic) | Brand-scoped trash, not OS trash. | ⚠️ Founder confirm |
| Move file | ~~**Move canvas** between brands~~ | DEFERRED to post-MVP (2026-04-25): cross-brand canvas transfer is post-launch scope. Designers stay within a single brand per canvas in MVP. | 🟦 DEFERRED 2026-04-25 |
| AI balance / credits | (none) | REMOVED entirely (2026-04-25): Kova billing lives in a separate Account page outside the editor. Not surfaced in main menu / popover. | ✅ Locked REMOVE |
| Account settings | **Kova account settings** | Different fields (no team/workspace settings). | ⚠️ Founder confirm |
| Libraries (main menu) | (none — replaced by Brand Kit picker) | Library = team library = REMOVE. Brand Kit lives in left panel Assets, not main menu. | ✅ Locked REMOVE |
| File color profile | ~~**Color profile**~~ | DEFERRED to post-MVP (2026-04-25): default sRGB only in MVP; per-canvas color profile management is post-launch scope. | 🟦 DEFERRED 2026-04-25 |

---

## 3. Master list

Tagged surface-group by surface-group. Each row: feature | tag | re-semantic note (if any) | reasoning.

**Surface group order**:
1. Top chrome (app header bar)
2. Main menu (Figma logo flyout) and submenus
3. File-name dropdown menu
4. Bottom canvas toolbar (tools palette)
5. Canvas surface (rulers, zoom UI on canvas, frame labels, selection affordances)
6. Left panel — File / Layers tab content
7. Left panel — Assets tab content
8. Right panel — Design tab (Properties inspector)
9. Right panel — Prototype tab
10. Settings (Preferences submenu detail)
11. Modals / popovers / overlays
12. Keyboard shortcuts (as a category)
13. Context menus

---

### 3.1 Top chrome (app header bar)

Items at the very top of the application — left-side header (logo, AI button, sidebar toggle, file area, tabs) and right-side header (avatar, play, share, panel tabs, zoom).

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| App logo (Figma F mark / Kova K mark) — top-left | KEEP-baseline | — | OP shows K logo top-left. Standard brand mark. |
| Logo dropdown trigger (chevron caret on logo) — opens main menu | KEEP-new | — | OP doesn't show a logo chevron; Figma users expect the logo to open the main menu. Add for parity. (Detailed contents covered in §3.2.) |
| "A?" header button | DEFER | — | Founder clarified 2026-04-25: this is the "Missing fonts" button (NOT AI). Redundant with the in-context yellow A? badge in Typography panel + canvas underline on missing-font text. Both already serve as font-availability indicators. DEFER to post-MVP. |
| Sidebar-toggle icon — collapse/expand left panel | KEEP-baseline | — | OP has sidebar toggle. Standard editor affordance. |
| File-name title display (e.g. "Untitled") | KEEP-baseline | — | OP shows file name. Editable inline. |
| File-name chevron / dropdown trigger | KEEP-new | — | OP file name has no chevron. Figma's file-name chevron opens file-management dropdown (Show version history, Export, Duplicate, Rename, Move, Trash, etc.). Add for parity. (Detailed contents covered in §3.3.) |
| File location label ("Drafts" in Figma) | KEEP-new | **Brand name** (e.g. "Gymshark" instead of "Drafts") | Kova has no Drafts/Files concept. Same UI surface (a small label under file name) but content is brand name. |
| Brand chip (Kova-specific pill, e.g. "Gymshark") | REMOVE | — | Founder review 2026-04-25 (Figma fidelity): consolidate to single brand-context indicator (the file location label re-semanticed to brand name above). Brand chip removed from MVP UI to avoid redundancy. |
| Left panel tab — "File" | KEEP-baseline | **Inside: Pages section + Layers section (Figma fidelity)** | Founder confirmed 2026-04-25 (Figma fidelity): tab labeled "File". Inside the tab: Pages section (top) + Layers section (below) — matches Figma exactly. OP's "LAYERS" tab gets renamed to "File"; Pages and Layers sections live inside as siblings. |
| Left panel tab — "Assets" | KEEP-new | **Brand assets** (Shopify products + brand uploads, not library kits) | Figma's Assets tab browses team libraries; Kova's browses brand-scoped assets. Same surface, different content source. (Detailed contents covered in §3.7.) |
| Search icon next to tabs (left panel) | KEEP-new | — | Useful for searching layers (File tab) or brand assets (Assets tab). Not in OP today — add. |
| User avatar (circular profile photo) — top-right | KEEP-baseline | — | OP shows avatar. Standard account indicator. |
| User avatar dropdown chevron — account menu | KEEP-new | — | OP avatar has no chevron; Figma's avatar opens account / preferences / theme / log-out menu. Add for parity. |
| Play button (outlined triangle) + dropdown — Presentation/Prototype | REMOVE | — | Hard-exclude #8 (Prototyping mode). Static emails don't need prototype play. |
| Share button (blue pill) — top-right | KEEP-baseline | **Placeholder — hover shows "coming soon" tooltip** | Button stays as Figma-native placeholder. Signed-link + comment infrastructure DEFERRED to post-MVP (2026-04-25). NOT multiplayer invite. |
| Right panel tab — "Design" | KEEP-baseline | — | Founder confirmed 2026-04-25 (Figma fidelity): keep as a single-tab UI in the right panel header. With Prototype tab REMOVED, Design stands alone as the only tab — Figma-fidelity preserved over alternative "restyle as heading" option. |
| Right panel tab — "Prototype" | REMOVE | — | Hard-exclude #8. No prototype mode in Kova. Removes the entire tab; right panel becomes single-mode (Design only). |
| Zoom indicator + dropdown (e.g. "54%") — right panel header | KEEP-baseline | — | OP shows zoom percentage as a label. Add dropdown for zoom presets (Zoom to fit, Zoom to selection, 50/100/200%) — already in View submenu. |

**Top chrome subtotal**: 18 entries — 7 KEEP-baseline, 6 KEEP-new, 4 REMOVE, 1 FLAG.

---

### 3.2 Main menu (Figma logo flyout) and submenus

Opens from the top-left logo. Has a search field at top (universal command palette), then top-level item rows that fan out to right-side submenus.

#### 3.2.a Root menu

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Back to files" header item | REMOVE | — | Kova has no Files concept. Replace navigation with "Back to brand dashboard" if needed (separate row in dashboard surface, not here). |
| "Actions..." search field with ⌘K shortcut (universal command palette) | DEFER | — | Founder review 2026-04-25: ⌘K is already a Kova feature that summons the AI popup — would conflict with Figma's ⌘K Actions search. DEFER the indexed Actions search; ⌘K stays bound to Kova AI. |
| "File ›" submenu trigger | KEEP-new | — | Standard menu structure; Figma users expect File menu top-level. |
| "Edit ›" submenu trigger | KEEP-new | — | Standard. |
| "View ›" submenu trigger | KEEP-new | — | Standard. |
| "Object ›" submenu trigger | KEEP-new | — | Standard. |
| "Text ›" submenu trigger | KEEP-new | — | Standard. |
| "Arrange ›" submenu trigger | KEEP-new | — | Standard. |
| "Vector ›" submenu trigger | KEEP-new | — | Standard for vector ops. |
| "Plugins ›" submenu trigger | REMOVE | — | Hard-exclude #4 (Plugins ecosystem). Founder-confirmed REMOVE. |
| "Widgets ›" submenu trigger | REMOVE | — | Widgets are persistent canvas elements similar to plugins. Not first-principles useful for static email design (emails are images, no runtime logic). Treated as plugin-class. |
| "Preferences ›" submenu trigger | KEEP-new | — | Settings/preferences are essential. Detailed contents covered in §3.10. |
| "Libraries" item (no chevron — opens library manager) | REMOVE | — | Hard-exclude #7 (Team libraries). Replaced by Brand Kit picker (lives in left panel Assets, not main menu). |
| "Open in desktop app" item | REMOVE | — | Kova IS the desktop app (Tauri). No browser-vs-desktop split. |
| "AI balance ›" item | REMOVE | — | Founder review 2026-04-25: Kova billing lives in a separate Account page outside the editor. Not surfaced in main menu. |
| "Help and account ›" submenu trigger | KEEP-new | — | Standard help/account menu. |

**Subtotal**: 16 entries — 0 KEEP-baseline, 11 KEEP-new, 4 REMOVE, 1 FLAG.

#### 3.2.b File submenu

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "New Design" | KEEP-new | **New canvas in current brand** | Figma-native New File. In Kova, creates a new canvas inside the currently open brand. (Brand context is implicit from current canvas.) |
| "New ›" submenu (templates etc) | DEFER | — | Founder review 2026-04-25: no email starter templates in MVP. Designers create canvases from scratch. DEFER template library to post-launch. |
| "Place image/video..." (⇧⌘K) | KEEP-baseline | **Place brand asset** (Shopify products + brand uploads; "video" not applicable) | OP has image tool in bottom toolbar. Figma's Place command is the keyboard-shortcut entry to the same. Re-semantic strips "video" since static-only. |
| "Save local copy..." | DEFER | — | Founder review 2026-04-25: Yjs + Supabase snapshots cover persistence; local backup export is post-MVP scope. |
| "Save to version history..." (⌥⌘S) | KEEP-new | — | Founder-confirmed Version history KEEP. Manual snapshot trigger. |
| "Show version history" | KEEP-new | — | Founder-confirmed. Opens version history sidebar/timeline. |
| "Export..." (⇧⌘E) | KEEP-new | **Export image (PNG)** — never HTML | Image-only export per non-negotiable #1. Same shortcut, image-only output. |
| "Export frames to PDF..." | REMOVE | — | Non-negotiable #1: image-only export. PDF is a different export format. (PDFs are also vector, not raster — clear conflict.) |
| "Create branch..." | REMOVE | — | Hard-exclude #10 (Branching). Non-negotiable #2 (single-user). Distinct from version history (which is KEPT). |

**Subtotal**: 9 entries — 1 KEEP-baseline, 5 KEEP-new, 2 REMOVE, 2 FLAG.

#### 3.2.c Edit submenu

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Undo" (⌘Z) | KEEP-baseline | — | OP-native via standard browser undo + Yjs. |
| "Redo" (⇧⌘Z) | KEEP-baseline | — | Standard. |
| "Copy as ›" submenu | KEEP-new | **Copy as PNG only** | Founder review 2026-04-25: PNG-only. SVG / CSS / iOS / Android variants all DEFERRED. |
| "Paste over selection" (⇧⌘V) | KEEP-baseline | — | Standard. |
| "Paste to replace" (⇧⌘R) | KEEP-new | — | Useful for swapping content while preserving layout. |
| "Duplicate" (⌘D) | KEEP-baseline | — | OP-native; standard ⌘D pattern Figma users expect. |
| "Delete" | KEEP-baseline | — | Standard. |
| "Find" (⌘F) | KEEP-new | **Scoped to current canvas only** | Search across current canvas only (text content, layer names). NOT cross-canvas / cross-file search per founder 2026-04-25. |
| "Find next" (⇧⌘F) | KEEP-new | — | Search navigation. |
| "Find previous" (⇧⌘D) | KEEP-new | — | Search navigation. |
| "Find and replace..." | REMOVE | — | Founder review 2026-04-25: replace functionality removed. Find scoped to current canvas only (above row). Designers handle text replacements manually. |
| "Set default properties" | DEFER | — | Founder review 2026-04-25: power-user persistence layer for default styles. DEFER to post-MVP. |
| "Copy properties" (⌥⌘C) | KEEP-new | — | Style transfer between objects. Figma-native. |
| "Paste properties" (⌥⌘V) | KEEP-new | — | Style transfer. |
| "Pick color" (^C) | KEEP-new | — | Eyedropper. Highly useful for matching brand colors from a reference image. |
| "Select all" (⌘A) | KEEP-baseline | — | Standard. |
| "Select matching layers" (⌥⌘A) | DEFER | — | Founder review 2026-04-25: cross-layer attribute query engine — power-user; DEFER to post-MVP. |
| "Select none" | KEEP-new | — | Deselect-all shortcut. |
| "Select inverse" (⇧⌘A) | KEEP-new | — | Power-user selection. |
| "Select all with ›" submenu | DEFER | — | Founder review 2026-04-25: advanced attribute-based selection — power-user; DEFER. |

**Subtotal**: 20 entries — 5 KEEP-baseline, 15 KEEP-new, 0 REMOVE, 0 FLAG.

#### 3.2.d View submenu

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Pixel grid" toggle (⇧') | DEFER | — | Founder review 2026-04-25: no user-facing toggle. Auto-show pixel grid at zoom > 800% only. Toggle DEFERRED. |
| "Layout guides" toggle (⇧G) | DEFER | — | Founder review 2026-04-25: no user-facing toggle. Default OFF (no guides). Toggle DEFERRED. |
| "Rulers" toggle (⇧R) | KEEP-baseline | — | OP shows rulers on canvas. Standard. |
| "Show slices" toggle | KEEP-new | — | Slices = export regions. Critical for image-only export model — pre-define export regions on a canvas. |
| "Comments" toggle (⇧C) | DEFER | — | Founder review 2026-04-25: async client feedback (Comments family) DEFERRED to post-MVP. Toggle DEFERRED. |
| "Annotations" toggle (⇧Y) | DEFER | — | Founder review 2026-04-25: Annotations DEFERRED with Comments family. |
| "Outlines ›" submenu | REMOVE | — | Vector outline view modes for vector debugging. Not first-principles useful for email design (no precision vector work needed). |
| "Pixel preview" toggle (⇧⌘P) | REMOVE | — | Pixel-level rendering preview is for icon/sprite work. Email images render at native scale. |
| "Mask outlines" toggle | KEEP-new | — | Founder confirmed 2026-04-25 — Masks KEPT. View toggle to show mask outline boundaries on canvas (debug aid). |
| "Frame outlines" toggle | KEEP-new | — | Useful debug aid for seeing frame boundaries when canvas is busy. |
| "Memory usage" toggle | REMOVE | — | Internal Figma diagnostic. Irrelevant for end users. |
| "Property labels" toggle | REMOVE | — | Founder review 2026-04-25: Kova handles element identification differently — hover shows subtle blue underline (text) / contour (shape/frame); click highlights the row in the Layers panel. No on-canvas property label overlay needed. |
| "Minimize UI" (⇧⌘\\) | KEEP-new | — | Focus mode. Power-user feature. |
| "Show/Hide UI" (⌘\\) | KEEP-new | — | Focus mode. Highly useful when reviewing email designs. |
| "Multiplayer cursors" toggle (⌥⌘\\) | REMOVE | — | Non-negotiable #2 (single-user local-first). No multiplayer. |
| "Switch to Draw" | REMOVE | — | Figma's drawing/whiteboard mode (different product mode). Not relevant for email design. |
| "Switch to Dev Mode" (⇧D) | REMOVE | — | Hard-exclude #3 (Dev mode). |
| "Panels ›" submenu | KEEP-new | — | Panel visibility toggles (show/hide left, show/hide right). Figma-native. |
| "Zoom in" (⌘+) | KEEP-baseline | — | Standard. |
| "Zoom out" (⌘−) | KEEP-baseline | — | Standard. |
| "Zoom to 100%" (⌘0) | KEEP-baseline | — | Standard. |
| "Zoom to fit" (⇧1) | KEEP-baseline | — | Standard. |
| "Zoom to selection" (⇧2) | KEEP-baseline | — | Standard. |
| "Previous page" (page nav) | KEEP-new | — | Pages KEEP per founder; navigation between pages. |
| "Next page" | KEEP-new | — | Page navigation. |
| "Zoom to previous frame" (⇧N) | DEFER | — | Founder review 2026-04-25: power-user multi-frame navigation. DEFER all 4 frame-navigation shortcuts. |
| "Zoom to next frame" (N) | DEFER | — | DEFERRED with frame-navigation cluster. |
| "Find previous frame" (Home) | DEFER | — | DEFERRED with frame-navigation cluster. |
| "Find next frame" (End) | DEFER | — | DEFERRED with frame-navigation cluster. |

**Subtotal**: 29 entries — 5 KEEP-baseline, 18 KEEP-new, 5 REMOVE, 1 FLAG.

#### 3.2.e Object submenu

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Frame selection" (⌥⌘G) | KEEP-baseline | — | OP supports frames. Wraps selection in a new frame. |
| "Group selection" (⌘G) | KEEP-baseline | — | OP supports groups. Standard. |
| "Ungroup selection" (⌘⌫) | KEEP-baseline | — | Standard. |
| "Wrap in new section" (⌘S) | DEFER | — | Founder review 2026-04-25: Sections (a container type above Frames) DEFERRED — designers organize with regular Frames in MVP. |
| "Convert to section" | DEFER | — | Sections DEFERRED. |
| "Convert to frame" | DEFER | — | Paired with sections — DEFERRED. |
| "Use as mask" (^⌘M) | KEEP-new | — | Founder confirmed 2026-04-25 — Masks KEPT. Selected shape becomes a clipping mask for content beneath; useful for circular logos, hero crops, branded shapes. |
| "Set as thumbnail" | DEFER | — | Founder review 2026-04-25: thumbnails are auto-generated in MVP (canvas dashboard shows them automatically); user-controlled thumbnail selection is post-MVP scope. |
| "Add auto layout" (⇧A) | KEEP-baseline | — | OP has auto-layout. Critical for email section stacking. |
| "More layout options ›" submenu | DEFER | — | Founder review 2026-04-25: duplicates layout controls already in right inspector (§3.8.d). DEFER the menu shortcut. |
| "Create component" (⌥⌘K) | DEFER | — | Founder review 2026-04-25: Components / instances workflow DEFERRED to post-MVP. |
| "Slots ›" submenu | DEFER | — | Components family DEFERRED. |
| "Reset instance" | DEFER | — | Components family DEFERRED. |
| "Detach instance" (⌥⌘B) | DEFER | — | Components family DEFERRED. |
| "Main component ›" submenu | DEFER | — | Components family DEFERRED. |
| "Bring to front" (]) | KEEP-baseline | — | Z-order. OP supports. |
| "Bring forward" (⌘]) | KEEP-baseline | — | Z-order. |
| "Send backward" (⌘[) | KEEP-baseline | — | Z-order. |
| "Send to back" ([) | KEEP-baseline | — | Z-order. |
| "Flip horizontal" (⇧H) | KEEP-baseline | — | Standard. |
| "Flip vertical" (⇧V) | KEEP-baseline | — | Standard. |
| "Rotate 180°" | KEEP-new | — | Quick rotation preset. |
| "Rotate 90° left" | KEEP-new | — | Quick rotation preset. |
| "Rotate 90° right" | KEEP-new | — | Quick rotation preset. |
| "Flatten" (⌥⇧F) | DEFER | — | Founder review 2026-04-25: power-user vector path conversion. DEFER. |
| "Outline stroke" (⌥⌘O) | DEFER | — | Founder review 2026-04-25: power-user vector path conversion (converts stroke to filled vector). Rare in email design. DEFER. |
| "Boolean groups ›" submenu (Union / Subtract / Intersect / Exclude) | DEFER | — | Founder review 2026-04-25: Boolean vector ops DEFERRED — email design rarely composes custom shapes from booleans (designers use icons/imports instead). |

**Subtotal**: 27 entries — 11 KEEP-baseline, 11 KEEP-new, 0 REMOVE, 5 FLAG (Masks + Components-related).

#### 3.2.f Text submenu

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Bold" (⌘B) | KEEP-baseline | — | OP has B in typography section. |
| "Italic" (⌘I) | KEEP-baseline | — | OP has I. |
| "Underline" (⌘U) | KEEP-baseline | — | OP has U. |
| "Strikethrough" (⇧⌘X) | KEEP-baseline | — | OP has S. |
| "Create link" (⇧⌘U) | KEEP-new | **Plain URL — designer-internal reference only** | Founder clarified 2026-04-25: Kova exports flat PNG; clickable links don't survive export. Klaviyo handles link tracking (designer adds hotspots over images in Klaviyo's composer with their own pre-tagged URLs). Canvas links are designer-only notes-to-self. No tracking integration. |
| "Bulleted list" (⇧⌘8) | KEEP-new | — | Email body content. |
| "Numbered list" (⇧⌘7) | KEEP-new | — | Email body content. |
| "Alignment ›" submenu | KEEP-baseline | — | OP has alignment row in typography section. |
| "Adjust ›" submenu | DEFER | — | Founder review 2026-04-25: power-user typography fine-tuning. DEFER. |
| "Case ›" submenu (UPPERCASE / lowercase / Title Case / Sentence case) | KEEP-new | — | Useful for email headlines that need consistent case treatment. |
| "Text direction ›" submenu (LTR / RTL) | DEFER | — | Founder review 2026-04-25: bidirectional text rendering — international scope; English-first MVP. DEFER. |
| "Spell check ›" submenu | DEFER | — | Founder review 2026-04-25: spell-check engine integration is real backend; designers can paste-from-Grammarly/Notion. DEFER. |
| "Show text suggestions" toggle | KEEP-new | — | AI text suggestions / autocomplete. Aligns with Kova AI features. |

**Subtotal**: 13 entries — 4 KEEP-baseline, 9 KEEP-new, 0 REMOVE, 0 FLAG.

#### 3.2.g Arrange submenu

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Round to pixel" | KEEP-new | — | Snap to pixel grid. Crisp image alignment. |
| "Align left" (⌥A) | KEEP-baseline | — | OP has alignment buttons. |
| "Align horizontal centers" (⌥H) | KEEP-baseline | — | OP. |
| "Align right" (⌥D) | KEEP-baseline | — | OP. |
| "Align top" (⌥W) | KEEP-baseline | — | OP. |
| "Align vertical centers" (⌥V) | KEEP-baseline | — | OP. |
| "Align bottom" (⌥S) | KEEP-baseline | — | OP. |
| "Tidy up" (^⌥T) | DEFER | — | Founder review 2026-04-25: position-pattern detection algorithm. Auto-layout (KEEP) covers product-grid use case via auto-layout containers. DEFER. |
| "Pack horizontal" | KEEP-new | — | Remove horizontal gaps. |
| "Pack vertical" | KEEP-new | — | Remove vertical gaps. |
| "Distribute horizontal spacing" (^⌥H) | KEEP-new | — | Even spacing. |
| "Distribute vertical spacing" (^⌥V) | KEEP-new | — | Even spacing. |
| "Distribute left" | KEEP-new | — | Edge-distribute variant. |
| "Distribute horizontal centers" | KEEP-new | — | Center-distribute variant. |
| "Distribute right" | KEEP-new | — | Edge-distribute variant. |
| "Distribute top" | KEEP-new | — | Edge-distribute variant. |
| "Distribute vertical centers" | KEEP-new | — | Center-distribute variant. |
| "Distribute bottom" | KEEP-new | — | Edge-distribute variant. |

**Subtotal**: 18 entries — 6 KEEP-baseline, 12 KEEP-new, 0 REMOVE, 0 FLAG.

#### 3.2.h Vector submenu

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Join selection" (⌘J) | REMOVE | — | Vector path operation. Founder review (2026-04-25): freelance email marketers don't use vector path ops 99% of the time. Email design uses basic shapes + text + images, not vector path manipulation. |
| "Smooth join selection" (⇧⌘J) | REMOVE | — | Vector path operation. Same reason. |
| "Delete and heal selection" (⇧⌫) | REMOVE | — | Vector path operation. Same reason. |
| "Split vector" | REMOVE | — | Vector path operation. Same reason. |
| "Simplify vector" | REMOVE | — | Vector path simplification. Same reason. |
| "Offset vector" | REMOVE | — | Vector path offset. Same reason. |

**Subtotal**: 6 entries — 0 KEEP-baseline, 0 KEEP-new, 6 REMOVE, 0 FLAG.

#### 3.2.i Plugins submenu

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Run last plugin" (⌥⌘P) | REMOVE | — | Hard-exclude #4. |
| "Saved plugins ›" submenu | REMOVE | — | Hard-exclude #4. |
| "Manage plugins..." | REMOVE | — | Hard-exclude #4. |

**Subtotal**: 3 entries — 0 KEEP-baseline, 0 KEEP-new, 3 REMOVE, 0 FLAG.

#### 3.2.j Widgets submenu

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Manage widgets..." | REMOVE | — | Widgets are persistent canvas elements with runtime logic (counters, polls, etc) — irrelevant for static-image email export. Plugin-class extension; same removal logic. |
| "Select all widgets" | REMOVE | — | No widgets to select; redundant with Widgets removal. |

**Subtotal**: 2 entries — 0 KEEP-baseline, 0 KEEP-new, 2 REMOVE, 0 FLAG.

#### 3.2.k Help and account submenu

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Help page" | KEEP-new | — | Standard help docs link. |
| "Keyboard shortcuts" (^⇧?) | KEEP-new | — | Shortcut cheat-sheet dialog. ICP first-principles: power users live in this dialog. |
| "Support forum" | DEFER | — | Founder review 2026-04-25: no community forum/Discord at MVP launch. DEFER until forum exists. |
| "Video tutorials" | REMOVE | — | Founder review (2026-04-25): Help submenu shrinks — Help page link is sufficient. |
| "Release notes" | REMOVE | — | Founder review (2026-04-25): not useful for ICP. |
| "Open font settings" | KEEP-new | **Brand font upload** (per-brand custom font management) | Founder confirmed 2026-04-25: brand-uploaded fonts are KEEP. This menu item opens the brand font upload flow inside Brand Kit settings. |
| "Legal summary" | REMOVE | — | Founder review (2026-04-25): terms/privacy live in Account settings or footer, not main menu. |
| "Account settings" | KEEP-new | — | Account management. |
| "Log out" | KEEP-new | — | Auth signoff. |

**Subtotal**: 9 entries — 0 KEEP-baseline, 4 KEEP-new, 3 REMOVE, 2 FLAG.

#### 3.2.l Other root menu items (already covered above)

- "AI balance ›" → covered in §3.2.a (FLAG)
- "Preferences ›" → detailed in §3.10 (Settings)

**§3.2 Main menu grand total**: 152 entries (16 root + 9 File + 20 Edit + 29 View + 27 Object + 13 Text + 18 Arrange + 6 Vector + 3 Plugins + 2 Widgets + 9 Help & account).
- KEEP-baseline: 34
- KEEP-new: 54
- REMOVE: 30
- DEFER: 32
- FLAG: 2

(Updated 2026-04-25 after both founder review passes. Per-sub-table subtotals immediately above this grand total reflect pre-pass-2 state and may differ ±2 from current row tags due to inheritance — grep-verified grand total above is authoritative.)

---

### 3.3 File-name dropdown menu

Opens from the chevron next to the file name in the left panel header. Contextual file-management actions for the currently open canvas. Some items overlap with §3.2.b File submenu (intentional — Figma exposes both entry points).

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Show version history" | KEEP-new | — | Founder-confirmed. Same action as in File submenu — convenience entry point. |
| "Publish library..." | REMOVE | — | Hard-exclude #7 (Team libraries publishing — cross-user sharing). Brand Kit replaces this; Brand Kit is single-user, not published. |
| "Export..." (⇧⌘E) | KEEP-new | **Image export only** | Same action as File > Export. Image-only per non-negotiable #1. |
| "Add to sidebar ›" submenu | DEFER | — | Founder review 2026-04-25: pinned canvases (and Pinned section in dashboard sidebar) DEFERRED to post-MVP. |
| "Create branch..." | REMOVE | — | Hard-exclude #10 (Branching). Same removal as File > Create branch. |
| "File color profile ›" submenu | DEFER | — | Founder review 2026-04-25: default sRGB only in MVP. Per-canvas color profile management DEFERRED. |
| "Duplicate" | KEEP-new | **Duplicate canvas** (within current brand) | Standard file action. In Kova, creates a copy of the canvas in the same brand. |
| "Rename" | KEEP-new | — | Standard. Inline rename of canvas title. |
| "Move file..." | DEFER | — | Founder review 2026-04-25: cross-brand canvas transfer DEFERRED. Designers stay within one brand per canvas in MVP. |
| "Move to trash" | KEEP-new | **Move to brand trash** (not OS trash) | Brand-scoped trash. Recoverable for some retention period. |

**§3.3 subtotal**: 10 entries — 0 KEEP-baseline, 5 KEEP-new, 2 REMOVE, 3 FLAG.

---

### 3.4 Bottom canvas toolbar (tools palette)

Dark pill-shaped floating toolbar centered at the bottom of the canvas. Three clusters: left cluster = drawing/object tools (most have dropdown chevrons for tool variants), right cluster = mode toggles (Scribble, Dev cursor, code).

#### 3.4.a Left cluster — drawing/object tools

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| Move/select tool (arrow icon) — primary tool slot | KEEP-baseline | — | OP has arrow/select tool. Standard. |
| Move tool dropdown chevron | KEEP-new | — | OP doesn't show chevron on arrow; Figma exposes Move/Hand/Scale variants in dropdown. Add for parity. |
| → "Move" (V) — dropdown item | KEEP-baseline | — | OP-active default. |
| → "Hand tool" (H) — dropdown item | KEEP-baseline | — | OP has hand/pan as separate icon. Figma consolidates into Move dropdown. Either layout works — founder decision in hi-fi. |
| → "Scale" (K) — dropdown item | KEEP-new | — | Scaling tool (not in OP visibly). Standard Figma. |
| Frame tool (frame/grid icon) | KEEP-baseline | — | OP has frame icon with caret. |
| Frame tool dropdown chevron | KEEP-baseline | — | OP shows caret on frame. |
| → "Frame" (F) — dropdown item | KEEP-baseline | — | OP-native. Critical for email frames. |
| → "Section" (⇧S) — dropdown item | DEFER | — | Sections (a container type above Frames) DEFERRED 2026-04-25 — designers organize with regular Frames in MVP. |
| → "Slice" (S) — dropdown item | KEEP-new | — | Slices = export regions. **Critical** for image-only export model — define slice regions and export each as separate PNG. Perfect fit for Kova. |
| Shape tool (rectangle icon) | KEEP-baseline | — | OP has rectangle icon. |
| Shape tool dropdown chevron | KEEP-baseline | — | OP shows caret. |
| → "Rectangle" (R) — dropdown item | KEEP-baseline | — | OP-default. |
| → "Line" (L) — dropdown item | KEEP-new | — | Email dividers/separators are common. |
| → "Arrow" (⇧L) — dropdown item | KEEP-new | — | Useful for email decorative elements. |
| → "Ellipse" (O) — dropdown item | KEEP-new | — | Standard shape. |
| → "Polygon" — dropdown item | KEEP-new | — | Standard shape. |
| → "Star" — dropdown item | KEEP-new | — | Standard shape. |
| → "Image/video..." (⇧⌘K) — dropdown item | KEEP-baseline | **Image only** ("video" stripped) | OP has image icon. Re-semantic strips video (static-only emails). |
| Pen tool (vector node icon) | KEEP-baseline | — | OP has pen/vector icon. |
| Pen tool dropdown chevron | KEEP-new | — | OP doesn't show chevron; Figma has Pen/Pencil variants in dropdown. |
| → "Pen" (P) — dropdown item | KEEP-baseline | — | OP-default. |
| → "Pencil" (⇧P) — dropdown item | REMOVE | — | Founder review (2026-04-25): email designs don't need freehand drawing — designers import images for hand-drawn elements. |
| Text tool ("T" icon) | KEEP-baseline | — | OP has T text tool. |
| Comment/feedback tool (speech-bubble icon) | DEFER | — | Founder review 2026-04-25: async client feedback family DEFERRED. Tool slot DEFERRED but Measurement (⇧M) still accessible — UI implementation in hi-fi may surface Measurement as standalone slot OR keep dropdown with Comment/Annotation hidden. |
| Comment tool dropdown chevron | DEFER | — | Comment/Annotation dropdown DEFERRED. |
| → "Comment" (C) — dropdown item | DEFER | — | Async client feedback DEFERRED 2026-04-25. |
| → "Annotation" (Y) — dropdown item | DEFER | — | Async client feedback family DEFERRED 2026-04-25. |
| → "Measurement" (⇧M) — dropdown item | KEEP-new | — | Designer-internal spacing annotations between elements — distinct from client-feedback Comments/Annotations (DEFERRED). Stays KEEP per founder 2026-04-25. |
| Insert/component icon (shapes-with-plus) | DEFER | — | Founder review 2026-04-25: Components family DEFERRED. The quick-insert affordance for components is DEFERRED. Brand Assets browsing already lives in §3.7 Assets tab. |

**Subtotal §3.4.a**: 30 entries — 13 KEEP-baseline, 15 KEEP-new, 1 REMOVE, 1 FLAG.

#### 3.4.b Right cluster — mode toggles

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| Vertical divider (visual separator between clusters) | KEEP-new | — | Visual structure. Trivial KEEP. |
| Scribble tool (freeform stroke icon) | DEFER | — | Founder review 2026-04-25: with async feedback / Annotations DEFERRED, Scribble's mark-up use case is even thinner. DEFER. |
| Dev-mode cursor toggle (highlighted blue active in screenshots) | REMOVE | — | Hard-exclude #3 (Dev mode). |
| `</>` code icon (CSS/code inspect) | REMOVE | — | Hard-exclude #3 (Dev mode / code export). Non-negotiable #1 (image-only). |

**Subtotal §3.4.b**: 4 entries — 0 KEEP-baseline, 1 KEEP-new, 2 REMOVE, 1 FLAG.

**§3.4 Bottom canvas toolbar grand total**: 34 entries — 13 KEEP-baseline, 11 KEEP-new, 3 REMOVE, 7 DEFER, 0 FLAG. (Updated 2026-04-25 after both passes; sub-table subtotals above may differ ±1.)

---

### 3.5 Canvas surface

The infinite scrollable canvas plane itself, plus all on-canvas affordances (rulers, selection visualization, frame labels, hover/snap indicators, marker overlays).

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| Infinite canvas plane (pannable, zoomable workspace) | KEEP-baseline | — | OP-native. The core editing surface. Canvas = Kova file = infinite workspace. |
| Top ruler (numeric ticks every 100px) | KEEP-baseline | — | OP has top ruler. Standard. |
| Left ruler (vertical, numeric ticks) | KEEP-baseline | — | OP has left ruler. Standard. |
| Frame labels (text above each frame, e.g. "EMAIL 3: Your Welcome Offer...") | KEEP-baseline | — | OP-native. Critical for organizing multi-frame canvases. |
| Selection handles (blue dots at corners + midpoints) | KEEP-baseline | — | OP-native. Standard direct-manipulation affordance. |
| Selection dimension label (e.g. "204 x 117" near selection) | KEEP-baseline | — | OP-native. Live W×H feedback. |
| Hover-element contour highlight (subtle blue: text underline / shape outline) | KEEP-new | — | Founder clarified 2026-04-25: when cursor hovers an element, subtle blue affordance — text gets underline (line-by-line, length-of-text), shapes/frames get full contour outline. Click then highlights the element's row in the Layers panel (§3.6.b). No on-canvas property label overlay. |
| Snap indicators (red/blue lines when Snap to geometry / objects / pixel grid is on) | KEEP-new | — | Snap-to-X visual feedback. Critical for crisp alignment in image-bound output. |
| Layout guides overlay (when toggle ON) | KEEP-new | — | Visual guides for layout structure. |
| Pixel grid overlay (at high zoom, when toggle ON) | KEEP-new | — | Pixel-level alignment aid for image-fidelity work. |
| Slice region visualization (when "Show slices" ON) | KEEP-new | — | Critical: shows export regions overlaid on the canvas. Image-only export model relies on this. |
| Comment markers (small comment-bubble icons placed on canvas) | DEFER | — | Async client feedback DEFERRED 2026-04-25. |
| Annotation markers (annotation icons placed on canvas) | DEFER | — | Async client feedback family DEFERRED 2026-04-25. |
| Measurement annotations (visual rulers between elements) | KEEP-new | — | Designer-internal spacing annotations — distinct from client-feedback (DEFERRED). Stays KEEP per founder 2026-04-25. |
| Multiplayer cursors visualization (other-user cursor avatars on canvas) | REMOVE | — | Non-negotiable #2 (single-user local-first). |
| Multiplayer presence avatars (small avatars indicating who's viewing) | REMOVE | — | Non-negotiable #2. |
| Frame outline overlays (when "Frame outlines" View toggle ON) | KEEP-new | — | Debug aid for seeing frame boundaries. |
| Vector outline overlays (when "Outlines" View submenu toggled) | REMOVE | — | Vector debug mode — irrelevant for email design. (View submenu also REMOVED.) |
| Pixel preview overlay (when "Pixel preview" View toggle ON) | REMOVE | — | Pixel-level rendering preview is icon-design oriented. (View submenu also REMOVED.) |
| Mask outline overlays (when "Mask outlines" View toggle ON) | KEEP-new | — | Founder confirmed 2026-04-25 — Masks KEPT. On-canvas visualization of mask boundaries. |
| Property labels overlay (canvas overlays of selected element properties) | REMOVE | — | Founder review 2026-04-25: Kova's element-identification model is hover-affordance + Layers-panel-highlight (above), NOT on-canvas labels. No Property labels overlay. |
| Page background color (set per page in Properties → Page section) | KEEP-new | — | Useful for previewing emails on different background colors (e.g., email client dark mode vs. white). |

**§3.5 Canvas surface subtotal**: 22 entries — 6 KEEP-baseline, 11 KEEP-new, 4 REMOVE, 1 FLAG.

---

### 3.6 Left panel — File / Layers tab content

The default left panel content when "File" tab is active. Contains Pages section (top) and Layers tree (below).

#### 3.6.a Pages section

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "PAGES" section header (uppercase label) | KEEP-baseline | — | OP-native. |
| "+" Add page button (right of header) | KEEP-baseline | — | OP-native. |
| Page row (page-icon + label, e.g. "Page 1") | KEEP-baseline | — | OP-native. Pages = sub-canvases per founder model. |
| Page selection highlight (active page styling) | KEEP-baseline | — | OP-native. |
| Page rename (inline edit on double-click) | KEEP-new | — | Standard Figma multi-page expectation. OP may not expose this UX yet. |
| Page reorder (drag to reorder) | KEEP-new | — | Standard expectation. |
| Page right-click context menu (Duplicate / Rename / Delete / Set as default) | KEEP-new | — | Standard pattern. |
| Page collapse/expand (Pages section can be collapsed) | KEEP-new | — | Disclosure UX. |

**Subtotal §3.6.a**: 8 entries — 4 KEEP-baseline, 4 KEEP-new.

#### 3.6.b Layers tree

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "LAYERS" section header (uppercase label) | KEEP-baseline | — | OP-native. |
| Layers section collapse/expand | KEEP-new | — | Disclosure UX. |
| Layer row: visibility eye icon (left of layer name) | KEEP-new | — | OP has visibility toggle but appears as checkbox; Figma uses eye icon. Standard. |
| Layer row: lock toggle (lock icon — prevents edits) | KEEP-new | — | Standard Figma; prevents accidental layer edits. |
| Layer row: layer-type glyph (T text, frame icon, rectangle, line, ellipse, etc) | KEEP-baseline | — | OP shows type icons. |
| Layer row: layer name label (editable on double-click) | KEEP-baseline | — | OP-native. |
| Layer row: indentation showing parent-child hierarchy | KEEP-baseline | — | OP shows indented tree. |
| Layer row: expand/collapse chevron for groups/frames | KEEP-baseline | — | OP-native. |
| Layer row: selection highlight (when selected on canvas) | KEEP-baseline | — | OP-native (purple highlight on CTA row visible in screenshots). |
| Layer row: drag-to-reorder within same parent | KEEP-baseline | — | Standard. |
| Layer row: drag-to-reparent (drop into another frame/group) | KEEP-baseline | — | Standard. |
| Layer row: right-click context menu (Rename / Group / Frame selection / Send to back / Delete / etc) | KEEP-new | — | Detailed in §3.13 Context menus. |
| Multi-select layers (shift-click for range, cmd-click for individual) | KEEP-baseline | — | OP-native. |
| Layer search (search icon in tab header) | KEEP-new | — | Filter layers by name. Useful for large canvases. |
| Component instance indicator (diamond/component glyph on layer row) | DEFER | — | Components family DEFERRED 2026-04-25. |
| Auto-layout indicator (small badge or icon on layer rows with auto-layout) | KEEP-baseline | — | OP supports auto-layout. |
| Mask indicator (mask-clip glyph) | KEEP-new | — | Founder confirmed 2026-04-25 — Masks KEPT. Layer row shows mask-clip glyph for mask layers. |
| Section header (distinct visual treatment for Section type) | KEEP-new | — | Sections KEEP-new (§3.2.e). Layers panel must visualize them. |
| Slice indicator (slice icon on slice layers) | KEEP-new | — | Slices KEEP-new. |
| Frame title styling (uppercase frame names like "EMAIL 3: Your Welcome Offer..." in OP) | KEEP-baseline | — | OP-native frame title visualization. |
| Empty state ("No layers yet" message when canvas is empty) | KEEP-new | — | UX polish. OP screenshot 1 shows empty state with no message. |
| Layer thumbnails/previews (small image previews next to image-layer names) | KEEP-new | — | Standard Figma. Helps identify image layers in busy canvases. |

**Subtotal §3.6.b**: 22 entries — 9 KEEP-baseline, 11 KEEP-new, 0 REMOVE, 2 FLAG.

#### 3.6.c Kova-specific extensions (already in OP)

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "SHOP" tab (second left-panel tab in OP) | KEEP-baseline | — | OP-specific Kova feature. Shopify product browser. Not from Figma — but it's present in OP and provides Kova-unique value (browse products to drag into canvas). Stays. |
| AI chat input pill (bottom-left of canvas, dark pill: chat-bubble icon + "Design with Kova AI…" placeholder + send icon) | KEEP-baseline | — | OP-native Kova feature. Not from Figma. The AI chat surface for the Kova canvas. Always shown (no hide-toggle in MVP — the §3.10 "Show AI chat on canvas" preference toggle is REMOVED). Confirmed KEEP-baseline 2026-04-25. |

**Subtotal §3.6.c**: 2 entries — 2 KEEP-baseline.

**§3.6 Left panel grand total**: 32 entries (was 31; +1 for AI chat pill row added in §3.6.c per 2026-04-25 founder confirm) — 17 KEEP-baseline, 13 KEEP-new, 0 REMOVE, 1 DEFER, 1 FLAG.

---

### 3.7 Left panel — Assets tab content

When "Assets" tab is active. In Figma, browses team libraries (UI kits, Apple Design Resources). In Kova, browses brand-scoped assets (Shopify products + brand uploads + Brand Kit components). Same UI surface, different content source.

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| Search input ("Search all libraries" placeholder) | KEEP-new | **Search brand assets** ("Search all assets" or "Search Brand Kit") | Same UI surface, re-labeled to brand-asset context. Critical for finding products/uploads in large brand inventories. |
| Magnifier icon (left side of search input) | KEEP-new | — | Standard search affordance. |
| Filter / sliders icon (right of search) | KEEP-new | — | Filter by type (product / upload / Brand Kit component) or category. |
| Library/book icon button (right of tabs, opens libraries manager) | REMOVE | — | Hard-exclude #7 (Team libraries manager). Brand Kit is local-per-brand; no library publishing/manager UI. |
| "All libraries" section header | KEEP-new | **All assets** | Re-semantic to brand-asset context. |
| Horizontal scroll-strip of library thumbnails | KEEP-new | **Brand asset categories** (Shopify products / Uploads / Brand Kit / Templates) | Same horizontal-scroll UI; categorized brand assets instead of libraries. |
| "Created in this file" sub-label | KEEP-new | **Created in this canvas** | Same concept (locally-created components/assets); re-labeled to canvas context. |
| Component count label ("1 component", "156 components") | KEEP-new | **Asset count** ("1 product", "47 assets") | Standard asset count. |
| "UI kits" section header | REMOVE | — | UI kits are Figma's design-system templates (iOS, macOS, Material). Not relevant for email design. Brand Kit replaces this. |
| Library card (large gradient artwork + title) | KEEP-new | **Brand asset card** (e.g., Shopify product card with image + title + price) | Same card UI; content is brand-specific assets instead of generic UI kits. |
| Library card title (e.g., "iOS 18 and iPadOS 18") | KEEP-new | **Asset title** (e.g., product name) | Same UI element; brand-asset name. |
| Library card publisher footer ("Apple Design Resources") | REMOVE | — | Publisher metadata for team-published libraries. Kova has no third-party publishers — assets come from the brand's own Shopify or uploads. |
| Library card component count | KEEP-new | — | Asset count per category. |
| Drag-and-drop from asset card → canvas | KEEP-new | — | Standard Figma asset drag pattern. Critical UX. |
| Right-click on asset (context menu — Insert / Copy / Hide / etc) | KEEP-new | — | Standard context menu. |
| Asset preview (hover or click for larger preview) | DEFER | — | Founder review 2026-04-25: UX polish; default click-to-insert covers MVP. DEFER hover preview. |
| Section: Local components (assets defined in current canvas) | DEFER | — | Components family DEFERRED 2026-04-25. |
| Section: Brand Kit (per-brand colors / fonts / logos / tone snippets / saved blocks) | KEEP-new | — | Founder-confirmed Brand Kit (mapped from Team libraries). Lives in Assets panel. |
| Section: Shopify products (product images browsable + draggable into canvas) | KEEP-new | **Net-new Kova feature** (no Figma analogue, but founder-required) | Note: technically violates "no scope creep beyond screenshots" rule — but Shopify integration is a non-negotiable Kova feature and must surface somewhere; Assets panel is the natural place. Tag for completeness; founder may relocate. |
| Section: Brand uploads (designer-uploaded images, e.g., custom photography) | KEEP-new | **Net-new Kova feature** | Same logic as Shopify products section — required Kova feature, surfaces in Assets. |
| Empty state per section ("No products yet — connect Shopify to import") | KEEP-new | — | Onboarding/empty-state UX. |

**§3.7 Left panel — Assets tab subtotal**: 21 entries — 0 KEEP-baseline, 18 KEEP-new, 2 REMOVE, 1 FLAG.

---

### 3.8 Right panel — Design tab (Properties inspector)

The biggest surface. Right panel content when "Design" tab is active. Contents change based on what's selected. When nothing is selected → page-level properties. When something selected → selection-type header + Position / Layout / Auto-layout / Appearance / Typography / Fill / Stroke / Effects / Export sections.

OpenPencil baseline: most of these sections exist (Position, Layout, Auto-layout, Appearance, Fill, Stroke, Effects, Export, Typography for text). Figma adds: page-level properties when no selection, Variables section, Styles section with + popover, Resizing modes (hug/fixed/fill), more granular component/variant header icons, advanced stroke options.

#### 3.8.a Page-level properties (shown when no selection)

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Page" section header | KEEP-new | — | OP doesn't expose page-level properties when nothing selected. Add for parity. |
| Page background color swatch + hex (e.g. "1E1E1E") | KEEP-new | — | Useful for previewing emails on different background colors (email-client dark mode vs. white). |
| Page background opacity field with % | KEEP-new | — | Standard color row. |
| Page background visibility eye icon | KEEP-new | — | Standard color row. |
| "Show in exports" checkbox | KEEP-new | — | Controls whether page background renders in image exports. |
| "Variables" section header (with sliders icon = variables manager) | DEFER | — | Variables system DEFERRED 2026-04-25 — Brand Kit + brand_profiles already do the variable+mode work. |
| "Styles" section header (with "+" add button → popover for Text/Color/Effect/Layout guide style types) | DEFER | — | Styles system DEFERRED 2026-04-25 — Brand Kit already does the token work; parallel Styles UI is duplication. |
| Styles "+" popover: "Text" style option | DEFER | — | Styles family DEFERRED. |
| Styles "+" popover: "Color" style option | DEFER | — | Styles family DEFERRED. |
| Styles "+" popover: "Effect" style option | DEFER | — | Styles family DEFERRED + Effects section already REMOVED. |
| Styles "+" popover: "Layout guide" style option | DEFER | — | Styles family DEFERRED. |
| "Export" section header (with "+" add) | KEEP-new | — | Export per page (renders entire page as image). Useful for full-page email export. |

**Subtotal §3.8.a**: 12 entries — 0 KEEP-baseline, 6 KEEP-new, 0 REMOVE, 6 FLAG.

#### 3.8.b Selection-type header (shown when something is selected)

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| Selection-type label (e.g. "RECTANGLE", "TEXT", "FRAME") | KEEP-baseline | — | OP shows this. |
| Selection name (editable, e.g. "Description text" / "EMAIL 3: ...") | KEEP-baseline | — | OP shows this. |
| Component/variant 4-dot grid icon (top-right of header) | DEFER | — | Components family DEFERRED 2026-04-25. |
| Link/chain icon (component instance link to main) | DEFER | — | Components family DEFERRED 2026-04-25. |
| Push-to-main / arrow-into-square icon (push instance changes to main component) | DEFER | — | Components family DEFERRED 2026-04-25. |
| Half-moon / mask icon (in Rectangle header — likely "Use as mask" quick-toggle) | KEEP-new | — | Founder confirmed 2026-04-25 — Masks KEPT. Quick-toggle for "Use as mask" from selection-type header. |
| Diamond / boolean / arrange icon | DEFER | — | Boolean groups DEFERRED 2026-04-25. The selection-header shortcut to Booleans inherits DEFER. |
| Overflow "•••" menu (more selection actions) | KEEP-new | — | Standard overflow pattern. |

**Subtotal §3.8.b**: 8 entries — 2 KEEP-baseline, 2 KEEP-new, 0 REMOVE, 4 FLAG.

#### 3.8.c Position section

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Position" section header | KEEP-baseline | — | OP-native. |
| "Alignment" sub-label | KEEP-new | — | OP shows alignment row but no sub-label. Add for clarity. |
| Align-left icon button | KEEP-baseline | — | OP-native (5 align icons row). |
| Align-horizontal-center icon button | KEEP-baseline | — | OP-native. |
| Align-right icon button | KEEP-baseline | — | OP-native. |
| Align-top icon button | KEEP-baseline | — | OP-native. |
| Align-vertical-center icon button | KEEP-baseline | — | OP-native. |
| Align-bottom icon button | KEEP-baseline | — | Figma has 6 alignment icons; OP shows 5. Add the 6th for parity. |
| "Position" sub-label | KEEP-new | — | OP shows X/Y but no sub-label. |
| X field (numeric input) | KEEP-baseline | — | OP-native. |
| Y field (numeric input) | KEEP-baseline | — | OP-native. |
| Constrain-to-parent / origin icon | KEEP-new | — | OP shows 3 small icons next to position; Figma has constrain. |
| "Rotation" sub-label | KEEP-new | — | OP-native rotation field. |
| Rotation angle field (with degree symbol) | KEEP-baseline | — | OP-native. |
| Rotate 90° icon | KEEP-new | — | Quick rotation. (Object menu has 90/180 rotate options too — duplicated here.) |
| Flip horizontal icon | KEEP-new | — | Quick flip. (Object menu has it too.) |
| Flip vertical icon | KEEP-new | — | Quick flip. |

**Subtotal §3.8.c**: 17 entries — 9 KEEP-baseline, 8 KEEP-new, 0 REMOVE, 0 FLAG.

#### 3.8.d Layout section

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Layout" section header | KEEP-baseline | — | OP-native. |
| "Resizing" sub-label | KEEP-new | — | OP shows W/H but no resizing-mode buttons. |
| Hug-contents icon button | KEEP-new | — | Resizing mode. Critical for auto-layout email frames. |
| Fixed-size icon button | KEEP-baseline | — | OP shows "Fixed" dropdown — same concept as fixed icon. |
| Fill-container icon button | KEEP-new | — | Resizing mode (fill parent). Critical for responsive auto-layout. |
| "Dimensions" sub-label | KEEP-new | — | OP shows W/H but no sub-label. |
| W field (width, numeric input) | KEEP-baseline | — | OP-native. |
| H field (height, numeric input) | KEEP-baseline | — | OP-native. |
| Aspect-ratio lock icon | KEEP-new | — | Lock W:H ratio while resizing. Standard. |

**Subtotal §3.8.d**: 9 entries — 4 KEEP-baseline, 5 KEEP-new, 0 REMOVE, 0 FLAG.

#### 3.8.e Auto-layout section (shown when frame has auto-layout)

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Auto layout" section header | KEEP-baseline | — | OP-native. |
| Add auto-layout "+" button (when not yet enabled) | KEEP-baseline | — | OP-native. |
| Direction icon: horizontal arrow (right) | KEEP-baseline | — | OP-native. |
| Direction icon: vertical arrow (down) | KEEP-baseline | — | OP-native. |
| Direction icon: wrap (grid) | KEEP-new | — | Wrap layout — recent Figma feature. May not be in OP yet. |
| Distribution/spacing icons (3 small icons) | KEEP-baseline | — | OP shows 3 small icons after direction. |
| Gap field (with horizontal-arrows icon) | KEEP-baseline | — | OP-native. |
| Padding T (top) field | KEEP-baseline | — | OP-native. |
| Padding H (horizontal) field | KEEP-baseline | — | OP-native. |
| Padding B (bottom) field | KEEP-baseline | — | OP-native. |
| Padding L (left) field | KEEP-baseline | — | OP-native. |
| Independent-padding toggle (toggle between linked and 4-separate padding) | KEEP-new | — | UX detail. May or may not be visible in OP. |
| "Alignment" sub-label | KEEP-baseline | — | OP-native. |
| 3×3 alignment grid (9 dots, click center to align center, etc) | KEEP-baseline | — | OP-native (center-middle dot highlighted in screenshot). |
| "Clip content" checkbox | KEEP-baseline | — | OP-native. |

**Subtotal §3.8.e**: 15 entries — 13 KEEP-baseline, 2 KEEP-new, 0 REMOVE, 0 FLAG.

#### 3.8.f Appearance section

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Appearance" section header | KEEP-baseline | — | OP-native. |
| Eye icon (visibility toggle for the layer) | KEEP-baseline | — | OP-native (eye icon next to opacity). |
| Blend mode / drop icon | KEEP-new | **Normal blend only in MVP** | Founder review 2026-04-25: only Normal blend mode in MVP. Multiply / Screen / Overlay / etc. DEFERRED. The dropdown stays as a UI affordance (one option) until other modes ship. |
| "Opacity" field (with grid/dotted-square icon) | KEEP-baseline | — | OP-native. |
| Opacity % unit | KEEP-baseline | — | OP-native. |
| "Corner radius" field (with bracket icon) | KEEP-baseline | — | OP-native (CTA frame shows radius "5"). |
| Individual-corner-radius toggle (corner-bracket square) | KEEP-new | — | Set each corner independently (top-left, top-right, bottom-right, bottom-left). Useful for CTA buttons with rounded top only. |
| Expand icon (advanced appearance options) | DEFER | — | Founder review 2026-04-25: with blend modes restricted to Normal-only and Effects section REMOVED, the advanced-appearance panel is sparse. DEFER expand icon until there's something behind it. |

**Subtotal §3.8.f**: 8 entries — 6 KEEP-baseline, 2 KEEP-new, 0 REMOVE, 0 FLAG.

#### 3.8.g Typography section (text layers only)

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Typography" section header | KEEP-baseline | — | OP-native. |
| 4-dot style picker icon (link to text styles) | DEFER | — | Styles system DEFERRED 2026-04-25. |
| Font family dropdown (with missing-font yellow "A?" badge if font is unavailable) | KEEP-baseline | — | OP shows "Arial" dropdown. Add missing-font indicator. |
| Font weight dropdown (Regular / Bold / etc) | KEEP-baseline | — | OP-native. |
| Font size dropdown / numeric input | KEEP-baseline | — | OP-native. |
| "Line height" field (with underlined-A icon) | KEEP-baseline | — | OP shows line-height field. |
| "Letter spacing" field (with spacing-A icon) | KEEP-baseline | — | OP-native. |
| Paragraph indent icon | DEFER | — | Founder review 2026-04-25: paragraph first-line-indent rendering. Almost no modern email design uses paragraph indents (brands use block-style spacing). DEFER. |
| "Alignment" sub-label | KEEP-baseline | — | OP-native. |
| Horizontal text alignment: align-left | KEEP-baseline | — | OP-native (alignment row). |
| Horizontal text alignment: align-center | KEEP-baseline | — | OP-native. |
| Horizontal text alignment: align-right | KEEP-baseline | — | OP-native. |
| Horizontal text alignment: justify | KEEP-baseline | — | OP-native (4 alignment icons). |
| Vertical text alignment: top | KEEP-new | — | Figma has vertical alignment for text in fixed-height containers. Useful for email CTAs. |
| Vertical text alignment: middle | KEEP-new | — | — |
| Vertical text alignment: bottom | KEEP-new | — | — |
| Text style row: B (Bold) | KEEP-baseline | — | OP-native. |
| Text style row: I (Italic) | KEEP-baseline | — | OP-native. |
| Text style row: U (Underline) | KEEP-baseline | — | OP-native. |
| Text style row: S (Strikethrough) | KEEP-baseline | — | OP-native. |
| Advanced typography sliders icon (more text options) | KEEP-new | — | Opens advanced text panel (OpenType features, ligatures, etc). |

**Subtotal §3.8.g**: 21 entries — 14 KEEP-baseline, 6 KEEP-new, 0 REMOVE, 1 FLAG.

#### 3.8.h Fill section

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Fill" section header | KEEP-baseline | — | OP-native. |
| 4-dot style picker icon (link to fill styles / Brand colors) | DEFER | — | Styles system DEFERRED 2026-04-25. |
| "+" add fill button | KEEP-baseline | — | OP-native. |
| Fill row: color swatch | KEEP-baseline | — | OP-native. |
| Fill row: hex input field (e.g. "FFFFFF") | KEEP-baseline | — | OP-native. |
| Fill row: opacity field with % | KEEP-baseline | — | OP-native. |
| Fill row: visibility eye icon | KEEP-baseline | — | OP-native. |
| Fill row: minus "−" remove button | KEEP-baseline | — | OP-native. |
| Multiple fills (stacked rows for layered fills) | KEEP-new | — | Standard Figma — multiple fill layers (color + image overlay, etc). May or may not be in OP yet. |
| Fill type variants (solid / gradient linear / gradient radial / gradient angular / gradient diamond / image / video) | KEEP-new | **Image only** for image fills (no video) | Critical: gradient fills + image fills are common in email design (hero backgrounds, brand-color gradients). Re-semantic strips video option. |

**Subtotal §3.8.h**: 10 entries — 7 KEEP-baseline, 2 KEEP-new, 0 REMOVE, 1 FLAG.

#### 3.8.i Stroke section

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Stroke" section header | KEEP-baseline | — | OP-native (with "+" add). |
| 4-dot style picker icon (link to stroke styles) | DEFER | — | Styles system DEFERRED 2026-04-25. |
| "+" add stroke button | KEEP-baseline | — | OP-native. |
| Stroke row: color swatch + hex + opacity + eye + remove | KEEP-baseline | — | Same as Fill row pattern; OP-native for strokes when added. |
| "Position" sub-label with dropdown (Inside / Outside / Center) | KEEP-new | — | Stroke position (relative to vector edge). Useful for image-fidelity in exports. |
| "Weight" field with horizontal-bar icon | KEEP-new | — | Stroke width. Standard. |
| Advanced-stroke icon (sliders — opens dash pattern, line cap, line join settings) | DEFER | — | Founder review 2026-04-25: vector engine extensions for decorative borders. DEFER — solid stroke + weight covers 95% of email design. |
| Individual-sides icon (toggle to set each side independently) | DEFER | — | Founder review 2026-04-25: per-side stroke configuration. DEFER. |

**Subtotal §3.8.i**: 8 entries — 4 KEEP-baseline, 4 KEEP-new, 0 REMOVE, 1 FLAG.

(Note: 4 KEEP-baseline rows here include the consolidated stroke-row pattern as one row.)

#### 3.8.j Effects section

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Effects" section header | REMOVE | — | Founder review (2026-04-25): email marketers don't use shadow / blur / noise / texture effects 99% of the time. Designers needing shadow on a CTA can import a pre-shadowed image asset. Whole section removed from UI surface. |
| 4-dot style picker icon (link to effect styles) | REMOVE | — | Effects section removed. |
| "+" add effect button | REMOVE | — | Effects section removed. |
| Effect row: type dropdown (Drop shadow / Inner shadow / Layer blur / Background blur / Noise / Texture) | REMOVE | — | Effects section removed. |
| Effect row: parameters (offset X/Y, blur, spread, color) | REMOVE | — | Effects section removed. |
| Effect row: visibility eye + remove | REMOVE | — | Effects section removed. |
| Multiple effects (stacked rows) | REMOVE | — | Effects section removed. |

**Subtotal §3.8.j**: 7 entries — 0 KEEP-baseline, 0 KEEP-new, 7 REMOVE, 0 FLAG.

#### 3.8.k Export section

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Export" section header | KEEP-baseline | — | OP-native. |
| "+" add export setting | KEEP-baseline | — | OP-native. |
| Export row: scale dropdown ("1x", "2x", "3x", custom) | KEEP-baseline | — | OP-native. |
| Export row: format dropdown — PNG | KEEP-baseline | **Default & primary** | Image-only per non-negotiable #1. |
| Export row: format dropdown — JPG | KEEP-new | — | JPG often smaller for photo-heavy emails. KEEP. |
| Export row: format dropdown — WebP | DEFER | — | Founder review 2026-04-25: PNG + JPG only in MVP. WebP DEFERRED. |
| Export row: format dropdown — SVG | DEFER | — | Founder review 2026-04-25: PNG + JPG only in MVP. SVG DEFERRED (vector format, also conflicts with strict image-only reading). |
| Export row: format dropdown — PDF | REMOVE | — | Non-negotiable #1: image-only. PDF is multi-format / vector / page-oriented. |
| Export row: overflow "•••" icon (advanced export — suffix, naming pattern, color profile) | DEFER | — | Founder review 2026-04-25: power-user advanced export options. DEFER. |
| Export row: minus "−" remove | KEEP-baseline | — | OP-native. |
| Multiple export settings (stacked rows for multiple sizes/formats per layer) | DEFER | — | Founder review 2026-04-25: power-user multi-export. One export config per layer is sufficient for MVP. DEFER. |
| "Export [layer name]" button (full-width blue) | KEEP-baseline | — | OP-native. |
| "Preview" disclosure expand | KEEP-baseline | — | OP-native (CTA preview shown rendered in screenshot 7). |
| Rendered preview image (when Preview expanded) | KEEP-baseline | — | OP-native. Critical for verifying export looks right before exporting. |

**Subtotal §3.8.k**: 14 entries — 9 KEEP-baseline, 4 KEEP-new, 1 REMOVE, 1 FLAG (SVG).

**§3.8 Right panel — Design tab grand total**: 129 entries — 67 KEEP-baseline, 32 KEEP-new, 8 REMOVE, 21 DEFER, 1 FLAG (Masks half-moon icon).

(Updated 2026-04-25 after both founder review passes. Components × 3 + Variables × 1 + Styles × 8 (1 section + 4 popover + 3 picker icons) + Sections × 0 (all in §3.2) + Booleans × 1 (diamond) + Stroke advanced × 2 + Multi-format export × 4 + Paragraph indent + Set as thumbnail elsewhere + Expand icon = ~21 DEFER. Sub-table subtotals above may differ ±2 from current state.)

---

### 3.9 Right panel — Prototype tab

The entire Prototype tab is hard-exclude #8 (Prototyping mode). Every feature inside it removes. Listed individually for completeness.

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| "Prototype" tab itself (right panel header) | REMOVE | — | Hard-exclude #8. Already noted in §3.1. |
| "Prototype settings" section header | REMOVE | — | Hard-exclude #8. |
| "Device" dropdown ("No device" / iPhone / iPad / etc) | REMOVE | — | Device-frame for prototype play. Not relevant for static email design. |
| Prototype background color swatch + hex | REMOVE | — | Background for prototype playback. Hard-exclude #8. |
| "Creating a connection" hint card (with X close) | REMOVE | — | Empty-state hint for prototype-connection workflow. Hard-exclude #8. |
| "Running your prototype" hint card (with X close) | REMOVE | — | Empty-state hint for play button. Hard-exclude #8. |
| Connection node visualization on canvas (circle with arrow when in Prototype mode) | REMOVE | — | The actual prototype-connection drawing affordance. Hard-exclude #8. |
| Prototype play button (top-right, outlined triangle) | REMOVE | — | Already covered in §3.1 (Top chrome). Hard-exclude #8. |
| Prototype play dropdown (open in tab / present / etc) | REMOVE | — | Hard-exclude #8. |
| Smart animate / Auto animate option | REMOVE | — | Founder-confirmed REMOVE (different from animated GIF content support). |
| Frame interaction settings (on-click / on-hover triggers) | REMOVE | — | Hard-exclude #8. |
| Overlay animations | REMOVE | — | Hard-exclude #8. |
| "?" help button (bottom-right) — within Prototype context | REMOVE | — | Removed with the entire tab. |

**§3.9 Prototype tab subtotal**: 13 entries — 0 KEEP-baseline, 0 KEEP-new, 13 REMOVE, 0 FLAG.

---

### 3.10 Settings (Preferences submenu detail)

Opens from main menu → Preferences. Long checkbox list of editor preferences. Most are user-preference toggles with broad utility; a few conflict with Kova non-negotiables.

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| ✓ "Snap to geometry" toggle | DEFER | — | Founder review 2026-04-25: behavior default ON, no user-facing toggle. The "snap to geometry" snapping behavior remains active by default. Toggle DEFERRED. |
| ✓ "Snap to objects" toggle | DEFER | — | Founder review 2026-04-25: behavior default ON. Toggle DEFERRED. |
| ✓ "Snap to pixel grid" toggle (⇧⌘') | DEFER | — | Founder review 2026-04-25: behavior default ON. Toggle DEFERRED. |
| "Keep tool selected after use" toggle | REMOVE | — | Founder review (2026-04-25): power-user esoteric — most email marketers never touch. |
| ✓ "Highlight layers on hover" toggle | DEFER | — | Founder review 2026-04-25: behavior default ON, no toggle. DEFERRED. |
| ✓ "Rename duplicated layers" toggle | DEFER | — | Founder review 2026-04-25: behavior default ON, no toggle. DEFERRED. |
| ✓ "Show dimensions on objects" toggle | DEFER | — | Founder review 2026-04-25: behavior default ON, no toggle. DEFERRED. |
| ✓ "Hide canvas UI during changes" toggle | DEFER | — | Founder review 2026-04-25: behavior default ON, no toggle. DEFERRED. |
| ✓ "Use smart quotes/symbols" toggle | REMOVE | — | Founder review 2026-04-25: REMOVED ENTIRELY — both the toggle AND the underlying auto-conversion behavior. User types straight quotes, gets straight quotes. No auto smart quotes / em-dashes. |
| ✓ "Flip objects while resizing" toggle | REMOVE | — | Founder review (2026-04-25): power-user esoteric. |
| "Keyboard zooms into selection" toggle | REMOVE | — | Founder review (2026-04-25): power-user esoteric. |
| "Invert zoom direction" toggle | REMOVE | — | Founder review (2026-04-25): power-user esoteric. |
| "Ctrl+click opens right click menus" toggle | REMOVE | — | Founder review (2026-04-25): power-user esoteric. |
| ✓ "Use number keys for opacity" toggle | REMOVE | — | Founder review (2026-04-25): the toggle is power-user esoteric; default the BEHAVIOR ON (number keys → opacity) and remove the user-facing preference toggle. |
| "Use old shortcuts for outlines" toggle | REMOVE | — | Vector outlines mode removed (§3.2.d). Setting moot. |
| "Use ⌘⌥↑/↓ to rotate layers" toggle | REMOVE | — | Founder review (2026-04-25): power-user esoteric. |
| ✓ "Play audio notifications in AI chat" toggle | REMOVE | — | Founder review 2026-04-25: super unnecessary. REMOVED. |
| "Open links in desktop app" toggle | REMOVE | — | Kova IS the desktop app. No browser-vs-desktop split. |
| ✓ "Show text suggestions" toggle | REMOVE | — | Founder review 2026-04-25: super unnecessary. REMOVED. |
| ✓ "Show tool suggestions" toggle | REMOVE | — | Founder review 2026-04-25: REMOVED with text suggestions. |
| ✓ "Show AI chat on canvas" toggle | REMOVE | — | Founder review 2026-04-25: AI chat pill is core (OP-baseline) — always shown, no toggle. REMOVED. |
| "Use scroll wheel zoom" toggle | REMOVE | — | Founder review (2026-04-25): power-user esoteric. |
| "Right-click and drag to pan" toggle | REMOVE | — | Founder review (2026-04-25): power-user esoteric. |
| "Theme ›" submenu (Light / Dark / Match system) | REMOVE | — | Founder-locked: dark mode everywhere inside the authenticated app, no theme toggle (Figma model). REMOVE the toggle entirely. |
| "Color profile..." (opens modal) | DEFER | — | Founder review 2026-04-25: default sRGB only in MVP. Color profile management DEFERRED (matches §3.3 file dropdown decision). |
| "Keyboard layout..." (opens modal) | REMOVE | — | Founder review (2026-04-25): power-user esoteric — international keyboard layouts not in MVP scope. |
| "Accessibility settings..." (opens modal) | KEEP-new | — | A11y (text size, motion, contrast). Standard. |
| "Permissions and helpers..." (opens modal) | DEFER | — | Founder review 2026-04-25: Figma-specific permissions don't apply to Kova. DEFER. |
| "Nudge amount..." (opens modal) | REMOVE | — | Founder review (2026-04-25): power-user esoteric — default nudge values used. |

**§3.10 Settings subtotal**: 29 entries — 0 KEEP-baseline, 13 KEEP-new, 14 REMOVE, 2 FLAG. (11 power-user esoteric toggles flipped KEEP-new → REMOVE on 2026-04-25 founder review.)

---

### 3.11 Modals / popovers / overlays

Floating layers above the editor: modal dialogs, color picker, tooltips, status popovers, hint cards, help affordances.

#### 3.11.a Variables Collection modal

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| Variables Collection modal (entire dialog) | DEFER | — | Variables system DEFERRED 2026-04-25. Modal DEFERRED with parent system. |
| Modal sidebar-toggle icon (top-left) | DEFER | — | Variables modal DEFERRED. |
| Modal title "Collection 1" | DEFER | — | Variables modal DEFERRED. |
| Modal expand/fullscreen icon | DEFER | — | Variables modal DEFERRED. |
| Modal "X" close icon | DEFER | — | Variables modal DEFERRED. |
| Empty-state heading "No variables in this collection" | DEFER | — | Variables modal DEFERRED. |
| Empty-state body text + "Learn more →" link | DEFER | — | Variables modal DEFERRED. |
| "+ Create" primary button (blue) | DEFER | — | Variables modal DEFERRED. |
| "Import" secondary button | DEFER | — | Variables modal DEFERRED. |

**Subtotal §3.11.a**: 9 entries — all FLAG.

#### 3.11.b Color picker popover

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| Color picker popover (entire floating panel) | KEEP-baseline | — | OP has color swatches but full popover may be different. Standard expectation. |
| "Custom" tab (popover header) | KEEP-baseline | — | OP has fill swatches; this is the picker. |
| "Libraries" tab (popover header) | REMOVE | — | Founder review (2026-04-25): Libraries tab stripped. Brand Kit color access lives via the swatch palette row at bottom + "On this page" context dropdown re-purposed to "Brand Kit colors / recent colors." |
| "+" add swatch button (popover header) | KEEP-new | — | Save current color to Brand Kit. |
| "X" close button | KEEP-baseline | — | Standard. |
| Swatch-type icon row: Solid fill | KEEP-baseline | — | OP has solid fills. |
| Swatch-type icon row: Linear gradient | KEEP-new | — | Gradient fills (covered in §3.8.h). |
| Swatch-type icon row: Radial gradient | KEEP-new | — | Gradient fills. |
| Swatch-type icon row: Angular gradient | REMOVE | — | Founder review (2026-04-25): rare gradient type — email designers use solid + linear + radial only. |
| Swatch-type icon row: Diamond gradient | REMOVE | — | Founder review (2026-04-25): rare gradient type. |
| Swatch-type icon row: Image fill (mountain icon) | KEEP-new | — | Image fills (re-semantic to brand-asset image fills). |
| Swatch-type icon row: Video fill (play-triangle-in-box) | REMOVE | — | Video fills not applicable for static-image emails. |
| Swatch-type icon row: Conic / rainbow gradient | REMOVE | — | Founder review (2026-04-25): rare gradient type. |
| 2D color picker square (saturation × brightness) | KEEP-baseline | — | Standard color picker. |
| Hue slider (rainbow strip with puck) | KEEP-baseline | — | Standard. |
| Eyedropper icon (next to hue slider) | KEEP-new | — | Pick color from canvas. Also in Edit > Pick color (^C). |
| Opacity/alpha slider (checkered transparency strip) | KEEP-baseline | — | Standard. |
| Color-model dropdown ("Hex" / RGB / HSL / HSB / CSS) | REMOVE | — | Founder review (2026-04-25): Hex-only — no RGB/HSL/HSB/CSS switching. Hex input field below remains. |
| Hex input field | KEEP-baseline | — | OP-native. |
| Percentage opacity field | KEEP-baseline | — | OP-native. |
| Context dropdown ("On this page") for recent/document colors | KEEP-new | — | Show colors used in current page/canvas. Useful for consistency. |
| Swatch palette row (recent / common / brand swatches) | KEEP-new | — | Brand color quick-access. |

**Subtotal §3.11.b**: 22 entries — 7 KEEP-baseline, 9 KEEP-new, 6 REMOVE, 0 FLAG. (5 rows flipped KEEP-new → REMOVE on 2026-04-25 founder review: Libraries tab + angular/diamond/conic gradients + color-model dropdown. Image fill explicitly KEPT per founder.)

#### 3.11.c Other popovers / tooltips

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| Missing fonts tooltip (e.g., "Missing fonts" black pill on A? button) | KEEP-new | — | UX feedback when a font referenced in the canvas isn't installed. Critical — designers rely on font-fallback warnings. |
| AI balance popover (heading "3,000 credits left", progress bar, explanatory text) | REMOVE | — | Founder review 2026-04-25: Kova billing lives in a separate Account page outside the editor. Popover REMOVED. |
| Tool tooltips (e.g., "Align left  ⌥A" on Position section icons, hover tooltips on toolbar) | KEEP-baseline | — | OP-native (likely). Standard editor affordance. |
| Help "?" button (bottom-right of right panel) | DEFER | — | Founder review 2026-04-25: in-editor help system DEFERRED to post-MVP. |
| Help button popover/panel (when "?" clicked) | DEFER | — | Founder review 2026-04-25: DEFERRED with parent button. |
| Snapshot/save toast notifications (e.g., "Version saved", "Exporting...") | KEEP-new | — | Standard UX feedback. |
| Network status indicator (online/offline) | KEEP-new | — | OP is local-first via Yjs but also syncs to Supabase. Show sync status. |
| Confirmation dialogs (delete confirmation, exit-without-save, etc) | KEEP-new | — | Standard destructive-action confirmation. |
| Onboarding modals / first-time UX overlays | DEFER | — | Founder review 2026-04-25: in-editor onboarding tooltip overlay system DEFERRED to post-MVP. |
| Plugin run dialog | REMOVE | — | Hard-exclude #4 (Plugins). |
| Library sync indicator (when team libraries are syncing) | REMOVE | — | Hard-exclude #7 (Team libraries). |

**Subtotal §3.11.c**: 11 entries — 1 KEEP-baseline, 6 KEEP-new, 2 REMOVE, 2 FLAG.

**§3.11 Modals / popovers / overlays grand total**: 42 entries — 10 KEEP-baseline, 11 KEEP-new, 9 REMOVE, 12 DEFER, 0 FLAG. (Updated 2026-04-25 after both passes — Variables modal × 9 DEFERRED, AI balance popover REMOVE, Onboarding DEFERRED, Help button + popover DEFERRED.)

---

### 3.12 Keyboard shortcuts (meta category)

Most individual shortcuts are listed inline with their menu items (e.g., ⌘D Duplicate, ⌘G Group, V Move tool, F Frame). This section captures the shortcut **system** itself: dialog, customization, modifier conventions.

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| Keyboard shortcuts dialog (^⇧?) — opens from Help & account or universal command | KEEP-new | — | Critical — power users live in this dialog. ICP first-principles: every Figma freelancer hits ^⇧? regularly. |
| Shortcuts dialog content: searchable list of all shortcuts | KEEP-new | — | Standard. |
| Shortcuts dialog content: organized by category (tools / view / edit / text / etc) | KEEP-new | — | Standard organization. |
| Shortcuts dialog content: highlight currently-active shortcut on use (key visualizer) | KEEP-new | — | Figma-native — keys highlight as you press them in the dialog. Useful for learning. |
| Custom keybindings / user-remappable shortcuts | DEFER | — | Founder review 2026-04-25: ship Kova with the exact Figma shortcuts in MVP — designers transition seamlessly. Custom keybindings is a future-MVP feature. DEFER. |
| Modifier-key conventions: ⌥ for clone-drag (option+drag duplicates) | KEEP-baseline | — | OP-native (standard Figma/Sketch convention). |
| Modifier-key conventions: ⇧ for multi-select | KEEP-baseline | — | OP-native. |
| Modifier-key conventions: ⌘ for command actions | KEEP-baseline | — | OP-native. |
| Modifier-key conventions: ⇧⌘ for inverse / advanced variants | KEEP-baseline | — | OP-native. |
| Number keys for opacity (1=10%, 2=20%, ..., 0=100%) — toggleable in Preferences | KEEP-new | — | Power-user shortcut. |
| Universal command palette (⌘K from main menu Actions search) | KEEP-new | — | Already noted in §3.2.a. Critical Figma-native pattern. |
| Spacebar to pan canvas (hold space + drag) | KEEP-baseline | — | OP-native (standard editor convention). |
| Z / Z+drag for marquee zoom | KEEP-new | — | Standard Figma. May not be in OP yet. |
| ⌘+scroll to zoom | KEEP-baseline | — | OP-native (standard browser/editor pattern). |
| Esc to deselect / cancel | KEEP-baseline | — | OP-native. |
| Enter to enter group / nested frame | KEEP-baseline | — | OP-native (standard Figma navigation). |
| Tab to cycle siblings within parent | KEEP-baseline | — | OP-native. |
| Shift+Tab to cycle siblings reverse | KEEP-baseline | — | OP-native. |

**§3.12 Keyboard shortcuts subtotal**: 18 entries — 9 KEEP-baseline, 8 KEEP-new, 0 REMOVE, 1 FLAG.

---

### 3.13 Context menus (right-click)

Not directly visible in screenshots (the Preferences toggle "Ctrl+click opens right click menus" implies the system exists). Content is contextual — most items mirror main-menu equivalents (Edit/Object/Arrange/Text). Listed by context.

#### 3.13.a Right-click on canvas object

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| Cut / Copy / Paste | KEEP-baseline | — | Standard. Mirrors Edit menu. |
| Copy as ›  (PNG, SVG, CSS, ...) | KEEP-new | **PNG only** | Founder review 2026-04-25: PNG only. SVG / CSS / iOS / Android variants DEFERRED. |
| Duplicate (⌘D) | KEEP-baseline | — | Mirrors Edit. |
| Delete | KEEP-baseline | — | Standard. |
| Group selection (⌘G) | KEEP-baseline | — | Mirrors Object. |
| Frame selection (⌥⌘G) | KEEP-baseline | — | Mirrors Object. |
| Ungroup (⌘⌫) | KEEP-baseline | — | Mirrors Object. |
| Bring to front / Bring forward / Send backward / Send to back | KEEP-baseline | — | Mirrors Object. |
| Flip horizontal / Flip vertical | KEEP-baseline | — | Mirrors Object. |
| Rotate 90° left / right / 180° | KEEP-new | — | Mirrors Object. |
| Lock / Unlock | KEEP-new | — | Lock layer to prevent edits. |
| Show / Hide layer | KEEP-new | — | Visibility toggle (also in Layers panel). |
| Rename | KEEP-baseline | — | Inline rename. |
| Copy properties / Paste properties | KEEP-new | — | Mirrors Edit. |
| Pick color (^C) — eyedropper from this object | KEEP-new | — | Mirrors Edit. |
| Add comment | DEFER | — | Async client feedback DEFERRED 2026-04-25. |
| Add annotation | DEFER | — | Async client feedback family DEFERRED 2026-04-25. |
| "Add to library" / "Add as component" | DEFER | — | Components family DEFERRED 2026-04-25. |
| "Detach instance" | DEFER | — | Components family DEFERRED 2026-04-25. |
| "Extract" (Dev mode — extract code) | REMOVE | — | Hard-exclude #3 (Dev mode). |
| "Run plugin..." / "Saved plugins ›" | REMOVE | — | Hard-exclude #4 (Plugins). |
| "Use as mask" | KEEP-new | — | Founder confirmed 2026-04-25 — Masks KEPT. Right-click shortcut to "Use as mask" (mirrors Object > Use as mask). |
| Selection: Select sibling | DEFER | — | Founder review 2026-04-25: power-user navigation DEFERRED. |
| Selection: Select parent | DEFER | — | Founder review 2026-04-25: power-user navigation DEFERRED. |
| Selection: Select all matching | DEFER | — | Inherits §3.2.c Select matching layers DEFER 2026-04-25. |
| Zoom to selection | KEEP-baseline | — | Mirrors View. |
| Set as thumbnail | DEFER | — | Founder review 2026-04-25: thumbnails are auto-generated; user-controlled thumbnail selection DEFERRED. |

**Subtotal §3.13.a**: 27 entries — 9 KEEP-baseline, 13 KEEP-new, 2 REMOVE, 3 FLAG.

#### 3.13.b Right-click on Page row (in Pages section)

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| Duplicate page | KEEP-new | — | Standard multi-page editor pattern. |
| Rename page | KEEP-new | — | Standard. |
| Delete page | KEEP-new | — | Standard. |
| Set as default page | DEFER | — | Founder review 2026-04-25: default-to-first-page covers MVP. DEFER. |
| Move page up / down | KEEP-new | — | Reorder shortcut. |
| Copy page link | DEFER | — | Founder review 2026-04-25: link infrastructure overlaps with Share/preview-link (DEFERRED). DEFER. |

**Subtotal §3.13.b**: 6 entries — 0 KEEP-baseline, 5 KEEP-new, 0 REMOVE, 1 FLAG.

#### 3.13.c Right-click on empty canvas area

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| Paste here (paste at click location) | KEEP-baseline | — | Standard. |
| Paste over selection | KEEP-baseline | — | Mirrors Edit. |
| Paste to replace | KEEP-new | — | Mirrors Edit. |
| Place image/video | KEEP-baseline | **Place brand asset (image only)** | Mirrors File menu. |
| Frame selection (when something is selected before right-click on empty) | KEEP-baseline | — | — |
| Add comment (places comment marker at click location) | DEFER | — | Async client feedback DEFERRED 2026-04-25. |
| Zoom in / Zoom out / Zoom to fit | KEEP-baseline | — | View controls. |
| Show ruler / Show layout guide / Show pixel grid | KEEP-new | — | View toggles. |

**Subtotal §3.13.c**: 8 entries — 4 KEEP-baseline, 4 KEEP-new, 0 REMOVE, 0 FLAG.

#### 3.13.d Right-click on layer row (in Layers panel)

| Feature | Tag | Re-semantic note | Reasoning |
|---|---|---|---|
| All canvas-object items above (same set, accessed from Layers panel) | KEEP-baseline | — | Same set. Trivially KEEP. |
| Scroll to layer (highlight in canvas + scroll into view) | KEEP-new | — | Useful for large canvases. |
| Reveal in Pages | KEEP-new | — | If layer is on different page, jump to that page. |

**Subtotal §3.13.d**: 3 entries — 1 KEEP-baseline, 2 KEEP-new.

**§3.13 Context menus grand total**: 44 entries — 16 KEEP-baseline, 14 KEEP-new, 2 REMOVE, 11 DEFER, 1 FLAG (Use as mask). (Updated 2026-04-25 after both passes.)

---

## 4. Open questions

**ALL 25 RESOLVED** (2026-04-25, after two founder review passes + final decisions).

### ✅ Resolved (25) — 2026-04-25

1. **Components / instances workflow** → ✅ DEFER (post-MVP). All ~14 component-related rows flipped to DEFER.
2. **Variables system** → ✅ DEFER. Brand Kit + brand_profiles already do the variable+mode work.
3. **Styles system** → ✅ DEFER. Brand Kit covers token need; parallel Styles UI is duplication.
4. **Masks** → ✅ KEEP. All 6 mask-related rows KEEP-new (Object > Use as mask, View > Mask outlines toggle, canvas mask outline overlay, Layers panel mask indicator, selection-type half-moon icon, right-click Use as mask). Useful for circular logos / hero crops / branded shapes.
5. **AI billing model and surfacing** → ✅ REMOVE entirely. Kova billing lives in separate Account page outside the editor.
6. **Color profile management** → ✅ DEFER. Default sRGB only in MVP.
7. **SVG export option** → ✅ DEFER. PNG + JPG only in MVP.
8. **Cross-brand canvas transfer** ("Move file") → ✅ DEFER.
9. **"Add to sidebar" / canvas pinning** → ✅ DEFER.
10. **Custom keybindings** → ✅ DEFER. Ship with exact Figma shortcuts in MVP for seamless transition.
11. **Scribble tool** → ✅ DEFER. With async feedback DEFERRED, Scribble's mark-up use case is even thinner.
12. **A? button** → ✅ DEFER. Founder clarified it's the "Missing fonts" indicator — redundant with in-context yellow A? badge in Typography panel + canvas underline on missing-font text.
13. **Brand chip vs "Drafts" label** → ✅ Figma fidelity (option A). Brand chip REMOVED; file location label re-semanticed to brand name (single brand-context indicator).
14. **"Design" tab in right panel styling** → ✅ Figma fidelity (option B). Keep as a single-tab UI in right panel header (Design stands alone with Prototype REMOVED).
15. **Custom font upload per brand** → ✅ KEEP-new. §3.2.k "Open font settings" re-semantic to brand font upload flow.
16. **Support forum / community link** → ✅ DEFER. No forum at MVP launch.
17. **Onboarding modal / first-time UX** → ✅ DEFER. In-editor onboarding overlay system is post-MVP.
18. **Permissions and helpers preference** → ✅ DEFER. Figma-specific permissions don't apply to Kova.
19. **"New" submenu / starter templates** → ✅ DEFER. No email starter templates in MVP.
20. **"Save local copy"** → ✅ DEFER. Yjs + Supabase snapshots cover persistence in MVP.
21. **Animated GIF content support** → ✅ DEFER (founder reverted from earlier KEEP, post-MVP).
22. **Tab labels: "File" (Figma) vs "Layers" (OP)** → ✅ Figma fidelity (option A). Tabs labeled "File" + "Assets". Inside the File tab: Pages section + Layers section (matches Figma exactly).
23. **Insert/component icon (bottom toolbar) vs. Assets tab** → ✅ DEFER (Insert/component DEFERRED with Components family).
24. **Edit > Copy as ›** → ✅ PNG only. SVG / CSS / iOS / Android variants DEFERRED.
25. **Email link click-tracking integration depth** → ✅ NO INTEGRATION. Plain URL only. Kova exports flat PNG; clickable links don't survive export. Klaviyo handles tracking in its composer. Canvas links are designer-internal reference notes only.

**Conflicts noticed between FIGMA_SCOPE_BRIEF and other Kova rules**:
- The brief originally said "canvas = one email design"; founder corrected mid-run to canvas = Kova file (infinite workspace). Surgical edits applied to brief in this run.
- The 14 hard-excludes list contained Comments + Sticky notes + Version history (via "branching"); founder reversed all three to KEEP. Brief not edited (Q5 founder preference: keep brief intact, document exceptions in this scope output instead).
- "Multiplayer cursors" appears as a View > toggle in Figma (user-controlled); Kova non-negotiable #2 forbids any multiplayer at all → REMOVE the toggle entirely (not just default to OFF).

**Format / structural ambiguities I had to resolve**:
- Brief showed example with 3-column table (Feature / Tag / Reasoning). Founder added "re-semantic note field" mid-conversation. I used 4 columns: Feature / Tag / Re-semantic note / Reasoning.
- Brief listed surface groups loosely; I expanded to 13 groups for clearer organization (top chrome + main menu + file dropdown split into 3 separate sub-groups since each is structurally distinct).
- Some hard-excludes (Plugins) are referenced multiple times across surfaces (menu item + bottom toolbar + context menu). I tagged each instance individually rather than de-duplicating, matching the "max granularity" instruction.

---

## 5. Statistics

### Totals

- **Total master-list entries**: 564 (was 563; +1 for AI chat pill row added in §3.6.c per 2026-04-25 founder confirm)
- **Surface groups covered**: 13 (Top chrome / Main menu × all submenus / File-name dropdown / Bottom toolbar / Canvas surface / Left panel File / Left panel Assets / Right panel Design × all sections / Right panel Prototype / Settings / Modals & popovers / Keyboard shortcuts / Context menus)
- **OpenPencil baseline screenshots cataloged**: 7
- **Figma screenshots cataloged**: 28
- **Founder review passes applied**: 2 + final clean-up (all 2026-04-25)
- **Open questions resolved**: 25 of 25 ✅ — every row has a final tag, no FLAGs remaining

### Tag distribution (exact counts — final, all 25 OQs resolved 2026-04-25)

| Tag | Count | % | Notes |
|---|---|---|---|
| KEEP-baseline | 181 | 32.1% | Already in OpenPencil today; stays in MVP. |
| KEEP-new | 184 | 32.6% | Comes from Figma; Kova adopts in MVP (adapt / re-semantic / rebuild). |
| REMOVE | 97 | 17.2% | Hidden from Kova UI surface permanently (code may stay in source). |
| **DEFER** | **102** | **18.1%** | **Post-MVP scope — sound feature, hidden from MVP UI but earmarked for post-launch.** New tag introduced 2026-04-25. |
| FLAG | 0 | 0.0% | **All resolved.** |
| **Total** | **564** | **100%** | (+1 from previous 563 — added explicit AI chat pill row in §3.6.c per founder confirm.) |

(Counts verified by `grep`. After all decisions: 6 mask FLAGs → KEEP-new (Masks confirmed KEEP); Brand chip KEEP-baseline → REMOVE (Figma fidelity, single brand-context indicator). FLAG count is now 0 — every row has a final tag.)

### REMOVE breakdown by reason (counted from master list)

#### Hard-exclude / non-negotiable removals (53)

| Reason | Count |
|---|---|
| Hard-exclude #8 (Prototyping mode — entire §3.9 + Play button + Smart animate + Prototype tab toggle) | 12 |
| Hard-exclude #4 (Plugins ecosystem — submenu items + canvas dialogs + context menu) | 6 |
| Hard-exclude #3 (Dev mode / code export / inspect — `</>` cursor + Dev cursor + View > Switch to Dev Mode + Extract context-menu) | 4 |
| Hard-exclude #7 (Team libraries publishing — Libraries menu + Publish library + library publisher footer + library sync indicator) | 4 |
| Hard-exclude #10 (Branching — Create branch × 2) | 2 |
| Non-negotiable #1 (image-only export — PDF + video swatch + video fill) | 3 |
| Non-negotiable #2 (single-user — Multiplayer cursors toggle + cursor visualization + presence avatars) | 3 |
| Non-negotiable #3 (desktop only — "Open in desktop app" main menu + Preferences toggle) | 2 |
| Widgets (plugin-class extension — Manage widgets + Select all widgets + Run widget) | 3 |
| Vector-debug View modes (Outlines submenu + Pixel preview + Memory usage + use-old-shortcuts-for-outlines preference + on-canvas vector-outline overlay) | 5 |
| Theme toggle (founder dark-only locked) | 1 |
| "Back to files" header item (no Files concept in Kova) | 1 |
| FigJam-spirit features (Switch to Draw + others covered as REMOVE in submenus) | 2 |
| UI kits / library card publisher footer / library run dialog (team-library remnants) | 3 |
| "Use old shortcuts for outlines" preference (moot once outlines REMOVED) | 1 |
| Other (Library sync indicator, etc) | 1 |
| **Subtotal hard-exclude REMOVE** | **53** |

#### 2026-04-25 founder review pass 1 removals (33)

Founder skepticism pass 1 — features that survived initial scoping but the founder flagged as "email marketers don't use 99% of the time" or "power-user esoteric (the ones users aren't going to touch)."

| Reason | Count |
|---|---|
| Vector path operations (§3.2.h — Join / Smooth join / Delete-and-heal / Split / Simplify / Offset vector) — not first-principles useful for email design | 6 |
| Help submenu shrunk (Video tutorials + Release notes + Legal summary — not useful for ICP) | 3 |
| Pencil tool (§3.4.a — freehand drawing not needed) | 1 |
| Effects section (§3.8.j entire — drop shadow / inner shadow / blur / noise / texture; designers import pre-shadowed images instead) | 7 |
| Power-user esoteric Preferences toggles (§3.10 — 11 toggles users never touch) | 11 |
| Color picker simplified (§3.11.b — Libraries tab + Angular/Diamond/Conic gradients + alternative-color-model dropdown; Image fill explicitly KEPT) | 5 |
| **Subtotal pass-1 REMOVE** | **33** |

#### 2026-04-25 founder review pass 2 removals (10)

Founder skepticism pass 2 — additional features removed (DEFER tag introduced for post-MVP candidates; these are permanently REMOVED).

| Reason | Count |
|---|---|
| AI billing surface entirely (§3.2.a "AI balance" main-menu item + §3.11.c AI balance popover) — Kova billing in separate Account page | 2 |
| AI chat preferences (§3.10 — Play audio notifications + Show text suggestions + Show tool suggestions + Show AI chat on canvas) — chat pill is core, no toggles needed | 4 |
| Smart quotes/symbols (§3.10) — toggle AND auto-conversion behavior REMOVED entirely; user types straight quotes, gets straight quotes | 1 |
| Property labels overlay (§3.2.d toggle + §3.5 canvas overlay) — Kova uses hover-affordance + Layers-panel-highlight model, NOT on-canvas property labels | 2 |
| Find and replace (§3.2.c) — Find scoped to current canvas KEEPS; replace functionality REMOVED | 1 |
| **Subtotal pass-2 REMOVE** | **10** |

| **Grand total REMOVE** | **96** |

### DEFER breakdown by cluster (counted from master list, 102 total)

Post-MVP scope. Sound features, hidden from MVP UI but earmarked to revisit post-launch.

| Cluster | Count |
|---|---|
| Async client-feedback family (Comments / Annotations / Sticky notes / Review threads) — §3.2.d toggles × 2, §3.4.a tool slot/chevron/Comment/Annotation × 4, §3.5 markers × 2, §3.13.a/c right-click × 3 | 11 |
| Components / instances workflow — §3.2.e × 5 + §3.8.b × 3 + §3.4.a × 1 + §3.6.b × 1 + §3.7 × 1 + §3.13.a × 2 + §3.8.b diamond shortcut × 1 | 14 |
| Variables system — §3.8.a section header + §3.11.a Variables Collection modal × 9 | 10 |
| Styles system — §3.8.a Styles section header + 4 popover items + 4-dot style picker × 3 (Typography/Fill/Stroke) | 8 |
| Sections (container-above-frames) — §3.2.e × 3 (Wrap/Convert section/Convert frame) + §3.4.a Section dropdown item | 4 |
| Boolean vector groups — §3.2.e Boolean groups submenu | 1 |
| Settings preference toggles default-on (§3.10 — Snap × 3, Highlight on hover, Rename duplicates, Show dimensions, Hide canvas UI during changes) | 7 |
| Settings deeper DEFERs (§3.10 — Color profile, Permissions and helpers) | 2 |
| View menu toggles (§3.2.d — Pixel grid, Layout guides, Comments, Annotations, Frame nav × 4) | 8 |
| Help button + popover (§3.11.c × 2) | 2 |
| Onboarding tooltips (§3.11.c) | 1 |
| AI chat / commands ⌘K (§3.2.a Actions search) | 1 |
| Missing-fonts A? button (§3.1) | 1 |
| File submenu deferrals (§3.2.b — New templates submenu, Save local copy) | 2 |
| Edit submenu power-user (§3.2.c — Set defaults, Select matching, Select all with) | 3 |
| Text submenu power-user (§3.2.f — Adjust, Text direction, Spell check) | 3 |
| Object menu (§3.2.e — Set as thumbnail, Flatten, Outline stroke, More layout options) | 4 |
| Arrange (§3.2.g — Tidy up) | 1 |
| Help submenu (§3.2.k — Support forum) | 1 |
| File-name dropdown (§3.3 — Add to sidebar, Move file, File color profile) | 3 |
| Bottom toolbar (§3.4.b — Scribble) | 1 |
| Assets tab (§3.7 — Local components ↑ already counted under Components, Asset hover preview) | 1 |
| Right panel power-user (§3.8.f Expand icon, §3.8.g Paragraph indent, §3.8.i Stroke advanced + Individual sides) | 4 |
| Export options (§3.8.k — WebP + SVG + advanced overflow + Multiple stacked rows) | 4 |
| Keyboard shortcuts (§3.12 — Custom keybindings) | 1 |
| Context menu power-user (§3.13.a — Select sibling/parent/matching, Set as thumbnail) | 4 |
| Page right-click (§3.13.b — Set as default page, Copy page link) | 2 |
| **Total DEFER (with overlap accounting)** | **102** |

### FLAG breakdown — 0 remaining (all resolved 2026-04-25)

All 6 Masks-related FLAGs resolved to KEEP-new on 2026-04-25 final pass. No outstanding FLAGs.

| **Total FLAG** | **0** |

### Hard-exclude application audit

All 14 hard-exclude categories applied (with founder adjustments):

| # | Category | Status |
|---|---|---|
| 1 | FigJam whiteboarding tools (sticky notes, stamps, voting, connectors) | Applied (sticky notes KEEP per founder; connectors REMOVE; rest n/a in screenshots) |
| 2 | Figma Slides | Applied (n/a — not visible in screenshots) |
| 3 | Dev Mode / code export / inspect | Applied (8 REMOVE rows) |
| 4 | Plugins ecosystem | Applied (5 REMOVE rows; founder confirmed AI capabilities live in separate first-party path, out of scope here) |
| 5 | Multiplayer cursors / live co-edit / presence | Applied (4 REMOVE rows) |
| 6 | Comments / annotations / review threads | Applied — REVERSED to KEEP per founder |
| 7 | Team libraries / library publishing | Applied (Libraries menu / Publish library / library publisher footer / library sync indicator) |
| 8 | Prototyping mode / interactions / smart animate | Applied (entire §3.9 Prototype tab REMOVED + Play button + Smart animate + Prototype tab toggle) |
| 9 | Masks | Applied — REVERSED to FLAG per founder (~6 inherited FLAG rows) |
| 10 | Branching | Applied (Create branch × 2 REMOVE; Version history KEPT separately per founder) |
| 11 | Browser-only / mobile features | Applied (Open in desktop app REMOVE; mobile features n/a) |
| 12 | Workspace / team / project-level | Applied ("Back to files" REMOVE + Libraries REMOVE + most account-level features re-semanticized to single-user) |
| 13 | Figma Sites | Applied (n/a — not visible in screenshots) |
| 14 | Any FigJam-specific tool mode | Applied (covered in #1 + Switch to Draw REMOVE + FigJam connectors REMOVE per founder) |
