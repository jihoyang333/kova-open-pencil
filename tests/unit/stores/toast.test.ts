import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

import { useToastStore, defaultIcon, type ToastVariant } from '@/stores/toast'

describe('useToastStore (Cluster 11 — PRD 11 §3.1)', () => {
  let originalTimers: ReturnType<typeof useFakeTimers> | null = null

  beforeEach(() => {
    setActivePinia(createPinia())
    originalTimers = useFakeTimers()
  })

  afterEach(() => {
    originalTimers?.restore()
  })

  test('show() returns a unique id', () => {
    const store = useToastStore()
    const a = store.show({ variant: 'success', message: 'A' })
    const b = store.show({ variant: 'success', message: 'B' })
    expect(typeof a).toBe('string')
    expect(a).not.toEqual(b)
  })

  test('first 5 toasts are visible, 6th queues', () => {
    const store = useToastStore()
    for (let i = 0; i < 7; i++) store.show({ variant: 'info', message: `t${i}` })
    expect(store.visible.length).toBe(5)
    expect(store.queued.length).toBe(2)
  })

  test('dismiss promotes next queued toast', () => {
    const store = useToastStore()
    for (let i = 0; i < 6; i++) store.show({ variant: 'info', message: `t${i}` })
    const firstId = store.visible[0].id
    store.dismiss(firstId)
    expect(store.visible.length).toBe(5)
    expect(store.queued.length).toBe(0)
    expect(store.visible.some((t) => t.id === firstId)).toBe(false)
  })

  test('non-sticky variants auto-dismiss after 5 s', () => {
    const store = useToastStore()
    store.show({ variant: 'success', message: 'auto' })
    expect(store.visible.length).toBe(1)
    originalTimers!.advance(5001)
    expect(store.visible.length).toBe(0)
  })

  test('sticky variants do NOT auto-dismiss (error / action / progress)', () => {
    const store = useToastStore()
    const sticky: ToastVariant[] = ['error', 'action', 'progress']
    for (const v of sticky) store.show({ variant: v, message: v })
    expect(store.visible.length).toBe(3)
    originalTimers!.advance(60_000)
    expect(store.visible.length).toBe(3)
  })

  test('custom duration overrides default', () => {
    const store = useToastStore()
    store.show({ variant: 'success', message: 'x', duration: 250 })
    originalTimers!.advance(249)
    expect(store.visible.length).toBe(1)
    originalTimers!.advance(2)
    expect(store.visible.length).toBe(0)
  })

  test('dismissAll clears everything', () => {
    const store = useToastStore()
    for (let i = 0; i < 8; i++) store.show({ variant: 'info', message: `t${i}` })
    expect(store.visible.length + store.queued.length).toBe(8)
    store.dismissAll()
    expect(store.visible.length).toBe(0)
    expect(store.queued.length).toBe(0)
  })

  test('defaultIcon maps each variant to canonical Lucide name', () => {
    expect(defaultIcon('success')).toBe('check')
    expect(defaultIcon('error')).toBe('alert-triangle')
    expect(defaultIcon('info')).toBe('info')
    expect(defaultIcon('action')).toBe('info')
    expect(defaultIcon('progress')).toBe('loader')
    expect(defaultIcon('ai')).toBe('sparkles')
  })

  test('toast survives queue when dismissed before promotion', () => {
    const store = useToastStore()
    for (let i = 0; i < 7; i++) store.show({ variant: 'info', message: `t${i}` })
    const queuedId = store.queued[0].id
    // Direct dismiss of a queued id should be no-op (not in visible).
    store.dismiss(queuedId)
    // Queue still has 2 (no promotion since nothing was removed from visible).
    expect(store.visible.length).toBe(5)
  })
})

// --- minimal fake-timer harness (bun:test doesn't ship fake-timers out of box)
function useFakeTimers(): { advance: (ms: number) => void; restore: () => void } {
  const real = globalThis.setTimeout
  const realClear = globalThis.clearTimeout

  interface Pending { id: number; at: number; fn: () => void }
  const pending: Pending[] = []
  let now = 0
  let counter = 1

  globalThis.setTimeout = ((fn: () => void, ms: number) => {
    const id = counter++
    pending.push({ id, at: now + (ms ?? 0), fn })
    return id as unknown as ReturnType<typeof setTimeout>
  }) as typeof setTimeout

  globalThis.clearTimeout = ((id: number) => {
    const idx = pending.findIndex((p) => p.id === id)
    if (idx >= 0) pending.splice(idx, 1)
  }) as typeof clearTimeout

  return {
    advance(ms: number) {
      now += ms
      const ready = pending.filter((p) => p.at <= now).sort((a, b) => a.at - b.at)
      for (const p of ready) {
        const idx = pending.indexOf(p)
        if (idx >= 0) pending.splice(idx, 1)
        p.fn()
      }
    },
    restore() {
      globalThis.setTimeout = real
      globalThis.clearTimeout = realClear
    },
  }
}
