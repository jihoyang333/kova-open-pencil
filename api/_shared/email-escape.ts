// HTML escape helpers shared by transactional email builders.
// Extracted from per-template duplicates (audit L-5, 2026-06-06).
//
// escapeHtml: safe to interpolate inside text content.
// escapeAttr: safe to interpolate inside double-quoted attribute values
// (href, alt, etc.). NEVER use to build URLs from untrusted input — validate
// + URL-parse first.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;')
}
