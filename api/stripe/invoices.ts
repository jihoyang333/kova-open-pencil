// PRD 04 §5.1.4 — GET /api/stripe/invoices.
//
// Proxy to stripe.invoices.list for the authenticated user's Stripe customer.
// Returns up to 12 most recent invoices for the billing-history table.

import { createClient } from '@supabase/supabase-js'

import { authenticateRequest } from '../_shared/auth'
import { getStripeClient } from '../_shared/stripe-client'

export const config = { runtime: 'edge' as const } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const MAX_INVOICES = 12

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: JSON_HEADERS })
}

interface InvoiceListItem {
  id: string
  created_iso: string
  description: string | null
  amount_paid_cents: number
  currency: string
  status: string
  hosted_invoice_url: string | null
  invoice_pdf: string | null
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return jsonError(405, 'Method not allowed')

  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) return authResult
  const { userId } = authResult

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
    return new Response(JSON.stringify({ invoices: [] satisfies InvoiceListItem[] }), {
      status: 200, headers: JSON_HEADERS,
    })
  }

  const stripe = getStripeClient()
  const list = await stripe.invoices.list({ customer: customerId, limit: MAX_INVOICES })

  // Filter out invoices with no id — Stripe shouldn't emit them but if it does
  // an empty-string id collides in Vue's :key loop. Belt-and-braces (L-4).
  const invoices: InvoiceListItem[] = list.data.flatMap(inv => {
    if (typeof inv.id !== 'string' || inv.id === '') return []
    return [{
      id: inv.id,
      created_iso: new Date(inv.created * 1000).toISOString(),
      description: inv.description,
      amount_paid_cents: inv.amount_paid,
      currency: inv.currency,
      status: inv.status ?? 'open',
      hosted_invoice_url: inv.hosted_invoice_url,
      invoice_pdf: inv.invoice_pdf,
    }]
  })

  return new Response(JSON.stringify({ invoices }), { status: 200, headers: JSON_HEADERS })
}
