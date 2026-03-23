# M4: Brand Kit & Media Library — Design Spec

**Date:** 2026-03-22
**Status:** Approved
**Milestone:** M4
**Depends on:** M1 (Auth), M2 (Dashboard), M3 (Onboarding)

## 1. Purpose

Give Kova users a way to manage their brand identity (colors, fonts, logo, voice) through a dedicated settings page, and store/browse/place brand media assets both from the dashboard and from within the canvas editor.

This milestone delivers:
- A brand settings page for editing all brand profile fields
- A pure formatting utility that structures brand data for AI system prompt injection (wired in M5)
- A new-client dialog replacing the inline text input in the sidebar
- A media library with upload, browsing, and canvas placement

## 2. User Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Media library in editor | Figma-style floating panel |
| 2 | Media library on dashboard | Full page at `/dashboard/{brandId}/assets` |
| 3 | Brand profile editor | Dedicated settings page at `/dashboard/{brandId}/settings` |
| 4 | Brand editing from editor? | No — editor reads brand data, editing only from dashboard |
| 5 | New client flow | Small modal dialog (name required, URL optional) |
| 6 | Image selection in editor | Place on canvas at viewport center, panel closes |
| 7 | Brand kit to system prompt | Format utility only in M4; wire into `buildSystemPrompt()` in M5 |
| 8 | Omnisend screenshots | Functional reference only — Kova uses its own theme |
| 9 | File formats | JPEG, PNG, GIF, WEBP, SVG (logos). 5 MB max |
| 10 | Design language | Figma UI reference. Light theme outside editor |

## 3. Architecture Overview

**7 tasks across 2 phases. 12 new files (~1,710 lines). 8 modified files.**

### Phase 4.1 — Brand Kit System

| Task | Description |
|------|-------------|
| 4.1.1 | Brand Settings Page |
| 4.1.2 | Brand Kit Formatting Utility |
| 4.1.3 | New Client Dialog |

### Phase 4.2 — Media Library

| Task | Description |
|------|-------------|
| 4.2.1 | Media Store + DB Migration |
| 4.2.2 | Dashboard Media Page |
| 4.2.3 | Editor Floating Panel |
| 4.2.4 | Toolbar Integration |

### Foundation Work

- Add `url TEXT` column to `brands` table (in M4 migration)
- Light-themed `BrandColorPicker.vue` (existing onboarding picker is dark)

### Shared Component

`MediaGrid.vue` with `density: 'compact' | 'comfortable'` prop. Dashboard uses comfortable (200 px min thumbnails), editor panel uses compact (140 px min).

## 4. Task Details

### 4.1.1 Brand Settings Page

**Route:** `/dashboard/:brandId/settings`
**File:** `src/views/dashboard/BrandSettingsView.vue` (~280 lines)

**Layout:** Two-column — left labels, right inputs. Back link to canvas grid.

**Sections:**

1. **Brand Identity** — name (text input), URL (text input + "Re-extract" button)
2. **Logo** — current logo preview + replace upload
3. **Colors** — primary, secondary, accent, background via `BrandColorPicker`
4. **Fonts** — heading + body (text inputs for MVP; Google Fonts picker deferred)
5. **Voice** — textarea for brand voice/tone
6. **Industry** — text input

**Behavior:**

- Auto-save on blur/change with `watchDebounced(500ms)` (same pattern as `EditorView.vue:82`)
- Toast on save success/error
- Re-extract: confirmation dialog &rarr; `POST /api/extract-brand` with stored `brand.url` &rarr; updates fields

**Modified files:**

| File | Change |
|------|--------|
| `src/router.ts` | Add `BrandSettingsView` as dashboard child route |
| `src/views/DashboardView.vue` | Update heading computed for `/settings` path |

### 4.1.2 Brand Kit Formatting Utility

**File:** `src/utils/format-brand-prompt.ts` (~50 lines)

```ts
function formatBrandKitPrompt(brand: Brand): string
```

Returns a structured text block for system prompt injection:

```
## Brand Kit: {name}
**Colors:** primary: #hex, secondary: #hex, accent: #hex, background: #hex
**Fonts:** heading: {font}, body: {font}
**Voice:** {voice}
**Industry:** {industry}
```

- Omits sections where all values are null/empty
- Pure function, no side effects
- M5 integration: wired into `buildSystemPrompt()` in Task 5.3.1

**Tests:** `tests/unit/utils/format-brand-prompt.test.ts` (~80 lines, 6 tests, 100% coverage)

### 4.1.3 New Client Dialog

