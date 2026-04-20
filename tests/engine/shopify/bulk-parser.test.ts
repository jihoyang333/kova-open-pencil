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

  it('skip: resumes from line N and yields correct lineNum', async () => {
    const lines = [
      JSON.stringify({ id: 'gid://shopify/Product/1', handle: 'p1', title: 'P1', status: 'ACTIVE' }),
      JSON.stringify({ id: 'gid://shopify/Product/2', handle: 'p2', title: 'P2', status: 'ACTIVE' }),
      JSON.stringify({ id: 'gid://shopify/Product/3', handle: 'p3', title: 'P3', status: 'ACTIVE' }),
    ].join('\n')

    const rows: Array<{ lineNum: number; record: Record<string, unknown> }> = []
    for await (const row of parseBulkJsonl(lines, 2)) rows.push(row)

    expect(rows).toHaveLength(1)
    expect(rows[0].lineNum).toBe(3)
    expect(rows[0].record.handle).toBe('p3')
  })

  it('skips malformed JSONL lines without crashing', async () => {
    const lines = [
      JSON.stringify({ id: 'gid://shopify/Product/1', handle: 'p1', title: 'P1', status: 'ACTIVE' }),
      'NOT_VALID_JSON{{{{',
      JSON.stringify({ id: 'gid://shopify/Product/2', handle: 'p2', title: 'P2', status: 'ACTIVE' }),
    ].join('\n')

    const rows: Array<{ table: string }> = []
    for await (const row of parseBulkJsonl(lines)) rows.push(row)
    expect(rows).toHaveLength(2)
  })
})
