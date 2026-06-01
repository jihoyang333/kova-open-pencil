import { beforeEach, describe, expect, mock, test } from 'bun:test'

const uploadMock = mock(() => Promise.resolve({ error: null }))
const getPublicUrlMock = mock(() => ({ data: { publicUrl: 'https://cdn/brand-logos/u1/b1-logo.png' } }))

mock.module('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({ upload: uploadMock, getPublicUrl: getPublicUrlMock }),
    },
  },
}))

let userId: string | null = 'u1'
mock.module('@/stores/auth', () => ({ useAuthStore: () => ({ user: userId ? { id: userId } : null }) }))

const updateBrandMock = mock(() => Promise.resolve())
mock.module('@/stores/brands', () => ({ useBrandsStore: () => ({ updateBrand: updateBrandMock }) }))

const { useLogoUpload } = await import('@/composables/brand-kit/use-logo-upload')

function pngFile(size = 1024): File {
  return new File([new Uint8Array(size)], 'logo.png', { type: 'image/png' })
}

describe('useLogoUpload', () => {
  beforeEach(() => {
    userId = 'u1'
    uploadMock.mockClear()
    getPublicUrlMock.mockClear()
    updateBrandMock.mockClear()
    uploadMock.mockImplementation(() => Promise.resolve({ error: null }))
  })

  test('uploads to brand-logos and persists logo_url via updateBrand', async () => {
    const { upload, error } = useLogoUpload()
    const url = await upload('b1', pngFile())
    expect(uploadMock).toHaveBeenCalled()
    // RLS requires the first path segment to equal the user id.
    expect((uploadMock.mock.calls[0] as unknown[])[0] as string).toStartWith('u1/')
    expect(updateBrandMock).toHaveBeenCalledWith('b1', { logo_url: url })
    expect(error.value).toBeNull()
  })

  test('rejects an unsupported image type', async () => {
    const { upload, error } = useLogoUpload()
    const gif = new File([new Uint8Array(10)], 'a.gif', { type: 'image/gif' })
    await expect(upload('b1', gif)).rejects.toThrow('unsupported_type')
    expect(uploadMock).not.toHaveBeenCalled()
    expect(error.value).toContain('Unsupported')
  })

  test('rejects a file over 2 MB', async () => {
    const { upload, error } = useLogoUpload()
    await expect(upload('b1', pngFile(2 * 1024 * 1024 + 1))).rejects.toThrow('file_too_large')
    expect(error.value).toContain('too large')
  })

  test('throws when unauthenticated', async () => {
    userId = null
    const { upload } = useLogoUpload()
    await expect(upload('b1', pngFile())).rejects.toThrow('unauthenticated')
  })

  test('surfaces a storage failure', async () => {
    uploadMock.mockImplementation(() => Promise.resolve({ error: { message: 'boom' } }))
    const { upload, error } = useLogoUpload()
    await expect(upload('b1', pngFile())).rejects.toBeDefined()
    expect(error.value).toBeDefined()
    expect(updateBrandMock).not.toHaveBeenCalled()
  })
})
