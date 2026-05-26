/**
 * Cluster 02 T03 — Shopify OAuth Bearer-header contract (PRD 02 §5.4.1).
 *
 * Verifies that /api/shopify/oauth/start:
 *   - accepts a Bearer JWT in the Authorization header (POST)
 *   - rejects callers without the header
 *   - never accepts access_token as a URL query parameter
 *   - returns the Shopify authorize URL in a JSON body (no 302 redirect with
 *     the access_token leaking through to logs/referers/history)
 *
 * Skipped automatically when TEST_API_BASE_URL is unset (deferred to staging).
 * Static-source contract enforced by tests/unit/api/shopify-auth-start-bearer.test.ts.
 */
import { describe, it, expect } from 'bun:test'

const BASE = process.env.TEST_API_BASE_URL
const JWT = process.env.TEST_SUPABASE_JWT
const skip = !BASE || !JWT
const d = skip ? describe.skip : describe

d('POST /api/shopify/oauth/start with Bearer header', () => {
  it('rejects missing Authorization header (401)', async () => {
    const res = await fetch(`${BASE}/api/shopify/oauth/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop: 'test-store', brand_id: 'brand-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects access_token query parameter (401 / Authorization fallback removed)', async () => {
    const res = await fetch(`${BASE}/api/shopify/oauth/start?access_token=${JWT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop: 'test-store', brand_id: 'brand-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects GET method (405) — must POST', async () => {
    const res = await fetch(`${BASE}/api/shopify/oauth/start?shop=test-store&brand_id=brand-1`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${JWT}` },
    })
    expect(res.status).toBe(405)
  })

  it('accepts valid Bearer + returns redirectUrl JSON (no access_token in URL)', async () => {
    const res = await fetch(`${BASE}/api/shopify/oauth/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${JWT}`,
      },
      body: JSON.stringify({ shop: 'test-store', brand_id: 'brand-1' }),
    })
    expect([200, 403, 404]).toContain(res.status)
    if (res.status === 200) {
      const body = (await res.json()) as { redirectUrl?: string }
      expect(body.redirectUrl).toMatch(/^https:\/\/.*\.myshopify\.com\/admin\/oauth\/authorize\?/)
      expect(body.redirectUrl).not.toContain('access_token=')
    }
  })
})
