import { describe, test, expect, beforeAll } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// W9a Cluster 02 — file-grid + brand recency index migration shape contract.
// Static-string match per Cluster 01/11 pattern. Live-DB verification deferred
// to staging (see tests/integration/migrations/cluster-02-dashboard-indices.test.ts).

const ROOT = join(import.meta.dir, '../../..')
const MIG_PATH = join(ROOT, 'supabase/migrations/20260520_02_dashboard_indices.sql')

let sql: string

beforeAll(() => {
  sql = readFileSync(MIG_PATH, 'utf-8')
})

describe('Cluster 02 — file-grid + brand recency indexes (PRD 02 §4.1)', () => {
  test('wraps DDL in a transaction', () => {
    expect(sql).toMatch(/^\s*(?:--[^\n]*\n)*\s*BEGIN;/m)
    expect(sql).toMatch(/COMMIT;\s*$/)
  })

  test('installs pg_trgm extension idempotently', () => {
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS pg_trgm/i)
  })

  test('idx_canvases_brand_recent — composite (brand_id, updated_at DESC) WHERE trashed_at IS NULL', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_canvases_brand_recent[\s\S]*?ON public\.canvases\s*\(brand_id,\s*updated_at DESC\)[\s\S]*?WHERE trashed_at IS NULL/i)
  })

  test('idx_canvases_name_trgm — GIN gin_trgm_ops WHERE trashed_at IS NULL', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_canvases_name_trgm[\s\S]*?USING gin \(name gin_trgm_ops\)[\s\S]*?WHERE trashed_at IS NULL/i)
  })

  test('idx_brands_user_recent — composite (user_id, updated_at DESC)', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_brands_user_recent[\s\S]*?ON public\.brands\s*\(user_id,\s*updated_at DESC\)/i)
  })
})
