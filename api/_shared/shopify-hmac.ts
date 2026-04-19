/**
 * Verify a Shopify HMAC-SHA256 webhook signature using Web Crypto API.
 * Compatible with both Node.js and Edge runtimes.
 * Uses timing-safe comparison to prevent timing attacks.
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
      ['sign'],
    )
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(rawBody)))
    const expected = btoa(String.fromCharCode(...mac))
    return timingSafeEqualStr(expected, headerSig)
  } catch {
    return false
  }
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}
