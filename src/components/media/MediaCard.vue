<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from 'reka-ui'
import { toast } from '@/composables/use-toast'
import {
  MENU_ITEM_CLASS,
  DELETE_ITEM_CLASS,
  MENU_CONTENT_CLASS
} from '@/components/dashboard/menu-styles'
import type { MediaAsset } from '@/types/kova/media'

const props = defineProps<{
  image: MediaAsset
  publicUrl: string
  density: 'compact' | 'comfortable'
  isPlacing?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  select: [image: MediaAsset]
  preview: [image: MediaAsset]
  rename: [image: MediaAsset, newName: string]
  delete: [image: MediaAsset]
}>()

const isRenaming = ref(false)
const renameValue = ref('')

const aspectClass = computed(() => (props.density === 'compact' ? 'aspect-square' : 'aspect-[4/3]'))

const formattedDate = computed(() => {
  const d = new Date(props.image.created_at)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
})

const formattedSize = computed(() => {
  const bytes = props.image.file_size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

function startRename(): void {
  renameValue.value = props.image.file_name
  isRenaming.value = true
}

function commitRename(): void {
  const name = renameValue.value.trim()
  if (name && name !== props.image.file_name) {
    emit('rename', props.image, name)
  }
  isRenaming.value = false
}

function cancelRename(): void {
  isRenaming.value = false
}

async function copyUrl(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.publicUrl)
    toast.show('URL copied to clipboard')
  } catch {
    toast.show('Failed to copy URL', 'error')
  }
}
</script>

<template>
  <div
    :data-test-id="`media-card-${image.id}`"
    class="group overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md"
    :class="{
      'pointer-events-none opacity-60': isPlacing,
      'ring-2 ring-blue-500 ring-offset-1': selected
    }"
  >
    <!-- Image area -->
    <div class="relative cursor-pointer" :class="aspectClass" @click="emit('select', image)">
      <img :src="publicUrl" :alt="image.file_name" class="size-full object-cover" loading="lazy" />

      <!-- Hover overlay -->
      <div class="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30">
        <!-- Selection checkbox -->
        <div
          class="absolute top-2 left-2 z-10"
          :class="selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
        >
          <div
            :data-test-id="`media-card-checkbox-${image.id}`"
            role="checkbox"
            :aria-checked="selected"
            :aria-label="`Select ${image.file_name}`"
            tabindex="0"
            class="flex size-5 items-center justify-center rounded border-2 transition-colors"
            :class="
              selected
                ? 'border-blue-500 bg-blue-500 text-white'
                : 'border-white bg-white/80 text-transparent hover:border-blue-300'
            "
            @click.stop="emit('select', image)"
            @keydown.enter.stop="emit('select', image)"
            @keydown.space.prevent.stop="emit('select', image)"
          >
            <icon-lucide-check class="size-3" />
          </div>
        </div>

        <!-- Bottom action bar -->
        <div
          class="absolute right-0 bottom-0 left-0 flex items-center gap-1.5 px-2 pb-2 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <div class="flex-1" />

          <!-- Preview / expand button -->
          <button
            :data-test-id="`media-card-preview-${image.id}`"
            class="flex size-7 items-center justify-center rounded bg-white/90 shadow-sm hover:bg-white"
            @click.stop="emit('preview', image)"
          >
            <icon-lucide-expand class="size-3.5 text-gray-700" />
          </button>

          <!-- Three-dot menu -->
          <DropdownMenuRoot>
            <DropdownMenuTrigger
              :data-test-id="`media-card-menu-${image.id}`"
              class="flex size-7 items-center justify-center rounded bg-white/90 shadow-sm hover:bg-white"
              @click.stop
            >
              <icon-lucide-more-vertical class="size-3.5 text-gray-700" />
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent :side-offset="4" align="end" :class="MENU_CONTENT_CLASS">
                <DropdownMenuItem :class="MENU_ITEM_CLASS" @select="copyUrl">
                  <icon-lucide-link class="size-4" /> Copy URL
                </DropdownMenuItem>
                <DropdownMenuItem :class="MENU_ITEM_CLASS" @select="startRename">
                  <icon-lucide-pencil class="size-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator class="mx-1 my-1 h-px bg-gray-100" />
                <DropdownMenuItem :class="DELETE_ITEM_CLASS" @select="emit('delete', image)">
                  <icon-lucide-trash-2 class="size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </div>

        <!-- Placing spinner -->
        <div v-if="isPlacing" class="absolute inset-0 flex items-center justify-center">
          <div class="rounded-full bg-white/90 p-2">
            <icon-lucide-loader-2 class="size-5 animate-spin text-gray-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- Metadata below image -->
    <div class="px-2.5 py-2">
      <!-- Inline rename -->
      <input
        v-if="isRenaming"
        :data-test-id="`media-card-rename-input-${image.id}`"
        v-model="renameValue"
        class="w-full rounded border border-gray-300 px-1 py-0.5 text-sm text-gray-900 outline-none focus:border-blue-500"
        autofocus
        @keydown.enter="commitRename"
        @keydown.escape="cancelRename"
        @blur="commitRename"
        @click.stop
      />
      <p v-else class="truncate text-sm font-medium text-gray-900">
        {{ image.file_name }}
      </p>
      <p class="mt-0.5 text-xs text-gray-500">
        {{ formattedDate }}
      </p>
      <p class="text-xs text-gray-400">
        {{ formattedSize }}
      </p>
    </div>
  </div>
</template>
