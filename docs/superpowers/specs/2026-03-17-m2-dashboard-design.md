# M2: Dashboard & Brand Management — Design Spec

**Created:** 2026-03-17
**Milestone:** 2 (Dashboard and Brand Management)
**Dependencies:** M1 (auth + routing) — complete
**Theme:** Light (consistent with login/signup/onboarding; only the editor uses dark theme)

---

## Data Model

```
User
  └── Brand (name + brand profile fields)
        └── Canvas (a Figma-like workspace — the unit of persistence)
              └── Email designs (spatial arrangements on canvas — NOT separate DB rows)
```

The PRD's original `clients` + `brand_profiles` tables are merged into a single `brands` table. A brand IS a client — there's no reason for two entities in a 1:1 relationship. This migration supersedes the PRD's planned `clients` table (Task 2.1.4) and `brand_profiles` table — both are replaced by the single `brands` table. All PRD references to `clients` should be read as `brands`, and `brand-profiles.ts` store merges into `brands.ts`.

---

## Database Schema

Single migration file: `supabase/migrations/20260317_m2_dashboard.sql`

### `brands` table

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, `gen_random_uuid()` |
| user_id | UUID | FK → `auth.users(id)`, NOT NULL |
| name | TEXT | NOT NULL |
| colors | JSONB | nullable — `{primary, secondary, accent, background}` |
| fonts | JSONB | nullable — `{heading, body}` |
| logo_url | TEXT | nullable |
| voice | TEXT | nullable |
| industry | TEXT | nullable |
| created_at | TIMESTAMPTZ | `now()` |
| updated_at | TIMESTAMPTZ | `now()` |

Brand profile fields (colors, fonts, logo_url, voice, industry) are nullable because a brand is created with just a name — onboarding (M3) fills in the rest.

### `canvases` table

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, `gen_random_uuid()` |
| brand_id | UUID | FK → `brands(id)` ON DELETE CASCADE, NOT NULL |
| name | TEXT | NOT NULL, DEFAULT `'Untitled'` |
| thumbnail_url | TEXT | nullable |
| trashed_at | TIMESTAMPTZ | nullable — null = active, non-null = soft-deleted |
| created_at | TIMESTAMPTZ | `now()` |
| updated_at | TIMESTAMPTZ | `now()` |

### RLS Policies

All tables scoped to `auth.uid()`:

- **brands:** SELECT/INSERT/UPDATE/DELETE WHERE `user_id = auth.uid()`
- **canvases:** SELECT/INSERT/UPDATE/DELETE WHERE `brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())`

### Triggers

Reuse existing `public.update_updated_at()` function from users migration for both tables.

### Supabase Storage

Bucket: `thumbnails`
- Path pattern: `{user_id}/{canvas_id}.png`
- RLS: authenticated users can upload/read files under their own `{user_id}/` prefix

---

## Routing

The existing `/dashboard` flat route in `src/router.ts` is restructured to use Vue Router's `children` array. `DashboardView.vue` becomes the layout shell (persistent sidebar + top bar + `<router-view>`) and the child routes render into its `<router-view>` slot.

```
/dashboard                        → DashboardView.vue (layout shell)
  /dashboard/                     → index redirect → /dashboard/:firstBrandId
  /dashboard/trash                → TrashView.vue (MUST be defined before :brandId to avoid param capture)
  /dashboard/:brandId             → CanvasGrid.vue
  /dashboard/:brandId/assets      → BrandAssetsView.vue (placeholder in M2, filled in M4)
/editor/:canvasId                 → editor with canvas context
```

**Route ordering is critical:** `/dashboard/trash` must be defined before `/dashboard/:brandId` in the children array. Otherwise Vue Router matches "trash" as a `:brandId` param. This is standard static-before-dynamic ordering.

