import { describe, test, expect } from 'bun:test'

// Plan 01 Task 12.4 — useViewportGuard composable.

const { useViewportGuard } = await import('../../../../src/composables/auth/use-viewport-guard')

describe('useViewportGuard', () => {
  test('mobile at innerWidth=375', () => {
    ;(globalThis as { window?: { innerWidth: number } }).window = { innerWidth: 375 }
    const g = useViewportGuard()
    expect(g.isMobile.value).toBe(true)
    expect(g.isTablet.value).toBe(false)
    expect(g.isDesktop.value).toBe(false)
  })

  test('tablet at innerWidth=768', () => {
    ;(globalThis as { window?: { innerWidth: number } }).window = { innerWidth: 768 }
    const g = useViewportGuard()
    expect(g.isMobile.value).toBe(false)
    expect(g.isTablet.value).toBe(true)
    expect(g.isDesktop.value).toBe(false)
  })

  test('desktop at innerWidth=1440', () => {
    ;(globalThis as { window?: { innerWidth: number } }).window = { innerWidth: 1440 }
    const g = useViewportGuard()
    expect(g.isMobile.value).toBe(false)
    expect(g.isTablet.value).toBe(false)
    expect(g.isDesktop.value).toBe(true)
  })

  test('1024 threshold flips to desktop', () => {
    ;(globalThis as { window?: { innerWidth: number } }).window = { innerWidth: 1024 }
    const g = useViewportGuard()
    expect(g.isDesktop.value).toBe(true)
    expect(g.isTablet.value).toBe(false)
  })

  test('1023 sits in tablet band', () => {
    ;(globalThis as { window?: { innerWidth: number } }).window = { innerWidth: 1023 }
    const g = useViewportGuard()
    expect(g.isDesktop.value).toBe(false)
    expect(g.isTablet.value).toBe(true)
  })
})
