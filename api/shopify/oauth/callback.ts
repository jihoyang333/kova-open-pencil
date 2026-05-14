import { createClient } from '@supabase/supabase-js'

import {
  normalizeShopDomain,
  SHOPIFY_API_VERSION,
} from '../../_shared/shopify-client'
import { logShopifyError } from '../../_shared/shopify-error'

export const config = { runtime: 'edge' as const } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

const WEBHOOK_TOPICS = [
  'products/create',
  'products/update',
  'products/delete',
  'collections/create',
  'collections/update',
  'collections/delete',
  'inventory_levels/update',
  'discounts/create',
  'discounts/update',
  'discounts/delete',
  'shop/update',
  'bulk_operations/finish',
  'app/uninstalled',
  'customers/data_request',
  'customers/redact',
  'shop/redact',
] as const

const COMPLIANCE_TOPICS = ['customers/data_request', 'customers/redact', 'shop/redact'] as const

interface OauthStateRow {
  state: string
  brand_id: string
  user_id: string
  shop: string
  expires_at: string
}

interface ShopInfo {
  id: string
  currencyCode: string
  ianaTimezone: string
  primaryDomain: { host: string }
}

function textError(status: number, message: string): Response {
  return new Response(message, { status })
}

async function exchangeCodeForToken(
  shop: string,
  code: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; scope: string } | null> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  })
  if (!res.ok) return null
  const body = (await res.json()) as { access_token?: string; scope?: string }
  if (!body.access_token || !body.scope) return null
  return { accessToken: body.access_token, scope: body.scope }
}

async function fetchShopInfo(
  shop: string,
  accessToken: string
): Promise<ShopInfo | null> {
  const res = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        ...JSON_HEADERS,
      },
      body: JSON.stringify({
        query:
          'query { shop { id currencyCode ianaTimezone primaryDomain { host } } }',
      }),
    }
  )
  if (!res.ok) return null
  const body = (await res.json()) as { data?: { shop?: ShopInfo } }
  return body.data?.shop ?? null
}

