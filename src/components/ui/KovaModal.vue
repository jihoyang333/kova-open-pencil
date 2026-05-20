<script setup lang="ts">
// Cluster 11 Plan Task 4.1 — KovaModal.
// Wraps Reka Dialog. Preserves kova-hifi.css .dlg / .dlg-head / .dlg-body /
// .dlg-foot class names so hi-fi HTML translation drops in unchanged.

import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
import KovaIcon from './KovaIcon.vue'

interface Props {
  open: boolean
  size?: 'sm' | 'md' | 'lg'
  title?: string
  description?: string
  closeOnBackdrop?: boolean
  destructive?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closeOnBackdrop: true,
})

const emit = defineEmits<{ 'update:open': [open: boolean] }>()

function onBackdrop(event: Event) {
  if (!props.closeOnBackdrop || props.destructive) {
    event.preventDefault()
    return
  }
  emit('update:open', false)
}
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay
        class="modal-backdrop fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        @click="onBackdrop"
      />
      <DialogContent
        role="dialog"
        :data-size="size"
        class="dlg fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-panel text-ink shadow-2xl"
        :class="[
          size,
          size === 'sm' && 'w-[460px]',
          size === 'md' && 'w-[540px]',
          size === 'lg' && 'w-[880px]',
        ]"
      >
        <div class="dlg-head flex items-start justify-between gap-3 border-b border-line p-4">
          <div class="min-w-0 flex-1">
            <DialogTitle
              v-if="title"
              as="h3"
              class="text-base font-semibold leading-tight"
            >
              {{ title }}
            </DialogTitle>
            <DialogDescription
              v-if="description"
              class="sub mt-1 text-sm text-ink-2"
            >
              {{ description }}
            </DialogDescription>
          </div>
          <DialogClose
            data-test="close"
            class="x grid h-7 w-7 place-items-center rounded-md text-ink-2 hover:bg-line-2 hover:text-ink"
            aria-label="Close"
          >
            <KovaIcon name="x" />
          </DialogClose>
        </div>
        <div class="dlg-body p-4">
          <slot />
        </div>
        <div
          v-if="$slots.footer"
          class="dlg-foot flex items-center justify-end gap-2 border-t border-line p-3"
        >
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
