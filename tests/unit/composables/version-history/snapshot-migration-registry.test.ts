import { describe, expect, it } from 'bun:test'
import {
  isFormatVersionRegistered,
  migratePages,
} from '@/composables/version-history/snapshot-migration-registry'
import { SNAPSHOT_FORMAT_VERSION } from '@/composables/version-history/use-snapshot-codec'

describe('snapshot-migration-registry', () => {
  it('registers the current format version', () => {
    expect(isFormatVersionRegistered(SNAPSHOT_FORMAT_VERSION)).toBe(true)
  })

  it('rejects an unregistered (future/unknown) version', () => {
    expect(isFormatVersionRegistered(999)).toBe(false)
  })

  it('migratePages is a no-op at the current version', () => {
    const pages = [{ pageId: 'p0', bytes: new Uint8Array([1, 2, 3]) }]
    expect(migratePages(SNAPSHOT_FORMAT_VERSION, pages)).toBe(pages)
  })

  it('migratePages throws on a gap in the chain', () => {
    expect(() => migratePages(999, [])).toThrow(/format_version_unsupported/)
  })
})
