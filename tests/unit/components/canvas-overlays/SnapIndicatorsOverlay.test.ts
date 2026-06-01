import { describe, expect, it, beforeEach } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import SnapIndicatorsOverlay from '@/components/canvas-overlays/SnapIndicatorsOverlay.vue'

let store: EditorStore

describe('SnapIndicatorsOverlay', () => {
  beforeEach(() => {
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('renders nothing when there are no snap guides', () => {
    expect(mount(SnapIndicatorsOverlay).findAll('[data-test="snap-guide"]')).toHaveLength(0)
  })

  it('renders a guide per active snap hit', () => {
    store.setSnapGuides([
      { axis: 'x', position: 100, from: 0, to: 200 },
      { axis: 'y', position: 50, from: 0, to: 300 }
    ])
    expect(mount(SnapIndicatorsOverlay).findAll('[data-test="snap-guide"]')).toHaveLength(2)
  })
})
