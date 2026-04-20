import { describe, it, expect } from 'bun:test'
import { bindingStatus } from '../../../src/canvas-extensions/product-variant/state'

describe('bindingStatus', () => {
  it('returns "unavailable" when variant missing from store', () => {
    expect(bindingStatus({ snapshot: { inventory: 0 } } as never, undefined)).toBe('unavailable')
  })
  it('returns "oos" when variant present but inventory_qty=0', () => {
    const variant = { inventory_qty: 0, available: false } as never
    expect(bindingStatus({ snapshot: { inventory: 5 } } as never, variant)).toBe('oos')
  })
  it('returns "ok" otherwise', () => {
    const variant = { inventory_qty: 42, available: true } as never
    expect(bindingStatus({} as never, variant)).toBe('ok')
  })
})
