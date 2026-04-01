import { createClient } from '@supabase/supabase-js'
import { authenticateRequest } from '../../_shared/auth'

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const MAX_BODY_SIZE = 4 * 1024 * 1024 // 4MB
const DAILY_GENERATION_LIMIT = 200
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

function secondsUntilMidnightUTC(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setUTCDate(midnight.getUTCDate() + 1)
  midnight.setUTCHours(0, 0, 0, 0)
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000)
}

interface UserData {
  generations_used: number | null
  generations_reset_at: string | null
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: JSON_HEADERS }
    )
  }

  // 1. Authenticate
  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) return authResult
  const { userId } = authResult

  // 2. Body size validation via content-length header (fast path)
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return new Response(
      JSON.stringify({ error: 'Message too large. Try attaching fewer images.' }),
      { status: 413, headers: JSON_HEADERS }
    )
  }

  // Read body once and check actual size
  const bodyText = await req.text()
  if (bodyText.length > MAX_BODY_SIZE) {
    return new Response(
      JSON.stringify({ error: 'Message too large. Try attaching fewer images.' }),
      { status: 413, headers: JSON_HEADERS }
    )
  }

  // 3. Rate limiting
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[ai-proxy] Missing Supabase environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('generations_used, generations_reset_at')
    .eq('id', userId)
    .single()

  if (userError || !userData) {
    return new Response(
      JSON.stringify({ error: 'User not found' }),
      { status: 404, headers: JSON_HEADERS }
    )
  }

  const typedUserData = userData as UserData
  const today = new Date().toISOString().slice(0, 10)
  const resetDate = typedUserData.generations_reset_at
    ? new Date(typedUserData.generations_reset_at).toISOString().slice(0, 10)
    : null

  let generationsUsed = typedUserData.generations_used ?? 0

  if (resetDate && resetDate < today) {
    generationsUsed = 0
    await supabase
      .from('users')
      .update({ generations_used: 0, generations_reset_at: new Date().toISOString() })
      .eq('id', userId)
  }

  if (generationsUsed >= DAILY_GENERATION_LIMIT) {
    return new Response(
      JSON.stringify({
        error: 'Daily limit reached. Your limit resets at midnight UTC.',
        retry_after: secondsUntilMidnightUTC(),
      }),
      { status: 429, headers: JSON_HEADERS }
    )
  }

  // 4. Forward to Anthropic
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    console.error('[ai-proxy] Missing ANTHROPIC_API_KEY')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  try {
    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: bodyText,
    })

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text()
      console.error('[ai-proxy] Anthropic error:', anthropicResponse.status, errorBody)
      return new Response(
        JSON.stringify({ error: 'AI service error. Please try again.' }),
        { status: 502, headers: JSON_HEADERS }
      )
    }

    // 5. Increment usage (non-blocking — fire and forget)
    void supabase
      .from('users')
      .update({
        generations_used: generationsUsed + 1,
        generations_reset_at: new Date().toISOString(),
      })
      .eq('id', userId)

    // 6. Stream SSE response back to client
    return new Response(anthropicResponse.body, {
      status: 200,
      headers: {
        'Content-Type': anthropicResponse.headers.get('content-type') ?? 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: unknown) {
    console.error('[ai-proxy] Fetch error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to connect to AI service.' }),
      { status: 502, headers: JSON_HEADERS }
    )
  }
}
