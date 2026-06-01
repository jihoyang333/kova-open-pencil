// Shared snapshot-format constants + types. Imported by both the codec and the
// migration registry so neither depends on the other (avoids an import cycle).

export const SNAPSHOT_FORMAT_VERSION = 1

export interface DecodedPage {
  pageId: string
  bytes: Uint8Array
}
