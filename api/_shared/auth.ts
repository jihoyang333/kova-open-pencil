import { createClient } from '@supabase/supabase-js'

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Returns the authenticated user ID on success, or a 401 Response on failure.
 */
export async function authenticateRequest(
  req: Request
): Promise<{ userId: string } | Response> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.error('[auth] Missing env: VITE_SUPABASE_URL')
    return new Response(
      JSON.stringify({ error: 'Missing VITE_SUPABASE_URL' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  if (!serviceRoleKey) {
    console.error('[auth] Missing env: SUPABASE_SERVICE_ROLE_KEY')
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: JSON_HEADERS }
    )
  }

  const token = authHeader.slice(7)
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 401, headers: JSON_HEADERS }
    )
  }

  return { userId: data.user.id }
}
