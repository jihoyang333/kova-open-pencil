import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

import { useConfirmStore } from '@/stores/confirm'

describe('useConfirmStore (Cluster 11 — PRD 11 §3.3 + KD-2)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('confirm() returns a Promise<boolean>', async () => {
    const store = useConfirmStore()
    const promise = store.confirm({ title: 'Delete?' })
    expect(promise).toBeInstanceOf(Promise)
    // Resolve immediately to clean up.
    store.answer(store.stack[0].id, true)
    await expect(promise).resolves.toBe(true)
  })

  test('answer(true) resolves the promise with true', async () => {
    const store = useConfirmStore()
    const p = store.confirm({ title: 'Save?' })
    store.answer(store.stack[0].id, true)
    expect(await p).toBe(true)
  })

  test('answer(false) resolves the promise with false', async () => {
    const store = useConfirmStore()
    const p = store.confirm({ title: 'Cancel?' })
    store.answer(store.stack[0].id, false)
    expect(await p).toBe(false)
  })

  test('stack grows up to MAX_STACK = 2', async () => {
    const store = useConfirmStore()
    const p1 = store.confirm({ title: 'First' })
    const p2 = store.confirm({ title: 'Second' })
    expect(store.stack.length).toBe(2)

    // Opening a 3rd closes the innermost (the 2nd) with false.
    const p3 = store.confirm({ title: 'Third' })
    expect(store.stack.length).toBe(2)
    expect(await p2).toBe(false)

    // Clean up.
    store.answer(store.stack[1].id, true)
    await expect(p3).resolves.toBe(true)
    store.answer(store.stack[0].id, true)
    await expect(p1).resolves.toBe(true)
  })

  test('answer with unknown id is a no-op', () => {
    const store = useConfirmStore()
    store.confirm({ title: 'X' })
    expect(() => store.answer('does-not-exist', true)).not.toThrow()
    expect(store.stack.length).toBe(1)
  })

  test('typedConfirmPhrase is preserved on the request', () => {
    const store = useConfirmStore()
    void store.confirm({
      title: 'Delete account',
      typedConfirmPhrase: 'delete my account',
    })
    expect(store.stack[0].typedConfirmPhrase).toBe('delete my account')
  })

  test('destructive flag is preserved', () => {
    const store = useConfirmStore()
    void store.confirm({ title: 'Delete', destructive: true })
    expect(store.stack[0].destructive).toBe(true)
  })
})
