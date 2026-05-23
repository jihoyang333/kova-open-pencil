// PRD 04 §5.1.6 — POST /api/account/avatar-upload.
//
// Server-side avatar upload + normalize.
//   - Accepts multipart/form-data with field "file" (PNG or JPG per founder lock D-1)
//   - Max 5 MB (founder lock D-20)
//   - sharp normalize: resize 256x256 cover + convert to PNG (D-16)
//   - Service-role upload to media-assets bucket at path `{user_id}/avatar.png`
//   - Persists users.avatar_storage_path
//
// Single endpoint replaces Plan 4.1+4.2's signed-URL pattern. Rationale:
// the upstream M4 storage RLS expects first folder = auth.uid(), not a
// `users/` prefix; the server-side pipeline also runs sharp before any
// bytes hit the bucket so a malicious payload never lands in storage.

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

import { authenticateRequest } from '../_shared/auth'
import { writeAudit } from '../_shared/audit'

export const config = { runtime: 'nodejs' as const, maxDuration: 30 } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const MAX_BYTES = 5 * 1024 * 1024
const AVATAR_SIZE = 256

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) return authResult
  const { userId } = authResult

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return jsonResponse(415, { error: 'expected_multipart' })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return jsonResponse(400, { error: 'invalid_form_data' })
  }
  const file = formData.get('file')
  if (!(file instanceof Blob)) return jsonResponse(400, { error: 'file_required' })

  if (file.size > MAX_BYTES) return jsonResponse(413, { error: 'file_too_large' })

  const inputBytes = new Uint8Array(await file.arrayBuffer())

  // Validate format via magic bytes (sharp.metadata) — file.type and filename
  // can be spoofed; sharp inspects actual bytes. PNG/JPG only per founder D-1.
  let normalized: Buffer
  try {
    const meta = await sharp(inputBytes).metadata()
    const format = meta.format ?? ''
    if (format !== 'png' && format !== 'jpeg' && format !== 'jpg') {
      return jsonResponse(415, { error: 'unsupported_image_format', detected: format || 'unknown', allowed: ['png', 'jpeg'] })
    }
    normalized = await sharp(inputBytes)
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
      .png({ compressionLevel: 9 })
      .toBuffer()
  } catch {
    return jsonResponse(415, { error: 'invalid_image' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl === undefined || supabaseUrl === '' || serviceRoleKey === undefined || serviceRoleKey === '') {
    return jsonResponse(500, { error: 'server_misconfigured' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const path = `${userId}/avatar.png`
  const { error: uploadErr } = await admin.storage.from('media-assets').upload(path, normalized, {
    contentType: 'image/png',
    upsert: true,
  })
  if (uploadErr) return jsonResponse(500, { error: 'upload_failed', message: uploadErr.message })

  const { error: dbErr } = await admin
    .from('users')
    .update({ avatar_storage_path: path })
    .eq('id', userId)
  if (dbErr) return jsonResponse(500, { error: 'persist_failed', message: dbErr.message })

  await writeAudit(admin, {
    userId,
    eventType: 'account.avatar_uploaded',
    payload: { path, bytes_in: file.size, bytes_out: normalized.byteLength },
    clusterOwner: '04',
  })

  const { data: publicUrlData } = admin.storage.from('media-assets').getPublicUrl(path)

  return jsonResponse(200, { avatar_storage_path: path, public_url: publicUrlData.publicUrl })
}
