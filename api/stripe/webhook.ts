// PRD 04 §5.1.3 — POST /api/stripe/webhook.
//
// Signature-verified Stripe webhook dispatcher.
//   1. Raw body reader (req.text()) — Stripe HMAC over the raw bytes
//      (B-CRIT12 lock — never parse JSON before verifying signature)
//   2. stripe.webhooks.constructEvent → HMAC-SHA256 + 5-min timestamp
//      tolerance + replay protection
//   3. Idempotency log: INSERT into stripe_webhook_events keyed on event.id.
//      PK conflict (23505) means duplicate — skip handler, return 200
//   4. Per-event dispatch to api/stripe/webhook-handlers/*
//   5. Update outcome row based on handler result
//   6. Return 200 ack to Stripe always when signature is valid; handler
//      errors return 500 so Stripe retries with backoff (idempotency-safe
//      per founder lock D-14 2026-05-17)

import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import { getStripeClient } from '../_shared/stripe-client'

import { handleCheckoutCompleted } from './webhook-handlers/handle-checkout-completed'
import { handleInvoicePaid } from './webhook-handlers/handle-invoice-paid'
import { handleInvoicePaymentFailed } from './webhook-handlers/handle-invoice-payment-failed'
import { handleSubscriptionCreated } from './webhook-handlers/handle-subscription-created'
import { handleSubscriptionDeleted } from './webhook-handlers/handle-subscription-deleted'
import { handleSubscriptionUpdated } from './webhook-handlers/handle-subscription-updated'

export const config = { runtime: 'edge' as const } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

const DISPATCH_TABLE = {
  'checkout.session.completed': handleCheckoutCompleted,
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'invoice.paid': handleInvoicePaid,
  'invoice.payment_failed': handleInvoicePaymentFailed,
} as const

type DispatchedType = keyof typeof DISPATCH_TABLE

function isDispatchedType(type: string): type is DispatchedType {
  return type in DISPATCH_TABLE
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('')
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  const signature = req.headers.get('stripe-signature')
  if (signature === null || signature === '') {
    return jsonResponse(400, { error: 'missing_signature' })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (webhookSecret === undefined || webhookSecret === '') {
    return jsonResponse(500, { error: 'webhook_secret_not_configured' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl === undefined || supabaseUrl === '' || serviceRoleKey === undefined || serviceRoleKey === '') {
    return jsonResponse(500, { error: 'server_misconfigured' })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: unknown) {
    return jsonResponse(400, { error: 'invalid_signature', message: err instanceof Error ? err.message : 'verify_failed' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const payloadHash = await sha256Hex(rawBody)
  const initialOutcome = isDispatchedType(event.type) ? 'processed' : 'unhandled_type'

  const { error: insertErr } = await admin.from('stripe_webhook_events').insert({
    event_id: event.id,
    type: event.type,
    payload_hash: payloadHash,
    outcome: initialOutcome,
  })

  if (insertErr) {
    const code = (insertErr as { code?: string }).code
    if (code === '23505') {
      return jsonResponse(200, { received: true, duplicate: true, event_id: event.id })
    }
    return jsonResponse(500, { error: 'idempotency_log_failed' })
  }

  if (!isDispatchedType(event.type)) {
    return jsonResponse(200, { received: true, outcome: 'unhandled_type', event_id: event.id })
  }

  let result: Awaited<ReturnType<typeof handleInvoicePaid>>
  try {
    result = await DISPATCH_TABLE[event.type](event, admin)
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'unknown_handler_error'
    try {
      await admin.from('stripe_webhook_events').update({
        outcome: 'error',
        error_message: errorMessage,
      }).eq('event_id', event.id)
    } catch (updateErr: unknown) {
      console.error(
        `[stripe/webhook] failed to record handler-error outcome for ${event.id}: ${updateErr instanceof Error ? updateErr.message : 'unknown'}`,
        { eventId: event.id, eventType: event.type, originalError: errorMessage }
      )
    }
    return jsonResponse(500, { error: 'handler_error' })
  }

  try {
    const { error: outcomeErr } = await admin.from('stripe_webhook_events').update({
      outcome: result.outcome,
      error_message: result.error ?? null,
      user_id: result.user_id ?? null,
    }).eq('event_id', event.id)
    if (outcomeErr) {
      console.error(
        `[stripe/webhook] outcome update failed for ${event.id} (${outcomeErr.code}): ${outcomeErr.message}`,
        { eventId: event.id, eventType: event.type, attemptedOutcome: result.outcome }
      )
    }
  } catch (updateErr: unknown) {
    console.error(
      `[stripe/webhook] outcome update threw for ${event.id}: ${updateErr instanceof Error ? updateErr.message : 'unknown'}`,
      { eventId: event.id, eventType: event.type, attemptedOutcome: result.outcome }
    )
  }

  return jsonResponse(200, { received: true, outcome: result.outcome, event_id: event.id })
}
