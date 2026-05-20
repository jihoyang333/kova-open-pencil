import { describe, it, expect, beforeEach, afterAll, mock } from 'bun:test'
import { installSentry } from '@/sentry'

const warnMock = mock(() => undefined)
const origWarn = console.warn

describe('installSentry (browser stub mode)', () => {
  beforeEach(() => {
    warnMock.mockClear()
    console.warn = warnMock
  })

  it('logs stub warn when VITE_SENTRY_DSN_BROWSER unset', () => {
    installSentry({} as never, {} as never)
    expect(warnMock).toHaveBeenCalled()
    const msg = warnMock.mock.calls[0]?.[0]
    expect(String(msg)).toContain('[sentry]')
    expect(String(msg)).toContain('stub mode')
  })

  it('does not throw when DSN missing', () => {
    expect(() => installSentry({} as never, {} as never)).not.toThrow()
  })
})

afterAll(() => {
  console.warn = origWarn
})
