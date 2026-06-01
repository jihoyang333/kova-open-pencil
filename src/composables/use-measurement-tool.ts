import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'

interface Vector2 {
  x: number
  y: number
}

/**
 * Measurement-tool UI state machine (Cluster 07b). 07a owns the page-level
 * Measurement system + `addMeasurement` engine tool; this composable holds the
 * two-click pending state. canvas-input wires:
 *   first click  → pendingStart = point
 *   second click → figma.graph.addMeasurement({ start, end }); pendingStart = null
 */
export function useMeasurementTool() {
  const editor = useEditorStore()

  const isActive = computed(() => editor.state.activeTool === 'MEASUREMENT')
  const pendingStart = ref<Vector2 | null>(null)

  function activate(): void {
    editor.state.activeTool = 'MEASUREMENT'
    pendingStart.value = null
  }

  function deactivate(): void {
    editor.state.activeTool = 'SELECT'
    pendingStart.value = null
  }

  return { isActive, pendingStart, activate, deactivate }
}
