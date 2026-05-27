// W9b Cluster 03 — server-side string sanitization (B-CRIT14 fix).
//
// Brand names, URLs, and descriptions are user-supplied and surface verbatim
// in modal headlines + summary rows + audit-log payloads. Vue 3 templates
// auto-escape `{{ value }}` interpolation, but defense-in-depth requires
// the API boundary to ALSO strip HTML / control chars before the value ever
// lands in Postgres or audit_log.
//
// Brand names are plain text — no markdown, no HTML. So the policy is
// "strip everything that looks like HTML/control structure." This is
// strictly less powerful than DOMPurify but appropriate for the threat
// model: stop XSS payloads at the storage boundary so a downstream renderer
// bug can't escalate to script execution.

const HTML_TAG_RE = /<[^>]*>/g
// Strip ASCII control chars except \t (0x09), \n (0x0A), \r (0x0D)
const CTRL_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g
const WHITESPACE_COLLAPSE_RE = /\s+/g

/**
 * Strip ALL HTML tags + ASCII control chars from a user-supplied string.
 * Returns plain text only. Collapses whitespace runs to single spaces and
 * trims leading/trailing whitespace.
 */
export function sanitizePlainText(input: string): string {
  return input
    .replace(HTML_TAG_RE, '')
    .replace(CTRL_RE, '')
    .replace(WHITESPACE_COLLAPSE_RE, ' ')
    .trim()
}

/**
 * Validate + sanitize a URL field. Returns the sanitized URL or null if the
 * URL is malformed or uses a forbidden scheme. Only http(s) accepted.
 * `javascript:`, `data:`, `file:` etc. all rejected.
 */
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
