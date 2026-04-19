import { describe, it, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { parseBulkJsonl } from '../../../api/_shared/shopify-bulk-parser'

describe('parseBulkJsonl', () => {
  it('reconstructs product → variants/media/metafields', async () => {
    const jsonl = readFileSync(`${import.meta.dir}/fixtures/bulk-sample.jsonl`, 'utf8')
    const rows: Array<{ table: string; record: Record<string, unknown> }> = []
    for await (const row of parseBulkJsonl(jsonl)) rows.push(row)

    const products = rows.filter((r) => r.table === 'shopify_products')
    const variants = rows.filter((r) => r.table === 'shopify_variants')
    const media    = rows.filter((r) => r.table === 'shopify_media')
    const meta     = rows.filter((r) => r.table === 'shopify_metafields')
    const cols     = rows.filter((r) => r.table === 'shopify_collections')
    const cpl      = rows.filter((r) => r.table === 'shopify_collection_products')

    expect(products).toHaveLength(1)
    expect(variants).toHaveLength(1)
    expect(variants[0].record.price).toBe('19.99')
    expect(media).toHaveLength(1)
    expect(meta).toHaveLength(1)
    expect(cols).toHaveLength(1)
    expect(cpl).toHaveLength(1)
  })

  it('streams: does not load entire file into memory at once', async () => {
    const lines: string[] = []
    for (let i = 0; i < 10_000; i++) {
      lines.push(JSON.stringify({ id: `gid://shopify/Product/${i}`, handle: `p-${i}`, title: `P${i}`, status: 'ACTIVE' }))
    }
    const jsonl = lines.join('\n')
    let count = 0
    for await (const _ of parseBulkJsonl(jsonl)) count++
    expect(count).toBe(10_000)
  })
})
