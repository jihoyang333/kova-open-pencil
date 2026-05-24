// PRD 04 §5.1.1 — POST /api/stripe/checkout-session.
//
// Creates a Stripe Checkout session for a logged-in user. Auto-creates the
// Stripe Customer on first call (one customer per user). Whitelists
// price_id against STRIPE_PRICE_ID_<plan> env vars (C-LOW04.7) so the
// client cannot forge an arbitrary price.

import { createClient } from '@supabase/supabase-js'

import { authenticateRequest } from '../_shared/auth'
import { isKnownPriceId } from '../_shared/price-map'
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

  let body: { price_id?: unknown; success_url?: unknown; cancel_url?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'invalid_json')
  }

  const { price_id, success_url, cancel_url } = body
  if (typeof price_id !== 'string' || price_id === '') return jsonError(400, 'price_id_required')
  if (!isValidUrl(success_url)) return jsonError(400, 'success_url_required')
  if (!isValidUrl(cancel_url)) return jsonError(400, 'cancel_url_required')

  if (!isKnownPriceId(price_id)) return jsonError(422, 'invalid_price')

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl === undefined || supabaseUrl === '' || serviceRoleKey === undefined || serviceRoleKey === '') {
    return jsonError(500, 'Server configuration error')
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: user, error: userErr } = await admin
    .from('users')
    .select('id, stripe_customer_id')
    .eq('id', userId)
    .maybeSingle()
  if (userErr || user === null) return jsonError(404, 'user_not_found')

  const stripe = getStripeClient()

  let customerId = user.stripe_customer_id as string | null
  if (customerId === null || customerId === '') {
    const created = await stripe.customers.create({ metadata: { user_id: userId } })
    customerId = created.id
    const { error: updateErr } = await admin
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId)
    if (updateErr) return jsonError(500, 'persist_customer_failed')
  }

  const idempotencyKey = req.headers.get('x-idempotency-key') ?? `co-${userId}-${Date.now()}`

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: price_id, quantity: 1 }],
      success_url,
      cancel_url,
      allow_promotion_codes: true,
      subscription_data: { metadata: { user_id: userId } },
    },
    { idempotencyKey }
  )

  return new Response(JSON.stringify({ url: session.url, id: session.id }), {
    status: 200,
    headers: JSON_HEADERS,
  })
}
