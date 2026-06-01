import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

// Cluster 05 PRD §5.1.1 — unit tests for POST /api/brand-fonts/upload.
// Mocks auth, the admin Supabase client, idempotency + file-type sniff so we
// exercise every documented status code with no live network/DB.

const OWNER_USER_ID = '11111111-1111-1111-1111-111111111111'
const BRAND_ID = '33333333-3333-3333-3333-333333333333'

const authState = { mode: 'owner' as 'owner' | 'unauthorized' }

mock.module('../../../../api/_shared/auth', () => ({
  authenticateRequest: async () => {
    if (authState.mode === 'owner') return { userId: OWNER_USER_ID }
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })
  },
}))

// Use the REAL file-type-sniff helper with crafted magic bytes (do NOT mock the
// module — it is imported directly by tests/unit/api/_shared/file-type-sniff.test.ts
// and mock.module is process-global in bun).
const WOFF2_MAGIC = [0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00] // 'wOF2'
const NON_FONT_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] // PNG

const idemState = { mode: 'fresh' as 'fresh' | 'cached' | 'conflict' }
const persistCalls: Array<{ status: number; body: unknown }> = []
mock.module('../../../../api/_shared/idempotency', () => ({
  verifyIdempotency: async () => {
    if (idemState.mode === 'conflict') {
      const { IdempotencyHttpError } = await import('../../../../api/_shared/idempotency')
      throw new IdempotencyHttpError(422, { error: 'idempotency_key_reused_with_different_body' })
    }
    if (idemState.mode === 'cached') {
      return { cached: true, status: 200, body: { font_id: 'cached', file_path: 'p', family_name: 'F' } }
    }
    return { cached: false, persist: async (status: number, body: unknown) => { persistCalls.push({ status, body }) } }
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
  insertError: { code?: string } | null
  uploadError: { message: string } | null
  storageRemoveCalls: string[][]
}

const db: DbState = {
  brandOwner: OWNER_USER_ID,
  rateCount: 1,
  insertError: null,
  uploadError: null,
  storageRemoveCalls: [],
}

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'brands') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () =>
                  db.brandOwner === OWNER_USER_ID
                    ? { data: { id: BRAND_ID }, error: null }
                    : { data: null, error: null },
              }),
            }),
          }),
        }
      }
      if (table === 'brand_fonts') {
        return {
          insert: () => ({
            select: () => ({
              maybeSingle: async () =>
                db.insertError ? { data: null, error: db.insertError } : { data: { id: 'x' }, error: null },
            }),
          }),
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: { id: 'existing-id' }, error: null }) }),
            }),
          }),
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
    channel: () => ({ send: async () => ({}) }),
    removeChannel: async () => ({}),
  }),
}))

const handler = (await import('../../../../api/brand-fonts/upload')).default

interface FileSpec { name: string; type: string; size: number; magic?: number[] }

function multipart(fields: Record<string, string>, file?: FileSpec, headers: Record<string, string> = {}): Request {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.set(k, v)
  if (file) {
    const bytes = new Uint8Array(file.size)
    const magic = file.magic ?? WOFF2_MAGIC
    bytes.set(magic.slice(0, file.size))
    form.set('file', new File([bytes], file.name, { type: file.type }))
  }
  return new Request('http://x/api/brand-fonts/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer t', ...headers },
    body: form,
  })
}

const validFile: FileSpec = { name: 'brand.woff2', type: 'font/woff2', size: 1024, magic: WOFF2_MAGIC }
const validFields = { brand_id: BRAND_ID, family_name: 'Brand Sans', license_attested: 'true' }

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
})

beforeEach(() => {
  authState.mode = 'owner'
  idemState.mode = 'fresh'
  persistCalls.length = 0
  db.brandOwner = OWNER_USER_ID
  db.rateCount = 1
  db.insertError = null
  db.uploadError = null
  db.storageRemoveCalls = []
})

afterEach(() => {})

