import type { SupabaseClient } from '@supabase/supabase-js'

// W8a Cluster 01 — cron step: shopify (Plan 01 Task 6b).
// Per-brand OAuth revoke via Shopify Admin API.
// 401/404 treated as success (already revoked). 5xx → retriable.
// Token retrieved from Vault helper read_shopify_token (M9 RPC).

export interface StepArgs {
  supabase: SupabaseClient
  userId: string
  idempotencyKey: string
}

export type StepResult = { ok: true } | { ok: false; retriable: boolean; error: string }

interface BrandShopifyRow {
  id: string
  shopify_shop_domain: string | null
  shopify_access_token_id: string | null
}

export async function runStep({ supabase, userId, idempotencyKey }: StepArgs): Promise<StepResult> {
  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, shopify_shop_domain, shopify_access_token_id')
    .eq('user_id', userId)
    .not('shopify_shop_domain', 'is', null) as { data: BrandShopifyRow[] | null; error: { message: string } | null }

  if (error) return { ok: false, retriable: true, error: error.message }
  if (!brands || brands.length === 0) return { ok: true }

  for (const brand of brands) {
    if (!brand.shopify_access_token_id || !brand.shopify_shop_domain) continue

    // Fetch the per-shop access token from Vault before revoking.
    const { data: tokenData, error: tokenErr } = await supabase.rpc('read_shopify_token', {
      p_secret_id: brand.shopify_access_token_id,
    })
    if (tokenErr || !tokenData) {
      // Token already gone — treat as revoked
      await supabase.from('brands')
        .update({ shopify_shop_domain: null, shopify_access_token_id: null })
        .eq('id', brand.id)
      continue
    }

    // Per Shopify docs: DELETE /admin/api_permissions/current.json (B-CRIT7 fix).
    const url = `https://${brand.shopify_shop_domain}/admin/api_permissions/current.json`
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-Shopify-Access-Token': String(tokenData),
          'X-Idempotency-Key': `${idempotencyKey}:${brand.id}`,
          'Content-Type': 'application/json',
        },
      })
      if (res.status >= 500) {
        return { ok: false, retriable: true, error: `Shopify ${res.status}` }
      }
      // 200, 401, 404 → idempotent success
    } catch (err) {
      return { ok: false, retriable: true, error: (err as Error).message }
    }

    await supabase.from('brands')
      .update({ shopify_shop_domain: null, shopify_access_token_id: null })
      .eq('id', brand.id)
  }

  return { ok: true }
}
