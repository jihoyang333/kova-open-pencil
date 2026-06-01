import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { createEditorStore, setActiveEditorStore, useEditorStore } from '@/stores/editor'
import { useCopyPasteProps } from '@/composables/use-copy-paste-props'
import { useClipboardStore } from '@/stores/clipboard'

// Uses the REAL editor store (createNode + select) rather than mock.module, which is
// process-global in Bun and would poison other editor-store tests in the same run.
function seedSelectedRect(strokeWeight: number): void {
  const editor = useEditorStore()
  const pageId = editor.state.currentPageId
  const rect = editor.graph.createNode('RECTANGLE', pageId, { name: 'rect' })
  ;(rect as unknown as Record<string, unknown>).strokeWeight = strokeWeight
  ;(rect as unknown as Record<string, unknown>).strokeAlign = 'INSIDE'
  editor.select([rect.id])
}

describe('useCopyPasteProps', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setActiveEditorStore(createEditorStore())
  })

  it('copy stores selection props in clipboard', () => {
    seedSelectedRect(2)
    const { copy } = useCopyPasteProps()
    const clipboard = useClipboardStore()
    copy()
    expect(clipboard.copiedProps).not.toBeNull()
    expect(clipboard.copiedProps!.sourceNodeType).toBe('RECTANGLE')
    expect(clipboard.copiedProps!.props.strokeWeight).toBe(2)
  })

  it('canPaste reflects clipboard state', () => {
    seedSelectedRect(4)
    const { canPaste, copy } = useCopyPasteProps()
    expect(canPaste.value).toBe(false)
    copy()
    expect(canPaste.value).toBe(true)
  })
})