**File:** `src/components/dashboard/NewClientDialog.vue` (~150 lines)

**Trigger:** Replaces inline text input in `BrandList.vue`

**UI (Reka UI Dialog):**

- Brand name — required text input
- Website URL — optional text input with URL validation
- Create button — disabled while name is empty

**Behavior:**

- Name only &rarr; `createBrand({ name })` &rarr; navigate to canvas grid
- Name + URL &rarr; `createBrandFull({ name, url })` &rarr; navigate to canvas grid &rarr; extraction runs in background
- Loading state on Create button during submission
- Error toast on failure

**Modified file:**

| File | Change |
|------|--------|
| `src/components/dashboard/BrandList.vue` | Replace inline input with "Add Brand" button opening dialog; add settings gear icon per brand linking to `/dashboard/{brandId}/settings` |

### 4.2.1 Media Store + DB Migration

**Migration:** `supabase/migrations/20260322_m4_media.sql` (~40 lines)

```sql
-- media table
CREATE TABLE media (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id    uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  file_name   text NOT NULL,
  file_type   text NOT NULL,
  file_size   int  NOT NULL,
  storage_path text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: user can only access own media
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
CREATE POLICY media_owner ON media
  USING (user_id = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-assets', 'media-assets', true);

-- Add url column to brands
ALTER TABLE brands ADD COLUMN url TEXT;
```

**Types:** `src/types/kova/media.ts` (~30 lines)

```ts
interface MediaAsset {
  id: string
  user_id: string
  brand_id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  created_at: string
}

const MEDIA_ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif',
  'image/webp', 'image/svg+xml'
] as const

const MEDIA_MAX_SIZE_BYTES = 5 * 1024 * 1024
```

**Store:** `src/stores/media.ts` (~140 lines, Pinia composition API)

| Method | Description |
|--------|-------------|
| `fetchImages(brandId)` | List media for brand |
| `uploadImage(brandId, file)` | Validate type/size &rarr; upload to storage &rarr; insert record |
| `uploadImageFromUrl(brandId, url)` | Fetch &rarr; create File &rarr; `uploadImage` |
| `deleteImage(id)` | Delete storage file &rarr; delete DB record |
| `getPublicUrl(storagePath)` | Supabase public URL |

Storage path format: `{userId}/{brandId}/{Date.now()}-{sanitizedFilename}`

**Modified file:**

| File | Change |
|------|--------|
| `src/stores/brands.ts` | Persist `url` in `createBrandFull`; cleanup media storage files on brand delete |
| `src/types/kova/database.ts` | Add `url: string \| null` to `Brand` interface |

**Tests:** `tests/unit/stores/media.test.ts` (~80 lines, 8 tests, mock Supabase)

### 4.2.2 Dashboard Media Page

**File:** `src/views/dashboard/BrandAssetsView.vue` (replaces 14-line stub)

**Layout:**

- Header: "Media Library" title + Upload button
- Search bar filtering by filename
- `MediaGrid` with comfortable density (200 px min thumbnails)
- `EmptyState` when no media

Upload opens `UploadDialog`.

### 4.2.3 Editor Floating Panel

**File:** `src/components/media/MediaLibraryPanel.vue` (~200 lines)

**Style:** Figma-style floating panel — absolutely positioned, `z-30`, shadow-lg, rounded-xl. Right side of canvas, below toolbar.

**Content:**

- Header with "Media" title + close (X) button
- Search bar
- `MediaGrid` with compact density (140 px min thumbnails)
- Upload button at bottom

**Image placement flow:**

1. User clicks image in grid
2. `fetch(publicUrl)` &rarr; `arrayBuffer()` &rarr; `new Uint8Array(buffer)`
3. Calculate viewport center via `store.screenToCanvas()`
4. `placeImageNode(bytes, cx, cy, w, h, name)`
5. Panel closes, image appears on canvas
6. Loading spinner on image card while placing

**Modified file:**

| File | Change |
|------|--------|
| `src/views/EditorView.vue` | Add `showMediaPanel` ref + conditional render of `MediaLibraryPanel` |

### 4.2.4 Toolbar Integration

**Modified file:**

| File | Change |
|------|--------|
| `src/components/Toolbar.vue` | Add media library toggle button with `icon-lucide-image`, emits event to toggle `showMediaPanel` in `EditorView` |

## 5. Shared Components

### MediaGrid.vue (~180 lines)

`src/components/media/MediaGrid.vue`

