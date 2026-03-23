<script setup lang="ts">
import { computed } from 'vue'
import type { MediaAsset } from '@/types/kova/media'

const props = defineProps<{
  image: MediaAsset
  publicUrl: string
  density: 'compact' | 'comfortable'
  isPlacing?: boolean
}>()

const emit = defineEmits<{
  select: [image: MediaAsset]
  delete: [image: MediaAsset]
}>()

const aspectClass = computed(() =>
  props.density === 'compact' ? 'aspect-square' : 'aspect-[4/3]'
)
</script>

<template>
  <div
    :data-test-id="`media-card-${image.id}`"
    class="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-shadow hover:shadow-md"
    :class="[aspectClass, { 'pointer-events-none opacity-60': isPlacing }]"
    @click="emit('select', image)"
  >
    <!-- Thumbnail -->
    <img
      :src="publicUrl"
      :alt="image.file_name"
      class="size-full object-cover"
      loading="lazy"
    />

    <!-- Hover overlay -->
    <div
      class="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30"
    >
      <!-- Delete button (top-right) -->
      <button
        :data-test-id="`media-card-delete-${image.id}`"
        class="absolute right-2 top-2 rounded-full bg-white/90 p-1 opacity-0 shadow transition-opacity hover:bg-white group-hover:opacity-100"
        @click.stop="emit('delete', image)"
      >
        <icon-lucide-trash-2 class="size-3.5 text-red-500" />
      </button>

      <!-- Placing spinner -->
      <div v-if="isPlacing" class="rounded-full bg-white/90 p-2">
        <icon-lucide-loader-2 class="size-5 animate-spin text-gray-600" />
      </div>
    </div>

    <!-- Filename label -->
    <div
      class="absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-black/50 to-transparent px-2 pb-1.5 pt-4 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
    >
      {{ image.file_name }}
    </div>
  </div>
</template>
