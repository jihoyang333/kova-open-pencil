/**
 * price-map server util — PRD 04 §5.1.1 / Plan Task 2.3.
 *
 * Maps server-only env vars (STRIPE_PRICE_ID_SOLO / STRIPE_PRICE_ID_AGENCY)
 * to plan names + back. Whitelist gate for the checkout-session endpoint.
 */
import { describe, it, expect, beforeEach } from 'bun:test'

describe('price-map', () => {
  let mod: typeof import('../../../../api/_shared/price-map')

  beforeEach(async () => {
    delete process.env.STRIPE_PRICE_ID_SOLO
    delete process.env.STRIPE_PRICE_ID_AGENCY
    mod = await import('../../../../api/_shared/price-map')
  })

  it('priceIdToPlan returns "solo" for STRIPE_PRICE_ID_SOLO match', () => {
    process.env.STRIPE_PRICE_ID_SOLO = 'price_test_solo'
    expect(mod.priceIdToPlan('price_test_solo')).toBe('solo')
  })

  it('priceIdToPlan returns "agency" for STRIPE_PRICE_ID_AGENCY match', () => {
    process.env.STRIPE_PRICE_ID_AGENCY = 'price_test_agency'
    expect(mod.priceIdToPlan('price_test_agency')).toBe('agency')
  })

  it('priceIdToPlan returns null for unknown', () => {
    expect(mod.priceIdToPlan('price_bogus')).toBeNull()
  })

  it('isKnownPriceId returns false for unknown', () => {
    expect(mod.isKnownPriceId('price_bogus')).toBe(false)
  })

  it('isKnownPriceId returns true for configured solo', () => {
    process.env.STRIPE_PRICE_ID_SOLO = 'price_test_solo'
    expect(mod.isKnownPriceId('price_test_solo')).toBe(true)
  })

  it('planToPriceId returns env-configured ID', () => {
    process.env.STRIPE_PRICE_ID_AGENCY = 'price_test_agency'
    expect(mod.planToPriceId('agency')).toBe('price_test_agency')
  })

  it('planToPriceId returns null when env unset', () => {
    expect(mod.planToPriceId('solo')).toBeNull()
  })

  it('getAllowedPriceIds returns only configured ids (C-LOW04.7)', () => {
    process.env.STRIPE_PRICE_ID_SOLO = 'price_test_solo'
    expect(mod.getAllowedPriceIds()).toEqual(['price_test_solo'])
    process.env.STRIPE_PRICE_ID_AGENCY = 'price_test_agency'
    expect(mod.getAllowedPriceIds()).toEqual(['price_test_solo', 'price_test_agency'])
  })
})
