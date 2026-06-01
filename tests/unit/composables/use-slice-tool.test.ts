import { describe, expect, it, beforeEach } from 'bun:test'
import { createEditorStore, setActiveEditorStore, useEditorStore } from '@/stores/editor'
import { useSliceTool } from '@/composables/use-slice-tool'

describe('useSliceTool', () => {
  beforeEach(() => setActiveEditorStore(createEditorStore()))

  it('starts inactive', () => {
    const { isActive } = useSliceTool()
    expect(isActive.value).toBe(false)
  })

  it('activate sets state.activeTool="SLICE"', () => {
    const editor = useEditorStore()
    const { activate, isActive } = useSliceTool()
    activate()
    expect(editor.state.activeTool).toBe('SLICE')
    expect(isActive.value).toBe(true)
  })

  it('deactivate returns to SELECT', () => {
    const editor = useEditorStore()
    const { activate, deactivate } = useSliceTool()
    activate()
    deactivate()
    expect(editor.state.activeTool).toBe('SELECT')
  })
})
