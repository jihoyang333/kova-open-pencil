<script setup lang="ts">
// Cluster 11 Plan Task 4.3b — KovaTooltip.
// Reka Tooltip wrapper. 500ms default delay matches the hi-fi A8.3
// accessibility-modal documentation for chrome icon tooltips.

import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from 'reka-ui'

interface Props {
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

withDefaults(defineProps<Props>(), { placement: 'top', delay: 500 })
</script>

<template>
  <TooltipProvider :delay-duration="delay">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          class="tooltip z-50 rounded border border-line bg-panel px-2 py-1 text-xs text-ink shadow"
          :side="placement"
        >
          {{ content }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
