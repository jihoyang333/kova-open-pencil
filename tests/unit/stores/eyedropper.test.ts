import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useEyedropperStore } from '@/stores/eyedropper'

describe('useEyedropperStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts inactive', () => {
    const store = useEyedropperStore()
    expect(store.active).toBe(false)
    expect(store.sampledHex).toBeNull()
  })

  it('activate sets active=true and registers callback', () => {
    const store = useEyedropperStore()
    const cb = mock(() => {})
    store.activate(cb)
    expect(store.active).toBe(true)
  })

  it('sample invokes callback with hex and clears active', () => {
    const store = useEyedropperStore()
    const cb = mock((_hex: string) => {})
    store.activate(cb)
    store.sample('#ff0000')
    expect(cb).toHaveBeenCalledWith('#ff0000')
    expect(store.active).toBe(false)
    expect(store.sampledHex).toBe('#ff0000')
  })

  it('cancel sets active=false without invoking callback', () => {
    const store = useEyedropperStore()
    const cb = mock((_hex: string) => {})
    store.activate(cb)
    store.cancel()
    expect(cb).not.toHaveBeenCalled()
    expect(store.active).toBe(false)
  })
})
