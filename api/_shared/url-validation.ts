/** Private/reserved IPv4 ranges that must be blocked to prevent SSRF. */
const BLOCKED_IPV4_RANGES = [
  /^127\./, // Loopback
  /^10\./, // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./, // Class B private
  /^192\.168\./, // Class C private
  /^169\.254\./, // Link-local
  /^0\./, // Current network
]

/** Hostnames that resolve to cloud metadata endpoints. */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.internal',
])

const MAX_URL_LENGTH = 2048

/**
 * Validates and normalizes a user-supplied URL for safe forwarding to Firecrawl.
 * Returns the normalized URL string, or an error message if invalid.
 */
export function validateUrl(raw: string): { url: string } | { error: string } {
  if (!raw || typeof raw !== 'string') {
    return { error: 'URL is required' }
  }

  if (raw.length > MAX_URL_LENGTH) {
    return { error: 'URL is too long' }
  }

  const withScheme = raw.startsWith('http://') || raw.startsWith('https://')
    ? raw
    : `https://${raw}`

  let parsed: URL
  try {
    parsed = new URL(withScheme)
  } catch {
    return { error: 'Invalid URL format' }
  }

  // Only allow http and https schemes
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Only http and https URLs are allowed' }
  }

  // Block credentials in URL (e.g., http://user:pass@host)
  if (parsed.username || parsed.password) {
    return { error: 'URLs with credentials are not allowed' }
  }

  const hostname = parsed.hostname.toLowerCase()

  // Block known internal hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { error: 'Internal URLs are not allowed' }
  }

  // Block IPv6 loopback
  if (hostname === '[::1]' || hostname === '::1') {
    return { error: 'Internal URLs are not allowed' }
  }

  // Block private IPv4 ranges
  for (const pattern of BLOCKED_IPV4_RANGES) {
    if (pattern.test(hostname)) {
      return { error: 'Internal URLs are not allowed' }
    }
  }

  return { url: parsed.toString() }
}
