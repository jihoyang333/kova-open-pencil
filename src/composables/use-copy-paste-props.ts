import { computed } from 'vue'
import { useClipboardStore } from '@/stores/clipboard'
import { useEditorStore } from '@/stores/editor'

/**
 * Q23 copy/paste-properties (PRD 07b §12). Copies from the first selected node,
 * pastes to all selected nodes via useClipboardStore (which drops incompatible
 * fields per C-LOW07b.4). `editor.selectedNodes` is a ComputedRef → read `.value`.
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
    clipboard.pasteProps(sel)
  }

  return { copy, paste, canPaste }
}
