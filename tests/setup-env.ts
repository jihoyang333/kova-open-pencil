// Preloaded by bunfig.toml [test] before any test file runs.
// Loads .env.test.local into process.env so integration tests can talk to the
// local Supabase stack without colliding with .env.local (which points at the
// cloud dev project).
//
// Bun auto-loads .env, .env.local, .env.test, but it does NOT load .env.test.local
// despite the naming convention suggesting otherwise (as of bun 1.3.10). We
// load it explicitly here.

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(import.meta.dir, '..', '.env.test.local')
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}
