import { describe, expect, test, beforeAll } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Cluster 02 T03 — static-source contract for Bearer-only auth on Shopify
// OAuth start endpoint + removal of the URL access_token fallback in the
// shared authenticateRequest helper.
//
// PRD 02 §5.4.1 launch-blocker: token must NOT appear in URL query, history,
// referer headers, or server access logs.

const ROOT = join(import.meta.dir, '../../..')
const OAUTH_START = join(ROOT, 'api/shopify/oauth/start.ts')
const SHARED_AUTH = join(ROOT, 'api/_shared/auth.ts')
const STORE_TYPE = join(ROOT, 'src/components/onboarding/StoreTypeStep.vue')
const SHOPIFY_HOOK = join(ROOT, 'src/composables/use-shopify-connection.ts')

let oauthStart: string
let sharedAuth: string
let storeType: string
let shopifyHook: string

beforeAll(() => {
  oauthStart = readFileSync(OAUTH_START, 'utf-8')
  sharedAuth = readFileSync(SHARED_AUTH, 'utf-8')
  storeType = readFileSync(STORE_TYPE, 'utf-8')
  shopifyHook = readFileSync(SHOPIFY_HOOK, 'utf-8')
})

describe('api/shopify/oauth/start — Bearer-only POST contract', () => {
  test('rejects non-POST methods', () => {
    expect(oauthStart).toMatch(/req\.method\s*!==\s*['"]POST['"]/)
  })

  test('returns JSON {redirectUrl}, never a 302 redirect carrying the token', () => {
    expect(oauthStart).toMatch(/redirectUrl/)
    expect(oauthStart).not.toMatch(/Response\.redirect/)
  })

  test('reads shop + brand_id from JSON body, not URL search params', () => {
    expect(oauthStart).not.toMatch(/url\.searchParams\.get\(['"]shop['"]\)/)
    expect(oauthStart).not.toMatch(/url\.searchParams\.get\(['"]brand_id['"]\)/)
    expect(oauthStart).toMatch(/await\s+req\.json\(\)/)
  })
})

describe('api/_shared/auth — URL access_token fallback removed', () => {
  test('does not read access_token from URL search params', () => {
    expect(sharedAuth).not.toMatch(/searchParams\.get\(['"]access_token['"]\)/)
  })

  test('only accepts Authorization Bearer header', () => {
    expect(sharedAuth).toMatch(/Authorization/)
    expect(sharedAuth).toMatch(/Bearer/)
  })
})

describe('clients — no access_token in URL query', () => {
  test('StoreTypeStep handleConnect uses Bearer header POST', () => {
    expect(storeType).not.toMatch(/access_token:\s*token/)
    expect(storeType).toMatch(/Authorization:\s*`Bearer/)
    expect(storeType).toMatch(/method:\s*['"]POST['"]/)
  })

  test('use-shopify-connection openOAuthPopup uses Bearer header POST', () => {
    expect(shopifyHook).not.toMatch(/access_token:\s*token/)
    expect(shopifyHook).toMatch(/Authorization:\s*`Bearer\s+\$\{token\}`/)
  })
})
