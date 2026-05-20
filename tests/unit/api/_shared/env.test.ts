import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { requireEnv, loadEnvOrSkip } from '../../../../api/_shared/env'

describe('requireEnv (W0-9 / founder lock #10)', () => {
  let original: string | undefined

  beforeEach(() => {
    original = process.env['KOVA_REQUIREENV_TEST_VAR']
  })
  afterEach(() => {
    if (original === undefined) delete process.env['KOVA_REQUIREENV_TEST_VAR']
    else process.env['KOVA_REQUIREENV_TEST_VAR'] = original
  })

  it('returns the value when set', () => {
    process.env['KOVA_REQUIREENV_TEST_VAR'] = 'value'
    expect(requireEnv('KOVA_REQUIREENV_TEST_VAR')).toBe('value')
  })

  it('throws when missing', () => {
    delete process.env['KOVA_REQUIREENV_TEST_VAR']
    expect(() => requireEnv('KOVA_REQUIREENV_TEST_VAR')).toThrow(
      /KOVA_REQUIREENV_TEST_VAR/,
    )
  })

  it('throws when empty string', () => {
    process.env['KOVA_REQUIREENV_TEST_VAR'] = ''
    expect(() => requireEnv('KOVA_REQUIREENV_TEST_VAR')).toThrow(
      /KOVA_REQUIREENV_TEST_VAR/,
    )
  })

  it('return type is string (not string | undefined) — compile-time test', () => {
    process.env['KOVA_REQUIREENV_TEST_VAR'] = 'x'
    const v: string = requireEnv('KOVA_REQUIREENV_TEST_VAR')
    expect(v).toBe('x')
  })
})

describe('loadEnvOrSkip (W0-13 / stub-guard pattern)', () => {
  let original: string | undefined
  const warnMock = mock(() => undefined)
  const origWarn = console.warn

  beforeEach(() => {
    original = process.env['KOVA_LOAD_OR_SKIP_TEST_VAR']
    warnMock.mockClear()
    console.warn = warnMock
  })
  afterEach(() => {
    if (original === undefined) delete process.env['KOVA_LOAD_OR_SKIP_TEST_VAR']
    else process.env['KOVA_LOAD_OR_SKIP_TEST_VAR'] = original
    console.warn = origWarn
  })

  it('returns the value when set', () => {
    process.env['KOVA_LOAD_OR_SKIP_TEST_VAR'] = 'value'
    expect(loadEnvOrSkip('KOVA_LOAD_OR_SKIP_TEST_VAR')).toBe('value')
    expect(warnMock).not.toHaveBeenCalled()
  })

  it('returns null + warn breadcrumb when missing', () => {
    delete process.env['KOVA_LOAD_OR_SKIP_TEST_VAR']
    expect(loadEnvOrSkip('KOVA_LOAD_OR_SKIP_TEST_VAR')).toBeNull()
    expect(warnMock).toHaveBeenCalled()
    const firstArg = warnMock.mock.calls[0]?.[0]
    expect(String(firstArg)).toContain('KOVA_LOAD_OR_SKIP_TEST_VAR')
    expect(String(firstArg)).toContain('stub mode')
  })

  it('returns null + warn breadcrumb when empty string', () => {
    process.env['KOVA_LOAD_OR_SKIP_TEST_VAR'] = ''
    expect(loadEnvOrSkip('KOVA_LOAD_OR_SKIP_TEST_VAR')).toBeNull()
    expect(warnMock).toHaveBeenCalled()
  })
})
