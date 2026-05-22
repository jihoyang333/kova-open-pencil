import { afterAll, beforeEach, describe, expect, test } from 'bun:test'

// Plan 01 Task 12.4 — useViewportGuard composable.
//
// NOTE: setting innerWidth — we mutate the happy-dom window's `innerWidth`
// property in place rather than replacing `globalThis.window` outright. The
// previous pattern (`globalThis.window = { innerWidth: ... }`) wiped out the
// happy-dom-installed Event/MouseEvent/Document constructors and polluted
// every later test file that relied on `@vue/test-utils.mount()` (W8a v2
// AUDIT L5 / HANDOFF #5460).

const { useViewportGuard } = await import('../../../../src/composables/auth/use-viewport-guard')

const originalInnerWidth = (globalThis.window as Window | undefined)?.innerWidth ?? 1440

function setInnerWidth(value: number): void {
  Object.defineProperty(globalThis.window, 'innerWidth', { configurable: true, value })
}

describe('useViewportGuard', () => {
  beforeEach(() => {
    setInnerWidth(originalInnerWidth)
  })

  afterAll(() => {
    setInnerWidth(originalInnerWidth)
  })

  test('mobile at innerWidth=375', () => {
    setInnerWidth(375)
    const g = useViewportGuard()
    expect(g.isMobile.value).toBe(true)
    expect(g.isTablet.value).toBe(false)
    expect(g.isDesktop.value).toBe(false)
  })

  test('tablet at innerWidth=768', () => {
    setInnerWidth(768)
    const g = useViewportGuard()
    expect(g.isMobile.value).toBe(false)
    expect(g.isTablet.value).toBe(true)
    expect(g.isDesktop.value).toBe(false)
  })

  test('desktop at innerWidth=1440', () => {
    setInnerWidth(1440)
    const g = useViewportGuard()
    expect(g.isMobile.value).toBe(false)
    expect(g.isTablet.value).toBe(false)
    expect(g.isDesktop.value).toBe(true)
  })

  test('1024 threshold flips to desktop', () => {
    setInnerWidth(1024)
    const g = useViewportGuard()
    expect(g.isDesktop.value).toBe(true)
    expect(g.isTablet.value).toBe(false)
  })

  test('1023 sits in tablet band', () => {
    setInnerWidth(1023)
    const g = useViewportGuard()
    expect(g.isDesktop.value).toBe(false)
    expect(g.isTablet.value).toBe(true)
  })
})
