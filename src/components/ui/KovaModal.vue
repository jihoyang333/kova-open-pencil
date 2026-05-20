<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

/**
 * Modal wrapper — Reka Dialog. Canonical `.dlg` from kova-hifi.css.
 *
 * Sizes: sm (460), md (540), lg (880).
 * Backdrop: `.modal-backdrop` (`--modal-backdrop` rgba).
 * Slots: `trigger` (optional), `head` (override default title/sub),
 *        default (body), `foot` (footer right buttons), `foot-left`.
 *
 * The default head emits `<h3>` + optional `<p class="sub">` from
 * `title` + `description` props. Override via `#head` slot if you need
 * custom chrome (e.g., the brand-picker search bar in A2+A3).
 */

export interface KovaModalProps {
  open?: boolean
  size?: 'sm' | 'md' | 'lg'
  title?: string
  description?: string
  /** Close button (x) in head. Default: true. */
  showClose?: boolean
  /** Click backdrop to close. Default: true. */
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<KovaModalProps>(), {
  size: 'md',
  showClose: true,
  closeOnBackdrop: true,
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'close'): void
}>()

const klass = computed(() => `dlg ${props.size}`)

function onInteractOutside(event: Event): void {
  if (!props.closeOnBackdrop) event.preventDefault()
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="(v) => { emit('update:open', v); if (!v) emit('close') }">
    <DialogTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="modal-backdrop" />
      <DialogContent :class="klass" @interact-outside="onInteractOutside">
        <slot name="head">
          <div class="dlg-head">
            <div>
              <DialogTitle as="h3">{{ props.title }}</DialogTitle>
              <DialogDescription v-if="props.description" as="p" class="sub">
                {{ props.description }}
              </DialogDescription>
            </div>
            <DialogClose v-if="props.showClose" class="x" aria-label="Close">
              <KovaIcon name="x" size="sm" aria-hidden="true" />
            </DialogClose>
          </div>
        </slot>
        <div class="dlg-body">
          <slot />
        </div>
        <div v-if="$slots.foot || $slots['foot-left']" class="dlg-foot">
          <div class="l"><slot name="foot-left" /></div>
          <div class="r"><slot name="foot" /></div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
