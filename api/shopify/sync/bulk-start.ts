import { createClient } from '@supabase/supabase-js'
import { authenticateRequest } from '../../_shared/auth'
import { SHOPIFY_API_VERSION } from '../../_shared/shopify-client'

export const config = { runtime: 'edge' as const }

const BULK_QUERY = `
  mutation {
    bulkOperationRunQuery(query: """
      {
        products {
          edges { node {
            id handle title status productType vendor tags publishedAt descriptionHtml
            variants { edges { node { id sku title price compareAtPrice inventoryQuantity availableForSale
              selectedOptions { name value } } } }
            media { edges { node { ... on MediaImage { id image { url altText width height } } } } }
            metafields { edges { node { id namespace key value type ownerType } } }
          } }
        }
        collections {
          edges { node {
            id handle title descriptionHtml ruleSet { rules { column relation condition } } sortOrder
            image { url } productsCount
            products { edges { node { id } } }
          } }
        }
        discountNodes {
          edges { node { id ... on DiscountCodeBasic { title status startsAt endsAt } } }
        }
      }
    """) { bulkOperation { id status } userErrors { field message } }
  }
`

interface BulkStartBody {
  brand_id: string
}

interface BulkOperationResponse {
  data: {
    bulkOperationRunQuery: {
      bulkOperation: { id: string; status: string } | null
      userErrors: Array<{ message: string }>
    }
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: JSON_HEADERS })
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

  const body = (await req.json()) as BulkStartBody
  const { brand_id } = body

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return jsonError(500, 'Server configuration error')
  const admin = createClient(supabaseUrl, serviceRoleKey)

  // Verify brand ownership for user JWT path
  if (!isInternal && authorizedUserId) {
    const { data: ownedBrand } = await admin
      .from('brands')
      .select('id')
      .eq('id', brand_id)
      .eq('user_id', authorizedUserId)
      .maybeSingle()
    if (!ownedBrand) return jsonError(403, 'Forbidden')
  }

  const { data: conn } = await admin
    .from('shopify_connections')
    .select('shop_domain,sync_progress')
    .eq('brand_id', brand_id)
    .single()
  if (!conn) return jsonError(404, 'No connection')

  // Block duplicate syncs
  const progress = (conn as { shop_domain: string; sync_progress: { phase: string } | null }).sync_progress
  if (progress?.phase === 'running' || progress?.phase === 'parsing') {
    return jsonError(409, 'Sync already in progress')
  }

  const { data: token } = await admin.rpc('read_shopify_token', { p_brand_id: brand_id })

  const shopDomain = (conn as { shop_domain: string }).shop_domain
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: BULK_QUERY }),
    },
  )

  const responseBody = (await res.json()) as BulkOperationResponse
  const op = responseBody.data.bulkOperationRunQuery.bulkOperation
  if (!op) return new Response(JSON.stringify(responseBody), { status: 502 })

  await admin
    .from('shopify_connections')
    .update({
      sync_progress: { phase: 'running', count_done: 0, count_total: 0, bulk_op_id: op.id },
    })
    .eq('brand_id', brand_id)

  return new Response(JSON.stringify({ ok: true, bulk_op_id: op.id }), { status: 200 })
}
