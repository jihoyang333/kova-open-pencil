# M4 Media Library: Multi-Select, Bulk Delete & Import to Canvas — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-select with checkboxes to the brand assets media library, enabling bulk delete and import-to-canvas workflows.

**Architecture:** Selection state (`selectedIds: Set<string>`) lives in `BrandAssetsView.vue` and flows down as props. A bulk toolbar conditionally replaces the normal toolbar. Two new Reka UI dialogs handle canvas picking and bulk delete confirmation. `sessionStorage` bridges image data to the editor on navigation.

**Tech Stack:** Vue 3 Composition API, Reka UI (DialogRoot), Tailwind CSS 4, Pinia, unplugin-icons (Lucide), Vue Router

**Spec:** `docs/superpowers/prompts/m4-chunk-select-and-import.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/components/media/MediaCard.vue` | Add `selected` prop, checkbox overlay, change click behavior |
| Modify | `src/components/media/MediaGrid.vue` | Add `selectedIds` prop, wire to MediaCard, add checkbox column in list view |
| Modify | `src/views/dashboard/BrandAssetsView.vue` | Selection state, bulk toolbar, canvas picker dialog, bulk delete dialog, fetch canvases |

---

## Chunk 1: MediaCard Selection UI

### Task 1: Add `selected` prop and checkbox overlay to MediaCard

**Files:**
- Modify: `src/components/media/MediaCard.vue`

- [ ] **Step 1: Add `selected` prop to MediaCard**

In `MediaCard.vue`, add `selected` to the props interface:

```ts
const props = defineProps<{
  image: MediaAsset
  publicUrl: string
  density: 'compact' | 'comfortable'
  isPlacing?: boolean
  selected?: boolean
}>()
```

- [ ] **Step 2: Add checkbox overlay to the image area**

Inside the `<!-- Hover overlay -->` div (the `absolute inset-0` container), add a checkbox in the top-left corner. It should:
- Always be visible when `selected` is true (checked state)
- Only visible on hover when `selected` is false (unchecked state)
- Use a styled div with `icon-lucide-check` inside for the checked state

Add this as the first child inside the hover overlay div (before the bottom action bar):

```html
<!-- Selection checkbox -->
<div
  class="absolute left-2 top-2 z-10"
  :class="selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
>
  <div
    :data-test-id="`media-card-checkbox-${image.id}`"
    class="flex size-5 items-center justify-center rounded border-2 transition-colors"
    :class="selected
      ? 'border-blue-500 bg-blue-500 text-white'
      : 'border-white bg-white/80 text-transparent hover:border-blue-300'"
    @click.stop="emit('select', image)"
  >
    <icon-lucide-check class="size-3" />
  </div>
</div>
```

- [ ] **Step 3: Add selected ring styling to the card root**

Update the card root div's `:class` binding to include a blue ring when selected:

```html
<div
  :data-test-id="`media-card-${image.id}`"
  class="group overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md"
  :class="{
    'pointer-events-none opacity-60': isPlacing,
    'ring-2 ring-blue-500 ring-offset-1': selected,
  }"
>
```

- [ ] **Step 4: Make card body click toggle selection**

Add a `@click` handler on the image area div (the one with `:class="aspectClass"`). The card body click should toggle selection. The preview icon remains the only way to open the lightbox.

```html
<div class="relative cursor-pointer" :class="aspectClass" @click="emit('select', image)">
```

- [ ] **Step 5: Run check**

Run: `cd /Users/jihoyang/kova-main/kova-open-pencil-1 && bun run check`
Expected: PASS (no lint or type errors)

- [ ] **Step 6: Commit**

```bash
git add src/components/media/MediaCard.vue
git commit -m "feat(media): add selection checkbox overlay to MediaCard"
```

---

### Task 2: Wire `selectedIds` into MediaGrid

**Files:**
- Modify: `src/components/media/MediaGrid.vue`

- [ ] **Step 1: Add `selectedIds` prop to MediaGrid**

Update the props interface:

```ts
const props = defineProps<{
  images: MediaAsset[]
  density: 'compact' | 'comfortable'
  searchQuery?: string
  sortBy?: SortOption
  viewMode?: ViewMode
  placingId?: string | null
  selectedIds?: Set<string>
}>()
```

- [ ] **Step 2: Pass `selected` prop to MediaCard in grid view**

