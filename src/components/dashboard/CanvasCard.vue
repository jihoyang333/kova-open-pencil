<script setup lang="ts">
import { ref } from 'vue'
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
  DropdownMenuTrigger
} from 'reka-ui'

import { useCanvasesStore } from '@/stores/canvases'

import type { Canvas } from '@/types/kova/database'

const props = defineProps<{ canvas: Canvas }>()

const emit = defineEmits<{
  open: []
  rename: [id: string, name: string]
  duplicate: [id: string]
}>()

const canvasesStore = useCanvasesStore()
const timeAgo = useTimeAgo(() => new Date(props.canvas.updated_at))

const isRenaming = ref(false)
const renameValue = ref('')

function startRename(): void {
  renameValue.value = props.canvas.name
  isRenaming.value = true
}

function commitRename(): void {
  const name = renameValue.value.trim()
  if (name && name !== props.canvas.name) {
    emit('rename', props.canvas.id, name)
  }
  isRenaming.value = false
}

function cancelRename(): void {
  isRenaming.value = false
}

function handleDuplicate(): void {
  emit('duplicate', props.canvas.id)
}

function handleMoveToTrash(): void {
  canvasesStore.confirmMoveToTrash(props.canvas)
}

const menuItemClass =
  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100'
const deleteItemClass =
  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 outline-none select-none data-[highlighted]:bg-red-50'
const menuContentClass = 'z-50 min-w-36 rounded-lg border border-gray-200 bg-white p-1 shadow-lg'
</script>

<template>
  <ContextMenuRoot>
    <ContextMenuTrigger as-child>
      <div
        :data-test-id="`canvas-card-${canvas.id}`"
        class="group cursor-pointer rounded-xl border border-gray-200 transition-shadow hover:shadow-md"
        @click="emit('open')"
      >
        <!-- Thumbnail -->
        <div class="relative h-36 overflow-hidden rounded-t-xl bg-gray-50">
          <img
            v-if="canvas.thumbnail_url"
            :src="canvas.thumbnail_url"
            :alt="canvas.name"
            class="size-full object-cover"
          />
          <div v-else class="flex size-full items-center justify-center text-sm text-gray-400">
            <icon-lucide-file class="size-8" />
          </div>

          <!-- Kebab menu -->
          <DropdownMenuRoot>
            <DropdownMenuTrigger
              :data-test-id="`canvas-card-menu-${canvas.id}`"
              class="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md bg-white/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              @click.stop
            >
              <icon-lucide-more-horizontal class="size-4 text-gray-600" />
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent :side-offset="4" align="end" :class="menuContentClass">
                <DropdownMenuItem :class="menuItemClass" @select="emit('open')">
                  <icon-lucide-external-link class="size-4" /> Open
                </DropdownMenuItem>
                <DropdownMenuItem :class="menuItemClass" @select="startRename">
                  <icon-lucide-pencil class="size-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem :class="menuItemClass" @select="handleDuplicate">
                  <icon-lucide-copy class="size-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator class="mx-1 my-1 h-px bg-gray-100" />
                <DropdownMenuItem :class="deleteItemClass" @select="handleMoveToTrash">
                  <icon-lucide-trash-2 class="size-4" /> Move to trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </div>

        <!-- Info -->
        <div class="px-3 py-2">
          <input
            v-if="isRenaming"
            :data-test-id="`canvas-card-rename-input-${canvas.id}`"
            v-model="renameValue"
            class="w-full rounded border border-gray-300 px-1 py-0.5 text-sm text-gray-900 outline-none focus:border-blue-500"
            autofocus
            @keydown.enter="commitRename"
            @keydown.escape="cancelRename"
            @blur="commitRename"
            @click.stop
          />
          <p v-else class="truncate text-sm font-medium text-gray-900">
            {{ canvas.name }}
          </p>
          <p class="mt-0.5 text-xs text-gray-500">Edited {{ timeAgo }}</p>
        </div>
      </div>
    </ContextMenuTrigger>

    <!-- Right-click context menu (same items) -->
    <ContextMenuPortal>
      <ContextMenuContent :class="menuContentClass">
        <ContextMenuItem :class="menuItemClass" @select="emit('open')">
          <icon-lucide-external-link class="size-4" /> Open
        </ContextMenuItem>
        <ContextMenuItem :class="menuItemClass" @select="startRename">
          <icon-lucide-pencil class="size-4" /> Rename
        </ContextMenuItem>
        <ContextMenuItem :class="menuItemClass" @select="handleDuplicate">
          <icon-lucide-copy class="size-4" /> Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator class="mx-1 my-1 h-px bg-gray-100" />
        <ContextMenuItem :class="deleteItemClass" @select="handleMoveToTrash">
          <icon-lucide-trash-2 class="size-4" /> Move to trash
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>
