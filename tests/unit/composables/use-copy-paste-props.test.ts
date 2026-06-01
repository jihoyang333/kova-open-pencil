import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

// Stub the editor store so the composable's selection source is deterministic.
mock.module('@/stores/editor', () => ({
  useEditorStore: () => ({
    selectedNodes: { value: [{ id: 'n1', type: 'RECTANGLE', strokeWeight: 2, strokeAlign: 'INSIDE' }] },
  }),
}))

const { useCopyPasteProps } = await import('@/composables/use-copy-paste-props')
const { useClipboardStore } = await import('@/stores/clipboard')

describe('useCopyPasteProps', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('copy stores selection props in clipboard', () => {
    const { copy } = useCopyPasteProps()
    const clipboard = useClipboardStore()
    copy()
    expect(clipboard.copiedProps).not.toBeNull()
    expect(clipboard.copiedProps!.props.strokeWeight).toBe(2)
  })

  it('canPaste reflects clipboard state', () => {
    const { canPaste, copy } = useCopyPasteProps()
    expect(canPaste.value).toBe(false)
    copy()
    expect(canPaste.value).toBe(true)
  })
})
