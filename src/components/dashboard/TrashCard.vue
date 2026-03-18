<script setup lang="ts">
import { useTimeAgo } from '@vueuse/core'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'

import type { Canvas } from '@/types/kova/database'

const props = defineProps<{ canvas: Canvas }>()

const emit = defineEmits<{
  restore: [id: string]
  permanentlyDelete: [id: string]
}>()

const trashedAgo = useTimeAgo(() => new Date(props.canvas.trashed_at ?? props.canvas.updated_at))

const menuItemClass = 'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100'
const deleteItemClass = 'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 outline-none select-none data-[highlighted]:bg-red-50'
const menuContentClass = 'z-50 min-w-36 rounded-lg border border-gray-200 bg-white p-1 shadow-lg'
</script>

<template>
  <ContextMenuRoot>
    <ContextMenuTrigger as-child>
      <div
        :data-test-id="`trash-card-${canvas.id}`"
        class="group rounded-xl border border-gray-200"
      >
        <!-- Thumbnail -->
        <div class="relative h-36 overflow-hidden rounded-t-xl bg-gray-50">
          <img
            v-if="canvas.thumbnail_url"
            :src="canvas.thumbnail_url"
            :alt="canvas.name"
            class="size-full object-cover"
          />
          <div v-else class="flex size-full items-center justify-center text-gray-400">
            <icon-lucide-file class="size-8" />
          </div>

          <!-- Kebab menu -->
          <DropdownMenuRoot>
            <DropdownMenuTrigger
              class="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md bg-white/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              @click.stop
            >
              <icon-lucide-more-horizontal class="size-4 text-gray-600" />
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent :side-offset="4" align="end" :class="menuContentClass">
                <DropdownMenuItem :class="menuItemClass" @select="emit('restore', canvas.id)">
                  <icon-lucide-undo-2 class="size-4" /> Restore
                </DropdownMenuItem>
                <DropdownMenuSeparator class="mx-1 my-1 h-px bg-gray-100" />
                <DropdownMenuItem :class="deleteItemClass" @select="emit('permanentlyDelete', canvas.id)">
                  <icon-lucide-trash-2 class="size-4" /> Permanently delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </div>

        <!-- Info -->
        <div class="px-3 py-2">
          <p class="truncate text-sm font-medium text-gray-900">{{ canvas.name }}</p>
          <p class="mt-0.5 text-xs text-gray-500">Trashed {{ trashedAgo }}</p>
        </div>
      </div>
    </ContextMenuTrigger>

    <ContextMenuPortal>
      <ContextMenuContent :class="menuContentClass">
        <ContextMenuItem :class="menuItemClass" @select="emit('restore', canvas.id)">
          <icon-lucide-undo-2 class="size-4" /> Restore
        </ContextMenuItem>
        <ContextMenuSeparator class="mx-1 my-1 h-px bg-gray-100" />
        <ContextMenuItem :class="deleteItemClass" @select="emit('permanentlyDelete', canvas.id)">
          <icon-lucide-trash-2 class="size-4" /> Permanently delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>
