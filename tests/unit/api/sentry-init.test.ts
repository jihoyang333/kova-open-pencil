import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import {
  captureServerException,
  initServerSentry,
  isServerSentryActive,
} from '../../../api/_shared/sentry'

// W6 Cluster 11 Phase 5c — server Sentry init guard.
//
// Tests only the env-guard + stub behavior. The actual @sentry/node SDK
// is not exercised — verifying that requires a live DSN + ingest endpoint,
// which is pre-launch §11 scope.

const DSN_VAR = 'SENTRY_DSN_SERVER'

describe('initServerSentry (Plan 11 Task 1.5)', () => {
  let original: string | undefined
  let warnSpy: ReturnType<typeof mock>
  let originalWarn: typeof console.warn

  beforeEach(() => {
    original = process.env[DSN_VAR]
    warnSpy = mock(() => undefined)
    originalWarn = console.warn
    console.warn = warnSpy as unknown as typeof console.warn
  })
  afterEach(() => {
    if (original === undefined) {
      delete process.env[DSN_VAR]
    } else {
      process.env[DSN_VAR] = original
    }
    console.warn = originalWarn
  })

  test('no DSN → no-op, warn breadcrumb, isActive false', () => {
    delete process.env[DSN_VAR]
    initServerSentry()
    expect(isServerSentryActive()).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain(DSN_VAR)
  })

  test('empty DSN → no-op, warn, isActive false', () => {
    process.env[DSN_VAR] = ''
    initServerSentry()
    expect(isServerSentryActive()).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
  })

  test('captureServerException is a no-op when init never ran', () => {
    delete process.env[DSN_VAR]
    expect(() =>
      captureServerException(new Error('test'), { brand_id: 'b1' })
    ).not.toThrow()
  })

  test('captureServerException no-throws with no ctx', () => {
    expect(() => captureServerException(new Error('bare'))).not.toThrow()
  })
})
