<script setup lang="ts">
// Cluster 11 Plan Task 4.2 — KovaPopover.
// Reka Popover wrapper with kova-hifi.css .popover class. Default placement
// bottom-start mirrors the hi-fi A2a brand-switcher pattern (280px) and A6
// avatar pattern (240px).

import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
} from 'reka-ui'
import { computed } from 'vue'

interface Props {
  open?: boolean
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
  width?: number | 'auto'
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'bottom-start',
  width: 'auto',
})

const emit = defineEmits<{ 'update:open': [open: boolean] }>()

const side = computed<'top' | 'bottom'>(() =>
  props.placement.startsWith('top') ? 'top' : 'bottom',
)
const align = computed<'start' | 'end'>(() =>
  props.placement.endsWith('end') ? 'end' : 'start',
)
</script>

<template>
  <PopoverRoot :open="open" @update:open="emit('update:open', $event)">
    <PopoverTrigger as-child>
      <slot name="trigger" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        class="popover z-40 rounded-md border border-line bg-panel p-2 text-ink shadow-xl"
        :side="side"
        :align="align"
        :style="{ width: width === 'auto' ? undefined : `${width}px` }"
      >
        <slot />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
