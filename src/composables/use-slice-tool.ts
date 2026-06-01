import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'

/**
 * Slice-tool UI activation wrapper (Cluster 07b). 07a owns the SLICE NodeType +
 * `createSlice` engine factory; this composable is the UI state machine that flips
 * the active tool. The pointer-drag region-draw interaction is wired in canvas-input /
 * SliceRegionOverlay, which call the engine factory.
 */
export function useSliceTool() {
  const editor = useEditorStore()

  const isActive = computed(() => editor.state.activeTool === 'SLICE')

  function activate(): void {
    editor.state.activeTool = 'SLICE'
  }

  function deactivate(): void {
    editor.state.activeTool = 'SELECT'
  }

  return { isActive, activate, deactivate }
}
