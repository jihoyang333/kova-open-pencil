import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verify a Shopify HMAC-SHA256 webhook signature.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export async function verifyShopifyHmac(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature || !secret) return false
  try {
    const expected = createHmac('sha256', secret).update(body).digest('base64')
    const expectedBuf = Buffer.from(expected)
    const signatureBuf = Buffer.from(signature)
    if (expectedBuf.length !== signatureBuf.length) return false
    return timingSafeEqual(expectedBuf, signatureBuf)
  } catch {
    return false
  }
}
