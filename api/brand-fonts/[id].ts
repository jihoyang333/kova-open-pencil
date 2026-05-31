import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import { authenticateRequest } from '../_shared/auth'

// Cluster 05 PRD §5.1.2 — DELETE /api/brand-fonts/:id.
//
// Algorithm:
//   1. Verify JWT.
//   2. SELECT brand_id, file_path; ensure brand owned by user.
//   3. storage.remove([file_path]) — not-found counts as success.
//   4. DELETE row.
//   5. Realtime emit brand:{brand_id}:fonts font_removed.

export const config = { runtime: 'nodejs' as const } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const FONT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function loadAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function fontIdFromUrl(req: Request): string | null {
  try {
    const segments = new URL(req.url).pathname.split('/').filter((s) => s.length > 0)
    const last = segments[segments.length - 1]
    if (last && FONT_ID_RE.test(last)) return last
    return null
  } catch {
    return null
  }
}

async function emitFontRemoved(
  admin: SupabaseClient,
  brandId: string,
  fontId: string
): Promise<void> {
  try {
    const channel = admin.channel(`brand:${brandId}:fonts`)
    await channel.send({
      type: 'broadcast',
      event: 'font_removed',
      payload: { event: 'font_removed', font_id: fontId },
    })
    await admin.removeChannel(channel)
  } catch (err) {
    console.error('[brand-fonts/delete] realtime emit failed (best-effort):', err)
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'DELETE') return jsonResponse(405, { error: 'method_not_allowed' })

  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) {
    return jsonResponse(401, { error: 'unauthenticated' })
  }
  const { userId } = authResult

  const fontId = fontIdFromUrl(req)
  if (fontId === null) return jsonResponse(400, { error: 'invalid_request' })

  const admin = loadAdmin()
  if (admin === null) {
    return jsonResponse(500, { error: 'internal_error', request_id: crypto.randomUUID() })
  }

  // 2. Load row + ownership join.
  const { data: row } = await admin
    .from('brand_fonts')
    .select('id, brand_id, file_path, brands!inner(user_id)')
    .eq('id', fontId)
    .maybeSingle()
  const fontRow = row as
    | { id: string; brand_id: string; file_path: string; brands: { user_id: string } }
    | null

  if (!fontRow) return jsonResponse(404, { error: 'not_found' })
  if (fontRow.brands.user_id !== userId) return jsonResponse(403, { error: 'forbidden' })

  // 3. Remove storage object (not-found is success).
  await admin.storage.from('brand-fonts').remove([fontRow.file_path])

  // 4. Delete row.
  const { error: deleteErr } = await admin.from('brand_fonts').delete().eq('id', fontId)
  if (deleteErr) {
    return jsonResponse(500, { error: 'internal_error', request_id: crypto.randomUUID() })
  }

  // 5. Realtime emit.
  await emitFontRemoved(admin, fontRow.brand_id, fontId)

  return jsonResponse(200, { success: true })
}
