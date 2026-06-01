import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import { authenticateRequest } from '../_shared/auth'
import { sniffFileType, type AllowedType } from '../_shared/file-type-sniff'
import { verifyIdempotency, IdempotencyHttpError } from '../_shared/idempotency'

// Cluster 05 PRD §5.1.1 — POST /api/brand-fonts/upload.
//
// Multipart font upload → Supabase Storage → brand_fonts row. Mirrors the
// account/avatar-upload pipeline (server-side bytes-before-storage validation)
// plus the Cluster 11 rate-limit + idempotency cross-cuts.
//
// Algorithm (per spec):
//   1. Verify JWT → user_id.
//   2. Brand-ownership check.
//   3. Rate-limit (bump_rate_limit RPC, bucket 'brand_fonts.upload', 5/min).
//   4. Idempotency (X-Idempotency-Key — optional).
//   5. file-type sniff (magic + extension + Content-Type all agree).
//   6. license_attested === 'true'.
//   7..9. Generate font_id, upload bytes to brand-fonts/{brand_id}/{font_id}.{ext}.
//   10. INSERT brand_fonts; unique (brand_id, family_name) → delete object + 409.
//   11. postgres_changes delivers the INSERT to subscribed clients (no broadcast).
//   12. 200 { font_id, file_path, family_name, mime_type, file_size_bytes }.

export const config = { runtime: 'nodejs' as const, maxDuration: 30 } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const MAX_BYTES = 5 * 1024 * 1024
const MAX_FAMILY_NAME = 64
const ENDPOINT = 'brand_fonts.upload'
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5
const BRAND_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// brand_fonts.mime_type CHECK: font/woff2 | font/ttf | font/otf.
// file-type reports ext woff2/ttf/otf; browsers send a grab-bag of headers.
const ALLOWED_FONTS: readonly AllowedType[] = [
  {
    mime: 'font/woff2',
    extensions: ['woff2'],
    contentTypes: ['font/woff2', 'application/font-woff2', 'application/octet-stream'],
  },
  {
    mime: 'font/ttf',
    extensions: ['ttf'],
    contentTypes: ['font/ttf', 'font/sfnt', 'application/x-font-ttf', 'application/octet-stream'],
  },
  {
    mime: 'font/otf',
    extensions: ['otf'],
    contentTypes: ['font/otf', 'font/sfnt', 'application/x-font-otf', 'application/octet-stream'],
  },
]

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function extOf(mime: string): string {
  return mime.split('/')[1]
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
    // Fail-open — a rate-limit table outage must not 500 the user.
    console.error('[brand-fonts/upload] bump_rate_limit failed (fail-open):', error)
    return 0
  }
  return data as number
}

interface ParsedForm {
  brandId: string
  familyName: string
  licenseAttested: string
  file: File
}

function parseForm(formData: FormData): ParsedForm | { error: string } {
  const brandId = formData.get('brand_id')
  const familyName = formData.get('family_name')
  const licenseAttested = formData.get('license_attested')
  const file = formData.get('file')

  if (typeof brandId !== 'string' || !BRAND_ID_RE.test(brandId)) {
    return { error: 'brand_id' }
  }
  if (typeof familyName !== 'string' || familyName.trim() === '' || familyName.length > MAX_FAMILY_NAME) {
    return { error: 'family_name' }
  }
  if (typeof licenseAttested !== 'string') return { error: 'license_attested' }
  if (!(file instanceof File)) return { error: 'file' }

  return { brandId, familyName: familyName.trim(), licenseAttested, file }
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

  // 2. Brand-ownership.
  const { data: ownedBrand } = await admin
    .from('brands')
    .select('id')
    .eq('id', parsed.brandId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!ownedBrand) return jsonResponse(403, { error: 'forbidden' })

  // 3. Idempotency — check the cache BEFORE bumping the rate limit so a
  // replayed request returns the cached response instead of burning quota
  // (code-review MED-4).
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

  // 4. Rate-limit — only after a cache miss, so replays never burn quota.
  const count = await bumpRateLimit(admin, userId)
  if (count > RATE_LIMIT_MAX) {
    return jsonResponse(429, { error: 'rate_limited', retry_after_seconds: 60 })
  }

  // 413 before reading bytes into memory beyond the cap.
  if (parsed.file.size > MAX_BYTES) {
    return jsonResponse(413, { error: 'file_too_large' })
  }

  const bytes = new Uint8Array(await parsed.file.arrayBuffer())

  // 5. MIME magic-number sniff (all three signals must agree).
  const sniff = await sniffFileType(bytes, parsed.file.name, parsed.file.type, ALLOWED_FONTS)
  if (!sniff.ok) return jsonResponse(415, { error: 'unsupported_mime' })

  // 6. License attestation.
  if (parsed.licenseAttested !== 'true') {
    return jsonResponse(422, { error: 'license_not_attested' })
  }

  // 7..9. Upload bytes (service-role).
  const fontId = crypto.randomUUID()
  const ext = extOf(sniff.mime)
  const filePath = `${parsed.brandId}/${fontId}.${ext}`
  const { error: uploadErr } = await admin.storage.from('brand-fonts').upload(filePath, bytes, {
    contentType: sniff.mime,
    upsert: false,
  })
  if (uploadErr) {
    return jsonResponse(500, { error: 'internal_error', request_id: crypto.randomUUID() })
  }

  // 10. INSERT row.
  const { data: inserted, error: insertErr } = await admin
    .from('brand_fonts')
    .insert({
      id: fontId,
      brand_id: parsed.brandId,
      family_name: parsed.familyName,
      file_path: filePath,
      file_size_bytes: bytes.byteLength,
      mime_type: sniff.mime,
      license_attested: true,
      uploaded_by: userId,
    })
    .select('id')
    .maybeSingle()

  if (insertErr) {
    // Roll back the orphaned storage object regardless of cause.
    await admin.storage.from('brand-fonts').remove([filePath])
    // 23505 = unique_violation → (brand_id, family_name) collision.
    if (insertErr.code === '23505') {
      const { data: existing } = await admin
        .from('brand_fonts')
        .select('id')
        .eq('brand_id', parsed.brandId)
        .eq('family_name', parsed.familyName)
        .maybeSingle()
      const existingId = (existing as { id: string } | null)?.id ?? null
      return jsonResponse(409, { error: 'duplicate_family', existing_font_id: existingId })
    }
    return jsonResponse(500, { error: 'internal_error', request_id: crypto.randomUUID() })
  }
  void inserted

  // 11. Realtime: the INSERT above is delivered to subscribed clients via
  // `postgres_changes` (brand_fonts is in the `supabase_realtime` publication —
  // see migration). No server-side broadcast: the client store subscribes to
  // postgres_changes, not broadcast, so an explicit emit would be dead code
  // (code-review MED-3).
  const body = {
    font_id: fontId,
    file_path: filePath,
    family_name: parsed.familyName,
    mime_type: sniff.mime,
    file_size_bytes: bytes.byteLength,
  }
  await idem.persist(200, body)
  return jsonResponse(200, body)
}
