import { createClient } from '@supabase/supabase-js'
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
          edges { node { id ... on DiscountCodeBasic { codes(first: 1) { edges { node { code } } } title status startsAt endsAt } } }
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

export default async function handler(req: Request): Promise<Response> {
  if (req.headers.get('X-Kova-Internal') !== process.env.KOVA_INTERNAL_KEY) {
    return new Response('Forbidden', { status: 403 })
  }

  const { brand_id } = (await req.json()) as BulkStartBody
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: conn } = await admin
    .from('shopify_connections')
    .select('shop_domain')
    .eq('brand_id', brand_id)
    .single()
  if (!conn) return new Response('No connection', { status: 404 })

  const { data: token } = await admin.rpc('read_shopify_token', { p_brand_id: brand_id })

  const res = await fetch(
    `https://${conn.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: BULK_QUERY }),
    },
  )

  const body = (await res.json()) as BulkOperationResponse
  const op = body.data.bulkOperationRunQuery.bulkOperation
  if (!op) return new Response(JSON.stringify(body), { status: 502 })

  await admin
    .from('shopify_connections')
    .update({
      sync_progress: { phase: 'running', count_done: 0, count_total: 0, bulk_op_id: op.id },
    })
    .eq('brand_id', brand_id)

  return new Response(JSON.stringify({ ok: true, bulk_op_id: op.id }), { status: 200 })
}
