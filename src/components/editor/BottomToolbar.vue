<script setup lang="ts">
/**
 * BottomToolbar — Cluster 06 Task 10.
 *
 * Hi-fi source: Kova Canvas - Final.html `.kc .toolbar` (lines 276-309).
 * Floating pill, bottom-center, h-tool tools, r-lg tool radius, r-2xl shell.
 * Tools sourced from useToolRegistry.primaryTools (canonical slot order).
 *
 * AI slot uses AiToolButton (distinct hover treatment per `.tool.ai`).
 * Divider between primary cluster (move/frame/rect/ellipse/pen/text/measurement)
 * and AI cluster (ai/components).
 */
import { computed } from 'vue'
import { useToolRegistry } from '@/stores/tool-registry'
import { useEditorStore } from '@/stores/editor'
import ToolButton from './ToolButton.vue'
import ToolDropdown from './ToolDropdown.vue'
import AiToolButton from './AiToolButton.vue'

const registry = useToolRegistry()
const editor = useEditorStore()

const tools = computed(() => registry.primaryTools)
const aiTools = computed(() => tools.value.filter((t) => t.slot === 'ai' || t.slot === 'components'))
const drawingTools = computed(() => tools.value.filter((t) => t.slot !== 'ai' && t.slot !== 'components'))

function isActive(toolId: string): boolean {
  // Map editor.activeTool (engine 'SELECT'/'FRAME'/etc) to ToolDef.id ('move'/'frame'/etc).
  const tool = editor.state.activeTool
  const reverseMap: Record<string, string> = {
    SELECT: 'move',
    FRAME: 'frame',
    RECTANGLE: 'rectangle',
    ELLIPSE: 'ellipse',
    PEN: 'pen',
    TEXT: 'text',
  }
  return reverseMap[tool] === toolId
}

function hasDropdown(toolId: string): boolean {
  if (toolId === 'move') return registry.dropdownTools('move').length > 0
  if (toolId === 'frame') return registry.dropdownTools('frame').length > 0
  if (toolId === 'pen') return registry.dropdownTools('pen').length > 0
  return false
}

function activate(toolId: string): void {
  registry.setActive(toolId)
}
</script>

<template>
  <div
    class="absolute left-1/2 -translate-x-1/2 flex items-center gap-[var(--toolbar-gap)] p-[var(--toolbar-pad)] rounded-[var(--r-2xl)] bg-page border border-line shadow-toolbar"
    role="toolbar"
    aria-label="Drawing tools"
    data-testid="bottom-toolbar"
    :style="{ bottom: 'var(--toolbar-bottom)' }"
  >
    <template v-for="tool in drawingTools" :key="tool.id">
      <ToolDropdown
        v-if="hasDropdown(tool.id) && (tool.id === 'move' || tool.id === 'frame' || tool.id === 'pen')"
        :parent="tool.id as 'move' | 'frame' | 'pen'"
      >
        <ToolButton
          :tool="tool"
          :active="isActive(tool.id)"
          :has-dropdown="true"
          @activate="activate(tool.id)"
        />
      </ToolDropdown>
      <ToolButton
        v-else
        :tool="tool"
        :active="isActive(tool.id)"
        @activate="activate(tool.id)"
      />
    </template>
    <div
      v-if="aiTools.length > 0"
      class="self-stretch w-px bg-line-2 mx-[var(--toolbar-divider-x)] my-[var(--toolbar-divider-y)]"
      aria-hidden="true"
      data-testid="toolbar-divider"
    />
    <template v-for="tool in aiTools" :key="tool.id">
      <AiToolButton v-if="tool.id === 'ai'" :tool="tool" />
      <ToolButton v-else :tool="tool" :active="false" @activate="activate(tool.id)" />
    </template>
  </div>
</template>