async function registerWebhooks(
  shop: string,
  accessToken: string,
  origin: string
): Promise<void> {
  const callbackBase = `${origin}/api/shopify/webhooks`

  const registerOne = (topic: string) =>
    fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`, {
      method: 'POST',
      headers: { 'X-Shopify-Access-Token': accessToken, ...JSON_HEADERS },
      body: JSON.stringify({
        webhook: { topic, address: `${callbackBase}?topic=${encodeURIComponent(topic)}`, format: 'json' },
      }),
    })

  // Compliance webhooks must succeed — Shopify Partner policy requirement
  for (const topic of COMPLIANCE_TOPICS) {
    const res = await registerOne(topic).catch(() => null)
    if (!res?.ok) throw new Error(`Failed to register compliance webhook: ${topic}`)
  }

  // Operational webhooks: best-effort
  const operational = WEBHOOK_TOPICS.filter(
    (t): boolean => !(COMPLIANCE_TOPICS as readonly string[]).includes(t),
  )
  await Promise.all(operational.map((topic) => registerOne(topic).catch(() => null)))
}

interface ServerConfig {
  supabaseUrl: string
  serviceRoleKey: string
  clientId: string
  clientSecret: string
  internalKey: string
}

function loadConfig(): ServerConfig | null {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const clientId = process.env.KOVA_SHOPIFY_CLIENT_ID
  const clientSecret = process.env.KOVA_SHOPIFY_CLIENT_SECRET
  const internalKey = process.env.KOVA_INTERNAL_KEY
  if (!supabaseUrl || !serviceRoleKey || !clientId || !clientSecret || !internalKey) return null
  return { supabaseUrl, serviceRoleKey, clientId, clientSecret, internalKey }
}

interface CallbackParams {
  state: string
  code: string
  shop: string
}

function parseParams(url: URL): CallbackParams | Response {
  const state = url.searchParams.get('state') ?? ''
  const code = url.searchParams.get('code') ?? ''
  const shopRaw = url.searchParams.get('shop') ?? ''
  if (!state || !code || !shopRaw) return textError(400, 'Missing params')
  const shop = normalizeShopDomain(shopRaw)
  if (!shop) return textError(400, 'Invalid shop')
  return { state, code, shop }
}

function makeAdmin(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

type Admin = ReturnType<typeof makeAdmin>

async function consumeOauthState(
  admin: Admin,
  state: string,
  shop: string
): Promise<OauthStateRow | null> {
  const { data } = await admin
    .from('shopify_oauth_state')
    .select('*')
    .eq('state', state)
    .maybeSingle()
  const row = data as OauthStateRow | null
  if (!row) return null
  // Always delete — prevents stale rows from lingering regardless of validity
  await admin.from('shopify_oauth_state').delete().eq('state', state)
  if (row.shop !== shop || new Date(row.expires_at).getTime() < Date.now()) return null
  return row
}

function parseShopId(gid: string): number | null {
  const shopIdStr = gid.split('/').at(-1) ?? ''
  const shopId = Number(shopIdStr)
  return Number.isFinite(shopId) && shopId > 0 ? shopId : null
}

async function persistConnection(
  admin: Admin,
  brandId: string,
  shop: string,
  shopInfo: ShopInfo,
  scope: string,
  secretId: string
): Promise<void> {
  const shopId = parseShopId(shopInfo.id)
  if (shopId === null) throw new Error('Invalid shop id from Shopify')

  await admin.from('shopify_connections').upsert(
    {
      brand_id: brandId,
      shop_domain: shop,
      shop_id: shopId,
      access_token_secret_id: secretId,
      scope,
      currency: shopInfo.currencyCode,
      timezone: shopInfo.ianaTimezone,
      primary_locale: 'en',
      status: 'active',
    },
    { onConflict: 'brand_id' }
  )
}

async function kickOffBulkSync(origin: string, brandId: string, internalKey: string): Promise<void> {
  await fetch(`${origin}/api/shopify/sync/bulk-start`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, 'X-Kova-Internal': internalKey },
    body: JSON.stringify({ brand_id: brandId }),
  }).catch(() => null)
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return textError(405, 'Method not allowed')

  const url = new URL(req.url)
  const params = parseParams(url)
  if (params instanceof Response) return params

  const config = loadConfig()
  if (!config) return textError(500, 'Server configuration error')

  const admin = makeAdmin(config.supabaseUrl, config.serviceRoleKey)

  const stateRow = await consumeOauthState(admin, params.state, params.shop)
  if (!stateRow) return textError(401, 'Invalid or expired state')

  const token = await exchangeCodeForToken(
    params.shop,
    params.code,
    config.clientId,
    config.clientSecret
  )
  if (!token) return textError(502, 'Token exchange failed')

  const { data: secretId, error: vaultError } = await admin.rpc(
    'create_shopify_vault_secret',
    { p_token: token.accessToken, p_name: `shopify_token_brand_${stateRow.brand_id}` },
  )
  if (vaultError || !secretId) return textError(502, 'Failed to vault access token')

  const shopInfo = await fetchShopInfo(params.shop, token.accessToken)
  if (!shopInfo) return textError(502, 'Failed to fetch shop metadata')

  await persistConnection(
    admin,
    stateRow.brand_id,
    params.shop,
    shopInfo,
    token.scope,
    secretId as string
  )

  // Shopify cannot reach localhost — skip webhook registration in local dev
  if (!url.origin.includes('localhost')) {
    try {
      await registerWebhooks(params.shop, token.accessToken, url.origin)
    } catch (err) {
      logShopifyError(err, { brand_id: stateRow.brand_id, shop_domain: params.shop })
      return textError(502, 'Failed to register required compliance webhooks')
    }
  }

  await kickOffBulkSync(url.origin, stateRow.brand_id, config.internalKey)

  // Notify the parent window and close the popup. We use BroadcastChannel as
  // the primary mechanism because Chrome severs window.opener when the popup
  // navigates through a cross-origin page with COOP: same-origin (Shopify's
  // OAuth page sets this), which makes the legacy postMessage path fail.
  // postMessage is kept as a best-effort fallback for browsers without
  // BroadcastChannel.
  const origin = JSON.stringify(url.origin)
  const brandIdJson = JSON.stringify(stateRow.brand_id)
  const html = `<!DOCTYPE html><html><head><title>Shopify Connected</title></head><body><script>
    (function () {
      var payload = { type: 'shopify_oauth_success', brandId: ${brandIdJson} };
      try {
        var bc = new BroadcastChannel('kova-shopify-oauth');
        bc.postMessage(payload);
        bc.close();
      } catch (e) {}
      try {
        if (window.opener) window.opener.postMessage(payload, ${origin});
      } catch (e) {}
      setTimeout(function () { window.close(); }, 50);
    })();
  <\/script><p>Shopify connected. You can close this window.</p></body></html>`

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
