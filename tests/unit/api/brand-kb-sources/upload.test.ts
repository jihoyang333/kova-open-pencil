import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

// Cluster 05 PRD §5.1.3 — unit tests for POST /api/brand-kb-sources/upload.

const OWNER_USER_ID = '11111111-1111-1111-1111-111111111111'
const BRAND_ID = '33333333-3333-3333-3333-333333333333'

const authState = { mode: 'owner' as 'owner' | 'unauthorized' }

mock.module('../../../../api/_shared/auth', () => ({
  authenticateRequest: async () => {
    if (authState.mode === 'owner') return { userId: OWNER_USER_ID }
    return new Response(JSON.stringify({ error: 'auth' }), { status: 401 })
  },
}))

// Use the REAL file-type-sniff helper with crafted magic bytes (do NOT mock the
// module — it is imported directly elsewhere and mock.module is process-global).
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34] // '%PDF-1.4'
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

const idemState = { mode: 'fresh' as 'fresh' | 'cached' }
mock.module('../../../../api/_shared/idempotency', () => ({
  verifyIdempotency: async () => {
    if (idemState.mode === 'cached') {
      return { cached: true, status: 200, body: { source_id: 'cached', file_path: 'p', file_name: 'n' } }
    }
    return { cached: false, persist: async () => {} }
  },
  IdempotencyHttpError: class extends Error {
    constructor(public readonly status: number, public readonly payload: { error: string }) {
      super(payload.error)
    }
  },
}))

interface DbState {
  brandOwner: string | null
  rateCount: number
  insertError: { message: string } | null
  uploadError: { message: string } | null
  storageRemoveCalls: string[][]
}

const db: DbState = { brandOwner: OWNER_USER_ID, rateCount: 1, insertError: null, uploadError: null, storageRemoveCalls: [] }

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'brands') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () =>
                  db.brandOwner === OWNER_USER_ID ? { data: { id: BRAND_ID }, error: null } : { data: null, error: null },
              }),
            }),
          }),
        }
      }
      if (table === 'brand_kb_sources') {
        return {
          insert: async () => (db.insertError ? { error: db.insertError } : { error: null }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
    rpc: async () => ({ data: db.rateCount, error: null }),
    storage: {
      from: () => ({
        upload: async () => (db.uploadError ? { error: db.uploadError } : { error: null }),
        remove: async (paths: string[]) => {
          db.storageRemoveCalls.push(paths)
          return { error: null }
        },
      }),
    },
  }),
}))

const handler = (await import('../../../../api/brand-kb-sources/upload')).default

interface FileSpec { name: string; type: string; size: number; magic?: number[] }

function multipart(fields: Record<string, string>, file?: FileSpec, headers: Record<string, string> = {}): Request {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.set(k, v)
  if (file) {
    const bytes = new Uint8Array(file.size)
    const magic = file.magic ?? PDF_MAGIC
    bytes.set(magic.slice(0, file.size))
    form.set('file', new File([bytes], file.name, { type: file.type }))
  }
  return new Request('http://x/api/brand-kb-sources/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer t', ...headers },
    body: form,
  })
}

const validFile: FileSpec = { name: 'brand.pdf', type: 'application/pdf', size: 2048, magic: PDF_MAGIC }
const validFields = { brand_id: BRAND_ID, file_name: 'brand.pdf' }

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
})

beforeEach(() => {
  authState.mode = 'owner'
  idemState.mode = 'fresh'
  db.brandOwner = OWNER_USER_ID
  db.rateCount = 1
  db.insertError = null
  db.uploadError = null
  db.storageRemoveCalls = []
})

describe('POST /api/brand-kb-sources/upload', () => {
  it('200 happy path returns source_id + file_path + file_name', async () => {
    const res = await handler(multipart(validFields, validFile))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.file_name).toBe('brand.pdf')
    expect(body.file_path).toContain(`${BRAND_ID}/`)
    expect(body.file_path).toContain('.pdf')
    expect(body.source_id).toBeTruthy()
  })

  it('405 on non-POST', async () => {
    const res = await handler(new Request('http://x/api/brand-kb-sources/upload', { method: 'GET' }))
    expect(res.status).toBe(405)
  })

  it('401 when unauthenticated', async () => {
    authState.mode = 'unauthorized'
    const res = await handler(multipart(validFields, validFile))
    expect(res.status).toBe(401)
  })

  it('400 when not multipart', async () => {
    const res = await handler(new Request('http://x/api/brand-kb-sources/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
      body: '{}',
    }))
    expect(res.status).toBe(400)
  })

  it('400 on missing file', async () => {
    const res = await handler(multipart(validFields))
    expect(res.status).toBe(400)
  })

  it('403 when brand not owned', async () => {
    db.brandOwner = null
    const res = await handler(multipart(validFields, validFile))
    expect(res.status).toBe(403)
  })

  it('429 when rate limit exceeded', async () => {
    db.rateCount = 6
    const res = await handler(multipart(validFields, validFile))
    expect(res.status).toBe(429)
  })

  it('413 when file too large', async () => {
    const res = await handler(multipart(validFields, { name: 'big.pdf', type: 'application/pdf', size: 11 * 1024 * 1024 }))
    expect(res.status).toBe(413)
  })

  it('415 when sniff disagrees (PNG magic in .pdf)', async () => {
    const res = await handler(multipart(validFields, { name: 'brand.pdf', type: 'application/pdf', size: 2048, magic: PNG_MAGIC }))
    expect(res.status).toBe(415)
  })

  it('500 on upload failure', async () => {
    db.uploadError = { message: 'boom' }
    const res = await handler(multipart(validFields, validFile))
    expect(res.status).toBe(500)
  })

  it('500 on insert failure + rolls back storage', async () => {
    db.insertError = { message: 'boom' }
    const res = await handler(multipart(validFields, validFile))
    expect(res.status).toBe(500)
    expect(db.storageRemoveCalls.length).toBe(1)
  })

  it('replays cached response on idempotency hit', async () => {
    idemState.mode = 'cached'
    const res = await handler(multipart(validFields, validFile, { 'X-Idempotency-Key': '0123456789abcdef0123' }))
    expect(res.status).toBe(200)
    expect((await res.json()).source_id).toBe('cached')
  })
})
