import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useAutosnapshot } from '@/composables/version-history/use-autosnapshot'
import { useSnapshotsStore } from '@/stores/snapshots'
import { setActiveEditorStore, type EditorStore } from '@/stores/editor'

let changingBytes = new Uint8Array([1, 2, 3])

function setup() {
  const store = useSnapshotsStore()
  const createSpy = mock(async () => ({ ok: true as const, id: crypto.randomUUID() }))
  ;(store as unknown as { create: unknown }).create = createSpy
  setActiveEditorStore({ serializeSnapshot: async () => changingBytes } as unknown as EditorStore)
  return { store, createSpy }
}

describe('useAutosnapshot', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    changingBytes = new Uint8Array([1, 2, 3])
  })

  it('creates an autosave on tick', async () => {
    const { createSpy } = setup()
    const { tick } = useAutosnapshot(ref('c1'))
    await tick()
    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(createSpy.mock.calls[0][0]).toMatchObject({ kind: 'autosave', canvasId: 'c1' })
  })

  it('skips when the document is unchanged since the last snap', async () => {
    const { createSpy } = setup()
    const { tick } = useAutosnapshot(ref('c1'))
    await tick() // creates
    await tick() // same bytes -> skip
    expect(createSpy).toHaveBeenCalledTimes(1)
  })

  it('snaps again after the document changes', async () => {
    const { createSpy } = setup()
    const { tick } = useAutosnapshot(ref('c1'))
    await tick()
    changingBytes = new Uint8Array([9, 9, 9, 9]) // doc edited
    await tick()
    expect(createSpy).toHaveBeenCalledTimes(2)
  })

  it('does not snap while paused', async () => {
    const { createSpy } = setup()
    const auto = useAutosnapshot(ref('c1'))
    auto.paused.value = true
    await auto.tick()
    expect(createSpy).toHaveBeenCalledTimes(0)
  })
})
