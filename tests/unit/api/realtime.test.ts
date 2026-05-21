import { describe, expect, test } from 'bun:test'

import { channelName } from '../../../api/_shared/realtime'

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

describe('channelName (Plan 11 Task 1.7 — server-side mirror)', () => {
  test('builds canonical kova.{userId}.{domain}.{topic} string', () => {
    expect(channelName(VALID_UUID, 'canvas', 'abc-123.snapshot')).toBe(
      `kova.${VALID_UUID}.canvas.abc-123.snapshot`
    )
  })

  test('matches the client-side useChannelName() format exactly', () => {
    // Mirror contract — first 5 dot segments are: kova, userId, domain, topic-parts...
    const name = channelName(VALID_UUID, 'brand', 'memory.created')
    expect(name.startsWith('kova.')).toBe(true)
    expect(name.split('.').slice(0, 7).join('.')).toBe(
      `kova.${VALID_UUID}.brand.memory.created`
    )
  })

  test('throws on non-UUID userId', () => {
    expect(() => channelName('not-a-uuid', 'canvas', 't')).toThrow(/userId/)
  })

  test('throws on empty userId', () => {
    expect(() => channelName('', 'canvas', 't')).toThrow(/userId/)
  })

  test('throws on domain with forbidden char', () => {
    expect(() => channelName(VALID_UUID, 'has space', 't')).toThrow(/domain/)
    expect(() => channelName(VALID_UUID, 'has/slash', 't')).toThrow(/domain/)
  })

  test('throws on topic with forbidden char', () => {
    expect(() => channelName(VALID_UUID, 'd', 'has*star')).toThrow(/topic/)
    expect(() => channelName(VALID_UUID, 'd', '')).toThrow(/topic/)
  })

  test('accepts dot-separated topic segments (canvas snapshot pattern)', () => {
    const name = channelName(VALID_UUID, 'canvas', 'canvas-xyz.snapshot.123')
    expect(name).toBe(`kova.${VALID_UUID}.canvas.canvas-xyz.snapshot.123`)
  })
})
