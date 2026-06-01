import { describe, expect, it, beforeEach } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import MeasurementAnnotations from '@/components/canvas-overlays/MeasurementAnnotations.vue'

let store: EditorStore

describe('MeasurementAnnotations', () => {
  beforeEach(() => {
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('renders one annotation per page measurement', () => {
    const page = store.state.currentPageId
    const a = store.graph.createNode('RECTANGLE', page, { name: 'a', x: 0, y: 0, width: 50, height: 50 })
    const b = store.graph.createNode('RECTANGLE', page, { name: 'b', x: 200, y: 0, width: 50, height: 50 })
    store.graph.addMeasurement(
      page,
      { nodeId: a.id, side: 'RIGHT' },
      { nodeId: b.id, side: 'LEFT' }
    )
    expect(mount(MeasurementAnnotations).findAll('[data-test="measurement-annotation"]')).toHaveLength(1)
  })

  it('renders nothing when there are no measurements', () => {
    expect(
      mount(MeasurementAnnotations).findAll('[data-test="measurement-annotation"]')
    ).toHaveLength(0)
  })
})
