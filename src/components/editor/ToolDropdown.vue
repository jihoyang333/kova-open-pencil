<script setup lang="ts">
/**
 * ToolDropdown — Cluster 06 Task 10.
 *
 * Sub-tool flyout under Move/Frame/Pen primary slots. Reka DropdownMenu
 * via Cluster 11's <KovaMenu>. Sub-tools registered by Cluster 07a
 * (Slice + Hand + Scale) and Cluster 06 itself for the default 8.
 */
import { computed } from 'vue'
import KovaMenu, { type KovaMenuItem } from '@/components/ui/KovaMenu.vue'
import { useToolRegistry } from '@/stores/tool-registry'

interface Props {
  parent: 'move' | 'frame' | 'pen'
}

const props = defineProps<Props>()
const registry = useToolRegistry()

const items = computed<KovaMenuItem[]>(() =>
  registry.dropdownTools(props.parent).map((tool) => ({
    id: tool.id,
    label: tool.label,
    icon: tool.icon,
    shortcut: tool.key ?? tool.keySequence?.join('+'),
    disabled: tool.disabled,
    onSelect: () => registry.setActive(tool.id),
  }))
)
</script>

<template>
  <KovaMenu :items="items">
    <template #trigger>
      <slot />
    </template>
  </KovaMenu>
</template>
