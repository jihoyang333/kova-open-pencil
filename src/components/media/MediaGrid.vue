<script setup lang="ts">
import { computed } from 'vue'
import { useMediaStore } from '@/stores/media'
import MediaCard from './MediaCard.vue'
import type { MediaAsset } from '@/types/kova/media'

export type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size'
export type ViewMode = 'grid' | 'list'

const props = defineProps<{
  images: MediaAsset[]
  density: 'compact' | 'comfortable'
  searchQuery?: string
  sortBy?: SortOption
  viewMode?: ViewMode
  placingId?: string | null
  selectedIds?: Set<string>
}>()

const emit = defineEmits<{
  select: [image: MediaAsset]
  preview: [image: MediaAsset]
  rename: [image: MediaAsset, newName: string]
  delete: [image: MediaAsset]
}>()

const mediaStore = useMediaStore()

const filteredAndSortedImages = computed(() => {
  let result = props.images

  if (props.searchQuery?.trim()) {
    const query = props.searchQuery.toLowerCase()
    result = result.filter((img) =>
      img.file_name.toLowerCase().includes(query)
    )
  }

  const sort = props.sortBy ?? 'newest'
  const sorted = [...result]
  switch (sort) {
    case 'newest':
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      break
    case 'oldest':
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      break
    case 'name-asc':
      sorted.sort((a, b) => a.file_name.localeCompare(b.file_name))
      break
    case 'name-desc':
      sorted.sort((a, b) => b.file_name.localeCompare(a.file_name))
      break
    case 'size':
      sorted.sort((a, b) => b.file_size - a.file_size)
      break
  }
  return sorted
})

const gridClass = computed(() =>
  props.density === 'compact'
    ? 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))]'
    : 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'
)

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <div v-if="filteredAndSortedImages.length > 0">
    <!-- Grid view -->
    <div
      v-if="(viewMode ?? 'grid') === 'grid'"
      data-test-id="media-grid"
      class="grid gap-3"
      :class="gridClass"
    >
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
    </div>

    <!-- List view -->
    <div
      v-else
      data-test-id="media-list"
      class="divide-y divide-gray-200 rounded-lg border border-gray-200"
    >
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
          role="checkbox"
          :aria-checked="selectedIds?.has(image.id) ?? false"
          :aria-label="`Select ${image.file_name}`"
          tabindex="0"
          class="flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors"
          :class="selectedIds?.has(image.id)
            ? 'border-blue-500 bg-blue-500 text-white'
            : 'border-gray-300 text-transparent'"
          @click.stop="emit('select', image)"
          @keydown.enter.stop="emit('select', image)"
          @keydown.space.prevent.stop="emit('select', image)"
        >
          <icon-lucide-check class="size-3" />
        </div>

        <!-- Thumbnail -->
        <img
          :src="mediaStore.getPublicUrl(image.storage_path)"
          :alt="image.file_name"
          class="size-12 shrink-0 rounded-md object-cover"
          loading="lazy"
        />

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-900">
            {{ image.file_name }}
          </p>
          <p class="text-xs text-gray-500">
            {{ formatDate(image.created_at) }} · {{ formatSize(image.file_size) }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            :data-test-id="`media-list-preview-${image.id}`"
            class="flex size-7 items-center justify-center rounded hover:bg-gray-200"
            @click.stop="emit('preview', image)"
          >
            <icon-lucide-expand class="size-3.5 text-gray-600" />
          </button>
          <button
            :data-test-id="`media-list-delete-${image.id}`"
            class="flex size-7 items-center justify-center rounded hover:bg-red-50"
            @click.stop="emit('delete', image)"
          >
            <icon-lucide-trash-2 class="size-3.5 text-red-500" />
          </button>
        </div>
      </div>
    </div>
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
