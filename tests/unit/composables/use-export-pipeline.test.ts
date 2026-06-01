import { describe, expect, it, beforeEach, spyOn } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import { useExportPipeline } from '@/composables/use-export-pipeline'

// Adapted per handoff R9: the plan's `figma.exportAsync` / `figma.currentPage` are
// fictional. Real export goes through the editor store's quality-aware
// `renderExportImage` (which owns the private ck/renderer). We use the REAL editor
// store (createNode/select) and spy `renderExportImage` — no mock.module (process-
// global in Bun, poisons sibling editor tests, see use-copy-paste-props).
//
// NOTE: useEditorStore() returns a forwarding Proxy; spying must target the concrete
// store created here, which the proxy forwards reads to.
let store: EditorStore

function seedSlices(): void {
  const pageId = store.state.currentPageId
  store.graph.createNode('SLICE', pageId, { name: 'header' })
  store.graph.createNode('SLICE', pageId, { name: 'footer' })
  store.graph.createNode('RECTANGLE', pageId, { name: 'rect' })
}

describe('useExportPipeline', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('exportAllSlices iterates only SLICE nodes (skips RECTANGLE)', async () => {
    seedSlices()
    const spy = spyOn(store, 'renderExportImage').mockResolvedValue(new Uint8Array([1, 2, 3]))
    const { exportAllSlices } = useExportPipeline()
    await exportAllSlices({ format: 'PNG', scale: 1 })
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('exportSingleSlice invokes renderExportImage once with scale + JPG quality', async () => {
    seedSlices()
    const sliceId = store.graph
      .getChildren(store.state.currentPageId)
      .find((n) => n.type === 'SLICE')!.id
    const spy = spyOn(store, 'renderExportImage').mockResolvedValue(new Uint8Array([9]))
    const { exportSingleSlice } = useExportPipeline()
    // UI quality is a 0–1 fraction (JPG_QUALITY constants); pipeline converts to the
    // engine's 0–100 scale before calling renderExportImage.
    const blob = await exportSingleSlice(sliceId, { format: 'JPG', scale: 2, quality: 0.92 })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]).toEqual([[sliceId], 2, 'JPG', 92])
    expect(blob.type).toBe('image/jpeg')
  })

  it('exportSingleSlice throws when slice id not found', async () => {
    seedSlices()
    const { exportSingleSlice } = useExportPipeline()
    await expect(exportSingleSlice('missing', { format: 'PNG', scale: 1 })).rejects.toThrow()
  })
})
