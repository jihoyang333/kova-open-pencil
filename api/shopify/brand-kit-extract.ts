import { createClient } from '@supabase/supabase-js'

import { authenticateRequest } from '../_shared/auth'
import { SHOPIFY_API_VERSION } from '../_shared/shopify-client'
import {
  extractBrandKitFromThemeSettings,
  type ExtractedBrandKit,
} from '../_shared/shopify-brand-kit'

export const config = { runtime: 'edge' as const } as const
export const maxDuration = 30

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const BRAND_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ServerConfig {
  supabaseUrl: string
  serviceRoleKey: string
}

interface ThemeRow {
  id: number
  role?: string
}

type FetchResult<T> = { ok: true; value: T } | { ok: false }

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: JSON_HEADERS,
  })
}

function loadConfig(): ServerConfig | null {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return { supabaseUrl, serviceRoleKey }
}

async function parseBody(req: Request): Promise<{ brand_id: string } | null> {
  try {
    const raw = (await req.json()) as unknown
    if (!raw || typeof raw !== 'object') return null
    const brandId = (raw as Record<string, unknown>).brand_id
    if (typeof brandId !== 'string') return null
    return { brand_id: brandId }
  } catch {
    return null
  }
}

async function findMainThemeId(
  shopDomain: string,
  token: string
): Promise<FetchResult<number | null>> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/themes.json?role=main`,
    { headers: { 'X-Shopify-Access-Token': token } }
  )
  if (!res.ok) return { ok: false }
  const body = (await res.json().catch(() => null)) as {
    themes?: ThemeRow[]
  } | null
  const themes = body?.themes ?? []
  if (themes.length === 0) return { ok: true, value: null }
  const main = themes.find((t) => t.role === 'main') ?? themes[0]
  return { ok: true, value: main.id }
}

async function fetchSettingsJson(
  shopDomain: string,
  themeId: number,
  token: string
): Promise<FetchResult<string>> {
  const url = new URL(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/themes/${themeId}/assets.json`
  )
  url.searchParams.set('asset[key]', 'config/settings_data.json')
  const res = await fetch(url.toString(), {
    headers: { 'X-Shopify-Access-Token': token },
  })
  if (!res.ok) return { ok: false }
  const body = (await res.json().catch(() => null)) as {
    asset?: { value?: string }
  } | null
  const value = body?.asset?.value
  if (typeof value !== 'string') return { ok: false }
  return { ok: true, value }
}

function parseSettings(
  raw: string
): Parameters<typeof extractBrandKitFromThemeSettings>[0] | null {
  try {
    return JSON.parse(raw) as Parameters<
      typeof extractBrandKitFromThemeSettings
    >[0]
  } catch {
    return null
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonError(405, 'Method not allowed')

  const body = await parseBody(req)
  if (!body) return jsonError(400, 'Invalid JSON body')
  if (!BRAND_ID_RE.test(body.brand_id)) return jsonError(400, 'Invalid brand_id')

  const auth = await authenticateRequest(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

  const cfg = loadConfig()
  if (!cfg) return jsonError(500, 'Server configuration error')

  const admin = createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: ownedBrand } = await admin
    .from('brands')
    .select('id')
    .eq('id', body.brand_id)
    .eq('user_id', userId)
    .maybeSingle()
  if (!ownedBrand) return jsonError(403, 'Forbidden')

  const { data: conn } = await admin
    .from('shopify_connections')
    .select('shop_domain')
    .eq('brand_id', body.brand_id)
    .maybeSingle()
  const connection = conn as { shop_domain: string } | null
  if (!connection) return jsonError(404, 'No Shopify connection')

  const { data: tokenRow } = await admin.rpc('read_shopify_token', {
    p_brand_id: body.brand_id,
  })
  const token = typeof tokenRow === 'string' ? tokenRow : null
  if (!token) return jsonError(500, 'Missing Shopify access token')

  const themeResult = await findMainThemeId(connection.shop_domain, token)
  if (!themeResult.ok) return jsonError(502, 'Failed to list themes')
  if (themeResult.value === null) return jsonError(404, 'No active theme')

  const settingsResult = await fetchSettingsJson(
    connection.shop_domain,
    themeResult.value,
    token
  )
  if (!settingsResult.ok) {
    return jsonError(502, 'Failed to fetch theme settings')
  }

  const parsed = parseSettings(settingsResult.value)
  if (!parsed) return jsonError(502, 'Malformed theme settings')

  const kit: ExtractedBrandKit = extractBrandKitFromThemeSettings(parsed)

  return new Response(JSON.stringify({ brand_id: body.brand_id, kit }), {
    status: 200,
    headers: JSON_HEADERS,
  })
}
