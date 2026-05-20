import { describe, it, expect, beforeEach, afterAll, mock } from 'bun:test'
import {
  captureException,
  initSentry,
  _resetSentryDsnCache,
} from '../../../../api/_shared/sentry'

const warnMock = mock(() => undefined)
const origWarn = console.warn

describe('captureException + initSentry (server stub mode)', () => {
  beforeEach(() => {
    warnMock.mockClear()
    console.warn = warnMock
    delete process.env['SENTRY_DSN_SERVER']
    _resetSentryDsnCache()
  })

  it('initSentry triggers loadEnvOrSkip warn when DSN unset', () => {
    initSentry()
    expect(warnMock).toHaveBeenCalled()
    expect(String(warnMock.mock.calls[0]?.[0])).toContain('stub mode')
  })

  it('captureException no-ops when DSN unset (no throw)', () => {
    expect(() =>
      captureException(new Error('boom'), { userId: 'u1' }),
    ).not.toThrow()
    expect(warnMock).toHaveBeenCalled()
  })

  it('repeated calls reuse cached DSN — warn emitted once per cache cycle', () => {
    captureException(new Error('a'))
    const initialCount = warnMock.mock.calls.length
    captureException(new Error('b'))
    captureException(new Error('c'))
    expect(warnMock.mock.calls.length).toBe(initialCount)
  })
})

afterAll(() => {
  console.warn = origWarn
})
