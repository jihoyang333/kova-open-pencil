#!/usr/bin/env bun
/**
 * Custom lint rule — block server-only secrets from leaking to the browser
 * bundle. Per CLAUDE.md "Supabase & Environment" + founder lock #10.
 *
 * --------------------------------------------------------------------------
 * Browser-safe env (VITE_ prefix is OK):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SENTRY_DSN_BROWSER
 *
 * Server-only env (NEVER VITE_ prefix, NEVER import.meta.env, NEVER bundled):
 *   SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, STRIPE_SECRET_KEY,
 *   STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, CRON_SECRET, SENTRY_DSN_SERVER
 * --------------------------------------------------------------------------
 *
 * The gate scans every .ts / .tsx / .vue / .js / .jsx file under src/ and
 * packages/*​/src/ (anything Vite bundles for the browser) for:
 *
 *   1. `import.meta.env.<SERVER_ONLY_NAME>` — direct browser-bundle access.
 *   2. `VITE_<SERVER_ONLY_NAME>` — VITE_-prefixed alias of a server secret.
 *
 * api/ + scripts/ + supabase/ + tests/ are excluded — they run server-side
 * or at build time, not in the browser bundle.
 *
 * Run via `bun run lint:no-leaking-secrets`. CI uses `LINT_NO_LEAK_MODE=error`
 * (default) — any violation fails the build.
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const REPO_ROOT = process.cwd()

const BROWSER_BUNDLE_ROOTS = [
  'src',
  'packages/core/src',
  'packages/cli/src',
  'packages/mcp/src',
]

const SKIP_DIR_SEGMENTS = new Set([
  'node_modules',
  'dist',
  'design-system',
  '.worktrees',
  '.git',
  'public',
])

// Server-only secret names. Mirroring CLAUDE.md.
const SERVER_ONLY_SECRETS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'CRON_SECRET',
  'SENTRY_DSN_SERVER',
] as const

const FILE_EXTS = new Set(['.ts', '.tsx', '.vue', '.js', '.jsx'])

interface Violation {
  file: string
  line: number
  col: number
  pattern: 'import.meta.env' | 'vite-prefix-alias'
  secret: string
  context: string
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (SKIP_DIR_SEGMENTS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full)
    } else if (entry.isFile() && FILE_EXTS.has(extOf(entry.name))) {
      yield full
    }
  }
}

function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot)
}

function scanFile(filePath: string, content: string): Violation[] {
  const rel = relative(REPO_ROOT, filePath)
  const violations: Violation[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!
    for (const secret of SERVER_ONLY_SECRETS) {
      // Pattern A: `import.meta.env.<SECRET>`
      const reMeta = new RegExp(`import\\.meta\\.env\\.${secret}\\b`)
      const metaMatch = reMeta.exec(line)
      if (metaMatch) {
        violations.push({
          file: rel,
          line: i + 1,
          col: metaMatch.index + 1,
          pattern: 'import.meta.env',
          secret,
          context: line.trim().slice(0, 200),
        })
      }

      // Pattern B: `VITE_<SECRET>` — direct alias.
      const reAlias = new RegExp(`\\bVITE_${secret}\\b`)
      const aliasMatch = reAlias.exec(line)
      if (aliasMatch) {
        violations.push({
          file: rel,
          line: i + 1,
          col: aliasMatch.index + 1,
          pattern: 'vite-prefix-alias',
          secret,
          context: line.trim().slice(0, 200),
        })
      }
    }
  }

  return violations
}

async function main(): Promise<number> {
  const mode = (process.env['LINT_NO_LEAK_MODE'] ?? 'error').toLowerCase()
  const isWarn = mode === 'warn'

  const all: Violation[] = []

  for (const root of BROWSER_BUNDLE_ROOTS) {
    const abs = join(REPO_ROOT, root)
    try {
      const s = await stat(abs)
      if (!s.isDirectory()) continue
    } catch {
      continue
    }
    for await (const filePath of walk(abs)) {
      const content = await readFile(filePath, 'utf8')
      all.push(...scanFile(filePath, content))
    }
  }

  if (all.length === 0) return 0

  const label = isWarn ? 'WARN' : 'ERROR'
  process.stderr.write(
    `\n[no-leaking-secrets] ${label} — ${all.length} potential leak(s)\n`
  )
  process.stderr.write(
    `Server-only secrets must NEVER ship to the browser bundle. See CLAUDE.md "Supabase & Environment" + founder lock #10.\n`
  )

  for (const v of all) {
    const norm = v.file.split(sep).join('/')
    process.stderr.write(
      `  ${norm}:${v.line}:${v.col}  ${v.pattern}  secret=${v.secret}\n`
    )
    process.stderr.write(`      ${v.context}\n`)
  }
  process.stderr.write('\n')

  return isWarn ? 0 : 1
}

if (import.meta.main) {
  const code = await main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`[no-leaking-secrets] internal error: ${message}\n`)
    return 2
  })
  process.exit(code)
}
