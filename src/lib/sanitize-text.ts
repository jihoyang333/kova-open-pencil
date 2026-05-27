// W9b Cluster 03 — client-side mirror of api/_shared/sanitize.ts
// (B-CRIT14 defense in depth). Vue 3 templates auto-escape `{{ value }}`,
// but any place that touches innerHTML / v-html / `aria-label` interpolation
// from user-supplied content benefits from a server-shape parity helper.

const HTML_TAG_RE = /<[^>]*>/g
// Strip ASCII control chars except \t, \n, \r
const CTRL_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g
const WHITESPACE_COLLAPSE_RE = /\s+/g

export function sanitizePlainText(input: string): string {
  return input
    .replace(HTML_TAG_RE, '')
    .replace(CTRL_RE, '')
    .replace(WHITESPACE_COLLAPSE_RE, ' ')
    .trim()
}

// W9b audit L6 — client mirror of api/_shared/sanitize.ts#sanitizeUrl.
// Returns the sanitised absolute URL or null when the input is not http(s).
// Cluster 05+ surfaces that bind brand URLs into `:href` MUST go through
// this — never bind a raw user URL directly. http:// and https:// only;
// javascript:, data:, file:, etc. are rejected.
export function sanitizeUrl(input: string | null | undefined): string | null {
  if (input == null) return null
  const trimmed = sanitizePlainText(input)
  if (trimmed.length === 0) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}
