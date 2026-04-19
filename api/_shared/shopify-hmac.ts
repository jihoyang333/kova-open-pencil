/**
 * Verify a Shopify HMAC-SHA256 webhook signature using Web Crypto API.
 * Compatible with both Node.js and Edge runtimes.
 * Uses crypto.subtle.verify for timing-safe comparison.
 */
export async function verifyShopifyHmac(
  rawBody: string,
  headerSig: string,
  secret: string,
): Promise<boolean> {
  if (!headerSig || !secret) return false
  try {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const sigBytes = Uint8Array.from(atob(headerSig), c => c.charCodeAt(0))
    return await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(rawBody))
  } catch {
    return false
  }
}
