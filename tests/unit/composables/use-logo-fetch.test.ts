import { describe, test, expect, beforeEach, mock, afterEach } from 'bun:test'
import { ref, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import * as vueuse from '@vueuse/core'

// Stub @vueuse/core's debounce so search commits synchronously and the
// composable doesn't wait on wall-clock timers (B-MED7 — same approach
// taken by Plan T10). Static import preserves other re-exports for the
// composable under test.
mock.module('@vueuse/core', () => ({
  ...vueuse,
  useDebounceFn: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'user-test' } }),
}))

const uploadCalls: Array<{ path: string; file: File }> = []
mock.module('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (path: string, file: File) => {
          uploadCalls.push({ path, file })
          return Promise.resolve({ error: null })
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://example.supabase.co/storage/brand-logos/${path}` },
        }),
      }),
    },
  },
}))

const { useLogoFetch } = await import('@/composables/use-logo-fetch')

const originalImage = globalThis.Image

beforeEach(() => {
  setActivePinia(createPinia())
  uploadCalls.length = 0
  class MockImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_v: string) { queueMicrotask(() => this.onload?.()) }
  }
  ;(globalThis as { Image: typeof MockImage }).Image = MockImage
})

afterEach(() => {
  ;(globalThis as { Image: typeof originalImage }).Image = originalImage
})

describe('useLogoFetch', () => {
  test('debounce-stubbed: setting url triggers favicon fetch', async () => {
    const url = ref('')
    const { logoUrl } = useLogoFetch(url)
    url.value = 'nike.com'
    await nextTick()
    // queueMicrotask in MockImage.set src needs another tick
    await new Promise((r) => setTimeout(r, 0))
    expect(logoUrl.value).toMatch(/nike\.com\/favicon\.ico$/)
  })

  test('empty url clears logoUrl', async () => {
    const url = ref('nike.com')
    const { logoUrl } = useLogoFetch(url)
    url.value = ''
    await nextTick()
    expect(logoUrl.value).toBeNull()
  })

  test('manualOverride uploads file and replaces logoUrl', async () => {
    const url = ref('')
    const { logoUrl, manualOverride } = useLogoFetch(url)
    const file = new File(['x'], 'logo.png', { type: 'image/png' })
    await manualOverride(file)
    expect(uploadCalls).toHaveLength(1)
    expect(logoUrl.value).toMatch(/brand-logos\/user-test\//)
  })
})