Update the `<MediaCard>` in the grid view template:

```html
<MediaCard
  v-for="image in filteredAndSortedImages"
  :key="image.id"
  :image="image"
  :public-url="mediaStore.getPublicUrl(image.storage_path)"
  :density="density"
  :is-placing="placingId === image.id"
  :selected="selectedIds?.has(image.id) ?? false"
  @select="emit('select', $event)"
  @preview="emit('preview', $event)"
  @rename="(img, name) => emit('rename', img, name)"
  @delete="emit('delete', $event)"
/>
```

- [ ] **Step 3: Add checkbox column to list view rows**

In the list view, add a checkbox as the first element in each row. Also make the row clickable for selection:

```html
<div
  v-for="image in filteredAndSortedImages"
  :key="image.id"
  class="group flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
  :class="{ 'bg-blue-50 hover:bg-blue-50': selectedIds?.has(image.id) }"
  @click="emit('select', image)"
>
  <!-- Selection checkbox -->
  <div
    :data-test-id="`media-list-checkbox-${image.id}`"
    class="flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors"
    :class="selectedIds?.has(image.id)
      ? 'border-blue-500 bg-blue-500 text-white'
      : 'border-gray-300 text-transparent'"
  >
    <icon-lucide-check class="size-3" />
  </div>

  <!-- Thumbnail -->
  ...existing thumbnail and info...
```

- [ ] **Step 4: Update list view action buttons to stop propagation**

Add `@click.stop` to the preview, select (old), and delete buttons in list view so they don't trigger row-level selection:

```html
<button ... @click.stop="emit('preview', image)">
<button ... @click.stop="emit('delete', image)">
```

Remove the old "Select" button in the list view actions since the checkbox replaces it.

- [ ] **Step 5: Run check**

Run: `cd /Users/jihoyang/kova-main/kova-open-pencil-1 && bun run check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/media/MediaGrid.vue
git commit -m "feat(media): wire selectedIds into MediaGrid with checkbox column"
```

---

## Chunk 2: BrandAssetsView Selection State & Bulk Toolbar

### Task 3: Add selection state and bulk toolbar to BrandAssetsView

**Files:**
- Modify: `src/views/dashboard/BrandAssetsView.vue`

- [ ] **Step 1: Add selection state**

Add these refs and computed properties in the `<script setup>`:

```ts
import { useCanvasesStore } from '@/stores/canvases'
import { useRouter } from 'vue-router'

const router = useRouter()
const canvasesStore = useCanvasesStore()

const selectedIds = ref<Set<string>>(new Set())
const showCanvasPicker = ref(false)
const showBulkDelete = ref(false)

const hasSelection = computed(() => selectedIds.value.size > 0)
const selectedCount = computed(() => selectedIds.value.size)

// Filtered images (matches MediaGrid's filtering for select-all)
const filteredImages = computed(() => {
  if (!searchQuery.value.trim()) return mediaStore.images
  const query = searchQuery.value.toLowerCase()
  return mediaStore.images.filter((img) =>
    img.file_name.toLowerCase().includes(query)
  )
})
```

- [ ] **Step 2: Add toggle/clear/selectAll handlers**

```ts
function toggleSelect(image: MediaAsset): void {
  const next = new Set(selectedIds.value)
  if (next.has(image.id)) {
    next.delete(image.id)
  } else {
    next.add(image.id)
  }
  selectedIds.value = next
}

function clearSelection(): void {
  selectedIds.value = new Set()
}

function toggleSelectAll(): void {
  const visible = filteredImages.value
  if (selectedIds.value.size === visible.length) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(visible.map((img) => img.id))
  }
}
```

- [ ] **Step 3: Clear selection when brand changes**

Update the `brandId` watcher to also clear selection and fetch canvases:

```ts
watch(brandId, (id) => {
  if (id) {
    void mediaStore.fetchImages(id)
    void canvasesStore.fetchCanvases(id)
  }
  selectedIds.value = new Set()
}, { immediate: true })
```

- [ ] **Step 4: Add bulk toolbar template**

Replace the existing toolbar div with a conditional:

