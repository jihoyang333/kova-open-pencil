import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * Plan 05 Task 5 Step 6 — W0-5 / CT-013 closure.
 *
 * Every `CREATE [OR REPLACE] FUNCTION ... SECURITY DEFINER` block in the
 * brand-kit migration MUST pin `SET search_path = public, pg_temp` inside the
 * same declaration, otherwise the function inherits the caller's search_path
 * and is exploitable via object shadowing (founder lock #15, PRD 03 §5.1).
 *
 * This is a static file scan — no database required — so it runs in the
 * `test:unit` gate (unlike the Docker-backed integration suites).
 */
describe('Plan 05 RPC search_path lock (W0-5 / CT-013)', () => {
  const MIGRATION = 'supabase/migrations/20260615_05_brand_kit.sql'

  test('every SECURITY DEFINER block has SET search_path = public, pg_temp', () => {
    const sql = readFileSync(MIGRATION, 'utf8')

    // Each block ends at the matching `$$;` terminator.
    const definerBlockRegex =
      /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION[\s\S]*?SECURITY\s+DEFINER[\s\S]*?\$\$;/gi
    const blocks = sql.match(definerBlockRegex) ?? []

    expect(blocks.length).toBeGreaterThanOrEqual(11) // 4 tone + 4 saved + 1 rule + 1 identity + 2 voice-draft

    const missing: string[] = []
    for (const block of blocks) {
      const hasLock = /SET\s+search_path\s*=\s*public\s*,\s*pg_temp/i.test(block)
      if (!hasLock) {
        const fnNameMatch = block.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)/i)
        missing.push(fnNameMatch?.[1] ?? '(unknown)')
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `SECURITY DEFINER RPC(s) missing 'SET search_path = public, pg_temp': ${missing.join(', ')}\n` +
          `Per W0-5 / founder lock #15 (PRD 03 §5.1), add 'SET search_path = public, pg_temp' to each declaration.`,
      )
    }
    expect(missing).toEqual([])
  })

  test('exactly 12 SECURITY DEFINER RPCs are defined (4 tone + 4 block + 1 rule + 1 identity + 2 voice)', () => {
    const sql = readFileSync(MIGRATION, 'utf8')
    const definerBlockRegex =
      /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION[\s\S]*?SECURITY\s+DEFINER[\s\S]*?\$\$;/gi
    const blocks = sql.match(definerBlockRegex) ?? []
    expect(blocks.length).toBe(12)
  })
})
