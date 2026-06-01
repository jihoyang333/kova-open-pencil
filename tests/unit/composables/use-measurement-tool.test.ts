import { describe, expect, it, beforeEach } from 'bun:test'
import { createEditorStore, setActiveEditorStore, useEditorStore } from '@/stores/editor'
import { useMeasurementTool } from '@/composables/use-measurement-tool'

describe('useMeasurementTool', () => {
  beforeEach(() => setActiveEditorStore(createEditorStore()))

  it('starts inactive', () => {
    const { isActive } = useMeasurementTool()
    expect(isActive.value).toBe(false)
  })

  it('activate sets state.activeTool="MEASUREMENT"', () => {
    const editor = useEditorStore()
    const { activate } = useMeasurementTool()
    activate()
    expect(editor.state.activeTool).toBe('MEASUREMENT')
  })

  it('deactivate clears any pending start point and returns to SELECT', () => {
    const editor = useEditorStore()
    const { activate, deactivate, pendingStart } = useMeasurementTool()
    activate()
    // Simulate first click
    pendingStart.value = { x: 10, y: 20 }
    deactivate()
    expect(pendingStart.value).toBeNull()
    expect(editor.state.activeTool).toBe('SELECT')
  })
})
