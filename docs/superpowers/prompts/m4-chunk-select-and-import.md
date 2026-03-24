# M4 Media Library: Multi-Select, Bulk Delete & Import to Canvas

> **Handoff prompt** — execute this in a fresh session with full context.

## Goal

Add multi-select functionality to the Media Library (brand assets page). Users should be able to select multiple images via checkboxes, then either **bulk delete** them or **import them to an existing canvas** (which navigates to the editor and places the images).

## Current State

The media library already has:
- Grid & list view toggle
- Sort dropdown (newest, oldest, name, size)
- Search filtering
- Per-card hover actions: Select button, expand/preview icon, three-dot menu (Copy URL, Rename, Delete)
- Image preview lightbox
- Separate "Upload from URL" and "Upload from computer" buttons
- `renameImage()` in media store

**Key files to modify:**
- `src/views/dashboard/BrandAssetsView.vue` — main assets page (add selection state, bulk toolbar, canvas picker)
- `src/components/media/MediaGrid.vue` — pass `selectedIds`, show checkboxes
- `src/components/media/MediaCard.vue` — show checkbox overlay when in selection mode or on hover

**Key files for reference (read-only patterns):**
- `src/components/dashboard/CanvasCard.vue` — Reka UI DropdownMenu pattern, rename UX
- `src/components/dashboard/menu-styles.ts` — shared menu CSS classes
- `src/stores/canvases.ts` — `fetchCanvases(brandId)`, `sortedCanvases` computed, `Canvas` type
- `src/stores/media.ts` — `deleteImage()`, `getPublicUrl()`, `images` ref
- `src/router.ts` — editor route is `/editor/:canvasId`

## Requirements

### 1. "Select" button = checkbox toggle (not "use image")

Currently the "Select" button on card hover emits `select` and the view treats it as a preview. Change this:

- **"Select"** button on hover → toggles a checkbox on/off for that image
- When an image is selected, show a **visible checkbox** (checked, top-left corner of the card)
- Clicking the card body should also toggle selection (not open preview)
- The **expand/preview icon** remains the only way to open the lightbox

### 2. Bulk actions toolbar (replaces normal toolbar when selection active)

When `selectedIds.size > 0`, replace the normal toolbar (sort, search, view toggle, upload buttons) with:

```
[✓ Select all]  "3 selected"  ——spacer——  [Import to canvas (blue)]  [Delete (red outline)]  [Cancel]
```

- **Select all** checkbox — toggles all visible (filtered) images
- **Count** — "{N} selected"
- **Import to canvas** — blue primary button, opens canvas picker dialog
- **Delete** — red outlined button, opens bulk delete confirmation
- **Cancel** — clears selection, returns to normal toolbar

### 3. Import to canvas → canvas picker → navigate to editor

When "Import to canvas" is clicked:

1. Open a Reka UI `DialogRoot` modal titled "Import to canvas"
2. Subtitle: "Choose a canvas to place {N} image(s) into."
3. List all canvases for the current brand using `canvasesStore.sortedCanvases`
4. Each canvas is a clickable row showing the canvas name
5. Show "No canvases yet. Create one first." if empty
6. Cancel button at bottom

When a canvas is clicked:
1. Close the dialog
2. Store selected image data in `sessionStorage` key `kova-import-images`:
   ```json
   [{ "url": "https://...", "fileName": "logo.png", "fileType": "image/png" }]
   ```
3. Navigate to `/editor/${canvasId}`
4. Clear selection

> **Note:** The editor-side code to read `sessionStorage` and place images is out of scope for this task. Just store the data and navigate.

### 4. Bulk delete confirmation

When "Delete" is clicked from the bulk toolbar:

1. Show confirmation modal: "Delete images" / "Are you sure you want to delete **{N} image(s)**? This action cannot be undone."
2. Cancel / Delete buttons
3. On confirm: `Promise.allSettled()` all deletions, show toast with count, clear selection
4. If any fail, show error toast with failure count

### 5. Remove "Image renamed" toast

In `BrandAssetsView.vue`, the `handleRename` function currently shows no toast on success (already done). Verify this stays as-is — no success toast for rename.

### 6. Wire `selectedIds` into MediaGrid and MediaCard

**MediaGrid.vue:**
- Accept new prop: `selectedIds: Set<string>`
- Pass it through to each `MediaCard`
- In list view rows, add a checkbox column

**MediaCard.vue:**
- Accept new prop: `selected: boolean`
- When `selected` is true, show a **checked checkbox** in the top-left corner (always visible, not just on hover)
- When `selected` is false but hovering, show an **unchecked checkbox** in the top-left corner
- The "Select" button at bottom-left can remain but its click should emit `select` (toggle)

### 7. Fetch canvases on brand change

In `BrandAssetsView.vue`, when `brandId` changes, also call `canvasesStore.fetchCanvases(brandId)` so the canvas list is ready for the picker.

## Tech Stack & Conventions

- **Vue 3** Composition API, `<script setup lang="ts">`
- **Reka UI** for Dialog (canvas picker modal) — import from `'reka-ui'`
- **Tailwind CSS 4** utility classes only
- **Icons:** `<icon-lucide-*>` via unplugin-icons (e.g., `icon-lucide-trash-2`, `icon-lucide-import`, `icon-lucide-x`)
- **Pinia** composition stores
- **Immutability:** Always create new `Set()` when updating `selectedIds` — never mutate in place
- **No `any`**, no `!` non-null assertions
- **data-test-id** on all interactive elements

## Verification

After implementation:
```sh
bun run check        # Must pass (oxlint + tsgo)
bun test ./tests/unit/stores/media.test.ts  # Must pass (9 tests)
```

## Out of Scope

- Editor-side: reading `sessionStorage` and placing images on canvas
- Drag-and-drop reordering
- Image dimensions display
- Changes to `MediaLibraryPanel.vue` (editor floating panel) — it already handles select/preview/rename/delete independently
