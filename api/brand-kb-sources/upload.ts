import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import { authenticateRequest } from '../_shared/auth'
import { sniffFileType, type AllowedType } from '../_shared/file-type-sniff'
import { verifyIdempotency, IdempotencyHttpError } from '../_shared/idempotency'

// Cluster 05 PRD §5.1.3 — POST /api/brand-kb-sources/upload.
//
// Parallels brand-fonts upload: bucket = brand-kb-sources, 10 MB cap, MIME set
// pdf/plain/markdown, NO license check, NO Realtime emit (KB sources are inert
// until the extraction worker — deferred — runs).

export const config = { runtime: 'nodejs' as const, maxDuration: 30 } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const MAX_BYTES = 10 * 1024 * 1024
const MAX_FILE_NAME = 255
const ENDPOINT = 'brand_kb_sources.upload'
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5
const BRAND_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// brand_kb_sources.mime_type CHECK: application/pdf | text/plain | text/markdown.
// PDFs have a magic number; plain text + markdown do not (`magicless`).
const ALLOWED_KB: readonly AllowedType[] = [
  {
    mime: 'application/pdf',
    extensions: ['pdf'],
    contentTypes: ['application/pdf', 'application/octet-stream'],
  },
  {
    mime: 'text/plain',
    extensions: ['txt'],
    contentTypes: ['text/plain', 'application/octet-stream'],
    magicless: true,
  },
  {
    mime: 'text/markdown',
    extensions: ['md', 'markdown'],
    contentTypes: ['text/markdown', 'text/plain', 'text/x-markdown', 'application/octet-stream'],
    magicless: true,
  },
]

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function extOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  if (dot < 0 || dot === fileName.length - 1) return 'bin'
  return fileName.slice(dot + 1).toLowerCase()
}

function loadAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function bumpRateLimit(admin: SupabaseClient, userId: string): Promise<number> {
  const now = Date.now()
  const windowStart = new Date(now - (now % RATE_LIMIT_WINDOW_MS)).toISOString()
  const { data, error } = await admin.rpc('bump_rate_limit', {
    p_user_id: userId,
    p_endpoint: ENDPOINT,
    p_window_start: windowStart,
  })
  if (error) {
    console.error('[brand-kb-sources/upload] bump_rate_limit failed (fail-open):', error)
    return 0
  }
  return data as number
}

interface ParsedForm {
  brandId: string
  fileName: string
  file: File
}

function parseForm(formData: FormData): ParsedForm | { error: string } {
  const brandId = formData.get('brand_id')
  const fileNameField = formData.get('file_name')
  const file = formData.get('file')

  if (typeof brandId !== 'string' || !BRAND_ID_RE.test(brandId)) {
    return { error: 'brand_id' }
  }
  if (!(file instanceof File)) return { error: 'file' }
  // file_name is a documented field; fall back to the Blob's own name.
  const rawName = typeof fileNameField === 'string' && fileNameField.trim() !== ''
    ? fileNameField.trim()
    : file.name
  if (rawName === '' || rawName.length > MAX_FILE_NAME) return { error: 'file_name' }

  return { brandId, fileName: rawName, file }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) {
    return jsonResponse(401, { error: 'unauthenticated' })
  }
  const { userId } = authResult

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return jsonResponse(400, { error: 'invalid_request', details: 'expected_multipart' })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return jsonResponse(400, { error: 'invalid_request', details: 'invalid_form_data' })
  }

  const parsed = parseForm(formData)
  if ('error' in parsed) {
    return jsonResponse(400, { error: 'invalid_request', details: parsed.error })
  }

  const admin = loadAdmin()
  if (admin === null) {
    return jsonResponse(500, { error: 'internal_error', request_id: crypto.randomUUID() })
  }

  const { data: ownedBrand } = await admin
    .from('brands')
    .select('id')
    .eq('id', parsed.brandId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!ownedBrand) return jsonResponse(403, { error: 'forbidden' })

  // Idempotency BEFORE rate-limit so a replay returns the cached response
  // instead of burning quota (code-review MED-4).
  let idem
  try {
    idem = await verifyIdempotency(admin, req, userId, ENDPOINT)
  } catch (err) {
    if (err instanceof IdempotencyHttpError) {
      return jsonResponse(err.status, err.payload)
    }
    throw err
  }
  if (idem.cached) {
    return new Response(JSON.stringify(idem.body), { status: idem.status, headers: JSON_HEADERS })
  }

  const count = await bumpRateLimit(admin, userId)
  if (count > RATE_LIMIT_MAX) {
    return jsonResponse(429, { error: 'rate_limited', retry_after_seconds: 60 })
  }

  if (parsed.file.size > MAX_BYTES) {
    return jsonResponse(413, { error: 'file_too_large' })
  }

  const bytes = new Uint8Array(await parsed.file.arrayBuffer())

  const sniff = await sniffFileType(bytes, parsed.fileName, parsed.file.type, ALLOWED_KB)
  if (!sniff.ok) return jsonResponse(415, { error: 'unsupported_mime' })

  const sourceId = crypto.randomUUID()
  const ext = extOf(parsed.fileName)
  const filePath = `${parsed.brandId}/${sourceId}.${ext}`
  const { error: uploadErr } = await admin.storage.from('brand-kb-sources').upload(filePath, bytes, {
    contentType: sniff.mime,
    upsert: false,
  })
  if (uploadErr) {
    return jsonResponse(500, { error: 'internal_error', request_id: crypto.randomUUID() })
  }

  const { error: insertErr } = await admin.from('brand_kb_sources').insert({
    id: sourceId,
    brand_id: parsed.brandId,
    file_name: parsed.fileName,
    file_path: filePath,
    file_size_bytes: bytes.byteLength,
    mime_type: sniff.mime,
    uploaded_by: userId,
  })
  if (insertErr) {
    await admin.storage.from('brand-kb-sources').remove([filePath])
    return jsonResponse(500, { error: 'internal_error', request_id: crypto.randomUUID() })
  }

  const body = {
    source_id: sourceId,
    file_path: filePath,
    file_name: parsed.fileName,
    mime_type: sniff.mime,
    file_size_bytes: bytes.byteLength,
  }
  await idem.persist(200, body)
  return jsonResponse(200, body)
}
