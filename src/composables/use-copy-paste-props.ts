import { computed } from 'vue'
import { useClipboardStore } from '@/stores/clipboard'
import { useEditorStore } from '@/stores/editor'

/**
 * Q23 copy/paste-properties (PRD 07b §12). Copies from the first selected node,
 * pastes to all selected nodes. The clipboard store builds a pure change set
 * (dropping incompatible fields per C-LOW07b.4); we apply it through the engine
 * via editor.updateNodeWithUndo so the paste repaints, persists, and is undoable
 * — never a direct scene-node mutation (audit C3). `editor.selectedNodes` is a
 * ComputedRef → read `.value`.
 */
export function useCopyPasteProps() {
  const clipboard = useClipboardStore()
  const editor = useEditorStore()

  const canPaste = computed(() => clipboard.copiedProps !== null)

  function copy(): void {
    const sel = editor.selectedNodes.value
    if (sel.length === 0) return
    clipboard.copyProps(sel[0])
  }

  function paste(): void {
    const sel = editor.selectedNodes.value
    if (sel.length === 0) return
    for (const { id, changes } of clipboard.buildPasteChanges(sel)) {
      editor.updateNodeWithUndo(id, changes, 'Paste properties')
    }
  }

  return { copy, paste, canPaste }
}
