# M4 Image Import Deep Audit

> **For agentic workers:** Use superpowers:systematic-debugging. Do NOT propose fixes until root cause is confirmed with evidence.

## Bug Report

**Steps to reproduce:**
1. Go to dashboard → Brand Assets
2. Select one or more images (checkboxes work correctly)
3. Click "Import to canvas" → choose a specific canvas
4. User lands on the editor/canvas page
5. **BUG:** Images do not appear on the canvas

## What We've Built So Far

### Write side (BrandAssetsView.vue)
- `importToCanvas(canvasId)` serializes selected images to `sessionStorage.setItem('kova-import-images', JSON.stringify(selectedImages))`
- Each image object: `{ url, fileName, fileType }`
- Then navigates via `router.push(/editor/${canvasId})`

### Read side (use-import-images.ts — NEW composable)
- On mount, reads `sessionStorage.getItem('kova-import-images')`
- Fetches each URL as blob → File
- Calls `store.placeImageFiles(files, cx, cy)` to place at viewport center
- Called inside `EditorView.vue` in the `if (canvasId) { ... }` block

### Existing working pattern (MediaLibraryPanel.vue)
- The floating media panel in the editor places images via the same `store.placeImageFiles()` API
- It fetches the image URL → blob → File, then calls `placeImageFiles`

## Investigation Checklist

You MUST investigate ALL of these before proposing any fix. Check each one and report findings with evidence.

### 1. Does OpenPencil canvas actually support images?

- [ ] Check `packages/core/` for image node support in the scene graph
- [ ] Search for `placeImageFiles` in `src/stores/editor.ts` — read the full implementation
- [ ] Search for `placeImageNode` — what does it actually do?
- [ ] Search for `decodeImageDimensions` — does it handle common formats (PNG, JPEG, WebP)?
- [ ] Check if there's an `IMAGE` or `RECTANGLE` with image fill node type in `packages/core/src/scene-graph.ts`
- [ ] **KEY TEST:** Does dragging an image file onto the canvas in the editor actually work? (check `use-canvas-drop.ts` — it uses the same `placeImageFiles` API)
- [ ] Does the MediaLibraryPanel "Select" button (which places images) actually work when used directly in the editor?

### 2. Routing investigation

- [ ] Check `src/router.ts` — what is the route for `/editor/:canvasId`? Is it the same component as the demo editor?
- [ ] Does `router.push(/editor/${canvasId})` cause a full page reload or an SPA navigation?
- [ ] If it's an SPA navigation from `/dashboard/brands/:brandId/assets` to `/editor/:canvasId`, does Vue Router properly mount EditorView?
- [ ] Could there be a guard or redirect that strips the canvasId?
- [ ] Check if `route.params.canvasId` is actually populated when EditorView mounts

### 3. Timing investigation

- [ ] `useImportImages` runs in `onMounted` — but the canvas element (`<canvas>`) may not be rendered yet at that point
- [ ] `store.placeImageFiles` requires `_ck` (the core engine) to be initialized. Check: is `_ck` ready when `onMounted` fires?
- [ ] The existing `onMounted` in EditorView already does an async Supabase fetch for canvas data — does `useImportImages` race with that?
- [ ] `document.querySelector('canvas')` — is the canvas DOM element available when the composable's onMounted fires?
- [ ] Check if `store.screenToCanvas()` works correctly before the canvas is fully initialized

### 4. sessionStorage investigation

- [ ] Is sessionStorage actually being written? Add a `console.log` or check in devtools
- [ ] Is the navigation happening on the same origin? (sessionStorage is origin-scoped)
- [ ] Could the page reload (if it's not SPA navigation) clear the sessionStorage read?
- [ ] Is the JSON format correct? Check what `mediaStore.getPublicUrl()` returns — is it a full URL or relative path?

### 5. placeImageFiles deep dive

- [ ] Read the full `placeImageFiles` implementation in `src/stores/editor.ts` (around line 1764)
- [ ] What is `_ck`? When is it initialized? Check the editor store initialization
- [ ] The function calls `placeImageNode` — read that function too
- [ ] Does `decodeImageDimensions` handle all expected image types?
- [ ] Does `placeImageFiles` silently fail (no error thrown) if `_ck` is null? (line 1765: `if (!_ck) return` — this would silently do nothing!)

### 6. CORS / fetch investigation

- [ ] The images are fetched from Supabase storage URLs. Are there CORS issues when fetching from the editor page?
- [ ] Does `mediaStore.getPublicUrl()` return a valid, fetchable URL?
- [ ] Could the Supabase storage bucket have restrictive CORS policies?

## Key Files to Read

| File | What to look for |
|------|-----------------|
| `src/stores/editor.ts` | `placeImageFiles`, `placeImageNode`, `_ck` initialization, `screenToCanvas` |
| `src/views/EditorView.vue` | Mount lifecycle, canvasId handling, when store is ready |
| `src/composables/use-import-images.ts` | The new consumer — timing, error handling |
| `src/composables/use-canvas-drop.ts` | Working image drop pattern for comparison |
| `src/components/media/MediaLibraryPanel.vue` | Working image placement pattern |
| `src/router.ts` | Route definitions, guards, `/editor/:canvasId` route |
| `src/views/dashboard/BrandAssetsView.vue` | `importToCanvas` — what's written to sessionStorage |
| `packages/core/src/scene-graph.ts` | Image/Rectangle node types |
| `src/stores/media.ts` | `getPublicUrl` — what URL format is returned |

## Expected Output

1. **Evidence-based findings** for each of the 6 investigation areas
2. **Root cause identification** — exactly which layer is failing and why
3. **Minimal fix** — smallest change to make import work, with code
4. Run `bun run check` to verify fix compiles

## Do NOT

- Propose fixes before completing investigation
- Assume the canvas supports images without verifying
- Modify `packages/core/` (read-only)
- Change the SYSTEM_PROMPT in use-chat.ts
- Skip any investigation area
