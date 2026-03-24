<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useMediaStore } from '@/stores/media'
import { useBrandsStore } from '@/stores/brands'
import { useEditorStore } from '@/stores/editor'
import { toast } from '@/composables/use-toast'
import MediaGrid from './MediaGrid.vue'
import UploadDialog from './UploadDialog.vue'
import type { MediaAsset } from '@/types/kova/media'

const emit = defineEmits<{
  close: []
}>()

const mediaStore = useMediaStore()
const brandsStore = useBrandsStore()
const store = useEditorStore()

const searchQuery = ref('')
const showUploadDialog = ref(false)
const placingId = ref<string | null>(null)

const brandId = computed(() => brandsStore.selectedBrandId)

// Fetch images when panel opens or brand changes
watch(brandId, (id) => {
  if (id) void mediaStore.fetchImages(id)
}, { immediate: true })

async function handleSelect(image: MediaAsset): Promise<void> {
  if (placingId.value) return // already placing

  placingId.value = image.id
  try {
    const publicUrl = mediaStore.getPublicUrl(image.storage_path)

    // Fetch image bytes and wrap as File for placeImageFiles API
    const response = await fetch(publicUrl)
    if (!response.ok) throw new Error('Failed to fetch image')
    const blob = await response.blob()
    const file = new File([blob], image.file_name, { type: image.file_type })

    // Calculate viewport center in screen coordinates
    const canvasEl = document.querySelector('canvas')
    if (!canvasEl) throw new Error('Canvas not found')
    const rect = canvasEl.getBoundingClientRect()
    const screenCx = rect.left + rect.width / 2
    const screenCy = rect.top + rect.height / 2
    const { x: cx, y: cy } = store.screenToCanvas(screenCx, screenCy)

    // placeImageFiles handles decoding, sizing, and undo
    await store.placeImageFiles([file], cx, cy)

    emit('close')
  } catch {
    toast.show('Failed to place image', 'error')
  } finally {
    placingId.value = null
  }
}

async function handleRename(image: MediaAsset, newName: string): Promise<void> {
  try {
    await mediaStore.renameImage(image, newName)
    toast.show('Image renamed')
  } catch {
    toast.show('Failed to rename image', 'error')
  }
}

async function handleDelete(image: MediaAsset): Promise<void> {
  try {
    await mediaStore.deleteImage(image)
    toast.show('Image deleted')
  } catch {
    toast.show('Failed to delete image', 'error')
  }
}
</script>

<template>
  <div
    data-test-id="media-library-panel"
    class="absolute right-4 top-14 z-30 flex h-[calc(100vh-80px)] w-72 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <h3 class="text-sm font-semibold text-gray-900">Media</h3>
      <button
        data-test-id="media-panel-close"
        class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        @click="emit('close')"
      >
        <icon-lucide-x class="size-4" />
      </button>
    </div>

    <!-- Search -->
    <div class="border-b border-gray-200 px-4 py-2">
      <div class="relative">
        <icon-lucide-search class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          data-test-id="media-panel-search"
          type="text"
          placeholder="Search…"
          class="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>

    <!-- Grid (scrollable) -->
    <div class="flex-1 overflow-y-auto p-3">
      <MediaGrid
        :images="mediaStore.images"
        density="compact"
        :search-query="searchQuery"
        :placing-id="placingId"
        @select="handleSelect"
        @preview="handleSelect"
        @rename="handleRename"
        @delete="handleDelete"
      />
    </div>

    <!-- Upload button -->
    <div class="border-t border-gray-200 px-4 py-3">
      <button
        data-test-id="media-panel-upload"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        @click="showUploadDialog = true"
      >
        <icon-lucide-upload class="mr-1.5 inline-block size-4" />
        Upload Images
      </button>
    </div>

    <!-- Upload dialog -->
    <UploadDialog
      v-if="brandId"
      v-model:open="showUploadDialog"
      :brand-id="brandId"
    />
  </div>
</template>
