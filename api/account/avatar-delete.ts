// PRD 04 §5.1.6 — DELETE /api/account/avatar-delete.
//
// Removes the user's avatar from storage + clears users.avatar_storage_path.
// Idempotent: missing avatar returns 200.

import { createClient } from '@supabase/supabase-js'

import { authenticateRequest } from '../_shared/auth'
import { writeAudit } from '../_shared/audit'

export const config = { runtime: 'edge' as const } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return jsonResponse(405, { error: 'method_not_allowed' })
  }

  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) return authResult
  const { userId } = authResult

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl === undefined || supabaseUrl === '' || serviceRoleKey === undefined || serviceRoleKey === '') {
    return jsonResponse(500, { error: 'server_misconfigured' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const path = `${userId}/avatar.png`
  await admin.storage.from('media-assets').remove([path])
  await admin.from('users').update({ avatar_storage_path: null }).eq('id', userId)

  await writeAudit(admin, {
    userId,
    eventType: 'account.avatar_deleted',
    payload: { path },
    clusterOwner: '04',
  })

  return jsonResponse(200, { ok: true })
}
