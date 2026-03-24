# M4 Chunk 5 Handoff: Editor Integration — MediaLibraryPanel + Toolbar Toggle

Read the implementation plan at `docs/superpowers/plans/2026-03-22-m4-brand-kit-media-library.md` and execute **Chunk 5: Editor Integration (Tasks 13 and 14)**. Task 13 creates the panel and wires it into EditorView. Task 14 adds the toolbar toggle button. They are sequential.

## Context

- **Working directory:** `/Users/jihoyang/kova-main/kova-open-pencil-1`
- **Branch:** `m4-brand-media-library`
- **Chunks 1–4 complete:** 12 commits total (types, migration, format utility, media store, BrandColorPicker, router, settings page, new client dialog, MediaCard, MediaGrid, UploadDialog, BrandAssetsView)

### Key files already created (Chunks 1–4)
| File | Purpose |
|------|---------|
| `src/types/kova/media.ts` | MediaAsset interface, MEDIA_ACCEPTED_TYPES, MEDIA_MAX_SIZE_BYTES, MEDIA_ACCEPT_STRING |
| `src/types/kova/database.ts` | Brand interface (includes `url` field) |
| `src/stores/media.ts` | Pinia store: fetchImages, uploadImage, uploadImageFromUrl, deleteImage, getPublicUrl |
| `src/stores/brands.ts` | Updated: `url` in createBrandFull, media cleanup in deleteBrand |
| `src/components/media/MediaCard.vue` | Image card with hover overlay (select + delete), density prop |
| `src/components/media/MediaGrid.vue` | CSS grid with auto-fill columns, search filtering, empty state |
| `src/components/media/UploadDialog.vue` | Reka UI Dialog + Tabs, drag-drop + URL upload, file validation |
| `src/views/dashboard/BrandAssetsView.vue` | Full media library dashboard page (search, upload, delete confirmation) |
| `src/router.ts` | Has `:brandId/settings` and `:brandId/assets` routes |

### Key files to read before starting
| File | Why |
|------|-----|
| `src/views/EditorView.vue` | You will add `showMediaPanel` ref, `provide('toggleMediaPanel')`, and render `MediaLibraryPanel` |
| `src/components/Toolbar.vue` | You will add a media library toggle button using `inject('toggleMediaPanel')` |
| `src/stores/editor.ts` | Has `placeImageFiles(files, cx, cy)` API and `screenToCanvas()` — used by the panel to place images on canvas |
| `src/stores/media.ts` | You'll call `fetchImages`, `getPublicUrl`, `deleteImage` from the panel |
| `src/stores/brands.ts` | You'll read `selectedBrandId` to know which brand's media to show |
| `src/components/media/MediaGrid.vue` | Reused inside the panel with `density="compact"` |
| `src/components/media/UploadDialog.vue` | Reused inside the panel for uploads |

### Test infrastructure (from Chunk 3)
- `bunfig.toml` — test preload config
- `tests/setup-dom.ts` — happy-dom globals for component tests
- `tests/vue-plugin.ts` — bun plugin for Vue SFC compilation
- `@vue/test-utils` installed for component mounting

## Tasks

### Task 13: MediaLibraryPanel + EditorView Integration
- Create `src/components/media/MediaLibraryPanel.vue`
  - Floating panel: `absolute right-4 top-14 z-30`, 288px wide, full height minus offset
  - Header with "Media" title and close button
  - Search input
  - Scrollable MediaGrid with `density="compact"`
  - Upload button at bottom, opens UploadDialog
  - `@select` handler: fetches image blob → wraps as File → calls `store.placeImageFiles([file], cx, cy)` at viewport center → emits `close`
  - `@delete` handler: calls `mediaStore.deleteImage()`
  - Watches `brandsStore.selectedBrandId` to fetch images
- Modify `src/views/EditorView.vue`:
  - Add `showMediaPanel` ref
  - `provide('toggleMediaPanel', () => { showMediaPanel.value = !showMediaPanel.value })`
  - Render `<MediaLibraryPanel v-if="showMediaPanel" @close="showMediaPanel = false" />`
- **Image placement flow:** Use `store.screenToCanvas(screenCx, screenCy)` to convert viewport center to canvas coords, then `store.placeImageFiles([file], cx, cy)` which handles decoding, sizing, and undo
- Verify: `bun run check` → 0 errors
- Commit: `feat(m4): add media library floating panel in editor`

### Task 14: Toolbar Integration
- Modify `src/components/Toolbar.vue`
  - `inject<() => void>('toggleMediaPanel')` from EditorView
  - Add desktop-only button with `icon-lucide-image`, matching existing toolbar button styling (`text-[#ccc] hover:bg-hover hover:text-white`)
  - `data-test-id="toolbar-media-library"`
  - Guarded: `v-if="!isMobile"` (toolbar has an `isMobile` flag — find it)
- Verify: `bun run check` → 0 errors
- Verify: `bun run test:unit` → all tests pass
- Commit: `feat(m4): add media library toggle button to toolbar`

## Final Verification (after both tasks)

Run the full quality gate:
```bash
bun run check && bun run test:unit && bun run test:dupes
```
Expected: All checks pass. Lint clean. Tests pass. Duplication < 3%.

## Workflow Requirements

Use the full superpowers workflow:
1. Use `superpowers:executing-plans` skill to execute
2. Tasks 13→14 are sequential
3. After implementation, run `superpowers:requesting-code-review` (code-reviewer agent) **before committing**
4. Fix any Critical/Important issues from review
5. Commit each task separately (2 commits)
6. After both tasks, use `superpowers:finishing-a-development-branch` to complete M4

## Verification Checklist

- [ ] MediaLibraryPanel renders as floating panel in editor
- [ ] Panel shows brand's images in compact grid
- [ ] Search filters images by filename
- [ ] Clicking an image places it on canvas at viewport center
- [ ] Upload dialog works from within the panel
- [ ] Toolbar has media library icon button (desktop only)
- [ ] Toggle: click toolbar button → panel opens, click again → closes
- [ ] `bun run check` — 0 errors
- [ ] `bun run test:unit` — all tests pass
- [ ] `bun run test:dupes` — duplication < 3%
- [ ] Code review passed (no Critical/Important issues)
- [ ] 2 commits on `m4-brand-media-library` branch
- [ ] M4 milestone complete — all 5 chunks done
