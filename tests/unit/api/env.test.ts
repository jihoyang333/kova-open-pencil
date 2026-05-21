import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { loadEnvOrSkip, requireEnv } from '../../../api/_shared/env'

const TEST_VAR = 'KOVA_REQUIREENV_TEST_VAR'
const SKIP_VAR = 'KOVA_LOAD_OR_SKIP_TEST_VAR'

describe('requireEnv (Plan 11 Task 1.3b / founder lock #10)', () => {
  let original: string | undefined

  beforeEach(() => {
    original = process.env[TEST_VAR]
  })
  afterEach(() => {
    if (original === undefined) {
      delete process.env[TEST_VAR]
    } else {
      process.env[TEST_VAR] = original
    }
  })

  test('returns the value when set', () => {
    process.env[TEST_VAR] = 'value'
    expect(requireEnv(TEST_VAR)).toBe('value')
  })

  test('throws when missing', () => {
    delete process.env[TEST_VAR]
    expect(() => requireEnv(TEST_VAR)).toThrow(/KOVA_REQUIREENV_TEST_VAR/)
  })

  test('throws when empty string', () => {
    process.env[TEST_VAR] = ''
    expect(() => requireEnv(TEST_VAR)).toThrow(/KOVA_REQUIREENV_TEST_VAR/)
  })

  test('return type is string (compile-time)', () => {
    process.env[TEST_VAR] = 'x'
    const v: string = requireEnv(TEST_VAR)
    expect(v).toBe('x')
  })

  test('preserves whitespace-only value (not coerced to empty)', () => {
    process.env[TEST_VAR] = '   '
    expect(requireEnv(TEST_VAR)).toBe('   ')
  })
})

describe('loadEnvOrSkip (Plan 11 Task 1.3c / W0-13)', () => {
  let original: string | undefined
  let warnSpy: ReturnType<typeof mock>
  let originalWarn: typeof console.warn

  beforeEach(() => {
    original = process.env[SKIP_VAR]
    warnSpy = mock(() => undefined)
    originalWarn = console.warn
    console.warn = warnSpy as unknown as typeof console.warn
  })
  afterEach(() => {
    if (original === undefined) {
      delete process.env[SKIP_VAR]
    } else {
      process.env[SKIP_VAR] = original
    }
    console.warn = originalWarn
  })

  test('returns the value when set, no warn', () => {
    process.env[SKIP_VAR] = 'value'
    expect(loadEnvOrSkip(SKIP_VAR)).toBe('value')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  test('returns null + warn when missing', () => {
    delete process.env[SKIP_VAR]
    expect(loadEnvOrSkip(SKIP_VAR)).toBeNull()
    expect(warnSpy).toHaveBeenCalled()
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain(SKIP_VAR)
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('stub mode')
  })

  test('returns null + warn when empty string', () => {
    process.env[SKIP_VAR] = ''
    expect(loadEnvOrSkip(SKIP_VAR)).toBeNull()
    expect(warnSpy).toHaveBeenCalled()
  })
})
