import { createClient } from '@supabase/supabase-js'
import { Receiver } from '@upstash/qstash'
import { parseBulkJsonl } from '../../_shared/shopify-bulk-parser'
import { publishToQStash } from '../../_shared/qstash'
import { logShopifyError } from '../../_shared/shopify-error'
import { resolveFks } from '../../_shared/shopify-bulk-processor'

export { resolveFks }

export const config = { runtime: 'nodejs20.x' as const }
export const maxDuration = 300

const BUDGET_MS = 260_000

interface WorkerBody {
  brand_id: string
  url: string
  cursor: number
  count_total: number
}

interface WorkerConfig {
  qstashCurrentKey: string
  qstashNextKey: string
  supabaseUrl: string
  serviceRoleKey: string
}

function loadWorkerConfig(): WorkerConfig | null {
  const qstashCurrentKey = process.env.QSTASH_CURRENT_SIGNING_KEY
  const qstashNextKey = process.env.QSTASH_NEXT_SIGNING_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!qstashCurrentKey || !qstashNextKey || !supabaseUrl || !serviceRoleKey) return null
  return { qstashCurrentKey, qstashNextKey, supabaseUrl, serviceRoleKey }
}

export default async function handler(req: Request): Promise<Response> {
  const cfg = loadWorkerConfig()
  if (!cfg) return new Response('Server configuration error', { status: 500 })

  const body = await req.text()
  const sig = req.headers.get('upstash-signature') ?? ''

  const receiver = new Receiver({
    currentSigningKey: cfg.qstashCurrentKey,
    nextSigningKey: cfg.qstashNextKey,
  })

  const valid = await receiver.verify({ body, signature: sig, url: req.url }).catch(() => false)
  if (!valid) return new Response('Unauthorized', { status: 401 })

  const { brand_id, url, cursor, count_total } = JSON.parse(body) as WorkerBody
  const admin = createClient(cfg.supabaseUrl, cfg.serviceRoleKey)

  const started = Date.now()
  // Always fetch from start; the parser skips already-processed lines via cursor
  const fileRes = await fetch(url)
  if (!fileRes.ok || !fileRes.body) return new Response('Fetch failed', { status: 502 })

  const batches = new Map<string, Array<Record<string, unknown>>>()

  const flush = async (): Promise<void> => {
    for (const [table, rows] of batches) {
      if (rows.length === 0) continue
      const resolved = await resolveFks(admin, brand_id, table, rows)
      const { error } = await admin.from(table).upsert(resolved)
      if (error) logShopifyError(new Error(`upsert failed for ${table}: ${error.message}`), { brand_id })
      batches.set(table, [])
    }
  }

  let lastLineNum = cursor
  let count = 0

  for await (const { table, record, lineNum } of parseBulkJsonl(fileRes.body, cursor)) {
    lastLineNum = lineNum
    const rec = { brand_id, ...record }
    const arr = batches.get(table) ?? (batches.set(table, []).get(table) as Array<Record<string, unknown>>)
    arr.push(rec)
    count++

    if (arr.length >= 500) await flush()

    if (Date.now() - started > BUDGET_MS) {
      await flush()
      await admin
        .from('shopify_connections')
        .update({ sync_progress: { phase: 'parsing', count_done: cursor + count, count_total, url } })
        .eq('brand_id', brand_id)
      await publishToQStash(`${new URL(req.url).origin}/api/shopify/sync/worker`, {
        brand_id, url, cursor: lastLineNum, count_total,
      })
      return new Response('chunked', { status: 200 })
    }
  }

  await flush()

  await admin
    .from('shopify_connections')
    .update({
      sync_progress: { phase: 'done', count_done: cursor + count, count_total },
      last_synced_at: new Date().toISOString(),
    })
    .eq('brand_id', brand_id)

  return new Response('ok', { status: 200 })
}
