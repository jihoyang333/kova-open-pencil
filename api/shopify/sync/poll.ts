import { createClient } from '@supabase/supabase-js'
import { authenticateRequest } from '../../_shared/auth'
import { SHOPIFY_API_VERSION } from '../../_shared/shopify-client'
import { processBulkFinish, type BulkFinishPayload } from './bulk-finish'

export const config = { runtime: 'edge' as const }

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

interface ShopifyBulkOperationNode {
  id: string
  status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'CANCELED' | 'FAILED' | 'EXPIRED'
  url: string | null
  objectCount: string | number
  errorCode: string | null
}

interface ShopifyNodeResponse {
  data?: { node: ShopifyBulkOperationNode | null }
  errors?: Array<{ message: string }>
}

interface SyncProgress {
  phase: 'idle' | 'running' | 'parsing' | 'done' | 'error'
  count_done?: number
  count_total?: number
  bulk_op_id?: string
  error?: string
}

interface PollResponse {
  phase: SyncProgress['phase']
  shopify_status?: ShopifyBulkOperationNode['status']
  count_done?: number
  count_total?: number
  error?: string
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: JSON_HEADERS })
}

function jsonOk(body: PollResponse): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: JSON_HEADERS })
}

export default async function handler(req: Request): Promise<Response> {
  const isInternal = req.headers.get('X-Kova-Internal') === process.env.KOVA_INTERNAL_KEY
    && process.env.KOVA_INTERNAL_KEY !== undefined

  let authorizedUserId: string | null = null
  if (!isInternal) {
    const authResult = await authenticateRequest(req)
    if (authResult instanceof Response) return authResult
    authorizedUserId = authResult.userId
  }

  const url = new URL(req.url)
  const brandId = url.searchParams.get('brand_id')
  if (!brandId) return jsonError(400, 'brand_id required')

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return jsonError(500, 'Server configuration error')
  const admin = createClient(supabaseUrl, serviceRoleKey)

  if (!isInternal && authorizedUserId) {
    const { data: ownedBrand } = await admin
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('user_id', authorizedUserId)
      .maybeSingle()
    if (!ownedBrand) return jsonError(403, 'Forbidden')
  }

  const { data: conn } = await admin
    .from('shopify_connections')
    .select('shop_domain,sync_progress')
    .eq('brand_id', brandId)
    .single()
  if (!conn) return jsonError(404, 'No connection')

  const progress = (conn as { sync_progress: SyncProgress | null }).sync_progress
  const shopDomain = (conn as { shop_domain: string }).shop_domain

  // Terminal phases — nothing to poll.
  if (!progress || progress.phase === 'idle' || progress.phase === 'done' || progress.phase === 'error') {
    return jsonOk({ phase: progress?.phase ?? 'idle' })
  }

  const bulkOpId = progress.bulk_op_id
  if (!bulkOpId) return jsonOk({ phase: progress.phase })

  const { data: token } = await admin.rpc('read_shopify_token', { p_brand_id: brandId })
  if (!token) return jsonError(500, 'Token unavailable')

  const nodeQuery = `
    query($id: ID!) {
      node(id: $id) {
        ... on BulkOperation {
          id status url objectCount errorCode
        }
      }
    }
  `

  const shopifyRes = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: nodeQuery, variables: { id: bulkOpId } }),
    },
  )

  if (!shopifyRes.ok) return jsonError(502, `Shopify GraphQL ${shopifyRes.status}`)
  const shopifyBody = (await shopifyRes.json()) as ShopifyNodeResponse
  const node = shopifyBody.data?.node ?? null
  if (!node) return jsonOk({ phase: progress.phase })

  const objectCount = typeof node.objectCount === 'string'
    ? parseInt(node.objectCount, 10)
    : node.objectCount

  if (node.status === 'COMPLETED' && node.url) {
    const payload: BulkFinishPayload = {
      admin_graphql_api_id: node.id,
      url: node.url,
      status: 'completed',
      object_count: objectCount,
    }
    // Fire-and-await: processBulkFinish handles its own mutex + error capture.
    await processBulkFinish(admin, brandId, payload, url.origin)
    return jsonOk({
      phase: 'done',
      shopify_status: node.status,
      count_done: objectCount,
      count_total: objectCount,
    })
  }

  if (node.status === 'FAILED' || node.status === 'CANCELED' || node.status === 'EXPIRED') {
    const lowered = node.status.toLowerCase()
    const failPayload: BulkFinishPayload = {
      admin_graphql_api_id: node.id,
      url: node.url ?? '',
      status: lowered === 'canceled' ? 'cancelled' : lowered,
      object_count: objectCount,
    }
    await processBulkFinish(admin, brandId, failPayload, url.origin)
    return jsonOk({
      phase: 'error',
      shopify_status: node.status,
      error: node.errorCode ?? `Bulk operation ${lowered}`,
    })
  }

  // Still running — update count for UI progress bar, leave phase=running.
  await admin
    .from('shopify_connections')
    .update({
      sync_progress: {
        phase: 'running',
        count_done: 0,
        count_total: objectCount,
        bulk_op_id: bulkOpId,
      },
    })
    .eq('brand_id', brandId)

  return jsonOk({
    phase: 'running',
    shopify_status: node.status,
    count_done: 0,
    count_total: objectCount,
  })
}
