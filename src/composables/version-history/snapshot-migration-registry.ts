import { SNAPSHOT_FORMAT_VERSION, type DecodedPage } from './use-snapshot-codec'

// Snapshot-format migration registry (W4 C-LOW09.11).
//
// decodeCanvasSnapshot() reads the envelope's format_version and looks it up here.
// Each entry maps a source format_version -> the next version + a page mutator, so
// old snapshots are forward-migrated instead of throwing 'format_version_unsupported'.
//
// Lockstep guard: if SNAPSHOT_FORMAT_VERSION is bumped, every prior version MUST have
// a chain entry leading to the current version, or scripts/lint/snapshot-format-registry.ts
// (run in CI) fails. This prevents a silent format bump that would break restore.

export type SnapshotMigration = (pages: DecodedPage[]) => DecodedPage[]

export const SNAPSHOT_MIGRATIONS: Record<number, { to: number; migrate: SnapshotMigration }> = {
  // Example for a future v2 bump:
  // 1: { to: 2, migrate: (pages) => pages },
}

export function isFormatVersionRegistered(fv: number): boolean {
  return fv === SNAPSHOT_FORMAT_VERSION || fv in SNAPSHOT_MIGRATIONS
}

// Applies the migration chain until pages reach SNAPSHOT_FORMAT_VERSION.
// Throws if a version in the chain is missing (registry gap).
export function migratePages(fromVersion: number, pages: DecodedPage[]): DecodedPage[] {
  let v = fromVersion
  let out = pages
  while (v !== SNAPSHOT_FORMAT_VERSION) {
    const entry = SNAPSHOT_MIGRATIONS[v]
    if (!entry) throw new Error('format_version_unsupported')
    out = entry.migrate(out)
    v = entry.to
  }
  return out
}
