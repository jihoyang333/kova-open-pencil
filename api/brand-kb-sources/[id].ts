import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import { authenticateRequest } from '../_shared/auth'

// Cluster 05 PRD §5.1.4 — DELETE /api/brand-kb-sources/:id.
// Parallels DELETE /api/brand-fonts/:id: removes Storage object + DB row.
// No Realtime emit (KB sources are inert).

export const config = { runtime: 'nodejs' as const } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const SOURCE_ID_RE =
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

function sourceIdFromUrl(req: Request): string | null {
  try {
    const segments = new URL(req.url).pathname.split('/').filter((s) => s.length > 0)
    const last = segments[segments.length - 1]
    if (last && SOURCE_ID_RE.test(last)) return last
    return null
  } catch {
    return null
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'DELETE') return jsonResponse(405, { error: 'method_not_allowed' })

  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) {
    return jsonResponse(401, { error: 'unauthenticated' })
  }
  const { userId } = authResult

  const sourceId = sourceIdFromUrl(req)
  if (sourceId === null) return jsonResponse(400, { error: 'invalid_request' })

  const admin = loadAdmin()
  if (admin === null) {
    return jsonResponse(500, { error: 'internal_error', request_id: crypto.randomUUID() })
  }

  const { data: row } = await admin
    .from('brand_kb_sources')
    .select('id, brand_id, file_path, brands!inner(user_id)')
    .eq('id', sourceId)
    .maybeSingle()
  const sourceRow = row as
    | { id: string; brand_id: string; file_path: string; brands: { user_id: string } }
    | null

  if (!sourceRow) return jsonResponse(404, { error: 'not_found' })
  if (sourceRow.brands.user_id !== userId) return jsonResponse(403, { error: 'forbidden' })

  await admin.storage.from('brand-kb-sources').remove([sourceRow.file_path])

  const { error: deleteErr } = await admin.from('brand_kb_sources').delete().eq('id', sourceId)
  if (deleteErr) {
    return jsonResponse(500, { error: 'internal_error', request_id: crypto.randomUUID() })
  }

  return jsonResponse(200, { success: true })
}
