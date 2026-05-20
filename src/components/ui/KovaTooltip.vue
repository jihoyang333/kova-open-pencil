<script setup lang="ts">
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'

/**
 * Tooltip wrapper — Reka Tooltip. Canonical `.tooltip` class from
 * kova-hifi.css (Cluster 11 lift, Q-B B1 spec).
 *
 * Default show delay 500 ms (per PRD 11 §3.4 + design.md).
 *
 * Usage:
 *   <KovaTooltip content="Hello">
 *     <KovaButton iconOnly icon="plus" ariaLabel="Add" />
 *   </KovaTooltip>
 */

export interface KovaTooltipProps {
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  /** Show delay in ms. Default 500 per PRD 11 §3.4. */
  delayDuration?: number
  /** Disable the tooltip (e.g. when content empty). */
  disabled?: boolean
}

const props = withDefaults(defineProps<KovaTooltipProps>(), {
  side: 'top',
  align: 'center',
  sideOffset: 6,
  delayDuration: 500,
  disabled: false,
})
</script>

<template>
  <TooltipProvider :delay-duration="props.delayDuration">
    <TooltipRoot v-if="!props.disabled && props.content">
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          class="tooltip"
          :side="props.side"
          :align="props.align"
          :side-offset="props.sideOffset"
        >
          {{ props.content }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
    <slot v-else />
  </TooltipProvider>
</template>
