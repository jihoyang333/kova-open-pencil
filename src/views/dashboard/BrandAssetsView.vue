<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  SelectViewport
} from 'reka-ui'
import { useMediaStore } from '@/stores/media'
import { useCanvasesStore } from '@/stores/canvases'
import { toast } from '@/composables/use-toast'
import MediaGrid from '@/components/media/MediaGrid.vue'
import UploadDialog from '@/components/media/UploadDialog.vue'
import EmptyState from '@/components/dashboard/EmptyState.vue'
import type { MediaAsset } from '@/types/kova/media'
import type { SortOption, ViewMode } from '@/components/media/MediaGrid.vue'

const route = useRoute()
const router = useRouter()
const mediaStore = useMediaStore()
const canvasesStore = useCanvasesStore()

const brandId = computed(() => {
  const id = route.params.brandId
  return Array.isArray(id) ? id[0] : (id ?? '')
})
const searchQuery = ref('')
const sortBy = ref<SortOption>('newest')
const viewMode = ref<ViewMode>('grid')
const showUploadDialog = ref(false)
const uploadDialogTab = ref<'upload' | 'url'>('upload')
const pendingDelete = ref<MediaAsset | null>(null)
const previewImage = ref<MediaAsset | null>(null)
const selectedIds = ref<Set<string>>(new Set())
const showCanvasPicker = ref(false)
const showBulkDelete = ref(false)

const hasSelection = computed(() => selectedIds.value.size > 0)
const selectedCount = computed(() => selectedIds.value.size)

const filteredImages = computed(() => {
  if (!searchQuery.value.trim()) return mediaStore.images
  const query = searchQuery.value.toLowerCase()
  return mediaStore.images.filter((img) => img.file_name.toLowerCase().includes(query))
})

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest to oldest' },
  { value: 'oldest', label: 'Oldest to newest' },
  { value: 'name-asc', label: 'Name A\u2013Z' },
  { value: 'name-desc', label: 'Name Z\u2013A' },
  { value: 'size', label: 'Largest first' }
]

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

const allVisibleSelected = computed(() => {
  const visible = filteredImages.value
  return visible.length > 0 && visible.every((img) => selectedIds.value.has(img.id))
})

function toggleSelectAll(): void {
  const visible = filteredImages.value
  if (allVisibleSelected.value) {
    const next = new Set(selectedIds.value)
    for (const img of visible) next.delete(img.id)
    selectedIds.value = next
  } else {
    const next = new Set(selectedIds.value)
    for (const img of visible) next.add(img.id)
    selectedIds.value = next
  }
}

// Fetch images when brand changes
watch(
  brandId,
  (id) => {
    if (id) {
      void mediaStore.fetchImages(id)
      void canvasesStore.fetchCanvases(id)
    }
    selectedIds.value = new Set()
  },
  { immediate: true }
)

function openUploadDialog(tab: 'upload' | 'url'): void {
  uploadDialogTab.value = tab
  showUploadDialog.value = true
}

function confirmDelete(image: MediaAsset): void {
  pendingDelete.value = image
}

async function executeDelete(): Promise<void> {
  if (!pendingDelete.value) return
  const image = pendingDelete.value
  pendingDelete.value = null
  try {
    await mediaStore.deleteImage(image)
    toast.show('Image deleted')
  } catch {
    toast.show('Failed to delete image', 'error')
  }
}

async function handleRename(image: MediaAsset, newName: string): Promise<void> {
  try {
    await mediaStore.renameImage(image, newName)
  } catch {
    toast.show('Failed to rename image', 'error')
  }
}

function handlePreview(image: MediaAsset): void {
  previewImage.value = image
}

function importToCanvas(canvasId: string): void {
  const selectedImages = mediaStore.images
    .filter((img) => selectedIds.value.has(img.id))
    .map((img) => ({
      url: mediaStore.getPublicUrl(img.storage_path),
      fileName: img.file_name,
      fileType: img.file_type
    }))

  if (selectedImages.length === 0) {
    toast.show('Selected images are no longer available', 'error')
    showCanvasPicker.value = false
    clearSelection()
    return
  }

  sessionStorage.setItem('kova-import-images', JSON.stringify(selectedImages))
  showCanvasPicker.value = false
  clearSelection()
  void router.push(`/canvas/${canvasId}`)
}

async function executeBulkDelete(): Promise<void> {
  const ids = [...selectedIds.value]
  const imagesToDelete = mediaStore.images.filter((img) => ids.includes(img.id))
  showBulkDelete.value = false

  const results = await Promise.allSettled(imagesToDelete.map((img) => mediaStore.deleteImage(img)))

  const failures = results.filter((r) => r.status === 'rejected')
  const successes = results.length - failures.length

  if (failures.length > 0) {
    toast.show(`Deleted ${successes} image(s), ${failures.length} failed`, 'error')
  } else {
    toast.show(`Deleted ${successes} image(s)`)
  }

  selectedIds.value = new Set()
}
</script>