describe('POST /api/brand-fonts/upload', () => {
  it('200 happy path returns font_id + file_path + family_name', async () => {
    const res = await handler(multipart(validFields, validFile))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.family_name).toBe('Brand Sans')
    expect(body.file_path).toContain(`${BRAND_ID}/`)
    expect(body.file_path).toContain('.woff2')
    expect(body.font_id).toBeTruthy()
    expect(persistCalls).toHaveLength(1)
  })

  it('405 on non-POST', async () => {
    const res = await handler(new Request('http://x/api/brand-fonts/upload', { method: 'GET' }))
    expect(res.status).toBe(405)
  })

  it('401 when unauthenticated', async () => {
    authState.mode = 'unauthorized'
    const res = await handler(multipart(validFields, validFile))
    expect(res.status).toBe(401)
  })

  it('400 when not multipart', async () => {
    const res = await handler(new Request('http://x/api/brand-fonts/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
      body: '{}',
    }))
    expect(res.status).toBe(400)
  })

  it('400 on missing brand_id', async () => {
    const res = await handler(multipart({ family_name: 'F', license_attested: 'true' }, validFile))
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
    const body = await res.json()
    expect(body.error).toBe('rate_limited')
    expect(body.retry_after_seconds).toBe(60)
  })

  it('413 when file too large', async () => {
    const res = await handler(multipart(validFields, { name: 'big.woff2', type: 'font/woff2', size: 6 * 1024 * 1024 }))
    expect(res.status).toBe(413)
  })

  it('415 when file-type sniff disagrees (polyglot: PNG magic in .woff2)', async () => {
    const res = await handler(multipart(validFields, { name: 'brand.woff2', type: 'font/woff2', size: 1024, magic: NON_FONT_MAGIC }))
    expect(res.status).toBe(415)
    expect((await res.json()).error).toBe('unsupported_mime')
  })

  it('422 when license not attested', async () => {
    const res = await handler(multipart({ ...validFields, license_attested: 'false' }, validFile))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('license_not_attested')
  })

  it('409 on duplicate family + rolls back storage object', async () => {
    db.insertError = { code: '23505' }
    const res = await handler(multipart(validFields, validFile))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('duplicate_family')
    expect(body.existing_font_id).toBe('existing-id')
    expect(db.storageRemoveCalls.length).toBe(1)
  })

  it('500 on storage upload failure', async () => {
    db.uploadError = { message: 'boom' }
    const res = await handler(multipart(validFields, validFile))
    expect(res.status).toBe(500)
  })

  it('500 on unexpected insert error + rolls back storage', async () => {
    db.insertError = { code: '53300' }
    const res = await handler(multipart(validFields, validFile))
    expect(res.status).toBe(500)
    expect(db.storageRemoveCalls.length).toBe(1)
  })

  it('422 on idempotency-key body conflict', async () => {
    idemState.mode = 'conflict'
    const res = await handler(multipart(validFields, validFile, { 'X-Idempotency-Key': '0123456789abcdef0123' }))
    expect(res.status).toBe(422)
  })

  it('replays cached response on idempotency hit', async () => {
    idemState.mode = 'cached'
    const res = await handler(multipart(validFields, validFile, { 'X-Idempotency-Key': '0123456789abcdef0123' }))
    expect(res.status).toBe(200)
    expect((await res.json()).font_id).toBe('cached')
  })

  it('cached replay returns 200 even when over rate quota — idempotency is checked first (MED-4)', async () => {
    idemState.mode = 'cached'
    db.rateCount = 6 // would 429 if rate-limit ran before the idempotency check
    const res = await handler(multipart(validFields, validFile, { 'X-Idempotency-Key': '0123456789abcdef0123' }))
    expect(res.status).toBe(200)
    expect((await res.json()).font_id).toBe('cached')
  })

  it('200 response carries server-sniffed mime_type + file_size_bytes (MED-2)', async () => {
    const res = await handler(multipart(validFields, validFile, { 'X-Idempotency-Key': '0123456789abcdef0123' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mime_type).toBe('font/woff2')
    expect(typeof body.file_size_bytes).toBe('number')
  })
})
