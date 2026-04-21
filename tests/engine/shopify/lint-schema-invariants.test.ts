import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { runLinter } from '../../../scripts/lint-schema-invariants'

const fixtures = join(import.meta.dir, 'fixtures')

describe('lint-schema-invariants', () => {
  it('passes on a clean shopify_orders_agg', async () => {
    const code = await runLinter(['--fixture', join(fixtures, 'clean.sql')])
    expect(code).toBe(0)
  })

  it('fails when shopify_orders_agg gains a customer_* column', async () => {
    const code = await runLinter(['--fixture', join(fixtures, 'bad.sql')])
    expect(code).toBe(1)
  })
})
