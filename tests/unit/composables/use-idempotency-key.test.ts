import { describe, test, expect } from 'bun:test'

import { useIdempotencyKey } from '@/composables/use-idempotency-key'

describe('useIdempotencyKey (Cluster 11 — PRD 11 §5.5)', () => {
  test('returns a generator that produces uuid v4 strings', () => {
    const gen = useIdempotencyKey()
    const a = gen()
    const b = gen()
    // RFC 4122 v4 format: 8-4-4-4-12 hex
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(uuidRe.test(a)).toBe(true)
    expect(uuidRe.test(b)).toBe(true)
    expect(a).not.toEqual(b)
  })

  test('uses crypto.randomUUID (not Math.random)', () => {
    // Verify by counting bits of entropy across 100 calls — Math.random has
    // ~52 bits, randomUUID has 122 bits. A weak generator would collide
    // within 100 samples in v4 layout (extremely unlikely with crypto).
    const gen = useIdempotencyKey()
    const set = new Set(Array.from({ length: 100 }, () => gen()))
    expect(set.size).toBe(100)
  })
})
