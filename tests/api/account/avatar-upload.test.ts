/**
 * POST /api/account/avatar-upload — PRD 04 §5.1.6.
 *
 * Server-side avatar upload + sharp normalize. PNG/JPG only, 5MB max.
 */
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const USER_ID = '44444444-4444-4444-4444-444444444444'

const authState = { mode: 'owner' as 'owner' | 'unauthorized' }

mock.module('../../../api/_shared/auth', () => ({
  authenticateRequest: async () => {
    if (authState.mode === 'owner') return { userId: USER_ID }
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })
  },
}))

mock.module('../../../api/_shared/audit', () => ({
  writeAudit: mock(async () => undefined),
}))

const sharpState = {
  invalidImage: false,
  detectedFormat: 'png' as string,
}

mock.module('sharp', () => ({
  default: (_input: Uint8Array) => {
    if (sharpState.invalidImage) throw new Error('not an image')
    return {
      async metadata() { return { format: sharpState.detectedFormat } },
      rotate() { return this },
      resize() { return this },
      png() { return this },
      async toBuffer() { return Buffer.from('normalized-png-bytes') },
    }
  },
}))

const storageState = {
  uploads: [] as Array<{ path: string; bytes: number }>,
  uploadError: null as null | { message: string },
  publicUrl: 'https://t.local/storage/v1/object/public/media-assets/avatar.png',
}

const dbState = {
  updates: [] as Array<Record<string, unknown>>,
  dbError: null as null | { message: string },
}

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: async (path: string, bytes: Uint8Array | Buffer) => {
          if (storageState.uploadError) return { error: storageState.uploadError }
          storageState.uploads.push({ path, bytes: bytes.byteLength })
          return { error: null }
        },
        getPublicUrl: () => ({ data: { publicUrl: storageState.publicUrl } }),
      }),
    },
    from: () => ({
      update: (row: Record<string, unknown>) => ({
        eq: async () => {
          if (dbState.dbError) return { error: dbState.dbError }
          dbState.updates.push(row)
          return { error: null }
        },
      }),
    }),
  }),
}))

const { default: handler } = await import('../../../api/account/avatar-upload')

function makeFormReq(file: Blob | null, contentType = 'multipart/form-data; boundary=test'): Request {
  const fd = new FormData()
  if (file !== null) fd.append('file', file, 'avatar.png')
  return new Request('http://l/api/account/avatar-upload', {
    method: 'POST',
    body: fd,
    headers: contentType === 'multipart/form-data; boundary=test' ? {} : { 'content-type': contentType },
  })
}

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'https://t.local'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv'
})

beforeEach(() => {
  authState.mode = 'owner'
  sharpState.invalidImage = false
  sharpState.detectedFormat = 'png'
  storageState.uploads = []
  storageState.uploadError = null
  dbState.updates = []
  dbState.dbError = null
})

describe('POST /api/account/avatar-upload', () => {
  it('returns 401 without auth', async () => {
    authState.mode = 'unauthorized'
    const res = await handler(makeFormReq(new Blob(['x'], { type: 'image/png' })))
    expect(res.status).toBe(401)
  })

  it('returns 405 on non-POST', async () => {
    const res = await handler(new Request('http://l/api/account/avatar-upload', { method: 'GET' }))
    expect(res.status).toBe(405)
  })

  it('returns 415 when content-type is not multipart', async () => {
    const res = await handler(new Request('http://l/api/account/avatar-upload', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    }))
    expect(res.status).toBe(415)
  })

  it('returns 415 when sharp detects unsupported format (gif/webp/etc.)', async () => {
    sharpState.detectedFormat = 'gif'
    const res = await handler(makeFormReq(new Blob(['x'], { type: 'image/gif' })))
    expect(res.status).toBe(415)
    const body = await res.json() as { error: string; detected: string }
    expect(body.error).toBe('unsupported_image_format')
    expect(body.detected).toBe('gif')
  })

  it('returns 413 when file exceeds 5 MB', async () => {
    const big = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' })
    const res = await handler(makeFormReq(big))
    expect(res.status).toBe(413)
  })

  it('returns 415 when sharp rejects the bytes (not an image)', async () => {
    sharpState.invalidImage = true
    const res = await handler(makeFormReq(new Blob(['not-an-image'], { type: 'image/png' })))
    expect(res.status).toBe(415)
  })

  it('returns 200 + path + public_url on happy path', async () => {
    const res = await handler(makeFormReq(new Blob([new Uint8Array(100)], { type: 'image/jpeg' })))
    expect(res.status).toBe(200)
    const body = await res.json() as { avatar_storage_path: string; public_url: string }
    expect(body.avatar_storage_path).toBe(`${USER_ID}/avatar.png`)
    expect(storageState.uploads).toHaveLength(1)
    expect(storageState.uploads[0].path).toBe(`${USER_ID}/avatar.png`)
    expect(dbState.updates[0]).toEqual({ avatar_storage_path: `${USER_ID}/avatar.png` })
  })
})
