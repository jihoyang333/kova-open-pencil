import { describe, test, expect, beforeAll } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// W6 Cluster 11 Phase 5c — static migration shape contract.
//
// We do NOT hit a live database here. The PRD 11 cross-cut tables
// (audit_log + idempotency_keys) are bedrock for Clusters 01, 03, 04, 05,
// 09. Their shape must NEVER drift from PRD 11 §4.1. A regex/string-match
// test catches schema regressions at lint speed.

const ROOT = join(import.meta.dir, '../../..')
const AUDIT_PATH = join(ROOT, 'supabase/migrations/20260519_w1_audit_log.sql')
const IDEM_PATH = join(ROOT, 'supabase/migrations/20260521_11_idempotency_keys.sql')

let auditSql: string
let idemSql: string

beforeAll(() => {
  auditSql = readFileSync(AUDIT_PATH, 'utf-8')
  idemSql = readFileSync(IDEM_PATH, 'utf-8')
})

describe('Cluster 11 — audit_log migration shape (PRD 11 §4.1)', () => {
  test('creates public.audit_log with IF NOT EXISTS', () => {
    expect(auditSql).toMatch(
      /CREATE TABLE IF NOT EXISTS public\.audit_log/
    )
  })

  test('user_id FK CASCADEs on users(id) delete', () => {
    expect(auditSql).toMatch(
      /user_id\s+uuid\s+REFERENCES\s+public\.users\(id\)\s+ON\s+DELETE\s+CASCADE/i
    )
  })

  test('payload defaults to empty JSON object', () => {
    expect(auditSql).toMatch(/payload\s+jsonb\s+NOT NULL\s+DEFAULT\s+'\{\}'::jsonb/)
  })

  test('two index definitions present', () => {
    expect(auditSql).toMatch(/CREATE INDEX IF NOT EXISTS idx_audit_log_user_event/)
    expect(auditSql).toMatch(/CREATE INDEX IF NOT EXISTS idx_audit_log_cluster_created/)
  })

  test('RLS enabled', () => {
    expect(auditSql).toMatch(
      /ALTER TABLE public\.audit_log ENABLE ROW LEVEL SECURITY/
    )
  })

  test('only service_role policy', () => {
    expect(auditSql).toMatch(/CREATE POLICY\s+audit_log_service_only[\s\S]*?TO\s+service_role/i)
    expect(auditSql).not.toMatch(/TO\s+authenticated/i)
    expect(auditSql).not.toMatch(/TO\s+anon/i)
  })
})

describe('Cluster 11 — idempotency_keys migration shape (PRD 11 §4.1)', () => {
  test('creates public.idempotency_keys with IF NOT EXISTS', () => {
    expect(idemSql).toMatch(
      /CREATE TABLE IF NOT EXISTS public\.idempotency_keys/
    )
  })

  test('key column is the PK + text type', () => {
    expect(idemSql).toMatch(/key\s+text\s+PRIMARY KEY/)
  })

  test('user_id FK CASCADEs on users(id) delete', () => {
    expect(idemSql).toMatch(
      /user_id\s+uuid\s+NOT NULL\s+REFERENCES\s+public\.users\(id\)\s+ON\s+DELETE\s+CASCADE/i
    )
  })

  test('CHECK constraint clamps key length 16..64', () => {
    expect(idemSql).toMatch(
      /CHECK\s*\(\s*length\(key\)\s*>=\s*16\s+AND\s+length\(key\)\s*<=\s*64\s*\)/i
    )
  })

  test('response columns present', () => {
    expect(idemSql).toMatch(/response_status\s+int\s+NOT NULL/i)
    expect(idemSql).toMatch(/response_body\s+jsonb\s+NOT NULL/i)
  })

  test('TTL index on created_at + per-user/endpoint debug index', () => {
    expect(idemSql).toMatch(/CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at/)
    expect(idemSql).toMatch(/CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_endpoint/)
  })

  test('RLS enabled', () => {
    expect(idemSql).toMatch(
      /ALTER TABLE public\.idempotency_keys ENABLE ROW LEVEL SECURITY/
    )
  })

  test('only service_role policy', () => {
    expect(idemSql).toMatch(
      /CREATE POLICY\s+idempotency_service_only[\s\S]*?TO\s+service_role/i
    )
    expect(idemSql).not.toMatch(/TO\s+authenticated/i)
    expect(idemSql).not.toMatch(/TO\s+anon/i)
  })

  test('table COMMENT documents 24h retention + cron', () => {
    expect(idemSql).toMatch(/24 hours/i)
    expect(idemSql).toMatch(/prune cron/i)
  })

  test('request_hash COMMENT warns about raw-byte hashing (no JSON canonicalization)', () => {
    expect(idemSql).toMatch(/byte-for-byte/i)
    expect(idemSql).toMatch(/does NOT canonicalize[\s\S]*JSON/i)
  })
})
