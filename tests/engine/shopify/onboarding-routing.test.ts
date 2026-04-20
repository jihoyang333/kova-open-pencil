import { describe, expect, test } from 'bun:test'
import { resolveGuard, getOnboardingNextRoute } from '../../../src/router'
import { normalizeShopDomain } from '../../../src/lib/shop-domain'

const STORE_TYPE_META = {
  requiresAuth: true,
  requiresOnboarding: false,
  onboardingOnly: true,
}

describe('/onboarding/store-type route guard', () => {
  const route = { meta: STORE_TYPE_META, path: '/onboarding/store-type' }

  test('redirects unauthenticated user to /login', () => {
    const result = resolveGuard(route, { isAuthenticated: false, isOnboarded: false })
    expect(result).toBe('/login')
  })

  test('allows authenticated, non-onboarded user through', () => {
    const result = resolveGuard(route, { isAuthenticated: true, isOnboarded: false })
    expect(result).toBe(true)
  })

  test('redirects already-onboarded user to /dashboard', () => {
    const result = resolveGuard(route, { isAuthenticated: true, isOnboarded: true })
    expect(result).toBe('/dashboard')
  })
})

describe('Shopify OAuth URL construction', () => {
  function buildOAuthUrl(rawShop: string, brandId: string): string | null {
    const shop = normalizeShopDomain(rawShop)
    if (!shop) return null
    const params = new URLSearchParams({ shop, brand_id: brandId })
    return `/api/shopify/oauth/start?${params.toString()}`
  }

  test('builds correct OAuth URL for a valid shop domain', () => {
    const url = buildOAuthUrl('mystore.myshopify.com', 'brand-123')
    expect(url).toBe('/api/shopify/oauth/start?shop=mystore.myshopify.com&brand_id=brand-123')
  })

  test('normalizes https:// scheme before building URL', () => {
    const url = buildOAuthUrl('https://mystore.myshopify.com', 'brand-123')
    expect(url).toBe('/api/shopify/oauth/start?shop=mystore.myshopify.com&brand_id=brand-123')
  })

  test('normalizes uppercase input before building URL', () => {
    const url = buildOAuthUrl('MYSTORE.myshopify.com', 'brand-123')
    expect(url).toBe('/api/shopify/oauth/start?shop=mystore.myshopify.com&brand_id=brand-123')
  })

  test('returns null for invalid shop domain', () => {
    expect(buildOAuthUrl('not-a-shopify-domain.com', 'brand-123')).toBeNull()
    expect(buildOAuthUrl('', 'brand-123')).toBeNull()
    expect(buildOAuthUrl('mystore.shopify.com', 'brand-123')).toBeNull()
  })

  test('strips trailing path from URL before building OAuth URL', () => {
    const url = buildOAuthUrl('mystore.myshopify.com/admin', 'brand-123')
    expect(url).toBe('/api/shopify/oauth/start?shop=mystore.myshopify.com&brand_id=brand-123')
  })
})

describe('onboarding step-to-route mapping', () => {
  test('brand-name step (3) exits to /onboarding/store-type', () => {
    expect(getOnboardingNextRoute(3)).toBe('/onboarding/store-type')
  })

  test('all other steps stay in-flow and return null', () => {
    for (const step of [1, 2, 4, 5, 6]) {
      expect(getOnboardingNextRoute(step)).toBeNull()
    }
  })
})
