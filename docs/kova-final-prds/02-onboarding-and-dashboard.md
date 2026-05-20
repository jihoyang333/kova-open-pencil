# PRD 02 — Onboarding & Dashboard

## 0. Status & ownership

| Field | Value |
|---|---|
| **Status** | `DRAFT` 2026-05-15 (awaiting founder review) |
| **Wave** | 2 |
| **Author** | Claude (Opus 4.7) |
| **Reviewer** | Jiho Yang (founder) |
| **Last updated** | 2026-05-15 |
| **Depends on PRDs** | 01 (Auth & Identity — for `/auth/callback` post-redirect logic, `users.preferences` JSONB column, viewport guard pattern), 11 (Shared UI Infrastructure — `useToast`, `<KovaModal>`, skeletons, empty-state component, offline indicator) |
| **Blocks PRDs** | 03 (Brand Management — consumes the brand-picker chrome + sidebar selector + new-brand flow this PRD ships), 06 (Canvas Editor Core Chrome — consumes `B11` canvas-creation transition + the "Back to dashboard" navigation contract) |
| **Source artifacts** | Hi-fi: 7 files (A1 onboarding, 03 dashboard, B11 canvas transition, B7 skeletons, B9 empty, A11+A12+A13 nav, B12 brands). 03 doc: implicit (no direct §2 rows — dashboard is not in canvas-side inventory). Q-decisions: Q17 (brand-switching only via dashboard sidebar — REVERSED 2026-04-25), Q5 Layer 2 (last-active brand persisted in localStorage). Audit §2.A Cluster 02 (lines 1105–1182) + §5.6 item 1 (M9 light→dark refactor) + `00e §6 #2(a)` (access_token security recategorization). |

---

## 1. Problem & outcome

### 1.1 Plain language (for founder)

After a user signs up (PRD 01 owns the auth flow), they need to land somewhere useful. This PRD ships that landing surface in two pieces. **First-brand onboarding** is the 4-screen wizard that catches a brand-new user with no brands yet: (1) brand name + website + auto-fetched logo, (2) Shopify connect or skip, (3) brand-kit populate (drop assets + paste guidelines, AI extracts colors / fonts / voice on commit — Cluster 05 owns the extract Edge Function; this PRD ships the upload UI), (4) splash confirming the workspace is ready. **The dashboard** is the daily landing once a user has at least one brand: a left sidebar (brand selector at top, search input, nav sections for Home/Library/Brand, account footer), a topbar (breadcrumb "Brand · Home", "New canvas" button), and a content pane (AI composer hero + recent files grid with 4-column layout + status tags + thumbnails). The dashboard is the **only** place a user can switch brands (Q17 reversal 2026-04-25 — no in-canvas brand picker). When a user clicks "Generate on canvas" in the composer or "New canvas" in the topbar, the canvas-creation transition (B11) plays for ≤500ms before routing to the editor. Empty states for zero canvases (A11.1) and zero brands (A11.7) ship with the chrome. Offline indicator (A13) lives in the sidebar footer + topbar pill + per-pane banner.

### 1.2 Caveman summary (per CLAUDE.md communication style)

User sign up → no brand yet → onboarding wizard (brand → Shopify → kit → splash). User has brand → dashboard. Dashboard sidebar = brand switcher + nav + search. Dashboard content = AI composer + recent files grid. New canvas = composer submit OR topbar button → B11 transition (≤500ms) → editor. Brand switch only from dashboard sidebar — never inside canvas (Q17). Empty states for zero canvases + zero brands. Offline pill in sidebar footer. M9 StoreTypeStep is light-themed — fix to dark before launch. Shopify OAuth access_token in URL — fix to httpOnly cookie or Bearer header before launch (security launch-blocker).

### 1.3 Outcome (acceptance gate)

User can: (1) complete the 4-step onboarding wizard from a fresh sign-up — brand identity (name + URL + auto-logo), Shopify connect or skip, brand-kit drop, splash; (2) skip Shopify and Brand-Kit and still reach the dashboard; (3) re-enter onboarding mid-flow without losing prior step data; (4) land on the per-brand dashboard with sidebar + topbar + AI composer + recent files grid + empty states; (5) switch brands via the sidebar `.brand-switch` popover that lists active brands and offers "Manage brands" → routes to `/account/brands` (Cluster 03/04); (6) create a new canvas via composer "Generate on canvas" OR topbar "New canvas" — sees B11 transition then lands in editor; (7) search the file grid (200ms debounce); (8) sort the file grid (default: most-recent-first, also name + created-date); (9) see B7.1 skeleton during dashboard initial load; (10) see B9-pattern empty state when search returns zero; (11) sees A11.7 "Add your first brand" empty when no brands exist; (12) sees A13 offline indicator when network drops. M9 `StoreTypeStep.vue` and `IntegrationsCard.vue` refactored to dark theme. Shopify OAuth flow uses httpOnly cookie or `Authorization: Bearer` header for `access_token` — never a URL query string.

---

## 2. Scope

### 2.1 In scope (this PRD)

**Onboarding wizard (4 steps + splash, dark):**
- Step 1 (A1.01.c): First brand — name, URL, auto-fetched logo, optional one-line description
- Step 2 (A1.01.d): Shopify OAuth connect — REUSES M9 `StoreTypeStep.vue` LOGIC, **REFACTORED to dark theme** (§5.6 item 1). Skip-for-now is a real path.
- Step 3 (A1.01.e): Brand-kit populate — drop assets (PDF/HTML/EML/PNG/JPG ≤25MB each) + paste guidelines textarea + "Kova will extract" AI surface. This PRD ships the UI shell + file upload. The **extract Edge Function** (`api/shopify/brand-kit-extract.ts` extended to scrape storefront + Claude voice inference per §5.6 item 3) is owned by **Cluster 05**. Confirm-before-write guardrail (per `00e §6 #5` D-3) lives in Cluster 05 review surface.
- Step 4 (A1.01.f): Splash — single primary CTA "Enter {Brand} workspace" + 2×2 starter cards (Draft your first email · Bring in past sends · Kova swipes · Another brand)
- Progress strip: 5-segment dot row at top of frame (`done` / `active` / upcoming via `--ink-3` / `--ink` / `--line-2` tokens per A1 spec)
- Wizard composable: `use-onboarding.ts` — orchestrates step state, validates per-step, persists draft in `sessionStorage` so a refresh mid-wizard does not erase prior input
- Onboarding-complete trigger: `useOnboardingComplete` calls `useBrandsStore.createBrand(...)`; on success the splash routes to `/brand/{brandId}`
- Auto-fetch logo from URL: debounced 600ms favicon-probe (HEAD `/favicon.ico` → on 200 use it; on 404 fall back to first-letter monogram; user can override with file picker)

**Dashboard chrome (dark):**
- Vue Router: `/brand/:brandId` (home), `/brand/:brandId/recents` (alias for home active-nav state), `/brand/:brandId/calendar` (A12 "coming soon" — Phase 2 destination but route exists), `/brand/:brandId/products`, `/brand/:brandId/personalization` (placeholder), `/brand/:brandId/knowledge-base` (placeholder), `/brand/:brandId/memories` (placeholder)
- Sidebar: brand-switch button (current brand + caret) → opens Reka DropdownMenu listing all active brands + "Manage brands" link (routes to `/account/brands` — B12 page, MVP per 2026-05-17 reversal, owned by PRD 03/04) + "New brand" affordance; search input (no Cmd+K shortcut — palette dropped per 00g 2026-05-17); nav sections (Home, Library, Brand) with "SOON" pill on every nav row whose route renders `ComingSoonView` — **Calendar, Swipes, Templates, Products, Personalization, Knowledge Base, Memories** (7 items, matching the 7 ComingSoon route registrations in §6.1) — but **NOT on the Brands item** (Brands ships visible at MVP per §12.11 Part B RESOLVED 2026-05-17 — A-LOW5 reconciles sidebar list with route map); side-footer with avatar + name + plan + more dropdown
- Topbar: breadcrumb (Brand → current page), "New canvas" button
- Content pane: greeting ("Good morning/afternoon/evening, {Name}"), composer hero (AI input + 5 preset chips + "Generate on canvas" CTA), Recent files section header (sort dropdown + grid/list view toggle), file grid (4 columns at 1440px, responsive collapse to 2 at <1024 — but viewport guard from Cluster 01 catches <1024 first)

**File grid:**
- Grid view (4 cols), list view toggle (Phase A ships grid; list defers to Phase B if scope permits — recommended ship both since list view is one Pinia state flip)
- File card: thumbnail (4:3 aspect) + status tag (Scheduled / Ready / Draft) + frame-count badge + title + sub-meta (relative timestamp + frame count or test type)
- Empty thumbnails per Q-decision: block-level email-frame abstractions — `.thumb-frame` (single email), `.thumb-flow` (3-mini-frames + arrows), `.thumb-ab` (A/B split halves). Real canvas thumbnails (PNG renders) override the abstractions when available (Cluster 09 owns thumbnail generation cron; this PRD reads `canvases.thumbnail_url`)
- Sort: default `recent` (by `canvases.updated_at DESC`), also `name` (alpha asc), `created` (by `canvases.created_at DESC`)
- Search: scoped to current brand; matches `canvases.name` (case-insensitive); 200ms debounce
- Empty grid state (no canvases yet — new brand): A11.1 — "No canvases yet" + primary "New canvas" + secondary "Start with AI"
- Search-empty state: B9 pattern — "No canvases match 'foo'" + clear-filters CTA

**AI composer hero:**
- Single-line input with "How can I help you today?" placeholder
- 5 preset chips below (Promote a sale · Showcase a product · Teach customers · Share reviews · Build community) — click seeds composer with recipe text
- Attach button (`+` icon — wires to file picker for Phase 2; in MVP hidden until Cluster 05 drag-drop lands per §12.8)
- Submit: ⌘↵ shortcut hint + "Generate on canvas" pill button
- Submit handler → `useCanvasesStore.createCanvas(brandId, draft_prompt)` → routes to `/editor/{canvasId}` with B11 transition state (B11.2 submitting → B11.3 review → B11.4 splash → editor)

**B11 canvas-creation transition:**
- B11.1 idle (composer with prompt typed) → B11.2 submitting (input read-only, submit button replaced with loader-2 spinner, "Creating canvas…" caption fades in) → B11.3 review (input shows typed prompt as review line, "almost there" status with accent-check tick) → B11.4 splash (full-viewport spinner cap, ≤500ms in prod, dissolves into editor)
- Same chrome dimensions byte-identical across B11.1/B11.2/B11.3 so no layout shift

**Empty states + skeletons:**
- B7.1 dashboard skeleton (shown on initial `fetchCanvases()` while in flight; 4×2 placeholder grid mirrors populated layout)
- A11.1 zero canvases (new brand, no files)
- A11.7 zero brands (first login, no brands yet — but onboarding catches this so A11.7 appears only if brand list goes empty after archive/delete: routes to `/brands/picker` or back through wizard — confirm in §12)
- B9-pattern search-empty: "Nothing matches '{query}' here — Clear filters"

**Offline indicator — CONSUMER of Cluster 11 `<NetworkStatusIndicator>` (CT-020):**
- This PRD owns ZERO offline UI surface. Cluster 11 §6.4 ships `<NetworkStatusIndicator>` (Figma-style 14×14 `cloud-off` icon + `KovaTooltip`, renders nothing while online) and Cluster 11 §3.7 mounts it globally in `App.vue` (commit f08fa551 — C-MED-11.5).
- The legacy A13.1 topbar "Online" pill, A13.2 sidebar `.net-strip`, and per-pane offline banner variants are RETIRED per 2026-05-17 founder decision (recorded in Cluster 11 §6.4).
- Detection composable: Cluster 11 §2.4 `useOnlineStatus` (combines `navigator.onLine` + Supabase Realtime channel heartbeat). Cluster 02 does NOT call this composable directly — it is encapsulated inside `<NetworkStatusIndicator>`.

**Coming-soon shells (A12):**
- `/brand/:brandId/calendar`, `/brand/:brandId/swipes`, `/brand/:brandId/templates` — each renders the canonical coming-soon shell (icon-tile + eyebrow + headline + 3-row roadmap + 2-CTA "Notify me" + "Read the roadmap")
- Sidebar items for these routes show a `SOON` pill on the right (existing `.pill` token, 9px font)

**M9 reuse refactors (§5.6 item 1):**
- `src/components/onboarding/StoreTypeStep.vue` — REFACTOR Tailwind utility classes from light to dark per kova-hifi.css tokens. Logic untouched (`normalizeShopDomain`, OAuth start, polling fallback)
- `src/components/dashboard/IntegrationsCard.vue` — REFACTOR same way (also rendered on dashboard banner pre-Shopify-connect state per existing pattern)

