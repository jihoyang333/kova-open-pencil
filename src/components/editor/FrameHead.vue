<script setup lang="ts">
/**
 * FrameHead — Cluster 06 Task 15.
 *
 * Hi-fi source: Kova Canvas - Final.html `.kc .right .frame-head` (lines 361-378).
 * Title + dropdown caret + 3 action buttons (Code/Component/Theme — Phase 2
 * visible-disabled per PRD §2.1). Overflow ... wires to useObjectActions
 * (Cluster 08 owns).
 */
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaTooltip from '@/components/ui/KovaTooltip.vue'

const editor = useEditorStore()

const title = computed(() => {
  const ids = [...editor.state.selectedIds]
  if (ids.length === 0) return 'Page'
  if (ids.length > 1) return `${ids.length} selected`
  const node = editor.graph.getNode(ids[0])
  return node?.name ?? 'Layer'
})
</script>

<template>
  <div
    class="flex items-center justify-between p-[14px] border-b border-line-2"
    data-testid="frame-head"
  >
    <div class="flex items-center gap-1.5 text-ink font-semibold text-[15px] tracking-[-0.005em]">
      <span>{{ title }}</span>
      <span class="grid place-items-center text-ink-3" aria-hidden="true">
        <KovaIcon name="chevron-down" size="xs" />
      </span>
    </div>
    <div class="flex gap-0.5 text-ink-2" data-testid="frame-head-actions">
      <KovaTooltip content="Generate code — Phase 2">
        <button
          type="button"
          class="w-[26px] h-[26px] grid place-items-center rounded-[5px] cursor-not-allowed text-ink-4"
          disabled
          aria-label="Generate code (Phase 2)"
        >
          <KovaIcon name="external-link" size="sm" />
        </button>
      </KovaTooltip>
      <KovaTooltip content="Convert to component — Phase 2">
        <button
          type="button"
          class="w-[26px] h-[26px] grid place-items-center rounded-[5px] cursor-not-allowed text-ink-4"
          disabled
          aria-label="Convert to component (Phase 2)"
        >
          <KovaIcon name="component" size="sm" />
        </button>
      </KovaTooltip>
      <KovaTooltip content="Theme — Phase 2">
        <button
          type="button"
          class="w-[26px] h-[26px] grid place-items-center rounded-[5px] cursor-not-allowed text-ink-4"
          disabled
          aria-label="Theme (Phase 2)"
        >
          <KovaIcon name="palette" size="sm" />
        </button>
      </KovaTooltip>
    </div>
  </div>
</template>
