// PRD 04 §5.1.2 — POST /api/stripe/portal-session.
//
// Returns a Stripe Customer Portal session URL. Founder lock: opened in a
// NEW TAB (Stripe blocks iframe embed per docs.stripe.com/customer-management
// /integrate-customer-portal, verified 2026-05-15). Caller redirects with
// window.open(url, '_blank').

import { createClient } from '@supabase/supabase-js'

import { authenticateRequest } from '../_shared/auth'
import { getStripeClient } from '../_shared/stripe-client'

export const config = { runtime: 'edge' as const } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: JSON_HEADERS })
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonError(405, 'Method not allowed')

  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) return authResult
  const { userId } = authResult

  let body: { return_url?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'invalid_json')
  }
  if (!isValidUrl(body.return_url)) return jsonError(400, 'return_url_required')

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl === undefined || supabaseUrl === '' || serviceRoleKey === undefined || serviceRoleKey === '') {
    return jsonError(500, 'Server configuration error')
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: user, error } = await admin
    .from('users')
    .select('id, stripe_customer_id')
    .eq('id', userId)
    .maybeSingle()
  if (error || user === null) return jsonError(404, 'user_not_found')

  const customerId = user.stripe_customer_id as string | null
  if (customerId === null || customerId === '') {
    return jsonError(409, 'no_active_subscription')
  }

  const stripe = getStripeClient()
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: body.return_url,
  })

  return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: JSON_HEADERS })
}
