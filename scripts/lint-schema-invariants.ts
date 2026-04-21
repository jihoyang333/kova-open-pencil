import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Matches customer_ prefix (e.g. customer_email) and other PII field names.
// customer_ uses \w+ not \b so it catches customer_email where _ is a word char.
const BANNED = /\bcustomer_\w+|\bemail\b|\bphone\b|\baddress\b|\bfirst_name\b|\blast_name\b/i

export async function runLinter(argv: string[] = process.argv.slice(2)): Promise<number> {
  const fixtureFlag = argv.indexOf('--fixture')
  const positional = argv.filter((a) => !a.startsWith('-'))
  const paths =
    fixtureFlag >= 0
      ? [argv[fixtureFlag + 1]]
      : positional.length > 0
        ? positional
        : listMigrations()
  let failed = false
  for (const p of paths) {
    const sql = readFileSync(p, 'utf8')
    const block = extractTableBlock(sql, 'shopify_orders_agg')
    if (!block) continue
    for (const line of block.split('\n')) {
      if (line.trim().startsWith('--')) continue
      if (BANNED.test(line)) {
        console.log(`PII column suspected in ${p}: ${line.trim()}`)
        failed = true
      }
    }
  }
  return failed ? 1 : 0
}

function listMigrations(): string[] {
  const dir = join(import.meta.dir, '../supabase/migrations')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => join(dir, f))
}

function extractTableBlock(sql: string, table: string): string | null {
  const re = new RegExp(`CREATE TABLE ${table}[^;]*;|ALTER TABLE ${table}[^;]*;`, 'gi')
  const matches = sql.match(re)
  return matches ? matches.join('\n') : null
}

if (import.meta.main) process.exit(await runLinter())
