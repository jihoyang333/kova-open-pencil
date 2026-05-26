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
