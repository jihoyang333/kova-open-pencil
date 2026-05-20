<script setup lang="ts">
import {
  PopoverArrow,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'
import { computed } from 'vue'

/**
 * Popover wrapper — Reka Popover. Canonical `.popover` class
 * (kova-hifi.css A6+A2a lift). 240 px default min-width.
 *
 * Variant `avatar` adds `.popover.avatar` for the A6 avatar dropdown layout.
 *
 * Usage:
 *   <KovaPopover>
 *     <template #trigger>
 *       <KovaButton iconOnly icon="chevron-down" ariaLabel="Open" />
 *     </template>
 *     <!-- popover body in default slot -->
 *   </KovaPopover>
 */

export interface KovaPopoverProps {
  variant?: 'default' | 'avatar'
  open?: boolean
  defaultOpen?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  showArrow?: boolean
  /** Optional max width (e.g. for B1 avatar: 240). */
  minWidth?: string
}

const props = withDefaults(defineProps<KovaPopoverProps>(), {
  variant: 'default',
  side: 'bottom',
  align: 'start',
  sideOffset: 6,
  showArrow: false,
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const klass = computed(() => {
  const c = ['popover']
  if (props.variant === 'avatar') c.push('avatar')
  return c.join(' ')
})

const style = computed(() => (props.minWidth ? { minWidth: props.minWidth } : undefined))
</script>

<template>
  <PopoverRoot :open="props.open" :default-open="props.defaultOpen" @update:open="(v) => emit('update:open', v)">
    <PopoverTrigger as-child>
      <slot name="trigger" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :class="klass"
        :side="props.side"
        :align="props.align"
        :side-offset="props.sideOffset"
        :style="style"
      >
        <slot />
        <PopoverArrow v-if="props.showArrow" class="arrow" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
