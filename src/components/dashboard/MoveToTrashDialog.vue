<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

import { useCanvasesStore } from '@/stores/canvases'

const canvasesStore = useCanvasesStore()
</script>

<template>
  <DialogRoot :open="!!canvasesStore.canvasToTrash" @update:open="canvasesStore.cancelMoveToTrash">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
      <DialogContent
        data-test-id="move-to-trash-dialog"
        class="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
      >
        <DialogTitle class="text-base font-semibold text-gray-900">
          Move file to trash
        </DialogTitle>
        <DialogDescription class="mt-2 text-sm text-gray-600">
          You're about to move
          <strong class="font-medium text-gray-900">{{ canvasesStore.canvasToTrash?.name }}</strong>
          to trash. You can restore it later from the Trash section.
        </DialogDescription>
        <div class="mt-6 flex justify-end gap-3">
          <DialogClose
            data-test-id="move-to-trash-cancel"
            class="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Cancel
          </DialogClose>
          <button
            data-test-id="move-to-trash-confirm"
            class="cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            @click="canvasesStore.executeMoveToTrash()"
          >
            Move to trash
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
