<script setup lang="ts">
// Find result row (PRD §12.12). Node-type icon + name + parent breadcrumb. Focused row
// highlighted. Adapted per R6/R-find: reads the real editor graph, not figma.getNodeById.
import { computed } from 'vue'
import type { NodeType } from '@open-pencil/core'
import { useEditorStore } from '@/stores/editor'
import KovaIcon from '@/components/ui/KovaIcon.vue'

const { nodeId, isFocused } = defineProps<{ nodeId: string; isFocused: boolean }>()
defineEmits<{ click: [] }>()

const editor = useEditorStore()
const node = computed(() => editor.graph.getNode(nodeId))
const parentName = computed(() => {
  const parentId = node.value?.parentId
  return parentId ? (editor.graph.getNode(parentId)?.name ?? '') : ''
})

const ICON_BY_TYPE: Partial<Record<NodeType, string>> = {
  FRAME: 'frame',
  TEXT: 'type',
  RECTANGLE: 'square',
  ELLIPSE: 'circle',
  VECTOR: 'pen-tool',
  GROUP: 'folder',
  SLICE: 'crop'
}
const icon = computed(() => (node.value ? (ICON_BY_TYPE[node.value.type] ?? 'box') : 'box'))
</script>

<template>
  <button
    v-if="node"
    type="button"
    data-test="row"
    class="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left hover:bg-fill"
    :class="isFocused ? 'bg-fill-2' : ''"
    @click="$emit('click')"
  >
    <KovaIcon :name="icon" size="sm" class="shrink-0 text-ink-3" data-test="node-icon" />
    <span data-test="node-name" class="flex-1 truncate text-xs text-ink">{{ node.name }}</span>
    <span data-test="breadcrumb" class="text-[10px] text-ink-3">{{ parentName }}</span>
  </button>
</template>
