import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

const postWithProgressMock = mock(
  (_url: string, _form: FormData, _token: string, onProgress: (f: number) => void) => {
    onProgress(1)
    return Promise.resolve({ font_id: 'f-new', file_path: 'brand-fonts/b1/f-new.woff2', family_name: 'Brand' })
  },
)

mock.module('@/lib/xhr-upload', () => ({ postWithProgress: postWithProgressMock }))

let selectChain: unknown[] = []
const fromMock = mock(() => ({
  select: () => ({
    eq: () => ({
      order: () => Promise.resolve({ data: selectChain, error: null }),
    }),
  }),
}))
const fetchMock = mock(() => Promise.resolve({ ok: true } as Response))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
    auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'tok' } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
  },
}))

const { useBrandFontsStore } = await import('@/stores/brand-fonts')
const realFetch = globalThis.fetch
globalThis.fetch = fetchMock as unknown as typeof fetch

describe('useBrandFontsStore', () => {
  afterAll(() => {
    globalThis.fetch = realFetch
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    postWithProgressMock.mockClear()
    fetchMock.mockClear()
    selectChain = []
  })

  test('fetchFonts loads rows for the brand', async () => {
    selectChain = [{ id: 'f1', brand_id: 'b1', family_name: 'A' }]
    const store = useBrandFontsStore()
    await store.fetchFonts('b1')
    expect(store.fonts).toHaveLength(1)
    expect(store.fontsForBrand('b1')).toHaveLength(1)
    expect(store.fontsForBrand('b2')).toHaveLength(0)
  })

  test('uploadFont posts multipart, appends row, clears progress', async () => {
    const store = useBrandFontsStore()
    const file = new File([new Uint8Array(10)], 'brand.woff2', { type: 'font/woff2' })
    const font = await store.uploadFont('b1', file, 'Brand', true)
    expect(font.id).toBe('f-new')
    expect(font.license_attested).toBe(true)
    expect(store.fonts).toHaveLength(1)
    expect(postWithProgressMock).toHaveBeenCalled()
    expect(store.uploadProgress.size).toBe(0) // cleared after success
  })

  test('uploadFont records error + rethrows on failure', async () => {
    postWithProgressMock.mockImplementationOnce(() => Promise.reject(new Error('file_too_large')))
    const store = useBrandFontsStore()
    const file = new File([new Uint8Array(10)], 'big.woff2', { type: 'font/woff2' })
    await expect(store.uploadFont('b1', file, 'Big', true)).rejects.toThrow('file_too_large')
    expect(store.uploadErrors.get('Big:big.woff2')).toBe('file_too_large')
    expect(store.fonts).toHaveLength(0)
  })

  test('deleteFont calls DELETE endpoint + removes locally', async () => {
    const store = useBrandFontsStore()
    store.fonts = [{ id: 'f1', brand_id: 'b1' }] as never
    await store.deleteFont('f1')
    expect(fetchMock).toHaveBeenCalledWith('/api/brand-fonts/f1', expect.objectContaining({ method: 'DELETE' }))
    expect(store.fonts).toHaveLength(0)
  })

  test('deleteFont throws on non-ok response', async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 403 } as Response))
    const store = useBrandFontsStore()
    store.fonts = [{ id: 'f1', brand_id: 'b1' }] as never
    await expect(store.deleteFont('f1')).rejects.toThrow('http_403')
    expect(store.fonts).toHaveLength(1) // not removed on failure
  })
})
