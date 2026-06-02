import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { useCanvasEditLock } from '@/composables/version-history/use-canvas-edit-lock'

beforeEach(() => useCanvasEditLock().unlock()) // reset the module singleton

describe('useCanvasEditLock', () => {
  it('starts unlocked', () => {
    expect(useCanvasEditLock().isLocked.value).toBe(false)
  })

  it('lock() / unlock() toggle isLocked', () => {
    const { lock, unlock, isLocked } = useCanvasEditLock()
    lock(); expect(isLocked.value).toBe(true)
    unlock(); expect(isLocked.value).toBe(false)
  })

  it('is a singleton — two consumers share isLocked', () => {
    const a = useCanvasEditLock()
    const b = useCanvasEditLock()
    a.lock(); expect(b.isLocked.value).toBe(true)
    b.unlock(); expect(a.isLocked.value).toBe(false)
  })

  it('double-lock warns (single-owner contract)', () => {
    const orig = console.warn
    const warnings: string[] = []
    console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
    try {
      const { lock, unlock, isLocked } = useCanvasEditLock()
      lock()
      lock() // contention
      expect(warnings.some((w) => w.includes('already locked'))).toBe(true)
      unlock()
      expect(isLocked.value).toBe(false) // single unlock releases (not ref-counted)
    } finally {
      console.warn = orig
    }
  })
})

afterEach(() => useCanvasEditLock().unlock())
