import { describe, test, expect, beforeAll } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATION_PATH = join(
  import.meta.dir,
  '../../../supabase/migrations/20260418_m9_02_catalog.sql'
)

const SHOPIFY_TABLES = [
  'shopify_products',
  'shopify_variants',
  'shopify_variant_prices',
  'shopify_media',
  'shopify_metafields',
  'shopify_collections',
  'shopify_collection_products',
  'shopify_discounts',
  'shopify_orders_agg',
  'shopify_compliance_log',
]

// Columns that would constitute customer PII in an aggregated order table
const PII_KEYWORDS = [
  'email',
  'phone',
  'name',
  'address',
  'ip',
  'customer_name',
  'billing',
  'shipping',
  'order_id',
]

let sql: string

beforeAll(() => {
  sql = readFileSync(MIGRATION_PATH, 'utf-8')
})

describe('20260418_m9_02_catalog.sql', () => {
  describe('RLS enablement', () => {
    for (const table of SHOPIFY_TABLES) {
      test(`${table} has ENABLE ROW LEVEL SECURITY`, () => {
        expect(sql).toMatch(new RegExp(`ALTER TABLE ${table}\\s+ENABLE ROW LEVEL SECURITY`))
      })
    }
  })

  describe('RLS policies exist', () => {
    for (const table of SHOPIFY_TABLES) {
      test(`${table} has at least one CREATE POLICY`, () => {
        expect(sql).toMatch(new RegExp(`CREATE POLICY .+ ON ${table}`))
      })
    }
  })

  describe('auth.uid() usage', () => {
    test('never calls auth.uid() as a bare expression (always wrapped in SELECT)', () => {
      // Strip single-line SQL comments before scanning so comment mentions don't fail
      const sqlNoComments = sql.replace(/--[^\n]*/g, '')
      const bareUid = /(?<!\(SELECT )\bauth\.uid\(\)/g
      const matches = [...sqlNoComments.matchAll(bareUid)]
      expect(matches).toHaveLength(0)
    })
  })

  describe('shopify_compliance_log', () => {
    test('policy is FOR SELECT only (not FOR ALL)', () => {
      // Extract the compliance_log policy block
      const policyMatch = sql.match(
        /CREATE POLICY [^\n]+ ON shopify_compliance_log\s+FOR\s+(\w+)/
      )
      expect(policyMatch).not.toBeNull()
      expect(policyMatch![1].toUpperCase()).toBe('SELECT')
    })

    test('has user_id column for audit trail durability', () => {
      // user_id must appear in the CREATE TABLE block for compliance_log
      const tableBlock = sql.match(
        /CREATE TABLE shopify_compliance_log\s*\([\s\S]+?\);/
      )
      expect(tableBlock).not.toBeNull()
      expect(tableBlock![0]).toContain('user_id')
    })
  })

  describe('shopify_orders_agg — no customer PII', () => {
    const tableBlock = () => {
      const match = sql.match(/CREATE TABLE shopify_orders_agg\s*\([\s\S]+?\);/)
      return match ? match[0] : ''
    }

    for (const keyword of PII_KEYWORDS) {
      test(`does not contain column matching PII keyword "${keyword}"`, () => {
        expect(tableBlock().toLowerCase()).not.toContain(keyword)
      })
    }
  })

  describe('indexes', () => {
    test('has bestseller composite index on shopify_orders_agg', () => {
      expect(sql).toMatch(
        /CREATE INDEX ON shopify_orders_agg\s+\(brand_id,\s*date DESC,\s*qty_sold DESC\)/
      )
    })

    test('has variant lookup index by shopify_variant_id', () => {
      expect(sql).toMatch(
        /CREATE INDEX ON shopify_variants\s+\(brand_id,\s*shopify_variant_id\)/
      )
    })

    test('has product search index by brand_id', () => {
      expect(sql).toMatch(
        /CREATE INDEX ON shopify_products\s+\(brand_id,\s*updated_at DESC\)/
      )
    })
  })
})
