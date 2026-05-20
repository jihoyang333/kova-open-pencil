// Cluster 11 Plan Task 3.2 — useToastStore tests.
// Auto-dismiss timing uses 100ms duration override so tests stay fast.

import { describe, it, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useToastStore } from '@/stores/toast'

describe('useToastStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('enqueues a toast and renders it visible', () => {
    const store = useToastStore()
    const id = store.show({ variant: 'success', message: 'ok' })
    expect(store.visible).toHaveLength(1)
    expect(store.visible[0]?.id).toBe(id)
  })

  it('caps visible at 5; rest goes to queued', () => {
    const store = useToastStore()
    for (let i = 0; i < 6; i++) store.show({ variant: 'info', message: `t${i}` })
    expect(store.visible).toHaveLength(5)
    expect(store.queued).toHaveLength(1)
  })

  it('promotes queued on dismiss', () => {
    const store = useToastStore()
    for (let i = 0; i < 6; i++) store.show({ variant: 'info', message: `t${i}` })
    const firstId = store.visible[0]!.id
    store.dismiss(firstId)
    expect(store.visible).toHaveLength(5)
    expect(store.queued).toHaveLength(0)
  })

  it('auto-dismisses success after duration', async () => {
    const store = useToastStore()
    store.show({ variant: 'success', message: 'auto', duration: 50 })
    expect(store.visible).toHaveLength(1)
    await new Promise((r) => setTimeout(r, 100))
    expect(store.visible).toHaveLength(0)
  })

  it('error variant auto-dismisses per founder override 2026-05-20', async () => {
    const store = useToastStore()
    store.show({ variant: 'error', message: 'auto', duration: 50 })
    expect(store.visible).toHaveLength(1)
    await new Promise((r) => setTimeout(r, 100))
    expect(store.visible).toHaveLength(0)
  })

  it('does NOT auto-dismiss action variant (sticky-with-cta)', async () => {
    const store = useToastStore()
    store.show({
      variant: 'action',
      message: 'undo?',
      ctaLabel: 'Undo',
      ctaHandler: () => undefined,
      duration: 50,
    })
    await new Promise((r) => setTimeout(r, 100))
    expect(store.visible).toHaveLength(1)
  })
})