<template>
  <div data-test-id="brand-assets-view" class="space-y-4">
    <!-- Loading -->
    <div
      v-if="mediaStore.isLoading"
      data-test-id="media-loading"
      class="flex items-center justify-center py-20"
    >
      <icon-lucide-loader-2 class="size-8 animate-spin text-gray-400" />
    </div>

    <!-- No media yet -->
    <template v-else-if="mediaStore.images.length === 0">
      <EmptyState
        title="Upload your first brand asset"
        description="Build your brand image library to use in email designs."
        action-label="Upload Images"
        @action="openUploadDialog('upload')"
      />
    </template>

    <!-- Has media -->
    <template v-else>
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
            :checked="allVisibleSelected"
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
        <!-- Sort dropdown -->
        <SelectRoot v-model="sortBy">
          <SelectTrigger
            data-test-id="media-sort"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <SelectValue />
            <icon-lucide-chevron-down class="size-3.5 text-gray-400" />
          </SelectTrigger>
          <SelectPortal>
            <SelectContent
              class="z-50 min-w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
              position="popper"
              :side-offset="4"
            >
              <SelectViewport>
                <SelectItem
                  v-for="option in SORT_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                  class="cursor-pointer rounded-md px-2.5 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100"
                >
                  <SelectItemText>{{ option.label }}</SelectItemText>
                </SelectItem>
              </SelectViewport>
            </SelectContent>
          </SelectPortal>
        </SelectRoot>

        <!-- Search -->
        <div class="relative">
          <icon-lucide-search
            class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
          />
          <input
            v-model="searchQuery"
            data-test-id="media-search"
            type="text"
            placeholder="Search image"
            class="rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div class="flex-1" />

        <!-- View toggle -->
        <div class="flex rounded-lg border border-gray-300">
          <button
            data-test-id="media-view-grid"
            class="rounded-l-lg px-2.5 py-2 transition-colors"
            :class="
              viewMode === 'grid'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-400 hover:text-gray-600'
            "
            @click="viewMode = 'grid'"
          >
            <icon-lucide-layout-grid class="size-4" />
          </button>
          <button
            data-test-id="media-view-list"
            class="rounded-r-lg border-l border-gray-300 px-2.5 py-2 transition-colors"
            :class="
              viewMode === 'list'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-400 hover:text-gray-600'
            "
            @click="viewMode = 'list'"
          >
            <icon-lucide-list class="size-4" />
          </button>
        </div>

        <!-- Upload buttons -->
        <button
          data-test-id="media-upload-url-button"
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="openUploadDialog('url')"
        >
          Upload from URL
        </button>
        <button
          data-test-id="media-upload-button"
          class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          @click="openUploadDialog('upload')"
        >
          Upload from computer
        </button>
      </div>

      <!-- Grid / List -->
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
    </template>

    <!-- Delete confirmation -->
    <div
      v-if="pendingDelete"
      data-test-id="media-delete-confirm"
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
      @click.self="pendingDelete = null"
    >
      <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 class="text-base font-semibold text-gray-900">Delete image</h3>
        <p class="mt-2 text-sm text-gray-600">
          Are you sure you want to delete
          <strong class="font-medium text-gray-900">{{ pendingDelete.file_name }}</strong
          >? This action cannot be undone.
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            data-test-id="media-delete-cancel"
            class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            @click="pendingDelete = null"
          >
            Cancel
          </button>
          <button
            data-test-id="media-delete-execute"
            class="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            @click="executeDelete"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Image preview lightbox -->
    <div
      v-if="previewImage"
      data-test-id="media-preview"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      @click.self="previewImage = null"
    >
      <button
        data-test-id="media-preview-close"
        class="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        @click="previewImage = null"
      >
        <icon-lucide-x class="size-5" />
      </button>
      <div class="flex max-h-[85vh] max-w-[85vw] flex-col items-center">
        <img
          :src="mediaStore.getPublicUrl(previewImage.storage_path)"
          :alt="previewImage.file_name"
          class="max-h-[80vh] max-w-full rounded-lg object-contain"
        />
        <p class="mt-3 text-sm text-white/80">
          {{ previewImage.file_name }}
        </p>
      </div>
    </div>

    <!-- Canvas picker dialog -->
    <DialogRoot v-model:open="showCanvasPicker">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
        <DialogContent
          data-test-id="media-canvas-picker"
          class="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
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

    <!-- Bulk delete confirmation -->
    <DialogRoot v-model:open="showBulkDelete">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
        <DialogContent
          data-test-id="media-bulk-delete-confirm"
          class="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
        >
          <DialogTitle class="text-base font-semibold text-gray-900"> Delete images </DialogTitle>
          <DialogDescription class="mt-2 text-sm text-gray-600">
            Are you sure you want to delete
            <strong class="font-medium text-gray-900">{{ selectedCount }} image(s)</strong>? This
            action cannot be undone.
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

    <!-- Upload dialog -->
    <UploadDialog
      v-model:open="showUploadDialog"
      :brand-id="brandId"
      :initial-tab="uploadDialogTab"
    />
  </div>
</template>
