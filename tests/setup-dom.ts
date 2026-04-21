import { mock } from 'bun:test'
import { GlobalWindow } from 'happy-dom'

// Mock @/lib/supabase so store unit tests get a no-op client with empty data.
// Cron tests (tests/api/**) mock @supabase/supabase-js directly — unaffected.
// supabase-factory tests import @/lib/supabase-factory directly — also unaffected.
mock.module('@/lib/supabase', () => {
  const makeChannel = () => {
    const ch: Record<string, unknown> = {}
    ch['on'] = () => ch
    ch['subscribe'] = () => ch
    ch['unsubscribe'] = () => Promise.resolve('ok' as const)
    return ch
  }
  const makeQuery = (): Record<string, unknown> => ({
    select: () => makeQuery(),
    eq: () => Promise.resolve({ data: [], error: null }),
    lt: () => ({ is: () => Promise.resolve({ data: [], error: null }) }),
    insert: () => Promise.resolve({ data: [], error: null }),
    update: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: null }),
      in: () => Promise.resolve({ data: null, error: null }),
    }),
    upsert: () => Promise.resolve({ data: [], error: null }),
  })
  const supabase = {
    from: () => makeQuery(),
    channel: makeChannel,
    rpc: () => Promise.resolve({ data: null, error: null }),
  }
  return { supabase, getSupabase: () => supabase, createSupabaseClient: () => supabase }
})

// Preserve native Web Crypto before happy-dom potentially replaces it
const nativeCrypto = globalThis.crypto

const window = new GlobalWindow()

// Register essential DOM globals for @vue/test-utils
// Expose window itself
;(globalThis as Record<string, unknown>).window = window

// Restore native Web Crypto so crypto.subtle works correctly in tests
globalThis.crypto = nativeCrypto

const globals = [
  'document',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'HTMLButtonElement',
  'SVGElement',
  'Element',
  'Node',
  'Text',
  'Comment',
  'DocumentFragment',
  'Event',
  'CustomEvent',
  'KeyboardEvent',
  'MouseEvent',
  'InputEvent',
  'FocusEvent',
  'MessageEvent',
  'MutationObserver',
  'ShadowRoot',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
] as const

for (const key of globals) {
  if (key in window) {
    ;(globalThis as Record<string, unknown>)[key] = (window as Record<string, unknown>)[key]
  }
}

// --- Canvas & Image API mocks (not supported by happy-dom) ---
// These are needed by src/utils/image-processing.ts and any tests that use it.
// Tests can control mock behavior via globalThis._canvasMock.

interface CanvasMockConfig {
  imageWidth: number
  imageHeight: number
  imageShouldError: boolean
  convertToBlobLargeSize: boolean
  convertToBlobCallCount: number
}

const canvasMock: CanvasMockConfig = {
  imageWidth: 800,
  imageHeight: 600,
  imageShouldError: false,
  convertToBlobLargeSize: false,
  convertToBlobCallCount: 0,
}

;(globalThis as Record<string, unknown>)._canvasMock = canvasMock

if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => 'blob:mock'
  globalThis.URL.revokeObjectURL = () => {}
}

class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = canvasMock.imageWidth
  naturalHeight = canvasMock.imageHeight
  set src(_url: string) {
    setTimeout(() => {
      this.naturalWidth = canvasMock.imageWidth
      this.naturalHeight = canvasMock.imageHeight
      if (canvasMock.imageShouldError) {
        this.onerror?.()
      } else {
        this.onload?.()
      }
    }, 0)
  }
}

;(globalThis as Record<string, unknown>).Image = MockImage

class MockOffscreenCanvas {
  width: number
  height: number
  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }
  getContext(_type: string) {
    return { drawImage: () => {} }
  }
  convertToBlob({ type }: { type: string; quality?: number }): Promise<Blob> {
    if (canvasMock.convertToBlobLargeSize) {
      canvasMock.convertToBlobCallCount++
      if (canvasMock.convertToBlobCallCount === 1) {
        return Promise.resolve(new Blob([new Uint8Array(1.5 * 1024 * 1024)], { type }))
      }
      return Promise.resolve(new Blob([new Uint8Array(500 * 1024)], { type }))
    }
    return Promise.resolve(new Blob([new Uint8Array(1000)], { type }))
  }
}

;(globalThis as Record<string, unknown>).OffscreenCanvas = MockOffscreenCanvas
