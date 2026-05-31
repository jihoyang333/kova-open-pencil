import { fileTypeFromBuffer } from 'file-type'

// Cluster 05 Plan Task — shared MIME magic-number sniff (PRD 05 §5.1, 2.B.5).
//
// Upload endpoints accept a multipart `file` whose claimed type comes from two
// untrusted client-supplied signals: the filename extension and the
// `Content-Type` (Blob.type) header. Both are trivially spoofable. The
// `file-type` package inspects the real leading bytes (magic number) and is
// the only trustworthy signal.
//
// Policy (2.B.5): the sniffed type, the filename extension, and the provided
// Content-Type MUST all agree on the same allowed entry. Disagreement (a
// polyglot file, a renamed `.exe`, a mismatched header) is rejected. This
// blocks the classic "upload a script renamed to .woff2" attack.
//
// Some text formats (`text/plain`, `text/markdown`) have NO magic number —
// `file-type` returns undefined for them. For those, callers opt in via
// `allowMagiclessText`: we fall back to extension + Content-Type agreement
// only (the bytes are inert text either way). Binary formats (fonts, PDF)
// always require a positive magic-number match.

export interface AllowedType {
  /** Canonical MIME stored in the DB (matches the table CHECK constraint). */
  readonly mime: string
  /** Lower-case file extensions that map to this type (no leading dot). */
  readonly extensions: readonly string[]
  /**
   * Content-Type values the browser may send for this type. Browsers are
   * inconsistent (e.g. fonts come through as `font/*`, `application/*`, or
   * `application/octet-stream`), so each entry lists every plausible header.
   */
  readonly contentTypes: readonly string[]
  /**
   * When true, this type has no reliable magic number (plain text / markdown)
   * and is validated by extension + Content-Type agreement only.
   */
  readonly magicless?: boolean
}

export type SniffResult = { ok: true; mime: string } | { ok: false }

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  if (dot < 0 || dot === fileName.length - 1) return ''
  return fileName.slice(dot + 1).toLowerCase()
}

function baseContentType(contentType: string): string {
  // Strip parameters like `; charset=utf-8` and normalize case.
  return contentType.split(';')[0].trim().toLowerCase()
}

function findByExtension(
  allowed: readonly AllowedType[],
  ext: string
): AllowedType | undefined {
  if (ext === '') return undefined
  return allowed.find((t) => t.extensions.includes(ext))
}

/**
 * Sniff and cross-check an uploaded file against an allow-list.
 *
 * All three signals must point at the same allowed entry:
 *   1. magic-number sniff (`file-type`) — except for `magicless` text types
 *   2. filename extension
 *   3. Content-Type header (Blob.type)
 *
 * @param bytes        Raw file bytes (already read into memory).
 * @param fileName     Client-supplied filename (used for the extension check).
 * @param contentType  Client-supplied MIME (Blob.type / Content-Type header).
 * @param allowed      Allow-list of acceptable types.
 */
export async function sniffFileType(
  bytes: Uint8Array,
  fileName: string,
  contentType: string,
  allowed: readonly AllowedType[]
): Promise<SniffResult> {
  const ext = extensionOf(fileName)
  const headerMime = baseContentType(contentType)

  const byExt = findByExtension(allowed, ext)
  if (byExt === undefined) return { ok: false }

  // Content-Type must be one the entry permits.
  if (!byExt.contentTypes.includes(headerMime)) return { ok: false }

  const sniffed = await fileTypeFromBuffer(bytes)

  if (byExt.magicless === true) {
    // No magic number to verify — but if `file-type` DID positively identify
    // the bytes as some other known binary format, that is a polyglot/spoof.
    if (sniffed !== undefined) return { ok: false }
    return { ok: true, mime: byExt.mime }
  }

  // Binary type: require a positive magic-number match that resolves to the
  // SAME allowed entry as the extension did.
  if (sniffed === undefined) return { ok: false }
  if (!byExt.extensions.includes(sniffed.ext.toLowerCase())) return { ok: false }

  return { ok: true, mime: byExt.mime }
}
