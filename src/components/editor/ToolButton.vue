<script setup lang="ts">
/**
 * ToolButton — Cluster 06 Task 10.
 *
 * Hi-fi source: Kova Canvas - Final.html `.kc .toolbar .tool` (lines 295-309).
 * Values copied from tokens-used.md §2.1 (36x36, radius 6, fill bg via accent
 * when active). Behavior dynamic — disabled/active/dropdown-chevron via props.
 */
import { computed } from 'vue'
import type { ToolDef } from '@/types/tool-registry'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaTooltip from '@/components/ui/KovaTooltip.vue'

interface Props {
  tool: ToolDef
  active?: boolean
  hasDropdown?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  hasDropdown: false,
})

defineEmits<{
  activate: [tool: ToolDef]
}>()

const tooltipText = computed(() => {
  if (props.tool.tooltip) return props.tool.tooltip
  const parts = [props.tool.label]
  if (props.tool.key) parts.push(`(${props.tool.key})`)
  else if (props.tool.keySequence) parts.push(`(${props.tool.keySequence.join('+')})`)
  return parts.join(' ')
})

const buttonClass = computed(() => {
  const base = [
    'relative grid place-items-center',
    'w-9 h-9 rounded-md',
    'transition-colors',
  ]
  if (props.tool.disabled) {
    base.push('text-ink-4 cursor-not-allowed')
  } else if (props.active) {
    base.push('bg-accent text-white')
  } else {
    base.push('text-ink-2 hover:bg-line-2 hover:text-ink cursor-pointer')
  }
  return base.join(' ')
})
</script>

<template>
  <KovaTooltip :content="tooltipText">
    <button
      type="button"
      :class="buttonClass"
      :disabled="tool.disabled"
      :aria-pressed="active"
      :aria-label="tool.label"
      :data-tool-id="tool.id"
      @click="$emit('activate', tool)"
    >
      <KovaIcon :name="tool.icon" size="md" />
      <span
        v-if="hasDropdown"
        class="absolute right-0.5 bottom-0.5 grid place-items-center text-ink-3"
        aria-hidden="true"
      >
        <KovaIcon name="chevron-down" size="xs" />
      </span>
    </button>
  </KovaTooltip>
</template>
