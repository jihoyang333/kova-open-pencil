import { describe, test, expect } from 'bun:test'

import { formatRelativeTime } from '@/utils/format-relative-time'

// Plan T28 — relative time util contract.

const NOW = new Date('2026-05-15T12:00:00Z')

describe('formatRelativeTime', () => {
  test('seconds ago → just now', () => {
    expect(formatRelativeTime(new Date('2026-05-15T11:59:30Z'), NOW)).toBe('just now')
  })

  test('minutes ago', () => {
    expect(formatRelativeTime(new Date('2026-05-15T11:45:00Z'), NOW)).toBe('15m ago')
  })

  test('hours ago', () => {
    expect(formatRelativeTime(new Date('2026-05-15T10:00:00Z'), NOW)).toBe('2h ago')
  })

  test('one day ago → yesterday', () => {
    expect(formatRelativeTime(new Date('2026-05-14T10:00:00Z'), NOW)).toBe('yesterday')
  })

  test('multi-day under a week', () => {
    expect(formatRelativeTime(new Date('2026-05-12T10:00:00Z'), NOW)).toBe('3d ago')
  })

  test('weeks ago', () => {
    expect(formatRelativeTime(new Date('2026-05-07T10:00:00Z'), NOW)).toBe('1w ago')
  })

  test('months ago', () => {
    expect(formatRelativeTime(new Date('2026-03-14T10:00:00Z'), NOW)).toBe('2mo ago')
  })

  test('accepts ISO string input', () => {
    expect(formatRelativeTime('2026-05-15T10:00:00Z', NOW)).toBe('2h ago')
  })
})