The index redirect (`/dashboard/` with no child path) fetches brands and redirects to `/dashboard/:firstBrandId`. If no brands exist (shouldn't happen post-onboarding), redirect to `/dashboard/empty` or show an in-layout empty state.

---

## Component Tree

```
DashboardView.vue (layout shell: sidebar + top bar + router-view)
├── BrandList.vue (left sidebar)
│   ├── Brand items — click navigates to /dashboard/:brandId
│   ├── "+ New Brand" button — inline form (name input + Create)
│   ├── Brand Assets link — per-brand, navigates to /dashboard/:brandId/assets
│   └── Trash link — navigates to /dashboard/trash
├── AccountMenu.vue (rendered in DashboardView's top bar area, top-right — avatar dropdown with sign out)
│
├── [route: /dashboard/:brandId]
│   └── CanvasGrid.vue (canvas cards + "New Canvas" card)
│       ├── CanvasCard.vue (thumbnail/placeholder, name, timestamp, context menu)
│       └── EmptyState.vue (zero canvases — "Create your first canvas" CTA)
│
├── [route: /dashboard/:brandId/assets]
│   └── BrandAssetsView.vue (placeholder — "Upload your first brand asset" empty state)
│
├── [route: /dashboard/trash]
│   └── TrashView.vue (trashed canvases grid)
│       └── TrashCard.vue (thumbnail, name, "Trashed X ago", context menu)
│
└── MoveToTrashDialog.vue (modal confirmation — Reka UI Dialog)
```

---

## Stores

### `src/stores/brands.ts` (Pinia, composition API)

**State:**
- `brands: Brand[]`
- `isLoading: boolean`

**Actions:**
- `fetchBrands()` — load all brands for authenticated user
- `createBrand(name: string)` — create brand with name only, returns new brand
- `updateBrand(id: string, data: Partial<Brand>)` — update any brand fields
- `deleteBrand(id: string)` — permanent delete (DB cascade deletes canvases; application code deletes all associated thumbnails from Supabase Storage `thumbnails/{userId}/*` before the DB delete to avoid orphaned storage objects)

**Getters:**
- `sortedBrands` — alphabetical
- `selectedBrand` — computed from `brands` array + a `selectedBrandId` ref that the dashboard view sets from the route param `:brandId` (stores should not import `useRoute()` directly; the view passes the ID in via a setter or action like `selectBrand(id)`)

### `src/stores/canvases.ts` (Pinia, composition API)

**State:**
- `canvases: Canvas[]`
- `trashedCanvases: Canvas[]`
- `isLoading: boolean`

**Actions:**
- `fetchCanvases(brandId: string)` — load active canvases (where `trashed_at IS NULL`)
- `createCanvas(brandId: string, name?: string)` — create canvas, returns new record
- `renameCanvas(id: string, name: string)`
- `duplicateCanvas(id: string)` — creates a new canvas record copying: name (with " (Copy)" suffix), brand_id. Does NOT copy thumbnail_url (new canvas has no content yet) or content (no persistence until M7). Returns the new canvas record.
- `moveToTrash(id: string)` — sets `trashed_at = now()`
- `restoreCanvas(id: string)` — sets `trashed_at = null`
- `permanentlyDelete(id: string)` — hard delete from DB
- `fetchTrashed()` — load all trashed canvases across all brands

**Getters:**
- `sortedCanvases` — by `updated_at` descending (most recent first)
- `sortedTrashed` — by `trashed_at` descending

---

## Dashboard UI

### Layout (DashboardView.vue)

Three-region layout, light theme:
- **Left sidebar** (~240px): brand list, New Brand, Assets link, Trash link
- **Main area**: top bar (brand name as heading) + content area (`<router-view>`)
- **Top-right**: account avatar dropdown (sign out option)

Desktop-only. No responsive/mobile layout.

### Brand List Sidebar (BrandList.vue)

- Renders brand names from brand store
- Selected brand highlighted (derived from `:brandId` route param)
- Clicking a brand navigates to `/dashboard/:brandId`
- "+ New Brand" at bottom — opens inline text input + "Create" button
- "Assets" link per brand (navigates to `/dashboard/:brandId/assets`)
- "Trash" link at bottom of sidebar (navigates to `/dashboard/trash`)
- First brand auto-selected on load (redirect from `/dashboard` to `/dashboard/:firstBrandId`)
- Always visible — even with one brand

### Canvas Grid (CanvasGrid.vue)

- Grid of canvas cards for the selected brand
- First position: "New Canvas" card with `+` icon
- Clicking "New Canvas": creates canvas record → navigates to `/editor/:canvasId`
- Clicking existing card: navigates to `/editor/:canvasId`
- Cards sorted by `updated_at` descending
- Grid layout: CSS Grid with `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` — responsive columns that adapt to available width

### Canvas Card (CanvasCard.vue)

- Thumbnail: `<img>` if `thumbnail_url` exists, styled placeholder if not
- Canvas name (truncated if long)
- "Edited [relative timestamp]" subtitle
- Context menu: Reka UI `ContextMenu` for right-click, Reka UI `DropdownMenu` for kebab icon (both render the same menu items):
  - Open
  - Rename (inline edit)
  - Duplicate
  - Move to trash

### Empty State (EmptyState.vue)

When selected brand has zero active canvases:
- Centered layout with icon
- "Create your first canvas" heading
- Description text
- CTA button that creates canvas and navigates to editor

### Trash View (TrashView.vue)

- Same grid layout as canvas grid
- Shows all trashed canvases across all brands
- Cards show "Trashed [relative time]" instead of "Edited [relative time]"
- Context menu: Restore, Permanently delete

### Move to Trash Dialog (MoveToTrashDialog.vue)

Figma-style modal (Reka UI Dialog):
- Title: "Move file to trash"
- Body: "You're about to move **[canvas name]** to trash. You can restore it later from the Trash section."
- Buttons: Cancel (text), Move to trash (primary/blue)

### Brand Assets Placeholder (BrandAssetsView.vue)

M2 placeholder — empty state only:
- Centered layout with icon
- "Upload your first brand asset" heading
- Description text about brand image library
- Disabled CTA (or "Coming soon" label)
- Full implementation in M4

---

## Thumbnail Infrastructure

### Utility: `src/utils/capture-thumbnail.ts`

```
captureThumbnail(canvasId: string): Promise<void>
```

1. Grab the Skia `<canvas>` DOM element from the editor
2. `HTMLCanvasElement.toBlob()` → PNG
3. Resize to ~400x300 via offscreen canvas
4. Get `userId` from the auth store (`useAuthStore().user.id`)
5. Upload to Supabase Storage: `thumbnails/{userId}/{canvasId}.png`
6. Update canvas record's `thumbnail_url` with the public/signed URL

**Error handling:** All errors are caught and logged but never block navigation or save operations. A failed thumbnail capture is silent — the canvas card falls back to the styled placeholder.

### Triggers

- **M2:** `onBeforeRouteLeave` in `EditorView.vue` — fires the capture as a non-blocking call. The `beforeunload` event is NOT a reliable trigger for async operations like `toBlob()` + upload, so we do not rely on it. If the user closes the tab, the thumbnail simply stays stale until the next editor visit.
- **M7 (future):** Debounced call on auto-save — same utility, additional trigger point.

### Display

`CanvasCard.vue` renders:
- `<img :src="thumbnail_url">` with loading state if URL exists
- Styled placeholder (gray background with canvas name) if no URL

---

## Editor ↔ Dashboard Navigation

### AppMenu.vue (new component)

Top-left of the editor. Kova icon/logo that opens a dropdown menu (Reka UI DropdownMenu). Matches Figma's pattern from reference screenshots.

Menu items:
- **Back to Dashboard** — prominent first item, navigates to `/dashboard`
- File → New, Save (future)
- Edit submenu (future)

### EditorView.vue Changes

- Reads `:canvasId` from route params
- Loads canvas record from canvas store
- Loads associated brand from brand store
- Syncs canvas name to `store.state.documentName` on load — the editor's existing title bar display works as-is. If the user renames via the editor's inline rename (which writes to `store.state.documentName`), that change is also persisted back to the canvas record's `name` field via `canvasStore.renameCanvas()`.
- If canvas doesn't exist or `trashed_at` is non-null → redirect to `/dashboard`
- On `onBeforeRouteLeave`: calls `captureThumbnail(canvasId)` (non-blocking, errors logged silently)

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Dashboard theme | Light | Consistent with auth/onboarding; only editor is dark |
| Sidebar visibility | Always visible | Even with one brand — consistent UI, no layout shift |
| Data model | Merged `brands` table | `clients` + `brand_profiles` was a 1:1 split with no benefit |
| Thumbnails | Client-side capture, placeholders for now | Infrastructure built in M2, trigger on navigate-away; M7 adds on-save trigger |
| Delete pattern | Soft delete → Trash | Figma-style: modal confirmation, Trash section in sidebar, restore + permanent delete, no auto-clearing |
| Routing | Nested routes under /dashboard | Deep-linkable URLs, follows SaaS conventions (Figma, Linear) |
| Brand assets | Placeholder route in M2 | Navigation wired now, implementation in M4 |
| Migrations | `brands` + `canvases` in M2 | `brand_profiles` merged into `brands`; media table deferred to M4 |