**Security launch-blocker (§5.4):**
- M9 Shopify OAuth start currently passes `access_token` as a URL query parameter. **Fix to either `Authorization: Bearer` header on a POST OR an httpOnly cookie set server-side**. Verified zero `access_token=` literals in `src/` post-fix. Owner: this PRD.

### 2.2 Out of scope (handed to other clusters)

| Item | Owning PRD |
|---|---|
| Brand record CRUD (create / archive / delete / restore RPCs) | 03 — Brand Management. **This PRD only calls `useBrandsStore.createBrand`; the store action itself is owned by 03 (already exists, this PRD verifies it's wired).** |
| `/account/brands` full-page brand management (B12) | 03 (or 04 — see §11 cross-cut; B12 lives at `/account/brands`, which is Account-page territory) |
| New-brand modal (A2/A3 flow outside the first-brand wizard) | 03 |
| Brand-picker route (A2 chromeless between-brands picker at `/brands`) | 03 |
| Brand-kit-extract Edge Function + Claude voice inference | 05 — Brand Kit & Drag-Drop |
| Confirm-before-write brand-voice review UX | 05 (per `00e §6 #5` D-3) |
| Account page (`/account`) | 04 |
| Stripe billing / plan badge data source | 04 (this PRD reads `users.plan` field for sidebar footer plan label only; column ships in 04's migration) |
| Canvas editor chrome (topbar / toolbar / panels) | 06 |
| Canvas engine + scene graph + renderer | 07a / 07b |
| Canvas right-click context menus | 08 |
| File-card right-click context menu (rename / duplicate / move to trash) | 08 (cross-cut — file-grid is dashboard, but right-click shell lives in 08) |
| Version history + restore | 09 |
| Trash UI + restore | 09 (existing `MoveToTrashDialog.vue` lives in `components/dashboard/` — this PRD verifies the dashboard topbar trash entry but 09 owns the trash view) |
| AI chat panel + memory | 10 |
| Toast component, `<KovaModal>`, `useConfirm`, skeleton primitives, empty-state primitive, offline-detection cross-cut | 11 |
| User preferences storage (Layer 1 server JSONB) | 12 (this PRD persists `lastActiveBrandId` to Layer 2 localStorage via `useLocalStorage` per Q5 schema) |
| Avatar dropdown menu items (Account / Help / Shortcuts / Sign out) | 06 (canvas-side topbar) and this PRD (dashboard sidebar footer dropdown — same `AccountMenu.vue` component, already exists). Item set per Q16. |

### 2.3 Deferred to Phase 2

- File-list view (list mode toggle in file grid — defer if Phase-A scope tight; recommended ship since it's a 30-line addition)
- Calendar route content (A12.1 — Phase 2 destination, shell ships now)
- Swipes route content (A12.2 — same)
- Templates route content (A12.3 — same)
- Personalization, Knowledge base, Memories sub-route content (sidebar nav exists but routes render placeholders pointing to Cluster 05 / 10 — confirm placeholder strategy in §12)
- Composer attachments (Phase 2 — MVP hides the `+` button until Cluster 05 drag-drop lands)
- AI chip presets that seed full multi-line recipe (MVP seeds a short label; Cluster 10 owns full recipe templating)
- Dashboard customization (rearrangeable sections) — out of MVP entirely
- Multi-select on file grid (bulk archive / move to trash) — Phase 2

### 2.4 Cross-cut acknowledgments (foreign owners)

- **Cluster 11** owns: `useToast()`, `<KovaModal>`, `useConfirm()`, skeleton primitive (`<KovaSkeleton>`), empty-state primitive (`<EmptyState>` — note: existing `src/components/dashboard/EmptyState.vue` is the M9-era component and may be lifted into Cluster 11; this PRD consumes by name), offline state composable (`use-offline-state.ts`). **Command-K palette dropped from MVP entirely per 00g 2026-05-17 — no longer a Cluster 11 deliverable.**
- **Cluster 01** owns: `/auth/callback` post-redirect logic per A15.06 annotation — (no brands → `/onboarding`, one brand → `/brand/{brandId}`, multi → `/brands/picker`). This PRD specifies the **interface** Cluster 01 reads from: `useBrandsStore.brands.length`.
- **Cluster 03** owns: `useBrandsStore.createBrand` action body (already exists; this PRD verifies it's compatible), archive/delete RPCs, new-brand modal outside the wizard, `/account/brands` page, brand-color auto-assign palette logic.
- **Cluster 05** owns: brand-kit-extract Edge Function and the confirm step UX. This PRD's onboarding step 3 uploads files + posts guidelines into a payload **Cluster 05** consumes downstream. The "Kova will extract" AI surface in step 3 is a UI promise — actual extract execution happens server-side in Cluster 05's flow.

---

## 3. Visual spec

Every surface maps to a hi-fi file + scene ID. Engineers cite the file + scene when implementing.

### 3.1 Onboarding wizard (DARK, 5 segments)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Wizard step 1 · first brand | `/onboarding/brand` | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A1 Onboarding - Dark.html` | A1.01.c | 480px card · onb-id-row (64px logo slot + 2-field stack) · affixed input `https://` prefix · onMount logo auto-fetch debounce |
| Wizard step 2 · Shopify connect | `/onboarding/shopify` | same | A1.01.d | 480px card · connect surface (`.onb-connect`) with shop URL affixed input (`https://` + `.myshopify.com`) · scope list (3 lines: data we read / images / what we don't access) · "Skip for now" + "Connect Shopify" peer ghost+primary actions |
| Wizard step 3 · brand kit | `/onboarding/brand-kit` | same | A1.01.e | 560px wide card · drop zone (`.onb-drop`) · file list (`.onb-files`) · guidelines textarea (`.onb-textarea`) · AI extraction promise card (`.onb-ai` with accent border/bg) · "Do this later" + "Extract and continue" actions |
| Wizard step 4 · splash | `/onboarding/done` | same | A1.01.f | 480px card · 56×56 success medal · 2×2 next-move grid (`.onb-next`) · "Enter {Brand} workspace" primary |
| Wizard re-entry · resume welcome (existing M9 `WelcomeStep.vue`) | `/onboarding` | (existing M9 — defer to current implementation) | n/a | Existing route; this PRD makes sure resume mid-flow restores prior step data from `sessionStorage` |

**Notes:**
- Auth (A1 step 01.a + 01.b) lives in Cluster 01 — that PRD ships signup/login. The wizard here picks up at step 01.c (first brand).
- Progress strip: 5 dot segments — but only 4 steps drive segment fills (Welcome from Cluster 01 fills dot 1; this PRD's steps fill dots 2–5). Annotate scenes so engineers don't off-by-one.
- Step 3 AI surface uses `--accent-soft` + `--accent-2` + `--accent-ink` tokens — accent reserved for inference surfaces per design.md coherence rule.

### 3.2 Dashboard chrome (DARK, populated state)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Brand dashboard · home | `/brand/:brandId` | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi 03 Brand Dashboard - Dark.html` | 03.a | Sidebar (`.sidebar`) + main (`.main`) split: 236px / 1fr. Sidebar contains `.brand-switch` (logo + name + caret) + `.side-search` (plain search input — no Cmd+K shortcut hint per 00g 2026-05-17) + `.nav` (3 sections: Home / Library / Brand) + `.side-footer` (avatar + name + plan + more). Topbar (`.topbar`, 52px) has `.breadcrumb` ("Brand → Home") + actions ("New canvas" sm button). Content (`.content`, padded 48 32 40) shows `.greeting` ("Good morning, {Name}") + `.composer` (input wrap 760px max-width + 5 chips) + Recent files section header (`.sec-head` with count + sort filter + view toggle) + `.file-grid` (4 cols, 14px gap, 4:3 thumbs) |
| Brand dashboard · sidebar brand-switcher popover (open state) | same | A2/A3 brand-switcher pattern (cross-cut) | A2.a (per A11 reference — Cluster 03 owns full A2 spec) | Reka DropdownMenu anchored to `.brand-switch` chevron — lists every active brand with logo glyph + name, divider, "Manage brands" → `/account/brands`, divider, "+ New brand" → opens new-brand modal (Cluster 03 owns modal) |

### 3.3 Canvas-creation transition (DARK)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| B11.1 composer idle | `/brand/:brandId` (composer focused) | `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B11 Canvas Creation Transition - Dark.html` | B11.1 | Reference snapshot — composer wrap 760px max + 14px radius + 18/20/12 padding · prompt typed · submit-button visible · chips below |
| B11.2 composer submitting | same | same | B11.2 | Input read-only · prompt text `--ink-2` · submit replaced inline by Lucide `loader-2` spinning 14×14 · caption "Creating canvas…" fades in below wrap |
| B11.3 composer transition | same | same | B11.3 | Input shows typed prompt as `.composer-input.review` line (`--ink-2`) · status carries `.composer-status.ready` with accent-tick · main-pane begins `transition-fade` (opacity 1 → 0 over 240ms) · chrome dims · wrap chrome dimensions never move |
| B11.4 splash hand-off | `/editor/:canvasId` (initial frame) | same | B11.4 | Full-viewport spinner cap (`.splash-spinner`) over `--bg` · ≤500ms in prod · dissolves into editor on `Yjs.ready` |

### 3.4 Skeletons (DARK)

| Surface | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|
| Dashboard skeleton (initial load) | `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B7 Loading Skeletons - Dark.html` | B7.1 | Mirrors dashboard chrome byte-identical — sidebar shows shimmer rows in place of brand-switch/nav, topbar shows shimmer-filled breadcrumb, content shows greeting shimmer + composer-wrap shimmer + 4×2 file-card shimmer grid. Shimmer animation: `var(--rail)` → `var(--fill)` 1.4s ease-in-out infinite |

### 3.5 Empty states (DARK)

| Surface | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|
| Zero canvases (new brand, no files) | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html` | A11.1 | `.empty-pane` inside `.content` — 40px icon-in-circle (`layout-grid`), "No canvases yet" headline, sub-copy, CTA row: primary "New canvas" + secondary "Start with AI" (with accent icon) |
| Zero brands fallback (post-delete edge) | same | A11.7 | Same component — `store` icon, "Add your first brand" headline, single primary "New brand". Reached if user deletes every brand and lands back on `/brand/{archived-or-missing}` — auth guard re-routes to `/onboarding`. Confirm flow in §12. |
| File-grid search empty | `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B9 List Search Empty - Dark.html` | B9-pattern (apply to file grid; B9.1–B9.3 are Brand-Kit-internal scenes but the pattern is reusable) | `.empty-pane` smaller variant — `search-x` icon, "Nothing matches '{query}' here", sub-copy, "Clear search" ghost CTA |

### 3.6 Coming-soon shells (DARK, A12 pattern)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Calendar (Phase 2) | `/brand/:brandId/calendar` | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html` | A12.1 | Sidebar + topbar normal; main content shows `.cs-pane` — icon-tile + "Phase 2 · planning surface" eyebrow + headline + 3-row roadmap + "Notify me when it's ready" + "Read the roadmap" |
| Swipes (Phase 2) | `/brand/:brandId/swipes` | same | A12.2 | Same shell, `bookmark` icon |
| Templates (Phase 2) | `/brand/:brandId/templates` | same | A12.3 | Same shell, `layout-template` icon + 2-tab strip ("Templates" / "Examples") |

### 3.7 Network state (DARK) — owned by Cluster 11 (CT-020)

| Surface | Owner | Notes |
|---|---|---|
| Online | Cluster 11 `<NetworkStatusIndicator>` | Renders nothing — the indicator is silent while online (Figma-parity). |
| Offline | Cluster 11 `<NetworkStatusIndicator>` | Single 14×14 `cloud-off` lucide icon mounted at top-right of the viewport via `App.vue` global mount (Plan 11 §3.7 / commit f08fa551). Hover surfaces `<KovaTooltip>` copy "You're offline. Changes are saved locally and will sync when you reconnect." |
| Sidebar `.net-strip`, topbar `.pill.warn.dot`, per-pane `.offline-banner` | **RETIRED** | A13.1 / A13.2 three-signal pattern retired 2026-05-17 in favor of the single-icon indicator. Do NOT re-introduce these surfaces in this PRD or Plan 02. |

### 3.8 Cross-references (not owned by this PRD but cited)

| Surface | Hi-fi file | Why cited |
|---|---|---|
| `/account/brands` populated · archived · restore · delete | `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B12 Brands page - Dark.html` | The sidebar `.brand-switch` "Manage brands" link routes here. This PRD ships the link; Cluster 03/04 ships the page. |
| A2 brand picker · A3 new brand | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html` | The "+ New brand" item in the dropdown routes to Cluster 03's new-brand modal. The brand-switch sidebar in this PRD uses A2's brand-card chrome pattern. |
| A_canvas_nav · brand-label click destination | A11 file | Canvas editor (Cluster 06) navigates back here. This PRD ships the `/brand/:brandId` dashboard target. |

### 3.9 Design system references

All dashboard + onboarding routes are DARK. Set `data-theme="dark"` on `<html>` via `meta.theme` router meta (Cluster 11 owns runtime theme swap).

- Tokens: `main-main-kova-scope/design-system/kova-hifi.css` `:root` block → Tailwind `@theme` in `app.css`
- Component primitives consumed verbatim from canonical CSS: `.btn`, `.btn.primary`, `.btn.sm`, `.btn.ghost`, `.btn.accent`, `.pill`, `.pill.ok.dot`, `.pill.warn.dot`, `.pill.outline`, `.empty-pane`, `.field`, `.input`, `.seg`, `.kbd`, `.cs-pane`
- Page-local CSS lifted from A1 + 03 hi-fi inline styles per design.md §6 "Extending the system": `.onb-shell`, `.onb-progress`, `.onb-stage`, `.onb-card`, `.onb-field`, `.onb-input-affixed`, `.onb-id-row`, `.onb-stack-card`, `.onb-connect`, `.onb-drop`, `.onb-files`, `.onb-ai`, `.onb-splash`, `.onb-next`, `.sidebar`, `.brand-switch`, `.side-search`, `.nav`, `.side-footer`, `.topbar`, `.composer`, `.composer-input-wrap`, `.composer-input-tools`, `.composer-chips`, `.composer-chip`, `.greeting`, `.sec-head`, `.file-grid`, `.file-card`, `.thumb`, `.thumb-frame`, `.thumb-flow`, `.thumb-ab`

---

## 4. Data model

### 4.1 Schema migrations

This PRD makes **no net-new tables**. Brands + canvases tables already exist (`20260317_m2_dashboard.sql`). One small migration adds an index supporting the file-grid sort:

```sql
-- ============================================================
-- Migration 20260520_02_dashboard_indices.sql
-- Cluster 02 Onboarding & Dashboard — index support for file grid + search
-- Pairs with: 20260317_m2_dashboard.sql (creates public.brands + public.canvases)
-- ============================================================

BEGIN;

-- ---- 1. Index supporting file-grid default sort + brand-scope lookup ----

-- Recent-first sort, per-brand, excluding trashed rows.
-- Critical path: dashboard render fetches `canvases WHERE brand_id = $1 AND trashed_at IS NULL ORDER BY updated_at DESC`.
CREATE INDEX IF NOT EXISTS idx_canvases_brand_recent
  ON public.canvases(brand_id, updated_at DESC)
  WHERE trashed_at IS NULL;

-- Name-search index (trigram for case-insensitive contains-match).
-- pg_trgm extension required — verify via `CREATE EXTENSION IF NOT EXISTS pg_trgm`.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_canvases_name_trgm
  ON public.canvases USING gin (name gin_trgm_ops)
  WHERE trashed_at IS NULL;

-- Per-user brand recency for sidebar dropdown sort (active brands by recency).
CREATE INDEX IF NOT EXISTS idx_brands_user_recent
  ON public.brands(user_id, updated_at DESC);
-- NOTE: archived_at column lands in Cluster 03's migration (20260520_03_brands_archive.sql).
-- Once Cluster 03 ships, augment this index with `WHERE archived_at IS NULL` via a separate ALTER INDEX
-- (or recreate). Documented as cross-cut in §11.

COMMIT;
```

**Notes:**
1. No SQL changes to existing brands or canvases column structure. Cluster 03 adds `brands.archived_at` and `brands.color`. `canvases.thumbnail_url` already exists (per `20260317_m2_dashboard.sql` line 41) — this PRD reads it.
2. `pg_trgm` is a Supabase-supported extension. CREATE is idempotent.
3. Search query: `WHERE name ILIKE '%' || $query || '%'` against the GIN trigram index keeps server-side search under ~5ms even at 10k canvases per user.

### 4.2 RLS policies

Existing RLS in `20260317_m2_dashboard.sql` is sufficient:

| Table | Existing policy | Verified for this PRD |
|---|---|---|
| `public.brands` | SELECT/INSERT/UPDATE/DELETE all gated on `user_id = auth.uid()` | ✅ Sidebar dropdown reads `brands` filtered by user; cannot leak across users. |
| `public.canvases` | All gated on `brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())` | ✅ Dashboard reads per-brand canvases; cannot leak. |
| `storage.objects` bucket `thumbnails` | INSERT/UPDATE/DELETE gated on `(storage.foldername(name))[1] = auth.uid()::text` | ✅ Bucket is `public: true` for read (matches Figma/Canva pattern); writes scoped to user prefix. |
| `storage.objects` bucket `brand-logos` | Same pattern | ✅ Read-public + write-prefix-scoped. |

**No new RLS policies in this PRD.** Verify in §9.2 integration tests.

### 4.3 Storage buckets

| Bucket | Owning cluster | This PRD uses for |
|---|---|---|
| `thumbnails` | M2 (existing) | Dashboard file-card thumbnail render — read public URL from `canvases.thumbnail_url` |
| `brand-logos` | M3 (existing) | Onboarding step 1 auto-fetched logo upload target (path: `{user_id}/{brand_id}.png`) — write via Supabase Storage SDK; user-uploaded logos override the favicon auto-fetch |

**No new buckets in this PRD.**

---

## 5. Backend

### 5.1 Edge Functions

**No net-new Edge Functions in this PRD.** Dashboard reads via supabase-js direct with RLS enforcement. The two backend touches are:

1. **Logo auto-fetch (browser-side):** see §5.3 (no Edge Function — direct fetch from browser with CORS-permissive favicon endpoints; falls back to server-proxied probe if browser CORS blocks — see §12)
2. **Shopify OAuth start (refactored access_token transport):** see §5.4

### 5.2 RPCs (database functions)

**No net-new RPCs in this PRD.** Existing `useBrandsStore.createBrand` performs `INSERT INTO brands` via supabase-js. `useCanvasesStore.createCanvas` does `INSERT INTO canvases`. No transactional boundaries that warrant SECURITY DEFINER.

### 5.3 Browser-side helpers (NOT Edge Functions)

#### 5.3.1 `fetchFavicon(url: string) → Promise<string | null>`

```typescript
// src/utils/logo-fetch.ts (NEW)
//
// Pure browser helper. Probes a domain's favicon by:
//   1. Normalizing input: strip protocol, strip trailing slash, accept "nike.com" or "nike"
//   2. Try `https://{domain}/favicon.ico` via <img>-load probe (works on opaque CORS responses)
//   3. On load → return URL string. On error → return null (caller falls back to monogram).
// Debounced 600ms in caller (useOnboarding composable). No state. Pure function.

export async function fetchFavicon(input: string): Promise<string | null> {
  const domain = normalizeDomain(input)
  if (!domain) return null
  const url = `https://${domain}/favicon.ico`
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = () => resolve(null)
    img.src = url
  })
}
```

**Note:** if browser-side probing has false negatives in production (some sites lack `/favicon.ico` but have `<link rel="icon">` in HTML), Phase B adds an Edge Function `/api/logo-fetch` that parses the HTML head server-side. MVP ships browser-only; documented in §12 as a known limitation.

### 5.4 External integrations

| Integration | What this PRD does | Webhooks |
|---|---|---|
| **Shopify OAuth (M9 reuse)** | Onboarding step 2 + sidebar topbar Connect surface call existing `POST /api/shopify/auth-start` to begin OAuth. **REFACTOR per §5.6 item 1 security launch-blocker:** the existing implementation passes the Supabase `access_token` as a URL query string. Replace with: (a) POST body containing the token, OR (b) `Authorization: Bearer <token>` header — server reads from header instead of query. The OAuth redirect URL itself (Shopify → our callback) never contains a Supabase token. | None new — M9 already ships `shopify/compliance/*` mandatory webhooks |
| **Supabase Storage** | `brand-logos` bucket write for user-uploaded logo override | None |

#### 5.4.1 Shopify OAuth access_token security fix (LAUNCH-BLOCKING)

**Current (M9, broken):**
```ts
// src/components/onboarding/StoreTypeStep.vue line ~40 (current code)
const params = new URLSearchParams({
  shop: normalizedShop.value,
  access_token: token,         // <-- LANDS IN URL → browser history, referer headers, server access logs
  // ...
})
window.location.href = `/api/shopify/auth-start?${params}`
```

**Fixed (this PRD):**
```ts
// src/components/onboarding/StoreTypeStep.vue (refactored)
async function handleConnect() {
  if (!normalizedShop.value) return
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token ?? ''
  const response = await fetch('/api/shopify/auth-start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      shop: normalizedShop.value,
      brandId: props.brandId,
    }),
  })
  const { redirectUrl } = await response.json()
  window.location.href = redirectUrl   // Shopify OAuth URL — contains state nonce only, no Supabase token
}
```

**Server-side change in `api/shopify/auth-start.ts`:** read `Authorization` header instead of query param. M9 already supports JWT validation via `verifyAuth` shared helper — change is `req.headers.authorization` instead of `req.query.access_token`.

**Verification in §9.5:** grep `src/` and `api/` for any literal `access_token=` query-string assignment — must return 0 matches.

### 5.5 Cron jobs

None.

### 5.6 Compliance + docs deliverables

| Deliverable | Location | Purpose |
|---|---|---|
| Updated M9 polling/connect-shop runbook excerpt | `kova-open-pencil-1/docs/operations/m9-shopify-connect-runbook.md` (extend existing) | Document the access_token-header-not-query change so any future M9 work doesn't regress it. |
| Onboarding wizard re-entry policy | inline `COMMENT` in `use-onboarding.ts` | Document that `sessionStorage` (not localStorage) holds in-flight wizard state — wipes on tab close per privacy minimization. |

---

## 6. Frontend

### 6.1 Routes (Vue Router)

```typescript
// kova-open-pencil-1/src/router.ts (extend existing)

const onboardingRoutes = [
  {
    path: '/onboarding',
    name: 'onboarding-welcome',
    component: () => import('@/views/OnboardingView.vue'),
    meta: { theme: 'dark', requiresAuth: true, onboardingOnly: true, viewportGuard: 'desktop' },
  },
  // Existing M9 sub-route preserved (kept for backwards compat with onboarding deep-links).
  {
    path: '/onboarding/store-type',
    name: 'onboarding-store-type',
    component: () => import('@/components/onboarding/StoreTypeStep.vue'),
    meta: { theme: 'dark', requiresAuth: true, onboardingOnly: true, viewportGuard: 'desktop' },
  },
  // C-HIGH2: wizard sub-routes (each step owns its URL for back/forward + deep-link).
  // Step components mounted inside OnboardingView via <router-view>; guards enforce linear progression.
  {
    path: '/onboarding/brand',
    name: 'onboarding-brand',
    component: () => import('@/components/onboarding/BrandIdentityStep.vue'),
    meta: { theme: 'dark', requiresAuth: true, onboardingOnly: true, viewportGuard: 'desktop', wizardStep: 1 },
  },
  {
    path: '/onboarding/shopify',
    name: 'onboarding-shopify',
    component: () => import('@/components/onboarding/ShopifyConnectStep.vue'),
    meta: { theme: 'dark', requiresAuth: true, onboardingOnly: true, viewportGuard: 'desktop', wizardStep: 2 },
  },
  {
    path: '/onboarding/brand-kit',
    name: 'onboarding-brand-kit',
    component: () => import('@/components/onboarding/BrandKitStep.vue'),
    meta: { theme: 'dark', requiresAuth: true, onboardingOnly: true, viewportGuard: 'desktop', wizardStep: 3 },
  },
  {
    path: '/onboarding/done',
    name: 'onboarding-done',
    component: () => import('@/components/onboarding/SplashStep.vue'),
    meta: { theme: 'dark', requiresAuth: true, onboardingOnly: true, viewportGuard: 'desktop', wizardStep: 4 },
  },
]

const dashboardRoutes = [
  // Brand-scoped home (default landing after auth callback for one-brand users).
  {
    path: '/brand/:brandId',
    name: 'brand-home',
    component: () => import('@/views/DashboardView.vue'),
    meta: { theme: 'dark', requiresAuth: true, requiresOnboarding: true, viewportGuard: 'desktop' },
    children: [
      // Default child = Recents (file grid).
      { path: '', name: 'brand-recents', component: () => import('@/views/dashboard/RecentsView.vue') },
      // Phase-2 coming-soon shells.
      { path: 'calendar', name: 'brand-calendar', component: () => import('@/views/dashboard/ComingSoonView.vue'), props: { kind: 'calendar' } },
      { path: 'swipes', name: 'brand-swipes', component: () => import('@/views/dashboard/ComingSoonView.vue'), props: { kind: 'swipes' } },
      { path: 'templates', name: 'brand-templates', component: () => import('@/views/dashboard/ComingSoonView.vue'), props: { kind: 'templates' } },
      // Existing sub-routes preserved (M2 era):
      { path: 'trash', name: 'brand-trash', component: () => import('@/views/dashboard/TrashView.vue') },
      // Cluster 05 + 10 placeholders — pending those PRDs:
      { path: 'products', name: 'brand-products', component: () => import('@/views/dashboard/ComingSoonView.vue'), props: { kind: 'products' } },
      { path: 'personalization', name: 'brand-personalization', component: () => import('@/views/dashboard/ComingSoonView.vue'), props: { kind: 'personalization' } },
      { path: 'knowledge-base', name: 'brand-kb', component: () => import('@/views/dashboard/ComingSoonView.vue'), props: { kind: 'knowledge-base' } },
      { path: 'memories', name: 'brand-memories', component: () => import('@/views/dashboard/ComingSoonView.vue'), props: { kind: 'memories' } },
    ],
  },

  // Brands picker (between-brands, no brand-scope yet) — used post-callback when user has multiple brands.
  // Cluster 03 owns the implementation; this PRD reserves the route.
  {
    path: '/brands',
    name: 'brands-picker',
    component: () => import('@/views/BrandPickerView.vue'),   // ships in Cluster 03; placeholder in Cluster 02
    meta: { theme: 'dark', requiresAuth: true, viewportGuard: 'desktop' },
  },

  // Legacy `/dashboard` redirect for any old links (M2-era hardcoded paths exist in docs/tests).
  {
    path: '/dashboard',
    redirect: () => {
      const { lastActiveBrandId } = useUIStateStore()
      return lastActiveBrandId ? `/brand/${lastActiveBrandId}` : '/brands'
    },
  },
]
```

**Route meta convention** (cross-cut owned by Cluster 11 per `00c §1.D`):
- `theme: 'dark' | 'light'` — runtime stylesheet swap. All routes in this PRD are dark.
- `requiresAuth: boolean` — auth-guard redirects to `/login` if not authenticated (Cluster 01 owns guard).
- `requiresOnboarding: boolean` — auth-guard redirects to `/onboarding` if user has zero brands.
- `onboardingOnly: boolean` — redirect to `/brand/{lastActiveBrandId}` if user is already onboarded.
- `viewportGuard: 'desktop' | null` — redirects to `/desktop-only` on width <1024 (Cluster 01 ships the route + guard).

### 6.2 Pinia stores

#### 6.2.1 `useBrandsStore` (existing — EXTEND)

```typescript
// src/stores/brands.ts (extend existing)
//
// EXISTING (verified): state { brands, isLoading, selectedBrandId, proposedBrandKit },
//                     getters { sortedBrands, selectedBrand },
//                     actions { selectBrand, fetchBrands, createBrand, updateBrand, deleteBrand }.
//
// THIS PRD ADDS:
//
// 1. Persist `selectedBrandId` to Q5 Layer 2 localStorage via VueUse useLocalStorage.
//    Key: 'kova:ui:last-brand'. Default: null. Survives reload but not browser-data clear (matches Q5 spec).
//
// 2. New getter: `sortedActiveBrands` = brands.value.filter(b => !b.archived_at).sort(updated_at desc).
//    NOTE: `archived_at` ships in Cluster 03; until then the getter degrades to all brands.
//    Guard via `'archived_at' in b ? !b.archived_at : true` to prevent runtime errors pre-Cluster-03.
//
// 3. New action: `ensureSelectedBrand()` — call on dashboard mount;
//    if selectedBrandId is null OR points to a missing/archived brand, falls back to the most-recent
//    active brand. Returns the resolved brand or null (caller routes to /onboarding if null).
//
// State shape addition:
//   const selectedBrandId = useLocalStorage<string | null>('kova:ui:last-brand', null)
//   // (replaces the existing ref(null))
//
// Action body for ensureSelectedBrand():
//   async function ensureSelectedBrand(): Promise<Brand | null> {
//     if (!brands.value.length) await fetchBrands()
//     const candidate = brands.value.find(b => b.id === selectedBrandId.value)
//     if (candidate && !candidate.archived_at) return candidate
//     const fallback = sortedActiveBrands.value[0] ?? null
//     selectedBrandId.value = fallback?.id ?? null
//     return fallback
//   }
```

#### 6.2.2 `useDashboardStore` (NEW)

```typescript
// src/stores/dashboard.ts (NEW)
//
// Per-dashboard-pane state: search, sort, view-mode. Resets per-brand on selectBrand().

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useCanvasesStore } from '@/stores/canvases'

export type SortMode = 'recent' | 'name' | 'created'
export type ViewMode = 'grid' | 'list'

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const searchQuery = ref('')
  const sortMode = ref<SortMode>('recent')          // Default: most-recent-first per §12 RESOLVED-3
  const viewMode = ref<ViewMode>('grid')             // Default: grid per A1 + 03 hi-fi
  const showTrashed = ref(false)                     // Toggle reads canvases.trashed_at IS NOT NULL

  // Getters
  const filteredCanvases = computed(() => {
    const canvases = useCanvasesStore()
    const source = showTrashed.value ? canvases.sortedTrashed : canvases.sortedCanvases
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return applySortMode(source, sortMode.value)
    return applySortMode(source.filter((c) => c.name.toLowerCase().includes(q)), sortMode.value)
  })

  function applySortMode(list: Canvas[], mode: SortMode): Canvas[] {
    if (mode === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name))
    if (mode === 'created') return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return list  // 'recent' = sortedCanvases default (by updated_at desc)
  }

  // Actions — per B-HIGH14 store mutations only happen via actions
  function setSearchQuery(q: string): void { searchQuery.value = q }
  function setSortMode(mode: SortMode): void { sortMode.value = mode }
  function setViewMode(mode: ViewMode): void { viewMode.value = mode }
  function setShowTrashed(flag: boolean): void { showTrashed.value = flag }

  // Reset on brand-switch
  function resetForBrand(): void {
    searchQuery.value = ''
    sortMode.value = 'recent'
    showTrashed.value = false
    // viewMode preserved across brand switches (per-device pref)
  }

  return {
    searchQuery, sortMode, viewMode, showTrashed,
    filteredCanvases,
    setSearchQuery, setSortMode, setViewMode, setShowTrashed,
    resetForBrand,
  }
})
```

#### 6.2.3 `useUIStateStore` (NEW — cross-cut Layer 2 prefs hub; coordinated with Cluster 12)

```typescript
// src/stores/ui-state.ts (NEW — but Cluster 12 owns the cross-cluster pattern)
//
// Per-device UI minutiae per Q5 Layer 2. This PRD ships the lastActiveBrandId key;
// Cluster 12 expands with pagesCollapsed, layersCollapsed, recentColors, dismissedToasts, etc.
// One store; many keys. Reserved here so other clusters can register without re-spec.

import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export const useUIStateStore = defineStore('ui-state', () => {
  const lastActiveBrandId = useLocalStorage<string | null>('kova:ui:last-brand', null)
  const lastActiveCanvasId = useLocalStorage<string | null>('kova:ui:last-canvas', null)
  const fileGridViewMode = useLocalStorage<'grid' | 'list'>('kova:ui:file-grid-view', 'grid')

  // B-HIGH14: store mutations only via actions
  function setLastActiveBrandId(id: string | null): void { lastActiveBrandId.value = id }
  function setLastActiveCanvasId(id: string | null): void { lastActiveCanvasId.value = id }
  function setFileGridViewMode(mode: 'grid' | 'list'): void { fileGridViewMode.value = mode }

  // Cluster 12 will extend.
  return {
    lastActiveBrandId, lastActiveCanvasId, fileGridViewMode,
    setLastActiveBrandId, setLastActiveCanvasId, setFileGridViewMode,
  }
})
```

**Note:** `useBrandsStore.selectedBrandId` and `useUIStateStore.lastActiveBrandId` are the same key — one underlying `useLocalStorage` ref shared via composition. (Pinia composition stores allow this — exported as a module-scope ref from `ui-state.ts`, imported by `brands.ts`.)

### 6.3 Composables

| Composable | File | Signature | Used by |
|---|---|---|---|
| `useOnboarding` | `src/composables/use-onboarding.ts` (NEW — module-scope singleton; retires M9 `useOnboardingState` per C-HIGH3) | `{ state: Reactive<{ brandName: string; brandUrl: string; industry: string; tempBrandId: string }>; step: Ref<'brand'\|'shopify'\|'brand-kit'\|'splash'>; next(): void; prev(): void; complete(): Promise<{ brandId: string }>; canProceed: ComputedRef<boolean>; isFinishing: Ref<boolean>; finishError: Ref<string \| null>; persistDraft(): void; restoreDraft(): void }` — templates write `v-model="state.brandName"` (no `.value`) per B-MED15 | `OnboardingView`, `BrandIdentityStep`, `BrandKitStep`, `SplashStep` |
| `useLogoFetch` | `src/composables/use-logo-fetch.ts` (NEW) | `(urlRef: Ref<string>) => { logoUrl: Ref<string \| null>; isFetching: Ref<boolean>; manualOverride(file: File): Promise<void> }` — 600ms debounce on `urlRef`; calls `fetchFavicon`; allows manual file override (uploads to `brand-logos` bucket) | `BrandUrlStep`, onboarding step 1 |
| `useGreeting` | `src/composables/use-greeting.ts` (NEW) | `(): ComputedRef<string>` — returns "Good morning/afternoon/evening, {firstName}" based on `new Date().getHours()` + `useAuthStore.profile.name` | `DashboardView` greeting |
| `useFileGrid` | `src/composables/use-file-grid.ts` (NEW) | `(brandId: Ref<string>) => { canvases: ComputedRef<Canvas[]>; isLoading: Ref<boolean>; isEmpty: ComputedRef<boolean>; hasSearchQuery: ComputedRef<boolean>; search: (q: string) => void (debounced 200ms); setSort: (m: SortMode) => void; setView: (m: ViewMode) => void }` — wraps `useDashboardStore` + `useCanvasesStore.fetchCanvases` | `RecentsView` |
| ~~`useOfflineState`~~ — **RETIRED (CT-020 + C-MED4)** | Cluster 11 ships `useOnlineStatus` (`src/composables/use-online-status.ts`). Consumed only inside Plan 11 `<NetworkStatusIndicator>`. | n/a — not called by Cluster 02 components | n/a |

### 6.4 Components

**Icon convention (W0-4 — 2026-05-19):** every icon rendered by a component in this PRD uses `<KovaIcon name="..." size?="..." />` from Cluster 11 §6.4.2 / Plan 11 Task 4.4. The four retired alternates are forbidden per scope plan §6.2 W0-4 lock: (a) raw `<icon-lucide-*>` tags with dynamic names, (b) `<component :is="\`icon-lucide-${name}\`">` template-literal resolution, (c) `i-lucide-*` UnoCSS class strings, (d) `<Icon name="lucide:...">` Nuxt-style. Wave-2 cluster-02 fix agent migrates any residual non-conforming icon binding in this PRD's component bodies during its pass.

#### 6.4.1 Page-level views

| Component | File | Hi-fi reference | Hosts |
|---|---|---|---|
| `OnboardingView` | `src/views/OnboardingView.vue` (existing — REFACTOR) | A1.01.c–A1.01.f | 4 wizard steps + splash; switches active sub-component via `useOnboarding.step` |
| `DashboardView` | `src/views/DashboardView.vue` (existing — REFACTOR) | 03.a | Sidebar + topbar + `<router-view>` for child routes |
| `RecentsView` | `src/views/dashboard/RecentsView.vue` (NEW; replaces existing `CanvasGrid.vue` or composes it) | 03.a content pane | Greeting + composer + file grid; empty / skeleton states |
| `ComingSoonView` | `src/views/dashboard/ComingSoonView.vue` (NEW) | A12.1–A12.3 | Generic shell with `kind: 'calendar' \| 'swipes' \| 'templates' \| 'products' \| 'personalization' \| 'knowledge-base' \| 'memories'` prop; per-kind icon + eyebrow + headline + roadmap text comes from a constants map |
| `BrandPickerView` | `src/views/BrandPickerView.vue` (CROSS-CUT — owned by Cluster 03; placeholder here) | A2.a | This PRD ships a stub: if Cluster 03 hasn't shipped yet, renders empty-pane "Choose a brand" + list of brands from `useBrandsStore.sortedActiveBrands` — minimal until Cluster 03 fills in. |

#### 6.4.2 Onboarding step components (existing — REFACTOR + EXTEND)

| Component | File | Hi-fi origin | Status |
|---|---|---|---|
| ~~`WelcomeStep`~~ — **RETIRED 2026-05-19** | `src/components/onboarding/WelcomeStep.vue` | (M9 era — pre-Cluster-01 auth landing) | Retired in Plan 02 Task T13 per §12.10 RESOLVED + C-LOW02.7. Cluster 01 owns the auth landing. |
| `BrandNameStep` + `BrandUrlStep` + `NameStep` (existing) | `src/components/onboarding/*.vue` | A1.01.c | CONSOLIDATE into single `<BrandIdentityStep>` that renders A1.01.c's full `.onb-id-row` + 3-field stack — matches hi-fi which is a single screen, not three. |
| `StoreTypeStep` (existing — M9) | `src/components/onboarding/StoreTypeStep.vue` | A1.01.d | **REFACTOR light → dark** (§5.6 item 1) + access_token security fix (§5.4.1). Keep logic for `normalizeShopDomain` + OAuth start + skip + "Something else" + "No store yet" branches. |
| `BrandKitStep` (NEW — A1.01.e) | `src/components/onboarding/BrandKitStep.vue` | A1.01.e | NEW. Drop-zone + file-list + textarea + AI extraction promise card. On "Extract and continue" → enqueues uploads + guidelines payload for Cluster 05's extract Edge Function. |
| `ExtractionStep` (existing) | `src/components/onboarding/ExtractionStep.vue` | (M9 — kept for compat) | RETIRE; `BrandKitStep` replaces. |
| `SplashStep` (NEW) | `src/components/onboarding/SplashStep.vue` | A1.01.f | NEW. 2×2 next-move grid + primary "Enter {brand} workspace". |
| ~~`ReviewStep`~~ — **RETIRED 2026-05-19** | `src/components/onboarding/ReviewStep.vue` | (M9 — final commit gate) | Retired in Plan 02 Task T13 per §12.10 RESOLVED + C-LOW02.7. Final commit gate folded into `SplashStep`. |

#### 6.4.3 Dashboard chrome components

| Component | File | Props | Slots | Emits | Hi-fi origin |
|---|---|---|---|---|---|
| `DashboardSidebar` (NEW) | `src/components/dashboard/DashboardSidebar.vue` | `currentBrand: Brand` | none | `brand-switch`, `nav` (route name), `search-open` | 03.a `.sidebar` |
| `BrandSwitcher` (NEW) | `src/components/dashboard/BrandSwitcher.vue` | `currentBrand: Brand` | none | `select` (brandId), `new-brand`, `manage-brands` | 03.a `.brand-switch` + Reka DropdownMenu |
| `SideNav` (NEW) | `src/components/dashboard/SideNav.vue` | `sections: NavSection[]` (data-driven) | none | `nav` | 03.a `.nav` |
| `SideFooter` (NEW) | `src/components/dashboard/SideFooter.vue` | `user: { name; email; plan }` | none | `account`, `sign-out`, `more` | 03.a `.side-footer` |
| `DashboardTopbar` (NEW) | `src/components/dashboard/DashboardTopbar.vue` | `brandName: string`, `currentPage: string` | `actions` (slot for context buttons) | `new-canvas` | 03.a `.topbar` |
| `Composer` (NEW) | `src/components/dashboard/Composer.vue` | `placeholder?: string`, `presets: ComposerPreset[]` | none | `submit` (promptText), `attach`, `chip-click` (preset) | 03.a `.composer` + B11.1 reference |
| `ComposerInputWrap` (NEW) | `src/components/dashboard/ComposerInputWrap.vue` | `modelValue: string`, `state: 'idle' \| 'submitting' \| 'review'` | none | `update:modelValue`, `submit` | 03.a `.composer-input-wrap` + B11.2 + B11.3 |
| `ComposerChips` (NEW) | `src/components/dashboard/ComposerChips.vue` | `presets: ComposerPreset[]` | none | `select` (preset) | 03.a `.composer-chips` |
| `FileGrid` (NEW) | `src/components/dashboard/FileGrid.vue` | `canvases: Canvas[]`, `viewMode: 'grid' \| 'list'`, `isLoading: boolean` | `empty` (slot for empty state) | `open` (canvasId), `context-menu` (canvasId, position) | 03.a `.file-grid` |
| `FileCard` (NEW; replaces existing `CanvasCard.vue` or refactors it) | `src/components/dashboard/FileCard.vue` | `canvas: Canvas` | none | `open`, `context-menu` | 03.a `.file-card` |
| `FileThumbnail` (NEW) | `src/components/dashboard/FileThumbnail.vue` | `canvas: Canvas` | none | none | 03.a `.thumb` + `.thumb-frame` / `.thumb-flow` / `.thumb-ab` (picked by `canvas.frame_count` + heuristic) |
| `SortDropdown` (NEW) | `src/components/dashboard/SortDropdown.vue` | `modelValue: SortMode` | none | `update:modelValue` | 03.a `.filter` button |
| `ViewToggle` (NEW) | `src/components/dashboard/ViewToggle.vue` | `modelValue: ViewMode` | none | `update:modelValue` | 03.a `.view-toggle` |
| ~~`OfflineIndicator`~~ — **RETIRED (CT-020)** | n/a | Cluster 02 consumes Cluster 11 `<NetworkStatusIndicator>` mounted globally in `App.vue`. No local offline component. |  |  |
| `CanvasCreationTransition` (NEW) | `src/components/dashboard/CanvasCreationTransition.vue` | `state: 'idle' \| 'submitting' \| 'review' \| 'splash'`, `prompt: string` | none | none | B11.1–B11.4 |
| `DashboardSkeleton` (NEW) | `src/components/dashboard/DashboardSkeleton.vue` | none | none | none | B7.1 |

#### 6.4.4 Empty-state instances (consume Cluster 11 `<EmptyState>` primitive)

| Surface | Composes |
|---|---|
| Zero canvases | `<EmptyState icon="layout-grid" title="No canvases yet" body="..." />` + primary "New canvas" + secondary "Start with AI" |
| Zero brands | `<EmptyState icon="store" title="Add your first brand" />` + primary "New brand" |
| Search-empty | `<EmptyState size="small" icon="search-x" title="Nothing matches '{query}' here" />` + ghost "Clear search" |

### 6.5 Drag-and-drop handlers

**N/A in this PRD.** File-grid does not accept drag-and-drop receivers (no drop-to-import in MVP). Brand-logo upload uses a file picker, not drag. Brand-kit step 3 drop zone is a single browser-level `DataTransfer` file-pick — no MIME-typed Kova payload.

### 6.6 Brand-kit extract queue handoff — consumer of Cluster 05 (C-MED7)

**Owner of the queue + Edge Function:** Cluster 05 (`api/brand-kit/extract.ts` + Postgres job table + worker).

**This PRD's responsibility:** At the end of onboarding step 3, the wizard pushes a payload to Cluster 05's extract queue via the public composable `useBrandKitExtractQueue()` (also owned by Cluster 05). The wizard advances to the splash step immediately after enqueue resolves — the extract worker runs asynchronously; the founder sees results in the Brand Kit page once the worker finishes (out of scope for this PRD).

**Queue contract (frozen 2026-05-19):**

```ts
// Composable signature — Cluster 05 ships at `src/composables/use-brand-kit-extract-queue.ts`
export interface BrandKitExtractPayload {
  /** Target brand the extract results write back to. */
  brand_id: string
  /** Uploaded brand-kit assets (PDF / HTML / EML / PNG / JPG, ≤25 MB each). */
  files: File[]
  /** Pasted brand-guidelines free text. Trimmed by the caller. */
  guidelines: string
  /** Where the payload originated. Cluster 05 uses this to gate analytics + retry policy. */
  source: 'onboarding' | 'brand-kit-page'
}

export interface BrandKitExtractHandle {
  enqueueBrandKitExtract(payload: BrandKitExtractPayload): Promise<{ job_id: string }>
}

export function useBrandKitExtractQueue(): BrandKitExtractHandle
```

**Wire-up in this PRD:**
- `OnboardingView` (T17) calls `enqueueBrandKitExtract({ brand_id, files, guidelines, source: 'onboarding' })` inside an `onBrandKitCommit` handler bound to `<BrandKitStep @commit>`.
- The `@skip` path on `BrandKitStep` does NOT enqueue.
- `tempBrandId` (held in the wizard state) is what feeds `brand_id`. If `tempBrandId` is missing, the enqueue is skipped and the wizard surfaces a toast (Cluster 11 `useToast`) — this is an error case, not silent.

**Failure mode:** If Cluster 05 has not yet shipped the queue Edge Function, `useBrandKitExtractQueue` resolves with a stub `job_id` and writes a breadcrumb to `audit_log` (Cluster 11) so the founder can replay later. Stub mode is `import.meta.env.MODE !== 'production'` only — production builds fail loudly if the queue is missing.

---

## 7. Tool layer / canvas-engine touches

N/A — this PRD does not touch `packages/core/`, the canvas renderer, or any scene-graph type. Dashboard sits above the engine; onboarding sits before the engine.

---

## 8. Acceptance criteria

Every line testable in code or browser. No "feels right."

### 8.1 Onboarding wizard

- [ ] User with no brands lands at `/onboarding/brand` from `/auth/callback` (Cluster 01 routing)
- [ ] Step 1 (brand identity) shows: 480px card, eyebrow "Your first brand", H1 "What are we working on?", lede, logo-slot + 3-field stack (name, URL with `https://` prefix, optional one-line description)
- [ ] Logo auto-fetch: typing "nike.com" in the URL field within 600ms shows favicon in the logo slot; on 404 the slot shows the first-letter monogram (capital N) on solid black background
- [ ] Manual logo override: clicking the logo slot opens file picker; selected image uploads to `brand-logos/{user_id}/{brand_id-or-tempUUID}.png`; storage URL becomes the logo
- [ ] Step 1 "Continue" disabled unless brand name + valid URL filled
- [ ] Step 2 (Shopify) shows: connect surface with shop URL affixed input (`https://` + `.myshopify.com`), 3-line scope list (✓ products/collections/variants + ✓ images + ✗ customer data)
- [ ] Step 2 "Skip for now" routes to step 3 with `brand.shopify_shop_domain` left null
- [ ] Step 2 "Connect Shopify" POSTs to `/api/shopify/auth-start` with `Authorization: Bearer <jwt>` header (NOT `access_token=` query string — verified in §9.5)
- [ ] Step 3 (brand kit) shows: 560px wide card, drop zone, file list (up to 25MB per file), guidelines textarea, AI extraction promise card (5 checks: colors / typography / voice / writing rules / seed memories)
- [ ] Step 3 "Do this later" routes to step 4 without queuing extract
- [ ] Step 3 "Extract and continue" uploads files to `brand-logos` bucket (temp path) + posts payload to Cluster 05's extract endpoint + routes to step 4
- [ ] Step 4 (splash) shows: 56×56 success medal, eyebrow "Workspace ready", H1 "You're in.", 4 next-move cards, primary "Enter {Brand} workspace"
- [ ] Step 4 primary CTA routes to `/brand/{brandId}` (the newly-created brand's dashboard)
- [ ] Wizard re-entry: refreshing mid-step preserves prior step data (in-flight state persisted to `sessionStorage`; restored on `useOnboarding.restoreDraft()` mount)
- [ ] Onboarding required for first brand (Q-decision §12.1 RESOLVED): user cannot bypass to dashboard if `useBrandsStore.brands.length === 0`
- [ ] Subsequent brand creation (from "+ New brand" outside onboarding) is **skippable** (Cluster 03 owns the inline new-brand flow; this PRD just enforces the policy)
- [ ] Progress strip dots: dot 1 (auth) = done on entry; current step active (wider); future steps `--line-2`
- [ ] M9 `StoreTypeStep.vue` rendered byte-for-byte equivalent to A1.01.d hi-fi at `data-theme="dark"`; no `bg-white`, `text-gray-900`, `border-gray-200`, or other light Tailwind classes remain in `src/components/onboarding/StoreTypeStep.vue` (verified via grep in §9.5)

### 8.2 Dashboard chrome

- [ ] `/brand/:brandId` renders sidebar (236px) + main split
- [ ] Sidebar `.brand-switch` button shows current brand logo + name + caret
- [ ] Clicking `.brand-switch` opens Reka DropdownMenu listing all active brands; clicking a brand routes to `/brand/{other-id}` and updates `useUIStateStore.lastActiveBrandId`
- [ ] Dropdown "+ New brand" item routes to Cluster 03's new-brand modal (or fallback no-op + toast pre-Cluster-03)
- [ ] Dropdown "Manage brands" item routes to `/account/brands` (Cluster 03/04 owns the page)
- [ ] Sidebar `.side-search` renders as plain search input (no Cmd+K shortcut binding — palette dropped per 00g 2026-05-17)
- [ ] Sidebar nav sections (Home / Library / Brand) render with correct items + active highlight per current route
- [ ] Sidebar nav rows whose route renders `ComingSoonView` show `SOON` pill (9px font, neutral pill). 7 items total per §6.1 route map: Calendar, Swipes, Templates, Products, Personalization, Knowledge Base, Memories (A-LOW5 reconciliation 2026-05-19).
- [ ] Sidebar nav "Brands" item ships visible at MVP with NO `SOON` pill (§12.11 Part B RESOLVED 2026-05-17 — PRD 03 owns the `/account/brands` page content)
- [ ] Sidebar `.side-footer` shows avatar (user initials), name, plan label ("Free plan" / "Pro plan" — reads `users.plan` if present, else "Free")
- [ ] Sidebar footer "more" button opens `AccountMenu` (existing) — items: Account · Help · Shortcuts · Sign out (per Q16)
- [ ] Topbar shows breadcrumb "{Brand} → Home"
- [ ] Topbar "New canvas" `.btn.sm` button: click creates a canvas (calls `useCanvasesStore.createCanvas(brandId)`), triggers B11 transition, routes to `/editor/{canvasId}`
- [ ] On `/brand/:brandId` initial load with no cached data, B7.1 skeleton renders for ≥1 frame before populated content

### 8.3 Greeting + composer

- [ ] Greeting reads "Good morning, {firstName}" between 04:00–11:59, "Good afternoon, {firstName}" between 12:00–17:59, "Good evening, {firstName}" between 18:00–03:59 (local time)
- [ ] `firstName` = first whitespace-split token of `users.name` (fallback: email local-part if no name)
- [ ] Composer renders `.composer-input-wrap` 760px max-width centered + placeholder "How can I help you today?"
- [ ] Composer 5 preset chips: "Promote a sale" · "Showcase a product" · "Teach customers" · "Share reviews" · "Build community"
- [ ] Clicking a preset chip seeds composer text with `composerPresets[chipId].seedText`
- [ ] Composer attach `+` button hidden in MVP (Phase 2 wires file picker once Cluster 05 drag-drop lands; §12.8)
- [ ] Composer ⌘↵ keyboard shortcut submits same as clicking the accent CTA
- [ ] Composer submit with non-empty text: state = 'submitting' (B11.2 → button replaced by `loader-2` spinner + caption fades in) within 50ms; createCanvas resolves → state = 'review' (B11.3) for 120ms → 'splash' (B11.4 full-viewport) → router push to `/editor/{canvasId}` within ≤500ms in production
- [ ] Composer submit with empty text is a no-op (button disabled)

### 8.4 File grid

- [ ] File grid renders 4 columns at viewport ≥1280px
- [ ] Each file card: thumbnail (4:3 aspect) + status tag + frame-count badge + title + sub-meta
- [ ] Thumbnail with no `canvas.thumbnail_url`: renders `.thumb-frame` / `.thumb-flow` / `.thumb-ab` abstraction (selected by deterministic hash of `canvas.id` so it's stable per canvas)
- [ ] Thumbnail with `canvas.thumbnail_url`: renders the public-bucket image (no fallback)
- [ ] Status tag color: Scheduled = accent (`--accent-soft` bg), Ready = ok (`--ok-soft` bg), Draft = neutral
- [ ] Frame-count badge in top-right of thumbnail
- [ ] Sub-meta shows relative timestamp via `formatRelativeTime(canvas.updated_at)` (e.g., "2h ago", "yesterday", "3d ago", "1w ago")
- [ ] Default sort = `recent` (by `updated_at DESC`)
- [ ] Sort dropdown options: Last viewed (recent) · Name · Date created
- [ ] Search input debounce = 200ms (§12 RESOLVED-4)
- [ ] Search matches canvas name (case-insensitive contains via pg_trgm GIN index in §4.1)
- [ ] Search empty result renders B9-pattern `<EmptyState size="small" icon="search-x" />` with "Clear search" CTA
- [ ] Zero canvases (new brand, search empty) renders A11.1 `<EmptyState icon="layout-grid" />` with "New canvas" + "Start with AI" CTAs
- [ ] View toggle (grid / list) switches `useDashboardStore.viewMode`; choice persists per-device via `useUIStateStore.fileGridViewMode`

### 8.5 B11 canvas-creation transition

- [ ] Total transition duration (B11.2 → B11.3 → B11.4 → editor route) ≤500ms in production (measured via Performance API marks)
- [ ] Composer wrap dimensions identical across B11.1 / B11.2 / B11.3 (border 1px `--line`, radius 14px, padding 18/20/12, max-width 760px) — verified via pixel-snapshot test
- [ ] B11.2 input goes `aria-readonly="true"`, prompt text class swaps to `.composer-input.submitting` (ink-2)
- [ ] B11.2 submit `arrow-right` icon swapped to Lucide `loader-2` spinning at 14×14
- [ ] B11.3 caption text changes from "Creating canvas…" to "Ready" with `.tick` accent-check
- [ ] B11.4 splash spinner ≥48×48, centered on `--bg`
- [ ] If createCanvas errors: revert to B11.1 + toast "Couldn't create canvas. Try again." (no editor route)

### 8.6 Coming-soon shells

- [ ] `/brand/:brandId/calendar` renders `.cs-pane` with `calendar-days` icon + "Phase 2 · planning surface" eyebrow + headline + 3-row roadmap + "Notify me when it's ready" + "Read the roadmap"
- [ ] `/brand/:brandId/swipes` same with `bookmark` icon
- [ ] `/brand/:brandId/templates` same with `layout-template` icon + 2-tab strip ("Templates" / "Examples")
- [ ] "Notify me when it's ready" click: posts user email + interest to Resend mailing-list (§12.9 RESOLVED)
- [ ] Breadcrumb on coming-soon routes adds "Coming soon" inline pill next to page name

### 8.7 Offline indicator — consumer of Cluster 11 (CT-020)

- [ ] `<NetworkStatusIndicator>` is mounted globally in `App.vue` by Plan 11 §3.7 (commit f08fa551) — Cluster 02 verifies it is present at the App root, NOT re-mounted locally
- [ ] When `useOnlineStatus().status === 'online'` (`navigator.onLine === true` AND Supabase Realtime channel state = SUBSCRIBED): the indicator renders nothing (silent online state per Figma parity)
- [ ] When `useOnlineStatus().status === 'offline'` (either signal): the 14×14 `cloud-off` lucide icon renders at the top-right of the viewport; hover surfaces `<KovaTooltip>` "You're offline. Changes are saved locally and will sync when you reconnect."
- [ ] No A13.1 topbar pill, A13.2 sidebar `.net-strip`, or per-pane `.offline-banner` is rendered by Cluster 02 (those three signals retired 2026-05-17)

### 8.8 Skeleton state (B7.1)

- [ ] On `/brand/:brandId` mount with cold cache: `DashboardSkeleton` renders for the duration of `useCanvasesStore.fetchCanvases(brandId)` + `useBrandsStore.fetchBrands()`
- [ ] Skeleton mirrors populated chrome geometry byte-identical: sidebar shimmer rows match nav-item heights, topbar shimmer matches breadcrumb height, file-grid shimmer is 4×2 with 4:3 aspect-ratio tiles
- [ ] On data resolved: skeleton fades to populated content over 160ms (no layout shift)

### 8.9 Security + cross-cuts

- [ ] `access_token` literal does NOT appear in any URL during the onboarding Shopify flow (verified via grep in §9.5 + browser DevTools Network panel inspection in §9.4)
- [ ] `users.preferences` JSONB column exists in DB (lands in Cluster 01's migration — this PRD verifies presence; if absent and Cluster 01 hasn't merged, defer Cluster 12 features)
- [ ] `kova:ui:last-brand` localStorage key set on every brand switch
- [ ] Onboarding required for first brand: user cannot skip Welcome→Splash flow if `useBrandsStore.brands.length === 0`
- [ ] Subsequent brand creation (from sidebar "+ New brand") is **inline modal** (Cluster 03 owns) — does NOT route to the full `/onboarding` wizard

---

## 9. Test plan

### 9.1 Unit tests (`bun run test:unit`)

Target coverage: ≥85% on dashboard composables + store actions + onboarding state machine.

| Test file | Covers |
|---|---|
| `tests/unit/composables/use-onboarding.test.ts` | Step advance / back / restoreDraft from sessionStorage / persistDraft writes; canProceed branching per step; complete() calls createBrand then routes to `/brand/{id}` |
| `tests/unit/composables/use-logo-fetch.test.ts` | Debounce timing; favicon probe success/failure; manual override upload to brand-logos bucket; cancellation on rapid input |
| `tests/unit/composables/use-greeting.test.ts` | Time-of-day branches (morning/afternoon/evening edge boundaries 04/12/18/04); firstName extraction from user.name vs email fallback |
| `tests/unit/composables/use-file-grid.test.ts` | Search debounce; sort mode switches; isEmpty / hasSearchQuery branches; brand-switch reset |
| `tests/unit/stores/dashboard.test.ts` | filteredCanvases reactivity to searchQuery / sortMode / showTrashed; resetForBrand wipes search but preserves viewMode |
| `tests/unit/stores/ui-state.test.ts` | useLocalStorage round-trip for lastActiveBrandId, lastActiveCanvasId, fileGridViewMode |
| `tests/unit/stores/brands-extension.test.ts` | ensureSelectedBrand falls back to most-recent when selectedBrandId is null or points to archived/missing brand |
| `tests/unit/utils/logo-fetch.test.ts` | normalizeDomain edge cases (bare hostname, with protocol, with path, with subdomain); fetchFavicon onload / onerror branches |
| `tests/unit/components/dashboard/BrandSwitcher.test.ts` | DropdownMenu open / select / new-brand / manage-brands emit; current brand highlight |
| `tests/unit/components/dashboard/Composer.test.ts` | Submit on click + ⌘↵; state transitions; chip click seeds input; disabled state |
| `tests/unit/components/dashboard/FileGrid.test.ts` | Renders n cards; empty slot fallback; thumbnail dispatch (thumbnail_url vs abstraction); status tag color per state |
| `tests/unit/components/dashboard/FileThumbnail.test.ts` | Deterministic abstraction picker (same canvasId → same abstraction); abstraction kind branches |
| `tests/unit/components/dashboard/CanvasCreationTransition.test.ts` | State transitions B11.1 → B11.2 → B11.3 → B11.4; spinner mount; chrome-dimensions invariance |
| `tests/unit/components/dashboard/DashboardSkeleton.test.ts` | Renders 4×2 grid; shimmer animation class applied |
| ~~`tests/unit/components/dashboard/OfflineIndicator.test.ts`~~ — **RETIRED (CT-020)** | Cluster 11 owns the indicator test; Cluster 02 verifies global mount only |
| `tests/unit/components/onboarding/StoreTypeStep-dark.test.ts` | No light Tailwind classes remain in rendered template (snapshot test); access_token NOT in URL on connect (mock fetch + assert headers) |
| `tests/unit/components/onboarding/BrandKitStep.test.ts` | File acceptance MIME + size cap; drop-zone events; textarea v-model; AI promise card render |

### 9.2 Integration tests (against local Supabase via `supabase start`)

Per `project_pre_prd_audit_ratified.md` — local Supabase + CI ephemeral Postgres, free.

| Test file | Covers |
|---|---|
| `tests/integration/migrations/02-dashboard-indices.test.ts` | Apply migration; verify `idx_canvases_brand_recent` and `idx_canvases_name_trgm` and `idx_brands_user_recent` exist; verify pg_trgm extension installed |
| `tests/integration/stores/brands-rls.test.ts` | As authenticated user A, SELECT brands returns only A's rows (no leak to user B's data) |
| `tests/integration/stores/canvases-rls.test.ts` | As authenticated user A, fetchCanvases(brand_owned_by_B) returns 0 rows |
| `tests/integration/api/shopify-auth-start-bearer.test.ts` | POST `/api/shopify/auth-start` with `Authorization: Bearer <jwt>` succeeds → redirectUrl; same call with `access_token=` query string returns 400 "use Bearer header" (post-refactor) |
| `tests/integration/storage/brand-logos-upload.test.ts` | User uploads logo to `brand-logos/{user_id}/{tempUUID}.png` → success; user B cannot delete user A's file (RLS) |
| `tests/integration/search/canvas-name-trgm.test.ts` | Insert 100 canvases with varied names; search "spring" matches "Spring Drop", "Late Spring"; index used per `EXPLAIN ANALYZE` (Bitmap Index Scan on idx_canvases_name_trgm) |

### 9.3 E2E tests (Playwright / Vercel Agent Browser)

Vercel Agent Browser preferred per `e2e-runner` agent default. Playwright fallback.

| Spec | Covers |
|---|---|
| `tests/e2e/onboarding/first-brand-flow.spec.ts` | Fresh sign-up → land at `/onboarding/brand` → fill brand name + URL (nike.com) → wait for logo auto-fetch → next → choose "Skip for now" on Shopify → next → "Do this later" on brand-kit → splash → "Enter Nike workspace" → assert URL = `/brand/{newBrandId}` |
| `tests/e2e/onboarding/store-type-dark-theme.spec.ts` | On `/onboarding/store-type`, assert `body[data-theme="dark"]` + assert no element has computed `background-color: rgb(255, 255, 255)` |
| `tests/e2e/onboarding/shopify-oauth-no-token-in-url.spec.ts` | Intercept all network requests; assert no URL contains `access_token=` substring during Shopify connect flow |
| `tests/e2e/dashboard/sidebar-brand-switch.spec.ts` | Sign in as user with 3 brands → click brand-switch → assert dropdown shows 3 brands + "Manage brands" + "New brand" → click "Allbirds" → assert URL = `/brand/{allbirds-id}` → assert sidebar brand-switch label = "Allbirds" |
| `tests/e2e/dashboard/composer-create-canvas.spec.ts` | On `/brand/{id}`, type "Spring sale email" into composer → ⌘↵ → assert spinner shows in submit button → assert URL changes to `/editor/{canvasId}` within 500ms |
| `tests/e2e/dashboard/file-grid-search.spec.ts` | Brand with 8 canvases → type "Welcome" in search → assert 1 card visible after 200ms → clear search → assert all 8 visible |
| `tests/e2e/dashboard/file-grid-empty-state.spec.ts` | New brand with 0 canvases → assert A11.1 empty pane renders → click "New canvas" → assert B11 transition |
| `tests/e2e/dashboard/coming-soon-shells.spec.ts` | Visit `/brand/{id}/calendar` → assert cs-pane + "Notify me when it's ready" button. Same for `/swipes` + `/templates`. |
| `tests/e2e/dashboard/offline-indicator.spec.ts` | Set `context.setOffline(true)` → assert the single global `<NetworkStatusIndicator>` renders the 14×14 `cloud-off` icon at top-right of the viewport; hover surfaces `<KovaTooltip>` "You're offline. Changes are saved locally and will sync when you reconnect." Set online → assert the icon renders nothing (component is silent while online, per Plan 11 §3.7 / commit f08fa551). Assert NO legacy A13.1 topbar warn pill, A13.2 sidebar `.net-strip`, or per-pane `.offline-banner` is rendered (retired 2026-05-17). |
| `tests/e2e/dashboard/wizard-reentry.spec.ts` | Mid-onboarding (step 2 filled), reload page → assert step 2 state restored from sessionStorage |

### 9.4 Manual QA (founder browser smoke)

Per `feedback_browser_smoke_test_before_done` memory.

- [ ] Sign up fresh → land in onboarding → step 1 → type "nike.com" → observe logo fetch (or fall-back monogram) → next
- [ ] Step 2 → "Connect Shopify" → observe NO `access_token` in URL bar at any point (DevTools Network panel + URL bar inspection) → cancel back to onboarding
- [ ] Step 2 → "Skip for now" → step 3 → drop a PDF + paste guidelines → "Do this later" → step 4 → "Enter Nike workspace"
- [ ] Refresh `/brand/{id}` → observe B7.1 skeleton flash → populated dashboard renders
- [ ] Click `.brand-switch` → dropdown opens → click another brand → URL updates + dashboard re-renders with new brand
- [ ] Type "test" in composer → ⌘↵ → observe B11 transition → land in editor
- [ ] Topbar "New canvas" → observe transition + editor
- [ ] Open `/brand/{id}/calendar` → observe coming-soon
- [ ] DevTools → toggle offline → observe the single `<NetworkStatusIndicator>` cloud-off icon at top-right of the viewport; hover shows the offline tooltip. Toggle online → icon disappears (no other surfaces should show or hide — the retired 3-signal pattern must NOT appear).
- [ ] File grid search → debounce visible (200ms)
- [ ] Sort dropdown → switch to "Name" → grid re-sorts
- [ ] Right-click a file card → context menu opens (Cluster 08 ships full menu; this PRD's smoke test only checks invocation hook fires)

### 9.5 Pre-commit + CI verifications

- `bun run check` — oxlint + type-check zero errors on new files
- `bun run format` — oxfmt no diff
- `bun run test:unit` — all green
- `bun run test:dupes` — jscpd < 3%
- **Grep checks** (CI):
  - `grep -rn 'access_token=' src/ api/` → 0 matches (must be 0 post-§5.4.1)
  - `grep -rn 'bg-white\|text-gray-900\|text-gray-500\|border-gray-200\|border-gray-300' src/components/onboarding/StoreTypeStep.vue src/components/dashboard/IntegrationsCard.vue` → 0 matches (must be 0 post-§5.6 item 1)
  - `grep -rn 'access_token' src/components/onboarding/` → only ever as a `headers.Authorization` Bearer token, never URL-attached
- Bundle-size check: dashboard chunk ≤120 KB gzipped (lazy-load child routes verified)

---

## 10. Rollout phasing

### Phase A — initial deploy (Wave 2 close)

- Migration `20260520_02_dashboard_indices` applied to local + staging Supabase
- All Vue routes 6.1 wired
- `StoreTypeStep.vue` + `IntegrationsCard.vue` refactored to dark theme
- `access_token` URL fix deployed
- `useDashboardStore` + `useUIStateStore` shipped; `useBrandsStore` extended
- `useOnboarding`, `useLogoFetch`, `useGreeting`, `useFileGrid` composables shipped
- All page-level + chrome + content components shipped
- B11 transition components shipped
- B7.1 skeleton + empty-state instances shipped
- A12 coming-soon shells shipped for Calendar / Swipes / Templates / Products / Personalization / Knowledge-base / Memories
- A13 offline indicator shipped (uses Cluster 11 `useOfflineState` cross-cut)
- Unit + integration + E2E test pack ≥85% coverage on new files
- Manual smoke pass (§9.4) signed off
- Bundle size verified

### Phase B — follow-up

- File-grid list view (if not in Phase A — recommended ship in Phase A)
- Composer attachments (Phase 2 — file picker + drag-drop receivers; depends on Cluster 05 drag-drop primitive)
- Server-side favicon-fetch Edge Function if browser-side has false-negative rate >5% in prod

### Feature flags (per `00d` 2.B 10 default — hard-coded constants for MVP)

| Flag | Default | Toggle condition |
|---|---|---|
| `ONBOARDING_REQUIRED_FOR_FIRST_BRAND` | `true` | Locked per §12.1 RESOLVED |
| `FILE_GRID_LIST_VIEW_ENABLED` | `true` | If Phase-A scope contracts, set `false` and ship grid-only |
| `COMPOSER_ATTACHMENTS_ENABLED` | `false` | Flip when Cluster 05 drag-drop primitive lands |
| `LOGO_AUTO_FETCH_SERVER_FALLBACK` | `false` | Flip if browser-side false-negatives >5% in prod |
| `FILE_GRID_DEFAULT_SORT` | `'recent'` | Locked per §12 RESOLVED-3 |
| `FILE_GRID_SEARCH_DEBOUNCE_MS` | `200` | Locked per §12 RESOLVED-4 |

---

## 11. Cross-cuts to other PRDs

| Other PRD | What we depend on (from them) | What they depend on us for |
|---|---|---|
| **01 — Auth & Identity** | `/auth/callback` post-redirect logic; `users.preferences` JSONB column; auth guard `requiresAuth` + `requiresOnboarding` + `onboardingOnly` + `viewportGuard` metas; `useAuthStore.profile.name` for greeting | We surface `useBrandsStore.brands.length` for the callback router to read |
| **11 — Shared UI Infrastructure** | `useToast()`, `<KovaModal>`, `useConfirm()`, `<KovaSkeleton>` primitive, `<EmptyState>` primitive, `useOfflineState`, Reka DropdownMenu wrapper, theme meta convention. *(Command-K palette dropped per 00g 2026-05-17 — no longer a Cluster 11 dep.)* | None at runtime — we author against their primitives |
| **03 — Brand Management** | `useBrandsStore.createBrand` action (already exists); `archive_brand` + `delete_brand` RPCs; `/account/brands` page (B12); new-brand modal (A2/A3); brand-color auto-assign palette; `brands.archived_at` column | Sidebar `.brand-switch` "Manage brands" routes to their page; "+ New brand" opens their modal; onboarding wizard step 1 calls `useBrandsStore.createBrand` |
| **04 — Account & Stripe** | `users.plan` column (for sidebar footer plan label); `users.stripe_*` columns (just-checked by sidebar plan badge, not modified) | We render the plan label in sidebar footer; we surface "Account" item in `AccountMenu` that routes to `/account` |
| **05 — Brand Kit & Drag-Drop** | Brand-kit-extract Edge Function (`api/shopify/brand-kit-extract.ts` extended per §5.6 item 3); confirm-before-write brand-voice review surface | Onboarding step 3 (`BrandKitStep`) uploads files + posts payload that Cluster 05's extract consumes; the AI promise card UI promises Cluster 05's downstream extract |
| **06 — Canvas Editor Core Chrome** | Editor route `/editor/:canvasId`; existing canvas topbar with breadcrumb "← {Brand}" navigation | B11 transition routes into their editor; "Back to dashboard" pattern returns to our `/brand/{brandId}` |
| **08 — Menus, Popovers, Shortcuts** | Right-click context-menu shell + `useObjectActions()` composable for file-card right-click (rename / duplicate / move to trash / etc.) | File-card emits `context-menu` event with `{ canvasId, position }`; their menu reads this |
| **09 — Version History + Trash** | Trash sub-route view + restore action; canvas thumbnail generation cron | File grid filters trashed canvases (`trashed_at IS NOT NULL`); reads `canvases.thumbnail_url` when present |
| **10 — AI Chat + Memory** | Eventually drives composer chip recipes + the canvas-creation system prompt | Composer submit creates canvas with prompt seeded; their chat panel reads from there |
| **12 — Settings & User Preferences** | `useUIStateStore` pattern (per Q5 Layer 2); future `usePreferencesStore` for Layer 1 server prefs | We seed `useUIStateStore` with `lastActiveBrandId`, `lastActiveCanvasId`, `fileGridViewMode`; they extend with pages/layers collapse, recent colors, dismissed toasts |

### 11.1 Hygiene rules from `00e §6`

- **No marketing-site spec** (§6 #1): N/A — this PRD does not touch marketing. ✅
- **No live multi-device canvas sync promises** (§6 #2): Composer + file grid both read Supabase Realtime channel state for offline detection — last-snapshot-wins is implicit (file grid re-fetches on visibility change); no live multi-device sync promised. ✅
- **D-5E staging trigger** (§6 #3): N/A in Wave 2 (staging activation gates on Wave 3 Cluster 04). ✅
- **D-3 RoPA disclosure** (§6 #4): N/A in this PRD — owned by Cluster 01 (privacy policy) + Cluster 05 (extract surface). Acknowledged for awareness. ✅
- **D-3 brand-voice guardrail** (§6 #5): N/A — owned by Cluster 05. We trigger the extract upload; Cluster 05 ships the confirm step before any silent write to `brands.voice`. ✅

---

## 12. Risks + open questions

### 12.1 RESOLVED 2026-05-15 — Onboarding required vs skippable

**Decision:** Required for first brand; skippable (inline modal) for subsequent brand creation. Matches Figma's "team setup is gated; project setup is inline" pattern and matches A1 + A2/A3 hi-fi split. Locked.

### 12.2 RESOLVED 2026-05-15 — Empty-state copy + illustrations

**Decision:** Match A11.1 + A11.7 hi-fi exactly. Use existing Lucide icons (`layout-grid` for zero-canvases, `store` for zero-brands, `search-x` for search-empty). No bespoke illustrations — Lucide-in-circle pattern is the design-system standard.

### 12.3 RESOLVED 2026-05-15 — File-grid default sort

**Decision:** `recent` (by `canvases.updated_at DESC`). Matches Figma "Recently viewed" default + matches A11.1 sub-meta language ("edited 2h ago"). Locked.

### 12.4 RESOLVED 2026-05-15 — Search debounce

**Decision:** 200ms. Industry standard (Notion 200ms, Linear ~150ms, Figma ~200ms). Below 150ms feels jumpy; above 300ms feels laggy. Locked.

### 12.5 RISK (Medium) — Cluster 05 sequencing for brand-kit extract

Onboarding step 3 uploads files + posts payload, but the extract Edge Function (Cluster 05 owns) may not exist when Wave 2 ships.

**Mitigation:** Step 3 enqueues the payload to a `brand_kit_extract_queue` table or returns a "processing" toast; Cluster 05 picks it up. Until Cluster 05 ships, step 3 stores the files + textarea content in a side-table and the AI promise card shows "Queued for processing" without actual inference. Browser shows toast "Your brand kit is being analyzed — check back in a few minutes" — no broken promise to the user, no actual extract until Cluster 05 lands.

### 12.6 RISK (Low) — Brand-color auto-assign for onboarding step 1

Cluster 03 ships `brands.color` (CHECK IN coral/violet/sage/sand/graphite). This PRD's onboarding step 1 creates a brand — needs to pick a color. Until Cluster 03 lands, the column doesn't exist; `useBrandsStore.createBrand` would error if it tries to set it.

**Mitigation:** Don't set color in onboarding's createBrand call — let Cluster 03's column add a `DEFAULT 'coral'`. The user can change in Cluster 03's brand-settings later. If founder wants per-brand color in MVP onboarding: defer to a Cluster 02.5 patch once Cluster 03 lands.

### 12.7 RESOLVED 2026-05-15 — Logo auto-fetch strategy (browser-side vs server-side)

**Decision:** Browser-side only at MVP (per §5.3.1). Server-side fallback Edge Function added Phase B if browser false-negative rate >5%. Documented as known limitation; user can always manually upload.

### 12.8 RESOLVED 2026-05-15 — Composer attachment placeholder behavior

**Decision:** Hide the `+` button entirely in MVP. A button that only shows a "not yet" toast is worse than no button. Wire the button + file picker in Phase 2 once Cluster 05 drag-drop primitive lands.

### 12.9 RESOLVED 2026-05-15 — Coming-soon "Notify me when it's ready" mechanism

**Decision:** Wire to Resend mailing-list signup in Phase A. Small marginal cost, captures real product-signal data. Resend integration already exists from Cluster 01.

### 12.10 RESOLVED 2026-05-19 — Existing onboarding components (WelcomeStep, BrandNameStep, BrandUrlStep, NameStep) consolidation

§6.4.2 recommends consolidating BrandNameStep + BrandUrlStep + NameStep into a single `BrandIdentityStep` matching A1.01.c's single-screen layout. Existing M9 split is 3 screens; hi-fi is 1 screen.

**Decision (founder ratified 2026-05-19 — C-MED5):** Consolidate per hi-fi. `BrandNameStep`, `BrandUrlStep`, and `NameStep` are retired during the refactor and `BrandIdentityStep` is the single replacement step. `WelcomeStep` and `ReviewStep` are also retired in the same wave (see C-LOW02.7 — Plan 02 Task T13). M9 tests against the retired files are deleted as part of the refactor; onboarding analytics consolidate `name_entered` + `url_entered` events into one `brand_identity_submitted` event.

### 12.11 Sidebar SOON-tagged nav entries — split into Part A + Part B

**Part A — Brand Kit / Knowledge base / Memories items.** OPEN at draft time; RESOLVED in-session 2026-05-17 by founder — show with `SOON` pills per A12 pattern. Communicates roadmap + sets expectations. Implementation: render the items with `.pill` token (9px font, neutral pill) on the right side of each nav row; route handlers render placeholder views until Cluster 05 + 10 ship.

**Part B — "Brands" sidebar item.** RESOLVED 2026-05-17 via B12 reversal dispatch (00f Prompt C). Brands item ships **visible at MVP with NO `SOON` pill** — it routes to `/account/brands`, the live B12 page owned by PRD 03 (page content) + PRD 04 (route registration + `.acc-rail` host). Promoted from Phase 2 → MVP per founder reversal of the 2026-05-13 lock. See §13.2 Q-decisions cross-ref.

### 12.12 RESOLVED 2026-05-19 — `/account` sidebar entry

A12 hi-fi shows no "Account" item in sidebar nav — `/account` is reachable only via sidebar-footer `AccountMenu` dropdown. Cluster 04 (Account & Stripe) confirms this routing per Q12 + Q13.

**Decision (founder ratified 2026-05-19 — A-MED1):** No `/account` sidebar item. Users reach Account exclusively via the sidebar-footer avatar dropdown (`AccountMenu`). Acceptable because the avatar is always-visible at the bottom of the sidebar and is the canonical destination per A12 hi-fi. Brand-management (`/account/brands`) is reached via the brand-switch dropdown's "Manage brands" link, not a sidebar entry.

### 12.13 Changelog 2026-05-17

- **§12.11 split** — Part A (Brand Kit / Knowledge base / Memories) resolved in-session: show with `SOON` pills. Part B (Brands item) resolved via 00f B12 reversal dispatch: ships visible at MVP, no `SOON` pill, routes to `/account/brands` (PRD 03 + 04 own).
- **Cmd+K reference scrubbed per 00g kill decision** — Command-K palette dropped from MVP entirely. Sidebar `.side-search` now plain search input (no shortcut hint, no palette binding). Affected lines: §0 depends-on table; §1.1 plain-language paragraph; §2.1 sidebar bullet; §2.2 dep table (Cluster 11 row); §2.4 cross-cut acknowledgment (Cluster 11); §3.2 dashboard hi-fi raster row; §8.2 sidebar checklist; §11 cross-cluster dep table (Cluster 11 row); §12.13 (this entry); §A.1 dep summary (Cluster 11 line).

---

## 13. References

### 13.1 03-doc rows covered

- No direct §2 rows (dashboard not in canvas-side inventory).
- §3C cross-cut row 1 (user preferences storage Layer 2) — `kova:ui:last-brand` localStorage key per Q5 schema.
- §3C cross-cut row 7 (right-click context-menu shell — file-card invokes Cluster 08's shell).

### 13.2 Q-decisions baked in

- **Q5 (Layer 2)** — last-active brand persists per-device via `useLocalStorage('kova:ui:last-brand', null)`
- **Q16** — avatar dropdown item set (Account · Help · Shortcuts · Sign out) consumed by `AccountMenu.vue` (existing)
- **Q17 (REVERSED 2026-04-25)** — brand-switching only via dashboard sidebar `.brand-switch` popover; no in-canvas brand picker; canvas breadcrumb "← {Brand}" routes back to `/brand/{brandId}`

### 13.3 Hi-fi files

- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A1 Onboarding - Dark.html` (A1.01.c–A1.01.f — onboarding wizard steps 1-4 + splash)
- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi 03 Brand Dashboard - Dark.html` (03.a — dashboard home with sidebar + composer + file grid)
- `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B11 Canvas Creation Transition - Dark.html` (B11.1–B11.4 — canvas-creation transition states)
- `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B7 Loading Skeletons - Dark.html` (B7.1 — dashboard skeleton)
- `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B9 List Search Empty - Dark.html` (B9 pattern — search-empty state applied to file grid)
- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html` (A11.1, A11.7 — empty states; A12.1–A12.3 — coming-soon; A13.1, A13.2 — online/offline; A_canvas_nav — brand-label click destination)
- `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B12 Brands page - Dark.html` (B12.1–B12.4 — cross-referenced; `/account/brands` page owned by Cluster 03/04)

### 13.4 Design system

- `main-main-kova-scope/design-system/design.md` (spec — token vocabulary, component contracts, accent reservation rules)
- `main-main-kova-scope/design-system/kova-hifi.css` (canonical dark CSS — `:root` tokens + component primitives `.btn`, `.pill`, `.empty-pane`, `.field`, `.seg`, `.kbd`, `.cs-pane`)
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` (vocabulary cheat-sheet)
- Onboarding + dashboard component-local CSS lifted from A1 + 03 hi-fi inline styles per design.md §6 "Extending the system"

### 13.5 Audit + verification inputs

- `kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` (master plan; §3 Cluster 02; §5 PRD template; §5.5 M9 reuse table; §5.6 ratification log; §6 cross-cuts; §8 done definition; §5.7 external verification)
- `kova-open-pencil-1/docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md` (operator manual followed for this draft)
- `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md` (§2.A Cluster 02 lines 1105–1182 lifted as base; §5.6 item 1 M9 dark refactor; §5.6 item 3 brand-kit-extract scope extension)
- `kova-open-pencil-1/docs/kova-final-prds/00d-EXTERNAL_VERIFICATION_HANDOFF.md` (Top-10 decision ratifications; D-1 access_token security recategorized; §5 item 2(a) launch-blocking security item)
- `kova-open-pencil-1/docs/kova-final-prds/00e-EXTERNAL_VERIFICATION_VERDICT.md` (§6 PRD-hygiene rules; §8 resolved-concerns log)
- `kova-open-pencil-1/docs/kova-final-prds/01-auth-and-identity.md` (canonical PRD-format reference — structure + depth mirrored here)

### 13.6 External sources cited

- [Supabase Storage — RLS path-prefix policies](https://supabase.com/docs/guides/storage/security/access-control) (`storage.foldername()` pattern)
- [Supabase — pg_trgm extension](https://supabase.com/docs/guides/database/extensions/pgtrgm) (GIN trigram index for case-insensitive search)
- [Lucide Icons](https://lucide.dev/icons/) (canonical icon set per CLAUDE.md `unplugin-icons` config)
- [Reka UI — DropdownMenu](https://reka-ui.com/docs/components/dropdown-menu) (used for brand-switcher popover)
- [VueUse — useLocalStorage](https://vueuse.org/core/useLocalStorage/) (Q5 Layer 2 storage primitive)
- [Web Performance API — `performance.mark()`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/mark) (B11 transition duration measurement)

### 13.7 Memory pointers consulted

- `feedback_app_dark_website_light` — dashboard + onboarding are inside the authenticated app → DARK (no light theme variants in this PRD)
- `feedback_figma_ui_theme` — sidebar nav + brand-switcher patterns referenced against Figma's project picker
- `feedback_browser_smoke_test_before_done` — §9.4 manual QA gate required before claiming done
- `feedback_verify_with_docs` — verified Supabase pg_trgm + Reka DropdownMenu via official docs
- `feedback_explain_for_nontechnical_founder` — §1.1 plain language + §1.2 caveman summary both included
- `project_kova_avatar` — multi-brand freelancer drives the sidebar brand-switcher pattern (not workspace-switcher); brands are first-class
- `project_kova_mvp_decisions` — onboarding required for first brand; per-brand dashboard isolation
- `project_design_system_master` — canonical paths cited in §13.4
- `project_m9_shopify_tools_schema_bug` — schema bug fixed 2026-05-13; M9 surfaces this PRD touches (StoreTypeStep + IntegrationsCard) are M9-era code refactored here

### 13.8 What is NOT in this PRD (handed elsewhere)

- Brand record archive / delete / restore RPCs (Cluster 03)
- Brand-color auto-assign palette logic (Cluster 03)
- New-brand modal outside onboarding (Cluster 03)
- `/brands` picker page + `/account/brands` management page (Cluster 03 / 04)
- Brand-kit-extract Edge Function + Claude voice inference (Cluster 05)
- Account page (Cluster 04)
- Stripe billing data sources (Cluster 04 — we read `users.plan` only)
- Canvas editor route + chrome (Cluster 06)
- Canvas engine + renderer (Cluster 07a / 07b)
- File-card right-click context menu (Cluster 08 owns shell; we emit the event)
- Trash view (Cluster 09)
- AI chat panel (Cluster 10)
- Toast / modal / skeleton / empty-state / offline-state primitives (Cluster 11)
- User preferences Layer 1 server JSONB shape (Cluster 12)
- Privacy policy + RoPA (Cluster 01 owns; we acknowledge brand-kit extract data flow via §5.6 item 3 routing)
