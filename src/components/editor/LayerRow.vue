<script setup lang="ts">
/**
 * LayerRow — Cluster 06 Task 11.
 *
 * Hi-fi source: Kova Canvas - Final.html `.kc .left .layer` (lines 189-216).
 * 28px row, 5/8 padding, 6px radius. Indent 24px / 40px per nesting depth.
 *
 * Per Q2: mask glyph variant per maskType (ALPHA/VECTOR/LUMINANCE).
 * Per Cluster 07a: SLICE NodeType renders distinct slice glyph.
 */
import { computed } from 'vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import type { LayerRow as LayerRowType } from '@/composables/use-layer-tree'

interface Props {
  row: LayerRowType
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
})

defineEmits<{
  click: [row: LayerRowType, ev: MouseEvent]
  toggleExpand: [row: LayerRowType]
  toggleVisibility: [row: LayerRowType]
  toggleLock: [row: LayerRowType]
  hover: [row: LayerRowType | null]
}>()

const typeIconName = computed(() => {
  switch (props.row.type) {
    case 'FRAME':
      return 'frame'
    case 'TEXT':
      return 'type'
    case 'RECTANGLE':
      return 'square'
    case 'ELLIPSE':
      return 'circle'
    case 'IMAGE':
      return 'image'
    case 'SLICE':
      return 'crop'
    case 'VECTOR':
      return 'pen-tool'
    default:
      return 'component'
  }
})

const maskIconName = computed(() => {
  if (!props.row.maskGlyph) return null
  switch (props.row.maskGlyph) {
    case 'ALPHA':
      return 'circle'
    case 'VECTOR':
      return 'pen-tool'
    case 'LUMINANCE':
      return 'sparkles'
    default:
      return 'circle'
  }
})

const rowClass = computed(() => {
  const base = [
    'flex items-center gap-[7px] py-[5px] px-2 h-7 text-[12.5px] rounded-md transition-colors group',
  ]
  if (props.selected) {
    base.push('bg-accent-soft text-ink')
  } else if (!props.row.isVisible) {
    base.push('text-ink-4 hover:bg-line-2 hover:text-ink-3')
  } else {
    base.push('text-ink-2 hover:bg-line-2 hover:text-ink cursor-pointer')
  }
  return base.join(' ')
})

const indentStyle = computed(() => ({ paddingLeft: `${props.row.indent * 16}px` }))
</script>

<template>
  <div
    :class="rowClass"
    :style="indentStyle"
    :data-layer-id="row.id"
    :data-layer-type="row.type"
    :data-selected="selected"
    role="treeitem"
    :aria-selected="selected"
    :aria-expanded="row.hasChildren ? row.isExpanded : undefined"
    @click="(ev) => $emit('click', row, ev)"
    @pointerenter="$emit('hover', row)"
    @pointerleave="$emit('hover', null)"
  >
    <button
      v-if="row.hasChildren"
      type="button"
      class="w-2.5 grid place-items-center text-ink-3 cursor-pointer"
      :aria-label="row.isExpanded ? 'Collapse' : 'Expand'"
      data-testid="layer-row-caret"
      @click.stop="$emit('toggleExpand', row)"
    >
      <KovaIcon :name="row.isExpanded ? 'chevron-down' : 'chevron-right'" size="xs" />
    </button>
    <span v-else class="w-2.5" aria-hidden="true" />

    <span
      class="grid place-items-center text-ink-3 flex-shrink-0"
      :class="selected ? 'text-ink' : ''"
      aria-hidden="true"
    >
      <KovaIcon :name="typeIconName" size="sm" />
    </span>

    <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap" data-testid="layer-row-name">
      {{ row.name }}
    </span>

    <span
      v-if="maskIconName"
      class="grid place-items-center text-ink-3 flex-shrink-0"
      data-testid="layer-row-mask"
      :data-mask-type="row.maskGlyph"
      :title="`Mask: ${row.maskGlyph}`"
      aria-hidden="true"
    >
      <KovaIcon :name="maskIconName" size="xs" />
    </span>

    <span
      v-if="row.isSlice"
      class="grid place-items-center text-ink-3 flex-shrink-0"
      data-testid="layer-row-slice"
      aria-hidden="true"
    >
      <KovaIcon name="crop" size="xs" />
    </span>

    <button
      type="button"
      class="grid place-items-center text-ink-3 hover:text-ink flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      :class="selected ? 'opacity-100' : ''"
      :aria-label="row.isVisible ? 'Hide layer' : 'Show layer'"
      data-testid="layer-row-vis"
      @click.stop="$emit('toggleVisibility', row)"
    >
      <KovaIcon :name="row.isVisible ? 'check' : 'x'" size="xs" />
    </button>

    <button
      v-if="row.isLocked"
      type="button"
      class="grid place-items-center text-ink-3 hover:text-ink flex-shrink-0"
      aria-label="Unlock layer"
      data-testid="layer-row-lock"
      @click.stop="$emit('toggleLock', row)"
    >
      <KovaIcon name="key" size="xs" />
    </button>
  </div>
</template>