```html
<!-- Bulk actions toolbar (when selection active) -->
<div v-if="hasSelection" class="flex items-center gap-3">
  <!-- Select all checkbox -->
  <label
    data-test-id="media-bulk-select-all"
    class="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
  >
    <input
      type="checkbox"
      class="size-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
      :checked="selectedIds.size === filteredImages.length"
      @change="toggleSelectAll"
    />
    Select all
  </label>

  <!-- Count -->
  <span data-test-id="media-bulk-count" class="text-sm text-gray-500">
    {{ selectedCount }} selected
  </span>

  <div class="flex-1" />

  <!-- Import to canvas -->
  <button
    data-test-id="media-bulk-import"
    class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
    @click="showCanvasPicker = true"
  >
    Import to canvas
  </button>

  <!-- Delete -->
  <button
    data-test-id="media-bulk-delete"
    class="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
    @click="showBulkDelete = true"
  >
    Delete
  </button>

  <!-- Cancel -->
  <button
    data-test-id="media-bulk-cancel"
    class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
    @click="clearSelection"
  >
    Cancel
  </button>
</div>

<!-- Normal toolbar (when no selection) -->
<div v-else class="flex items-center gap-3">
  ...existing toolbar content...
</div>
```

- [ ] **Step 5: Wire `selectedIds` and `@select` to MediaGrid**

Update the `<MediaGrid>` usage:

```html
<MediaGrid
  :images="mediaStore.images"
  density="comfortable"
  :search-query="searchQuery"
  :sort-by="sortBy"
  :view-mode="viewMode"
  :selected-ids="selectedIds"
  @select="toggleSelect"
  @preview="handlePreview"
  @rename="handleRename"
  @delete="confirmDelete"
/>
```

- [ ] **Step 6: Run check**

Run: `cd /Users/jihoyang/kova-main/kova-open-pencil-1 && bun run check`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/views/dashboard/BrandAssetsView.vue
git commit -m "feat(media): add selection state and bulk actions toolbar"
```

---

## Chunk 3: Canvas Picker Dialog & Bulk Delete Dialog

### Task 4: Add canvas picker dialog

**Files:**
- Modify: `src/views/dashboard/BrandAssetsView.vue`

- [ ] **Step 1: Add Reka UI Dialog imports**

Add `DialogClose`, `DialogContent`, `DialogDescription`, `DialogOverlay`, `DialogPortal`, `DialogRoot`, `DialogTitle` to the **existing** `reka-ui` import statement (which already has the Select* components):

```ts
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
```

- [ ] **Step 2: Add the importToCanvas handler**

```ts
function importToCanvas(canvasId: string): void {
  const selectedImages = mediaStore.images
    .filter((img) => selectedIds.value.has(img.id))
    .map((img) => ({
      url: mediaStore.getPublicUrl(img.storage_path),
      fileName: img.file_name,
      fileType: img.file_type,
    }))

  sessionStorage.setItem('kova-import-images', JSON.stringify(selectedImages))
  showCanvasPicker.value = false
  clearSelection()
  void router.push(`/editor/${canvasId}`)
}
```

- [ ] **Step 3: Add canvas picker dialog template**

Add after the bulk delete confirmation dialog area (or after the existing delete confirmation):

```html
<!-- Canvas picker dialog -->
<DialogRoot v-model:open="showCanvasPicker">
  <DialogPortal>
    <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
    <DialogContent
      data-test-id="media-canvas-picker"
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
    >
      <DialogTitle class="text-base font-semibold text-gray-900">
        Import to canvas
      </DialogTitle>
      <DialogDescription class="mt-1 text-sm text-gray-500">
        Choose a canvas to place {{ selectedCount }} image(s) into.
      </DialogDescription>

      <div class="mt-4 max-h-64 overflow-y-auto">
        <template v-if="canvasesStore.sortedCanvases.length > 0">
          <button
            v-for="canvas in canvasesStore.sortedCanvases"
            :key="canvas.id"
            :data-test-id="`media-canvas-pick-${canvas.id}`"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
            @click="importToCanvas(canvas.id)"
          >
            <icon-lucide-file class="size-4 shrink-0 text-gray-400" />
            {{ canvas.name }}
          </button>
        </template>
        <p v-else class="py-6 text-center text-sm text-gray-500">
          No canvases yet. Create one first.
        </p>
      </div>

      <div class="mt-4 flex justify-end">
        <DialogClose
          data-test-id="media-canvas-picker-cancel"
          class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </DialogClose>
      </div>
    </DialogContent>
  </DialogPortal>
