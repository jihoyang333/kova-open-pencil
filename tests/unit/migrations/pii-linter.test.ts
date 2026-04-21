import { describe, test, expect } from 'bun:test'
import { join } from 'node:path'

const FIXTURE_PATH = join(import.meta.dir, 'fixtures/add-customer-email.sql')
const LINTER_PATH = join(import.meta.dir, '../../../scripts/lint-migration.ts')
const SCHEMA_LINTER_PATH = join(import.meta.dir, '../../../scripts/lint-schema-invariants.ts')

describe('pii-linter', () => {
  test('exits non-zero when migration adds customer_email to shopify_orders_agg', () => {
    const result = Bun.spawnSync({
      cmd: ['bun', 'run', LINTER_PATH, FIXTURE_PATH],
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const stdout = result.stdout.toString()

    expect(result.exitCode).not.toBe(0)
    expect(stdout).toContain('shopify_orders_agg')
    expect(stdout).toContain('customer_email')
  })

  test('exits 0 when run against the real migrations', () => {
    const result = Bun.spawnSync({
      cmd: ['bun', 'run', SCHEMA_LINTER_PATH],
      stdout: 'pipe',
      stderr: 'pipe',
    })

    expect(result.exitCode).toBe(0)
  })
})
