<script setup lang="ts">
/**
 * AiToolButton — Cluster 06 Task 10.
 *
 * Hi-fi source: Kova Canvas - Final.html `.kc .toolbar .tool.ai` (lines 307-308).
 * Uses --accent-ink color + --accent-soft hover bg per tokens-used.md §1.4.
 * Click → opens right panel AI tab + focuses ChatPanel composer.
 */
import { computed } from 'vue'
import type { ToolDef } from '@/types/tool-registry'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaTooltip from '@/components/ui/KovaTooltip.vue'
import { useRightPanelTab } from '@/composables/use-right-panel-tab'

interface Props {
  tool: ToolDef
}

const props = defineProps<Props>()
const rightPanelTab = useRightPanelTab()

const tooltipText = computed(() =>
  props.tool.tooltip ?? `${props.tool.label} — chat with Kova`
)

function onClick(): void {
  if (props.tool.disabled) return
  rightPanelTab.focusAiComposer()
}
</script>

<template>
  <KovaTooltip :content="tooltipText">
    <button
      type="button"
      class="relative grid place-items-center w-9 h-9 rounded-md text-accent-ink hover:bg-accent-soft transition-colors cursor-pointer"
      :aria-label="tool.label"
      :data-tool-id="tool.id"
      @click="onClick"
    >
      <KovaIcon :name="tool.icon" size="md" />
    </button>
  </KovaTooltip>
</template>
