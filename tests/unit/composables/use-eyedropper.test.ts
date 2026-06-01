import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useEyedropper } from '@/composables/use-eyedropper'
import { useEyedropperStore } from '@/stores/eyedropper'

describe('useEyedropper', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('isActive reflects store.active', () => {
    const { isActive } = useEyedropper()
    expect(isActive.value).toBe(false)

    const store = useEyedropperStore()
    store.activate(() => {})
    expect(isActive.value).toBe(true)
  })

  it('activate registers callback through the store', () => {
    const { activate } = useEyedropper()
    const cb = mock((_hex: string) => {})
    activate(cb)

    const store = useEyedropperStore()
    store.sample('#abcdef')
    expect(cb).toHaveBeenCalledWith('#abcdef')
  })

  it('cancel clears active', () => {
    const { activate, cancel, isActive } = useEyedropper()
    activate(() => {})
    expect(isActive.value).toBe(true)
    cancel()
    expect(isActive.value).toBe(false)
  })
})
