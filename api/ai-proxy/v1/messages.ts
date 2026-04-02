import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authenticateRequest } from '../../_shared/auth'

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const MAX_BODY_BYTES = 4 * 1024 * 1024 // 4MB
const DAILY_GENERATION_LIMIT = 200
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

function secondsUntilMidnightUTC(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setUTCDate(midnight.getUTCDate() + 1)
  midnight.setUTCHours(0, 0, 0, 0)
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000)
}

// Module-scope lazy singleton — reused across warm Vercel invocations
let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase environment variables')

  _supabase = createClient(url, key)
  return _supabase
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: JSON_HEADERS }
    )
  }

  // 1. Authenticate (validates Supabase env vars internally)
  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) return authResult
  const { userId } = authResult

  // 2. Body size validation — content-length fast path, then actual byte length
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return new Response(
      JSON.stringify({ error: 'Message too large. Try attaching fewer images.' }),
      { status: 413, headers: JSON_HEADERS }
    )
  }

  const bodyText = await req.text()
  const bodyByteLength = new TextEncoder().encode(bodyText).byteLength
  if (bodyByteLength > MAX_BODY_BYTES) {
    return new Response(
      JSON.stringify({ error: 'Message too large. Try attaching fewer images.' }),
      { status: 413, headers: JSON_HEADERS }
    )
  }

  // 3. Atomic rate limiting — reserves a slot or rejects
  let supabase: SupabaseClient
  try {
    supabase = getSupabase()
  } catch {
    console.error('[ai-proxy] Missing Supabase environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  const { data: rateResult, error: rateError } = await supabase.rpc(
    'try_increment_generation',
    { p_user_id: userId, p_daily_limit: DAILY_GENERATION_LIMIT }
  )

  if (rateError) {
    console.error('[ai-proxy] Rate limit RPC error:', rateError.message)
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  const row = Array.isArray(rateResult) ? rateResult[0] : rateResult
  if (!row?.allowed) {
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

    // 5. Stream SSE response back to client
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
