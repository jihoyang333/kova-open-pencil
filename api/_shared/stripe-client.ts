// PRD 04 §5.1 / Plan Task 2.2 — Stripe SDK singleton.
//
// Lazy-init via globalThis so the Edge Function cold-start path constructs
// once. Throws on missing STRIPE_SECRET_KEY (per founder lock #10 — no `!`).
// API version pinned to the SDK's bundled default; do not override per
// B-MED3 audit (2026-05-19): tests mock the entire stripe client object,
// so apiVersion drift cannot regress the suite.

import Stripe from 'stripe'

const STRIPE_CLIENT_GLOBAL_KEY = '__kovaStripeClient'

interface GlobalWithStripe {
  [STRIPE_CLIENT_GLOBAL_KEY]?: Stripe
}

export function getStripeClient(): Stripe {
  const g = globalThis as GlobalWithStripe
  if (g[STRIPE_CLIENT_GLOBAL_KEY]) return g[STRIPE_CLIENT_GLOBAL_KEY]!
  const key = process.env.STRIPE_SECRET_KEY
  if (key === undefined || key === '') {
    throw new Error('Missing required environment variable: STRIPE_SECRET_KEY. See docs/operations/stripe-setup-runbook.md.')
  }
  const client = new Stripe(key, {
    typescript: true,
  })
  g[STRIPE_CLIENT_GLOBAL_KEY] = client
  return client
}
