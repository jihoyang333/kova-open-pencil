# M4 Chunk 4 Handoff: Media Library Components — MediaCard, MediaGrid, UploadDialog, Dashboard Page

Read the implementation plan at `docs/superpowers/plans/2026-03-22-m4-brand-kit-media-library.md` and execute **Chunk 4: Media Library Components (Tasks 9, 10, 11, and 12)**. Tasks 9→10→11 are sequential (each component is used by the next). Task 12 depends on all three.

## Context

- **Working directory:** `/Users/jihoyang/kova-main/kova-open-pencil-1`
- **Branch:** `m4-brand-media-library`
- **Chunks 1–3 complete:** 9 commits total (types, migration, format utility, media store, BrandColorPicker, router, settings page, new client dialog)

### Key files already created (Chunks 1–3)
| File | Purpose |
|------|---------|
| `src/types/kova/media.ts` | MediaAsset interface, MEDIA_ACCEPTED_TYPES, MEDIA_MAX_SIZE_BYTES, MEDIA_ACCEPT_STRING |
| `src/types/kova/database.ts` | Brand interface (includes `url` field) |
| `supabase/migrations/20260322_m4_media.sql` | Media table, storage bucket |
| `src/utils/format-brand-prompt.ts` | Brand → AI prompt string |
| `src/stores/media.ts` | Pinia store: fetchImages, uploadImage, uploadImageFromUrl, deleteImage, getPublicUrl |
| `src/stores/brands.ts` | Updated: `url` in createBrandFull, media cleanup in deleteBrand |
| `src/components/brand/BrandColorPicker.vue` | Light-themed color picker (Reka UI Popover) |
| `src/router.ts` | Has `:brandId/settings` and `:brandId/assets` routes |
| `src/views/dashboard/BrandSettingsView.vue` | Brand settings with auto-save, logo, colors, fonts, voice |
| `src/components/dashboard/NewClientDialog.vue` | Dialog for creating brand with name + optional URL |
| `src/components/dashboard/BrandList.vue` | Uses NewClientDialog, has settings gear per brand |

### Key files to read before starting
| File | Why |
|------|-----|
| `src/stores/media.ts` | You'll call `fetchImages`, `uploadImage`, `uploadImageFromUrl`, `deleteImage`, `getPublicUrl` |
| `src/types/kova/media.ts` | MediaAsset type, MEDIA_ACCEPT_STRING, MEDIA_ACCEPTED_TYPES for file validation |
| `src/views/dashboard/BrandAssetsView.vue` | Current stub (14 lines) — Task 12 replaces it entirely |
| `src/components/dashboard/EmptyState.vue` | Already emits `'action'` event — used in Task 12 |
| `src/components/dashboard/MoveToTrashDialog.vue` | Reka UI Dialog reference pattern |

### Test infrastructure (from Chunk 3)
- `bunfig.toml` — test preload config
- `tests/setup-dom.ts` — happy-dom globals for component tests
- `tests/vue-plugin.ts` — bun plugin for Vue SFC compilation
- `@vue/test-utils` installed for component mounting

## Tasks

### Task 9: MediaCard Component (independent)
- Create `src/components/media/MediaCard.vue`
- Props: `image` (MediaAsset), `publicUrl` (string), `density` ('compact' | 'comfortable'), `isPlacing?` (boolean)
- Emits: `select`, `delete`
- Hover overlay with delete button (top-right), filename label (bottom), placing spinner
- Aspect ratio: `aspect-square` for compact, `aspect-[4/3]` for comfortable
- Verify: `bun run check` → 0 errors
- Commit: `feat(m4): add MediaCard component with hover actions`

### Task 10: MediaGrid Component (depends on Task 9)
- Create `src/components/media/MediaGrid.vue`
- Props: `images` (MediaAsset[]), `density`, `searchQuery?`, `placingId?`
- Uses MediaCard in a CSS grid with auto-fill columns
- Filters images by filename search, shows empty state when no results
- Grid cols: `minmax(140px,1fr)` for compact, `minmax(200px,1fr)` for comfortable
- Verify: `bun run check` → 0 errors
- Commit: `feat(m4): add MediaGrid component with density and search`

### Task 11: UploadDialog Component (depends on Task 10 for context, independent to build)
- Create `src/components/media/UploadDialog.vue`
- Reka UI Dialog + TabsRoot with "Upload" and "From URL" tabs
- Upload tab: drag-and-drop dropzone + `useFileDialog` from `@vueuse/core` for file picker
- URL tab: input + preview + confirm button, calls `mediaStore.uploadImageFromUrl()`
- File validation uses MEDIA_ACCEPTED_TYPES, MEDIA_ACCEPT_STRING from types
- Verify: `bun run check` → 0 errors
- Commit: `feat(m4): add upload dialog with drag-drop and URL tabs`

### Task 12: Dashboard Media Page — Replace BrandAssetsView Stub (depends on all above)
- Replace entire `src/views/dashboard/BrandAssetsView.vue` (currently 14-line stub)
- Uses MediaGrid, UploadDialog, EmptyState
- Fetches images on brand change via `watch(brandId, ...)`
- Search input + upload button in header, grid below
- Empty state shows "Upload Images" button when no media
- Verify: `bun run check` → 0 errors
- Commit: `feat(m4): replace brand assets stub with full media library page`

## Workflow Requirements

Use the full superpowers workflow:
1. Use `superpowers:executing-plans` skill to execute
2. Tasks 9→10→12 are sequential. Task 11 is buildable independently but used by Task 12.
3. After implementation, run `superpowers:requesting-code-review` (code-reviewer agent) **before committing**
4. Fix any Critical/Important issues from review
5. Commit each task separately (4 commits total)

## Verification Checklist

- [ ] MediaCard renders with correct aspect ratio per density prop
- [ ] MediaGrid filters images by search query
- [ ] MediaGrid shows empty state when no images match
- [ ] UploadDialog has working drag-drop zone and URL tab
- [ ] BrandAssetsView fetches images on brand navigation
- [ ] BrandAssetsView shows EmptyState when no media exists
- [ ] `bun run check` — 0 errors
- [ ] Code review passed (no Critical/Important issues)
- [ ] 4 commits on `m4-brand-media-library` branch
