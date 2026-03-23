<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useMediaStore } from '@/stores/media'
import { toast } from '@/composables/use-toast'
import MediaGrid from '@/components/media/MediaGrid.vue'
import UploadDialog from '@/components/media/UploadDialog.vue'
import EmptyState from '@/components/dashboard/EmptyState.vue'
import type { MediaAsset } from '@/types/kova/media'

const route = useRoute()
const mediaStore = useMediaStore()

const brandId = computed(() => {
  const id = route.params.brandId
  return Array.isArray(id) ? id[0] : id ?? ''
})
const searchQuery = ref('')
const showUploadDialog = ref(false)
const pendingDelete = ref<MediaAsset | null>(null)

// Fetch images when brand changes
watch(brandId, (id) => {
  if (id) void mediaStore.fetchImages(id)
}, { immediate: true })

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
        @action="showUploadDialog = true"
      />
    </template>

    <!-- Has media -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="relative">
          <icon-lucide-search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="searchQuery"
            data-test-id="media-search"
            type="text"
            placeholder="Search images…"
            class="rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          data-test-id="media-upload-button"
          class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          @click="showUploadDialog = true"
        >
          <icon-lucide-upload class="mr-1.5 inline-block size-4" />
          Upload
        </button>
      </div>

      <!-- Grid -->
      <MediaGrid
        :images="mediaStore.images"
        density="comfortable"
        :search-query="searchQuery"
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
          <strong class="font-medium text-gray-900">{{ pendingDelete.file_name }}</strong>?
          This action cannot be undone.
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

    <!-- Upload dialog -->
    <UploadDialog
      v-model:open="showUploadDialog"
      :brand-id="brandId"
    />
  </div>
</template>
