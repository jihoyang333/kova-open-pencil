<script setup lang="ts">
/**
 * ZoomHud — Cluster 06 Task 16.
 *
 * Floating zoom HUD anchored bottom-right of the canvas viewport.
 * Hi-fi source: Kova Canvas - Final.html `.kc .zoom` (lines 311-325) —
 * floating surface (#1a1a1d → `bg-page`), 8px radius, percent + caret.
 *
 * Reads `editor.state.zoom`. The caret opens the zoom popover, which
 * Cluster 08 ships; until then the trigger is an inert accessible button.
 * Distinct from the right-panel tab-strip `zoom-r` (RightPanel renders that).
 */
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import KovaIcon from '@/components/ui/KovaIcon.vue'

const editor = useEditorStore()

const zoomLabel = computed(() => `${Math.round(editor.state.zoom * 100)}%`)
</script>

<template>
  <button
    type="button"
    data-testid="zoom-hud"
    aria-label="Zoom controls"
    class="absolute right-[22px] bottom-[22px] z-30 flex items-center gap-1.5 rounded-lg border border-line bg-page px-2.5 py-1.5 text-[12px] tracking-[0.01em] text-ink-2 shadow-elev-2 hover:text-ink"
  >
    <span data-testid="zoom-hud-label">{{ zoomLabel }}</span>
    <KovaIcon name="chevron-down" size="xs" class="text-ink-3" />
  </button>
</template>
