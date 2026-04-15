<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { ref, watch } from 'vue'

import MediaGrid from '@/components/media/MediaGrid.vue'
import { useMediaStore } from '@/stores/media'

import type { MediaAsset } from '@/types/kova/media'

const props = defineProps<{
  open: boolean
  brandId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [asset: MediaAsset]
}>()

const mediaStore = useMediaStore()
const searchQuery = ref('')
let hasFetched = false

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen && !hasFetched) {
      hasFetched = true
      await mediaStore.fetchImages(props.brandId)
    }
  },
)

function handleSelect(asset: MediaAsset): void {
  emit('select', asset)
  emit('update:open', false)
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 flex h-[480px] w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-panel shadow-2xl"
      >
        <!-- Header -->
        <div class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <DialogTitle class="text-sm font-medium text-white">
            Pick from Media Library
          </DialogTitle>
          <DialogClose
            class="flex size-6 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-[#ccc]"
          >
            <icon-lucide-x class="size-3.5" />
          </DialogClose>
        </div>

        <!-- Search -->
        <div class="shrink-0 border-b border-border px-4 py-2">
          <div class="flex items-center gap-2 rounded-lg bg-muted/10 px-3 py-1.5">
            <icon-lucide-search class="size-3.5 shrink-0 text-muted" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search images..."
              class="flex-1 bg-transparent text-xs text-white placeholder:text-muted focus:outline-none"
            />
          </div>
        </div>

        <!-- Grid -->
        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          <MediaGrid
            :images="mediaStore.images"
            density="compact"
            :search-query="searchQuery"
            sort-by="newest"
            @select="handleSelect"
          />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
