<script setup lang="ts">
import { computed } from 'vue'
import { useMediaStore } from '@/stores/media'
import MediaCard from './MediaCard.vue'
import type { MediaAsset } from '@/types/kova/media'

const props = defineProps<{
  images: MediaAsset[]
  density: 'compact' | 'comfortable'
  searchQuery?: string
  placingId?: string | null
}>()

const emit = defineEmits<{
  select: [image: MediaAsset]
  delete: [image: MediaAsset]
}>()

const mediaStore = useMediaStore()

const filteredImages = computed(() => {
  if (!props.searchQuery?.trim()) return props.images
  const query = props.searchQuery.toLowerCase()
  return props.images.filter((img) =>
    img.file_name.toLowerCase().includes(query)
  )
})

const gridClass = computed(() =>
  props.density === 'compact'
    ? 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))]'
    : 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'
)
</script>

<template>
  <div
    v-if="filteredImages.length > 0"
    data-test-id="media-grid"
    class="grid gap-3"
    :class="gridClass"
  >
    <MediaCard
      v-for="image in filteredImages"
      :key="image.id"
      :image="image"
      :public-url="mediaStore.getPublicUrl(image.storage_path)"
      :density="density"
      :is-placing="placingId === image.id"
      @select="emit('select', $event)"
      @delete="emit('delete', $event)"
    />
  </div>
  <div
    v-else
    data-test-id="media-grid-empty"
    class="flex flex-col items-center justify-center py-12 text-center"
  >
    <icon-lucide-image class="mb-3 size-10 text-gray-300" />
    <p class="text-sm text-gray-500">
      {{ searchQuery ? 'No images match your search' : 'No images yet' }}
    </p>
  </div>
</template>
