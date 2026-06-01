<script setup lang="ts">
// Measurement annotations (PRD 07b §B8.9 + 07a page-level measurement model). Iterates
// the page's measurements (graph.getMeasurements — NOT a NodeType filter), drawing a
// dashed line between the two anchor side-midpoints plus a label. Canvas coords.
import { computed } from 'vue'
import type { Measurement, MeasurementAnchor, MeasurementSide } from '@open-pencil/core'
import { useEditorStore } from '@/stores/editor'
import { OVERLAY_Z, OVERLAY_COLOR } from '@/constants/overlays'

interface Point {
  x: number
  y: number
}
interface Annotation {
  id: string
  line: Record<string, string>
  label: Record<string, string>
  text: string
}

const editor = useEditorStore()

const measurements = computed<Measurement[]>(() => {
  void editor.state.sceneVersion
  return editor.graph.getMeasurements(editor.state.currentPageId)
})

function anchorPoint(anchor: MeasurementAnchor): Point | null {
  const node = editor.graph.getNode(anchor.nodeId)
  if (!node) return null
  const abs = editor.graph.getAbsolutePosition(anchor.nodeId)
  const side: MeasurementSide = anchor.side
  if (side === 'TOP') return { x: abs.x + node.width / 2, y: abs.y }
  if (side === 'BOTTOM') return { x: abs.x + node.width / 2, y: abs.y + node.height }
  if (side === 'LEFT') return { x: abs.x, y: abs.y + node.height / 2 }
  return { x: abs.x + node.width, y: abs.y + node.height / 2 }
}

const annotations = computed<Annotation[]>(() => {
  const out: Annotation[] = []
  for (const m of measurements.value) {
    const a = anchorPoint(m.start)
    const b = anchorPoint(m.end)
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    out.push({
      id: m.id,
      line: {
        position: 'absolute',
        left: `${a.x}px`,
        top: `${a.y}px`,
        width: `${len}px`,
        height: '0',
        borderTop: `1px dashed ${OVERLAY_COLOR.SNAP_RED}`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: '0 0',
        zIndex: String(OVERLAY_Z.MEASUREMENT_LINE),
        pointerEvents: 'none'
      },
      label: {
        position: 'absolute',
        left: `${(a.x + b.x) / 2}px`,
        top: `${(a.y + b.y) / 2}px`,
        zIndex: String(OVERLAY_Z.MEASUREMENT_LABEL),
        pointerEvents: 'none'
      },
      text: m.freeText || `${Math.round(len)}`
    })
  }
  return out
})
</script>

<template>
  <template v-for="a in annotations" :key="a.id">
    <span data-test="measurement-annotation" :style="a.line" />
    <span
      class="rounded-sm bg-[color:var(--color-accent)] px-1 py-px text-[10px] text-white"
      :style="a.label"
      >{{ a.text }}</span
    >
  </template>
</template>