</DialogRoot>
```

- [ ] **Step 4: Run check**

Run: `cd /Users/jihoyang/kova-main/kova-open-pencil-1 && bun run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/dashboard/BrandAssetsView.vue
git commit -m "feat(media): add canvas picker dialog for image import"
```

---

### Task 5: Add bulk delete confirmation dialog

**Files:**
- Modify: `src/views/dashboard/BrandAssetsView.vue`

- [ ] **Step 1: Add bulk delete handler**

```ts
async function executeBulkDelete(): Promise<void> {
  const ids = [...selectedIds.value]
  const imagesToDelete = mediaStore.images.filter((img) => ids.includes(img.id))
  showBulkDelete.value = false

  const results = await Promise.allSettled(
    imagesToDelete.map((img) => mediaStore.deleteImage(img))
  )

  const failures = results.filter((r) => r.status === 'rejected')
  const successes = results.length - failures.length

  if (failures.length > 0) {
    toast.show(`Deleted ${successes} image(s), ${failures.length} failed`, 'error')
  } else {
    toast.show(`Deleted ${successes} image(s)`)
  }

  selectedIds.value = new Set()
}
```

- [ ] **Step 2: Add bulk delete confirmation dialog template**

Add after the single-image delete confirmation:

```html
<!-- Bulk delete confirmation -->
<DialogRoot v-model:open="showBulkDelete">
  <DialogPortal>
    <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
    <DialogContent
      data-test-id="media-bulk-delete-confirm"
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
    >
      <DialogTitle class="text-base font-semibold text-gray-900">
        Delete images
      </DialogTitle>
      <DialogDescription class="mt-2 text-sm text-gray-600">
        Are you sure you want to delete
        <strong class="font-medium text-gray-900">{{ selectedCount }} image(s)</strong>?
        This action cannot be undone.
      </DialogDescription>
      <div class="mt-6 flex justify-end gap-3">
        <DialogClose
          data-test-id="media-bulk-delete-cancel"
          class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </DialogClose>
        <button
          data-test-id="media-bulk-delete-execute"
          class="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          @click="executeBulkDelete"
        >
          Delete
        </button>
      </div>
    </DialogContent>
  </DialogPortal>
</DialogRoot>
```

- [ ] **Step 3: Run check**

Run: `cd /Users/jihoyang/kova-main/kova-open-pencil-1 && bun run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/views/dashboard/BrandAssetsView.vue
git commit -m "feat(media): add bulk delete confirmation dialog"
```

---

## Chunk 4: Verification & Cleanup

### Task 6: Verify rename toast behavior

**Files:**
- Read: `src/views/dashboard/BrandAssetsView.vue`

- [ ] **Step 1: Verify handleRename has no success toast**

Confirm that `handleRename` only shows a toast on error, not on success. The current code:

```ts
async function handleRename(image: MediaAsset, newName: string): Promise<void> {
  try {
    await mediaStore.renameImage(image, newName)
  } catch {
    toast.show('Failed to rename image', 'error')
  }
}
```

This is already correct — no change needed. Mark as verified.

- [ ] **Step 2: Commit (only if changes were needed)**

No commit expected for this task.

---

### Task 7: Final verification

- [ ] **Step 1: Run linting and type checks**

Run: `cd /Users/jihoyang/kova-main/kova-open-pencil-1 && bun run check`
Expected: PASS

- [ ] **Step 2: Run media store unit tests**

Run: `cd /Users/jihoyang/kova-main/kova-open-pencil-1 && bun test ./tests/unit/stores/media.test.ts`
Expected: 9 tests pass

- [ ] **Step 3: Run full unit test suite**

Run: `cd /Users/jihoyang/kova-main/kova-open-pencil-1 && bun run test:unit`
Expected: All tests pass

- [ ] **Step 4: Manual smoke test checklist**

If `bun run dev` is running, verify in browser:
- [ ] Hovering a card shows unchecked checkbox top-left
- [ ] Clicking checkbox/card selects it (blue ring + checked checkbox)
- [ ] Bulk toolbar appears with count, Import, Delete, Cancel
- [ ] "Select all" toggles all images
- [ ] "Cancel" clears selection, restores normal toolbar
- [ ] "Import to canvas" opens canvas picker dialog
- [ ] Clicking a canvas stores data in sessionStorage and navigates to editor
- [ ] "Delete" opens confirmation, confirming deletes selected images
- [ ] List view shows checkboxes and selection highlighting
