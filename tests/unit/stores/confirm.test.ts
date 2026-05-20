// Cluster 11 Plan Task 5.1 — useConfirmStore tests.

import { describe, it, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useConfirmStore } from '@/stores/confirm'

describe('useConfirmStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('confirm() returns a promise that resolves on resolveTop(true)', async () => {
    const store = useConfirmStore()
    const p = store.confirm({ title: 'X' })
    store.resolveTop(true)
    await expect(p).resolves.toBe(true)
  })

  it('confirm() resolves false on resolveTop(false)', async () => {
    const store = useConfirmStore()
    const p = store.confirm({ title: 'X' })
    store.resolveTop(false)
    await expect(p).resolves.toBe(false)
  })

  it('stack capped at 2: opening 3rd closes innermost with false', async () => {
    const store = useConfirmStore()
    const r1 = store.confirm({ title: 'A' })
    const r2 = store.confirm({ title: 'B' })
    const r3 = store.confirm({ title: 'C' })

    await expect(r2).resolves.toBe(false)
    store.resolveTop(true)
    await expect(r3).resolves.toBe(true)
    store.resolveTop(true)
    await expect(r1).resolves.toBe(true)
  })

  it('pending reflects top of stack', () => {
    const store = useConfirmStore()
    expect(store.pending).toBeNull()
    void store.confirm({ title: 'A' })
    expect(store.pending?.title).toBe('A')
    void store.confirm({ title: 'B' })
    expect(store.pending?.title).toBe('B')
    store.resolveTop(false)
    expect(store.pending?.title).toBe('A')
  })
})
