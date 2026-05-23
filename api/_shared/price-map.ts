// PRD 04 §5.1.1 / Plan Task 2.3 — server-only price-map.
//
// Whitelist gate for the checkout-session endpoint (C-LOW04.7): the client
// posts a price_id, the server confirms it matches STRIPE_PRICE_ID_<plan>,
// rejects any others with 422. No hardcoded price IDs.

export type PlanName = 'free' | 'solo' | 'agency'
export type PaidPlanName = Exclude<PlanName, 'free'>

function planEnvKey(plan: PaidPlanName): string {
  return `STRIPE_PRICE_ID_${plan.toUpperCase()}`
}

export function planToPriceId(plan: PaidPlanName): string | null {
  const value = process.env[planEnvKey(plan)]
  return value === undefined || value === '' ? null : value
}

export function priceIdToPlan(priceId: string): PlanName | null {
  if (priceId !== '' && priceId === process.env.STRIPE_PRICE_ID_SOLO) return 'solo'
  if (priceId !== '' && priceId === process.env.STRIPE_PRICE_ID_AGENCY) return 'agency'
  return null
}

export function isKnownPriceId(priceId: string): boolean {
  return priceIdToPlan(priceId) !== null
}

export function getAllowedPriceIds(): readonly string[] {
  const solo = process.env.STRIPE_PRICE_ID_SOLO
  const agency = process.env.STRIPE_PRICE_ID_AGENCY
  return [solo, agency].filter((id): id is string => typeof id === 'string' && id !== '')
}
