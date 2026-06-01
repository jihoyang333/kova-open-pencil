// W4 C-LOW09.11 — snapshot-format / Kiwi-schema lockstep guard.
//
// If the engine Kiwi schema (packages/core/src/kiwi/) or the snapshot codec changes
// in this PR, the diff MUST also touch SNAPSHOT_FORMAT_VERSION or the
// snapshot-migration-registry — otherwise a silent format bump could break restore.
//
// Runs in CI against the PR diff. Locally it is a no-op (no base ref).
import { execSync } from 'node:child_process'

const WATCHED = /(packages\/core\/src\/kiwi\/|src\/composables\/version-history\/use-snapshot-codec\.ts)/
const SENTINEL = /SNAPSHOT_FORMAT_VERSION|snapshot-migration-registry/

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8' })
  } catch {
    return ''
  }
}

const base = process.env['GITHUB_BASE_REF'] || ''
if (!base) {
  console.log('snapshot-format-registry: no base ref (local run) — skipping')
  process.exit(0)
}

const range = `origin/${base}...HEAD`
const changed = sh(`git diff --name-only ${range}`).split('\n').filter(Boolean)
const touchesWatched = changed.some((f) => WATCHED.test(f))

if (!touchesWatched) {
  console.log('snapshot-format-registry: no watched files changed — ok')
  process.exit(0)
}

const diff = sh(`git diff ${range} -- '*.ts'`)
if (SENTINEL.test(diff)) {
  console.log('snapshot-format-registry: format bump / registry update present — ok')
  process.exit(0)
}

console.error(
  '::error::Kiwi schema or snapshot codec changed without a SNAPSHOT_FORMAT_VERSION bump or snapshot-migration-registry update.',
)
process.exit(1)