| Prop | Type | Description |
|------|------|-------------|
| `density` | `'compact' \| 'comfortable'` | Grid sizing |
| `images` | `MediaAsset[]` | Items to render |
| `searchQuery` | `string` | Filter by filename |

| Event | Payload | Description |
|-------|---------|-------------|
| `select` | `MediaAsset` | Image clicked |
| `delete` | `MediaAsset` | Delete requested |

Grid uses CSS Grid with `minmax(density === 'compact' ? 140px : 200px, 1fr)`. Client-side search by filename.

### MediaCard.vue (~120 lines)

`src/components/media/MediaCard.vue`

| Prop | Type |
|------|------|
| `image` | `MediaAsset` |
| `density` | `'compact' \| 'comfortable'` |

Hover overlay with select action + delete icon (top-right corner). Thumbnail uses `object-cover` with aspect-ratio container.

### UploadDialog.vue (~200 lines)

`src/components/media/UploadDialog.vue`

Reka UI Dialog with Tabs:

- **Tab 1 "Upload"** — drag-and-drop zone + file picker button
- **Tab 2 "From URL"** — URL text input + preview + confirm button

Validates file type against `MEDIA_ACCEPTED_TYPES` and size against `MEDIA_MAX_SIZE_BYTES`. Shows upload progress indicator.

### BrandColorPicker.vue (~80 lines)

`src/components/brand/BrandColorPicker.vue`

Light-themed color picker (existing onboarding picker uses dark theme).

| Prop | Type | Description |
|------|------|-------------|
| `modelValue` | `string` | Hex color value |
| `label` | `string` | Field label |

Reka UI Popover with color swatch button trigger, hex text input, and native color input.

## 6. Execution Waves

| Wave | Tasks (parallel) |
|------|-----------------|
| 1 | Media types, DB migration, brand kit formatting utility |
| 2 | Media store, BrandColorPicker |
| 3 | BrandSettingsView, NewClientDialog, MediaCard |
| 4 | MediaGrid, UploadDialog, Router + BrandList changes |
| 5 | BrandAssetsView (dashboard), MediaLibraryPanel (editor) |
| 6 | Toolbar integration |

## 7. Testing Strategy

| Test File | Tests | Coverage Target |
|-----------|-------|-----------------|
| `tests/unit/utils/format-brand-prompt.test.ts` | 6 | 100% |
| `tests/unit/stores/media.test.ts` | 8 | 80% |
| `tests/unit/components/new-client-dialog.test.ts` | 4 | 80% |
| E2E: media panel &rarr; select image &rarr; verify canvas node | 1 | Critical path |

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Image placement latency (URL &rarr; Uint8Array) | Loading spinner on image card while placing |
| Color picker theme mismatch | New light-themed `BrandColorPicker` component |
| SVG upload sanitization | Acceptable for MVP (user's own files only) |
| Dashboard heading logic | Update `DashboardView` computed for `/settings` path |
| Concurrent extraction tracking | Track per-brand extraction state, not globally |

## 9. File Inventory

### New Files (12)

| File | Est. Lines |
|------|-----------|
| `src/types/kova/media.ts` | ~30 |
| `supabase/migrations/20260322_m4_media.sql` | ~40 |
| `src/utils/format-brand-prompt.ts` | ~50 |
| `src/stores/media.ts` | ~140 |
| `src/components/brand/BrandColorPicker.vue` | ~80 |
| `src/views/dashboard/BrandSettingsView.vue` | ~280 |
| `src/components/dashboard/NewClientDialog.vue` | ~150 |
| `src/components/media/MediaCard.vue` | ~120 |
| `src/components/media/MediaGrid.vue` | ~180 |
| `src/components/media/UploadDialog.vue` | ~200 |
| `src/components/media/MediaLibraryPanel.vue` | ~200 |
| `tests/unit/utils/format-brand-prompt.test.ts` | ~80 |

### Modified Files (8)

| File | Change |
|------|--------|
| `src/router.ts` | Add `BrandSettingsView` route |
| `src/components/dashboard/BrandList.vue` | Replace inline input with dialog trigger + settings link |
| `src/views/dashboard/BrandAssetsView.vue` | Replace stub with full media library page |
| `src/views/DashboardView.vue` | Update heading computed for `/settings` |
| `src/views/EditorView.vue` | Add `MediaLibraryPanel` state + render |
| `src/components/Toolbar.vue` | Add media library toggle button |
| `src/types/kova/database.ts` | Add `url: string \| null` to `Brand` |
| `src/stores/brands.ts` | Persist `url` in `createBrandFull` + media cleanup on delete |
