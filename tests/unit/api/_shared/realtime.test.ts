import { describe, it, expect } from 'bun:test'
import { channelName } from '../../../../api/_shared/realtime'

describe('channelName (server)', () => {
  it('formats kova.{userId}.{domain}.{topic}', () => {
    expect(channelName('u1', 'canvas', 'abc.snapshot')).toBe(
      'kova.u1.canvas.abc.snapshot',
    )
  })

  it('rejects empty parts', () => {
    expect(() => channelName('', 'canvas', 't')).toThrow()
    expect(() => channelName('u1', '', 't')).toThrow()
    expect(() => channelName('u1', 'canvas', '')).toThrow()
  })
})
